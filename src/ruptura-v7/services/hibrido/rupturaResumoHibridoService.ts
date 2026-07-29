import type {
  RupturaDashboardDivisao,
  RupturaDashboardFornecedor,
  RupturaDashboardLoja,
  RupturaDashboardSetor,
  RupturaCdEstoqueAgregado,
} from "../../types/rupturaDashboardTypes.ts";
import type { RupturaFiltrosContexto } from "../../types/rupturaFiltrosTypes.ts";
import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import type { ResumoLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import {
  HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE,
  HYBRID_LOJA_NAO_PUBLICADA_MESSAGE,
} from "../../../hibrido-v7/hybridErrors.ts";
import { listarBandeirasDoCatalogo } from "../../../auth-v7/catalogoLojasService.ts";
import { fetchCatalogoLojas } from "../../../auth-v7/catalogoLojasService.ts";
import { resolverLojasEfetivas } from "../lojasFiltroUtils.ts";
import {
  filtrarProdutosPorCompradores,
  listarCompradoresDistintos,
} from "../compradoresFiltroUtils.ts";
import {
  carregarManifest,
  listarLojasPublicadasManifest,
  lojaPathsFromManifest,
} from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";
import { assertEscopoHibrido, assertLojasSelecionadas, HIBRIDO_BANDEIRA_DEFAULT } from "./hibridoScope.ts";
import { aggregateResumos, mapResumoToDashboard, mapResumosAgregadosToDashboard } from "./mapResumoDashboard.ts";
import { ensureGestaoLoja } from "./rupturaGestaoHibridoService.ts";
import { agregarDivisoesFromGestao, agregarSetoresFromGestao, mesclarDivisoesComGestao, mesclarSetoresComGestao } from "../../utils/agregarDivisoesFromGestao.ts";
import {
  formatTooltipsPrazoFromGestao,
} from "../../utils/calcularDetalheCurtoPrazo.ts";
import { precisaEnriquecerDivisoes } from "../../utils/derivarDivisoesDashboard.ts";
import {
  agregarCapaFromGestao,
  agregarCapaPorCompradorFromGestao,
  agregarCapaPorLojaFromGestao,
  mapCapaLinhaTotalToDashboardKpi,
  type RupturaCapaResultado,
  type RupturaCompradorResultado,
  type RupturaLojaResultado,
} from "../../utils/agregarCapaFromGestao.ts";
import type { BaseCompradorLinha } from "../../utils/baseCompradorTypes.ts";
import { listarValoresDistintos, montarBaseCompradorFromGestao } from "../../utils/mapearBaseCompradorFromGestao.ts";

export { mapResumoToDashboard, aggregateResumos, mapResumosAgregadosToDashboard } from "./mapResumoDashboard.ts";

const RESUMO_CONCURRENCY = 4;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export type ModoUniversoLeituraResumo = "oficial" | "integral";

async function loadResumoLoja(
  manifest: Awaited<ReturnType<typeof carregarManifest>>["manifest"],
  loja: number,
  modo: ModoUniversoLeituraResumo = "oficial",
): Promise<ResumoLojaJson | null> {
  if (!manifest) return null;
  const paths = lojaPathsFromManifest(manifest, loja);
  if (!paths) return null;
  const path =
    modo === "oficial" && paths.resumoOficial ? paths.resumoOficial : paths.resumo;
  const { data } = await downloadStorageJson<ResumoLojaJson>(path);
  return data;
}

async function loadResumosBandeira(
  ctx: RupturaFiltrosContexto,
  bandeira: string,
  lojasAlvo: number[],
  modo: ModoUniversoLeituraResumo = "oficial",
): Promise<{ resumos: ResumoLojaJson[]; lojasNaoPublicadas: number[]; erro: HybridServiceError | null }> {
  const { manifest, erro: mErr } = await carregarManifest({
    regional: ctx.regional,
    bandeira,
    dataReferencia: ctx.dataReferencia,
  });
  if (mErr) {
    return {
      resumos: [],
      lojasNaoPublicadas: lojasAlvo,
      erro: { code: "bandeira_not_published", message: HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE },
    };
  }

  const publicadas = listarLojasPublicadasManifest(manifest!);
  const alvo = lojasAlvo.length ? lojasAlvo : publicadas;

  if (!publicadas.length) {
    return {
      resumos: [],
      lojasNaoPublicadas: alvo,
      erro: { code: "bandeira_not_published", message: HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE },
    };
  }

  const resumos: ResumoLojaJson[] = [];
  const lojasNaoPublicadas: number[] = [];

  await mapPool(alvo, RESUMO_CONCURRENCY, async (loja) => {
    if (!publicadas.includes(loja)) {
      lojasNaoPublicadas.push(loja);
      return;
    }
    const resumo = await loadResumoLoja(manifest, loja, modo);
    if (resumo) resumos.push(resumo);
    else lojasNaoPublicadas.push(loja);
  });

  return { resumos, lojasNaoPublicadas, erro: null };
}

async function loadResumos(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  modo: ModoUniversoLeituraResumo = "oficial",
): Promise<{
  resumos: ResumoLojaJson[];
  lojasNaoPublicadas: number[];
  erro: HybridServiceError | null;
  versao?: number;
}> {
  const bandeiraCtx = ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const scopeErr = assertEscopoHibrido(authCtx, { ...ctx, bandeira: bandeiraCtx });
  if (scopeErr) return { resumos: [], lojasNaoPublicadas: [], erro: scopeErr };

  const catalogo = await fetchCatalogoLojas();
  const lojasAlvo = resolverLojasEfetivas(catalogo, ctx);
  const selErr = assertLojasSelecionadas(lojasAlvo);
  if (selErr) return { resumos: [], lojasNaoPublicadas: [], erro: selErr };

  if (ctx.bandeira != null) {
    const r = await loadResumosBandeira(ctx, ctx.bandeira, lojasAlvo, modo);
    if (r.erro) return { ...r, versao: undefined };
    if (!r.resumos.length && r.lojasNaoPublicadas.length) {
      return {
        resumos: [],
        lojasNaoPublicadas: r.lojasNaoPublicadas,
        erro: {
          code: r.lojasNaoPublicadas.length === lojasAlvo.length ? "bandeira_not_published" : "loja_not_published",
          message:
            r.lojasNaoPublicadas.length === lojasAlvo.length
              ? HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE
              : HYBRID_LOJA_NAO_PUBLICADA_MESSAGE,
        },
      };
    }
    const { manifest } = await carregarManifest({
      regional: ctx.regional,
      bandeira: ctx.bandeira,
      dataReferencia: ctx.dataReferencia,
    });
    return { ...r, versao: manifest?.versao };
  }

  const bandeiras = listarBandeirasDoCatalogo(catalogo, ctx.regional).map((b) => b.bandeira);
  const resumos: ResumoLojaJson[] = [];
  const lojasNaoPublicadas: number[] = [];
  let versao: number | undefined;
  let bandeiraErro: HybridServiceError | null = null;

  for (const bandeira of bandeiras) {
    const lojasBandeira = lojasAlvo.filter((l) =>
      catalogo.some((c) => c.loja === l && c.regional === ctx.regional && c.bandeira === bandeira),
    );
    if (!lojasBandeira.length) continue;

    const r = await loadResumosBandeira(ctx, bandeira, lojasBandeira, modo);
    if (r.erro && !bandeiraErro) bandeiraErro = r.erro;
    resumos.push(...r.resumos);
    lojasNaoPublicadas.push(...r.lojasNaoPublicadas);

    if (!versao) {
      const { manifest } = await carregarManifest({
        regional: ctx.regional,
        bandeira,
        dataReferencia: ctx.dataReferencia,
      });
      versao = manifest?.versao;
    }
  }

  if (!resumos.length) {
    return {
      resumos: [],
      lojasNaoPublicadas,
      erro: bandeiraErro ?? {
        code: "bandeira_not_published",
        message: HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE,
      },
      versao,
    };
  }

  return { resumos, lojasNaoPublicadas, erro: null, versao };
}

/** Carrega produtos gestao.json de todas as lojas presentes nos resumos (multi-loja / bandeira). */
async function carregarProdutosGestaoResumos(
  ctx: RupturaFiltrosContexto,
  resumos: ResumoLojaJson[],
): Promise<HibridoProdutoGestao[]> {
  if (!resumos.length) return [];

  const porBandeira = new Map<string, number[]>();
  for (const r of resumos) {
    const bandeira = r.bandeira || ctx.bandeira || HIBRIDO_BANDEIRA_DEFAULT;
    const lojas = porBandeira.get(bandeira) ?? [];
    if (!lojas.includes(r.loja)) lojas.push(r.loja);
    porBandeira.set(bandeira, lojas);
  }

  const bandeiraEntries = [...porBandeira.entries()];
  const porManifest = await mapPool(bandeiraEntries, RESUMO_CONCURRENCY, async ([bandeira, lojas]) => {
    const { manifest } = await carregarManifest({
      regional: ctx.regional,
      bandeira,
      dataReferencia: ctx.dataReferencia,
    });
    if (!manifest) return [] as HibridoProdutoGestao[];

    const porLoja = await mapPool(lojas, RESUMO_CONCURRENCY, async (loja) => {
      const { produtos, erro } = await ensureGestaoLoja(manifest, loja);
      return erro || !produtos.length ? [] : produtos;
    });
    return porLoja.flat();
  });

  return porManifest.flat();
}

async function carregarAgregadosGestaoResumos(
  ctx: RupturaFiltrosContexto,
  resumos: ResumoLojaJson[],
): Promise<{
  divisoes: RupturaDashboardDivisao[];
  setores: RupturaDashboardSetor[];
} | null> {
  const produtos = await carregarProdutosGestaoResumos(ctx, resumos);
  if (!produtos.length) return null;
  const meta = {
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: resumos.length === 1 ? resumos[0]!.loja : 0,
  };
  return {
    divisoes: agregarDivisoesFromGestao(produtos, meta),
    setores: agregarSetoresFromGestao(produtos, meta),
  };
}

function aplicarTooltipsPrazoNoKpi(
  dado: RupturaDashboardLoja,
  produtos: HibridoProdutoGestao[],
): void {
  if (!produtos.length) return;
  const tooltips = formatTooltipsPrazoFromGestao(produtos);
  dado.tooltip_curto_prazo = tooltips.tooltip_curto_prazo;
  dado.tooltip_medio_prazo = tooltips.tooltip_medio_prazo;
  dado.tooltip_longo_prazo = tooltips.tooltip_longo_prazo;
}

export type DashboardHibridoCobertura = {
  lojasAlvo: number[];
  lojasCarregadas: number[];
  lojasNaoPublicadas: number[];
};

export async function consultarDashboardLojaHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  modo: ModoUniversoLeituraResumo = "oficial",
): Promise<{
  dado: RupturaDashboardLoja | null;
  erro: HybridServiceError | null;
  cobertura: DashboardHibridoCobertura;
}> {
  const catalogo = await fetchCatalogoLojas();
  const lojasAlvo = resolverLojasEfetivas(catalogo, ctx);
  const { resumos, erro, lojasNaoPublicadas } = await loadResumos(ctx, authCtx, modo);
  const cobertura: DashboardHibridoCobertura = {
    lojasAlvo,
    lojasCarregadas: resumos.map((r) => r.loja),
    lojasNaoPublicadas,
  };
  if (erro) return { dado: null, erro, cobertura };
  const dado = mapResumosAgregadosToDashboard(resumos, ctx);

  if (resumos.length >= 1) {
    const produtos = await carregarProdutosGestaoResumos(ctx, resumos);
    if (dado) aplicarTooltipsPrazoNoKpi(dado, produtos);
  }

  return { dado, erro: null, cobertura };
}

