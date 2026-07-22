import type {
  RupturaDashboardFornecedor,
  RupturaDashboardLoja,
  RupturaDashboardSetor,
  RupturaCdEstoqueAgregado,
} from "../../types/rupturaDashboardTypes.ts";
import type { RupturaFiltrosContexto } from "../../types/rupturaFiltrosTypes.ts";
import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import type { ResumoLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import {
  HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE,
  HYBRID_LOJA_NAO_PUBLICADA_MESSAGE,
} from "../../../hibrido-v7/hybridErrors.ts";
import { listarBandeirasDoCatalogo } from "../../../auth-v7/catalogoLojasService.ts";
import { fetchCatalogoLojas } from "../../../auth-v7/catalogoLojasService.ts";
import { resolverLojasEfetivas } from "../lojasFiltroUtils.ts";
import {
  carregarManifest,
  listarLojasPublicadasManifest,
  lojaPathsFromManifest,
} from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";
import { assertEscopoHibrido, assertLojasSelecionadas, HIBRIDO_BANDEIRA_DEFAULT } from "./hibridoScope.ts";
import { aggregateResumos, mapResumoToDashboard, mapResumosAgregadosToDashboard } from "./mapResumoDashboard.ts";

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

async function loadResumoLoja(
  manifest: Awaited<ReturnType<typeof carregarManifest>>["manifest"],
  loja: number,
): Promise<ResumoLojaJson | null> {
  if (!manifest) return null;
  const paths = lojaPathsFromManifest(manifest, loja);
  if (!paths) return null;
  const { data } = await downloadStorageJson<ResumoLojaJson>(paths.resumo);
  return data;
}

async function loadResumosBandeira(
  ctx: RupturaFiltrosContexto,
  bandeira: string,
  lojasAlvo: number[],
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
    const resumo = await loadResumoLoja(manifest, loja);
    if (resumo) resumos.push(resumo);
    else lojasNaoPublicadas.push(loja);
  });

  return { resumos, lojasNaoPublicadas, erro: null };
}

async function loadResumos(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
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
    const r = await loadResumosBandeira(ctx, ctx.bandeira, lojasAlvo);
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

    const r = await loadResumosBandeira(ctx, bandeira, lojasBandeira);
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

export async function consultarDashboardLojaHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dado: RupturaDashboardLoja | null; erro: HybridServiceError | null }> {
  const { resumos, erro } = await loadResumos(ctx, authCtx);
  if (erro) return { dado: null, erro };
  return {
    dado: mapResumosAgregadosToDashboard(resumos, ctx),
    erro: null,
  };
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
    total_produtos: 0,
    total_ruptura: s.totalRuptura,
    curto_prazo: 0,
    medio_prazo: 0,
    longo_prazo: 0,
    bloqueados: 0,
    total_base_limpa_elegivel: 0,
    percentual_ruptura: null,
  }));
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