export async function consultarDashboardSetoresHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dados: RupturaDashboardSetor[]; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const agregado = aggregateResumos(resumos, ctx);
  const dados: RupturaDashboardSetor[] = (agregado?.setores ?? []).map((s) => ({
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: resumos.length === 1 ? resumos[0]!.loja : 0,
    divisao: null,
    setor_n2: s.setor,
    total_produtos: s.totalBaseLimpa ?? 0,
    total_ruptura: s.totalRuptura,
    curto_prazo: s.curtoPrazo ?? 0,
    medio_prazo: s.medioPrazo ?? 0,
    longo_prazo: s.longoPrazo ?? 0,
    bloqueados: 0,
    total_base_limpa_elegivel: s.totalBaseLimpa ?? 0,
    percentual_ruptura: s.percentualRuptura ?? null,
  }));

  if (resumos.length >= 1) {
    const gestao = await carregarAgregadosGestaoResumos(ctx, resumos);
    if (gestao) {
      if (dados.every((s) => s.total_base_limpa_elegivel === 0)) {
        return { dados: gestao.setores, erro: null };
      }
      return { dados: mesclarSetoresComGestao(dados, gestao.setores), erro: null };
    }
  }

  return { dados, erro: null };
}

export async function consultarDashboardDivisoesHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dados: RupturaDashboardDivisao[]; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const agregado = aggregateResumos(resumos, ctx);
  let dados: RupturaDashboardDivisao[] = (agregado?.divisoes ?? []).map((d) => ({
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: resumos.length === 1 ? resumos[0]!.loja : 0,
    divisao: d.divisao,
    total_ruptura: d.totalRuptura,
    total_base_limpa: d.totalBaseLimpa,
    percentual_ruptura: d.percentualRuptura,
    curto_prazo: d.curtoPrazo ?? 0,
    medio_prazo: d.medioPrazo ?? 0,
    longo_prazo: d.longoPrazo ?? 0,
  }));

  if (resumos.length >= 1) {
    const gestao = await carregarAgregadosGestaoResumos(ctx, resumos);
    if (gestao) {
      if (precisaEnriquecerDivisoes(dados)) {
        dados = gestao.divisoes;
      } else {
        dados = mesclarDivisoesComGestao(dados, gestao.divisoes);
      }
    }
  }

  return { dados, erro: null };
}

export async function consultarDashboardFornecedoresHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  limite = 10,
): Promise<{ dados: RupturaDashboardFornecedor[]; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const agregado = aggregateResumos(resumos, ctx);
  const dados: RupturaDashboardFornecedor[] = (agregado?.fornecedores ?? []).slice(0, limite).map((f) => ({
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: resumos.length === 1 ? resumos[0]!.loja : 0,
    cod_fornecedor: null,
    razao_fornecedor: f.fornecedor,
    rede: null,
    comprador: f.comprador,
    total_produtos: 0,
    total_ruptura: f.totalRuptura,
    curto_prazo: 0,
    medio_prazo: 0,
    longo_prazo: 0,
    total_com_pendencia: 0,
    total_sem_estoque_cd: 0,
    total_base_limpa_elegivel: 0,
    percentual_ruptura: null,
  }));
  return { dados, erro: null };
}

export async function consultarCompradoresTopHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  limite = 10,
): Promise<{ dados: { comprador: string; total_ruptura: number }[]; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const agregado = aggregateResumos(resumos, ctx);
  const dados = (agregado?.compradores ?? []).slice(0, limite).map((c) => ({
    comprador: c.comprador,
    total_ruptura: c.totalRuptura,
  }));
  return { dados, erro: null };
}

export async function consultarEstoquePorCdHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dados: RupturaCdEstoqueAgregado[]; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const agregado = aggregateResumos(resumos, ctx);
  const dados: RupturaCdEstoqueAgregado[] = (agregado?.estoquePorCd ?? []).map((c) => ({
    codigo_cd_fisico: c.codigoFisico,
    posicao_logica: c.posicaoLogica,
    total_estoque: c.totalEstoque,
    total_produtos: 0,
  }));
  return { dados, erro: null };
}

export async function consultarCapaDashboardHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ capa: RupturaCapaResultado | null; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { capa: null, erro };
  if (!resumos.length) return { capa: null, erro: null };

  const produtos = await carregarProdutosGestaoResumos(ctx, resumos);
  if (!produtos.length) return { capa: null, erro: null };

  return { capa: agregarCapaFromGestao(produtos), erro: null };
}

export async function consultarCapaLojaHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ loja: RupturaLojaResultado | null; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { loja: null, erro };
  if (!resumos.length) return { loja: null, erro: null };

  const produtos = await carregarProdutosGestaoResumos(ctx, resumos);
  if (!produtos.length) return { loja: null, erro: null };

  return { loja: agregarCapaPorLojaFromGestao(produtos), erro: null };
}

export async function consultarCapaCompradorHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ comprador: RupturaCompradorResultado | null; erro: HybridServiceError | null }> {
  const r = await consultarDashboardCompradorHibrido(ctx, authCtx);
  if (r.erro) return { comprador: null, erro: r.erro };
  return { comprador: r.comprador, erro: null };
}

export async function consultarDashboardCompradorHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{
  dado: RupturaDashboardLoja | null;
  comprador: RupturaCompradorResultado | null;
  catalogoCompradores: string[];
  erro: HybridServiceError | null;
  cobertura: DashboardHibridoCobertura;
}> {
  const catalogo = await fetchCatalogoLojas();
  const lojasAlvo = resolverLojasEfetivas(catalogo, ctx);
  const { resumos, erro, lojasNaoPublicadas } = await loadResumos(ctx, authCtx);
  const cobertura: DashboardHibridoCobertura = {
    lojasAlvo,
    lojasCarregadas: resumos.map((r) => r.loja),
    lojasNaoPublicadas,
  };
  if (erro) {
    return { dado: null, comprador: null, catalogoCompradores: [], erro, cobertura };
  }
  if (!resumos.length) {
    return { dado: null, comprador: null, catalogoCompradores: [], erro: null, cobertura };
  }

  const produtosBrutos = await carregarProdutosGestaoResumos(ctx, resumos);
  const catalogoCompradores = listarCompradoresDistintos(produtosBrutos);
  if (!produtosBrutos.length) {
    return { dado: null, comprador: null, catalogoCompradores, erro: null, cobertura };
  }

  const produtos = filtrarProdutosPorCompradores(produtosBrutos, ctx.compradores);
  const comprador = agregarCapaPorCompradorFromGestao(produtos);
  const dado = mapCapaLinhaTotalToDashboardKpi(comprador.total, ctx);
  aplicarTooltipsPrazoNoKpi(dado, produtos);

  return { dado, comprador, catalogoCompradores, erro: null, cobertura };
}

export async function consultarBaseCompradorHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{
  linhas: BaseCompradorLinha[];
  catalogoDepartamentos: string[];
  catalogoSecoes: string[];
  catalogoCategorias: string[];
  catalogoCompradores: string[];
  erro: HybridServiceError | null;
  cobertura: DashboardHibridoCobertura;
}> {
  const catalogo = await fetchCatalogoLojas();
  const lojasAlvo = resolverLojasEfetivas(catalogo, ctx);
  const { resumos, erro, lojasNaoPublicadas } = await loadResumos(ctx, authCtx);
  const cobertura: DashboardHibridoCobertura = {
    lojasAlvo,
    lojasCarregadas: resumos.map((r) => r.loja),
    lojasNaoPublicadas,
  };
  if (erro) {
    return {
      linhas: [],
      catalogoDepartamentos: [],
      catalogoSecoes: [],
      catalogoCategorias: [],
      catalogoCompradores: [],
      erro,
      cobertura,
    };
  }
  if (!resumos.length) {
    return {
      linhas: [],
      catalogoDepartamentos: [],
      catalogoSecoes: [],
      catalogoCategorias: [],
      catalogoCompradores: [],
      erro: null,
      cobertura,
    };
  }

  const produtosBrutos = await carregarProdutosGestaoResumos(ctx, resumos);
  const catalogoCompradores = listarCompradoresDistintos(produtosBrutos);
  const linhas = montarBaseCompradorFromGestao({
    produtos: produtosBrutos,
    compradores: ctx.compradores,
    universoOficial: true,
    deduplicarCodigo: true,
  });

  return {
    linhas,
    catalogoDepartamentos: listarValoresDistintos(linhas, "departamento"),
    catalogoSecoes: listarValoresDistintos(linhas, "secao"),
    catalogoCategorias: listarValoresDistintos(linhas, "categoria"),
    catalogoCompradores,
    erro: null,
    cobertura,
  };
}

export async function consultarExecucaoAtivaHibrido(
  ctx: Pick<RupturaFiltrosContexto, "regional" | "dataReferencia" | "bandeira" | "loja" | "lojas">,
  authCtx: PermissionContext | null,
): Promise<{ dado: { versao?: number; finalizado_em?: string | null } | null; erro: HybridServiceError | null }> {
  const { resumos, erro, versao } = await loadResumos(
    { ...ctx, bandeira: ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT, loja: ctx.loja ?? 73, lojas: ctx.lojas ?? [] },
    authCtx,
  );
  if (erro && (erro.code === "not_published" || erro.code === "bandeira_not_published")) {
    return { dado: null, erro };
  }
  if (erro && erro.code !== "loja_not_published") return { dado: null, erro };
  return {
    dado: { versao, finalizado_em: resumos[0]?.atualizadoEm ?? null },
    erro: null,
  };
}
