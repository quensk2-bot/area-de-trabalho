import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import type { GestaoJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import {
  HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE,
  HYBRID_LOJA_NAO_PUBLICADA_MESSAGE,
} from "../../../hibrido-v7/hybridErrors.ts";
import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";
import { listarBandeirasDoCatalogo, fetchCatalogoLojas } from "../../../auth-v7/catalogoLojasService.ts";
import type { RupturaFiltrosProdutos } from "../../types/rupturaFiltrosTypes.ts";
import type { RupturaProdutoLoja } from "../../types/rupturaTypes.ts";
import { resolverLojasEfetivas } from "../lojasFiltroUtils.ts";
import {
  carregarManifest,
  listarLojasPublicadasManifest,
  lojaPathsFromManifest,
} from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";
import { assertEscopoHibrido, assertLojasSelecionadas, HIBRIDO_BANDEIRA_DEFAULT } from "./hibridoScope.ts";
import { isOrdenacaoGestaoDefault, ordenarProdutosGestaoDefault } from "./gestaoOrdering.ts";
import { filtrarProdutos } from "./gestaoFilters.ts";
import type { CdsPorProduto } from "./mapearBaseRupturaHibrido.ts";
import { normalizarProdutosGestaoExport } from "./normalizarProdutoGestaoExport.ts";
import { filtrarUniversoOficialCompativel } from "../../../motor/export/hibrido/filtrarUniversoOficialCompativel.ts";

export { ordenarProdutosGestaoDefault, prioridadeClassificacaoGestao, isOrdenacaoGestaoDefault } from "./gestaoOrdering.ts";
export { filtrarProdutos } from "./gestaoFilters.ts";

type GestaoCacheEntry = {
  meta: GestaoJson;
  gestaoPath: string;
  chunksLoaded: Set<string>;
  produtos: HibridoProdutoGestao[];
  complete: boolean;
  loadPromise: Promise<HybridServiceError | null> | null;
};

const gestaoCache = new Map<string, GestaoCacheEntry>();
const GESTAO_LOJA_CONCURRENCY = 2;

export type GestaoLoadProgress = { atual: number; total: number; loja: number };

/** Limpa cache de gestão (troca de contexto ou testes). */
export function invalidateGestaoCache(prefix?: string): void {
  if (!prefix) {
    gestaoCache.clear();
    return;
  }
  for (const key of gestaoCache.keys()) {
    if (key.includes(prefix)) gestaoCache.delete(key);
  }
}

/** Hook de teste — quantidade de chunks baixados na sessão. */
export function gestaoCacheStats(): { entries: number; chunksLoaded: number; complete: number } {
  let chunksLoaded = 0;
  let complete = 0;
  for (const entry of gestaoCache.values()) {
    chunksLoaded += entry.chunksLoaded.size;
    if (entry.complete) complete += 1;
  }
  return { entries: gestaoCache.size, chunksLoaded, complete };
}

function mapProduto(p: HibridoProdutoGestao, ctx: RupturaFiltrosProdutos): RupturaProdutoLoja {
  return {
    execucao_id: "hibrido",
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    versao: 1,
    loja: p.loja,
    seqproduto: p.seqproduto,
    descricao: p.descricao,
    cod_fornecedor: p.codFornecedor,
    razao_fornecedor: p.razaoFornecedor,
    rede: p.rede,
    comprador: p.comprador,
    bandeira: ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT,
    divisao: p.divisao,
    setor_n2: p.setorN2,
    grupo_n3: null,
    subgrupo_n4: null,
    categoria_n5: null,
    estoque_loja: p.estoqueLoja,
    par_min: p.parMin,
    par_max: p.parMax,
    media_venda_dia: p.mediaVendaDia,
    pendencia_loja: p.pendenciaLoja,
    inventario_unidades: null,
    classificacao_prazo: p.classificacaoPrazo,
    curto_prazo: null,
    medio_prazo: null,
    longo_prazo: null,
    base_limpa: p.baseLimpa,
    flag_ruptura: null,
    ruptura_com_inventario: null,
    ruptura_sem_inventario: null,
    cross_docking: null,
    soma_estoque_cd: p.somaEstoqueCd,
    pendencia_cpa_cd: p.pendenciaCpaCd,
    dias_pedido: p.diasPedido,
    acao_curto_prazo: null,
    acao_medio_prazo: null,
    acao_recomendada: p.acaoRecomendada,
    produto_centralizado: p.produtoCentralizado,
    texto_produto_centralizado: null,
    posicao_cd_selecionada: null,
    codigo_cd_selecionado: p.codigoCdSelecionado,
    status_recebto: null,
    status_estoque_cds: p.statusEstoqueCds,
    status_solicitacao_ativacao_cd: null,
    quantidade_cds: null,
    qualidade_dados: p.qualidadeDados,
    status_operacional: null,
  };
}

function ordenarProdutos(
  produtos: HibridoProdutoGestao[],
  ordenacao?: { coluna: string; direcao: "asc" | "desc" },
): HibridoProdutoGestao[] {
  if (isOrdenacaoGestaoDefault(ordenacao)) {
    return ordenarProdutosGestaoDefault(produtos);
  }
  const col = ordenacao!.coluna;
  const asc = ordenacao!.direcao !== "desc";
  return [...produtos].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[col];
    const bv = (b as unknown as Record<string, unknown>)[col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
    return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

async function carregarChunkGestao(
  gestaoPath: string,
  partePath: string,
  entry: GestaoCacheEntry,
): Promise<HybridServiceError | null> {
  if (entry.chunksLoaded.has(partePath)) return null;

  const fullPath = gestaoPath.replace(/gestao\.json$/, partePath);
  const chunk = await downloadStorageJson<{ produtos: HibridoProdutoGestao[] }>(fullPath);
  if (chunk.erro) return chunk.erro;

  entry.chunksLoaded.add(partePath);
  entry.produtos.push(...normalizarProdutosGestaoExport(chunk.data?.produtos ?? []));
  return null;
}

export async function ensureGestaoLoja(
  manifest: NonNullable<Awaited<ReturnType<typeof carregarManifest>>["manifest"]>,
  loja: number,
): Promise<{ produtos: HibridoProdutoGestao[]; erro: HybridServiceError | null }> {
  const paths = lojaPathsFromManifest(manifest, loja);
  if (!paths) {
    return { produtos: [], erro: { code: "loja_not_published", message: HYBRID_LOJA_NAO_PUBLICADA_MESSAGE } };
  }

  const cacheKey = paths.gestao;
  let entry = gestaoCache.get(cacheKey);

  if (!entry) {
    const { data, erro } = await downloadStorageJson<GestaoJson>(paths.gestao);
    if (erro) return { produtos: [], erro };

    entry = {
      meta: data!,
      gestaoPath: paths.gestao,
      chunksLoaded: new Set(),
      produtos: normalizarProdutosGestaoExport(data!.produtos ?? []),
      complete: !data!.meta.chunked,
      loadPromise: null,
    };
    gestaoCache.set(cacheKey, entry);
  }

  if (entry.complete) {
    return { produtos: entry.produtos, erro: null };
  }

  const partes = entry.meta.meta.chunkIndex?.partes ?? [];
  if (!partes.length) {
    entry.complete = true;
    return { produtos: entry.produtos, erro: null };
  }

  if (entry.loadPromise) {
    const loadErr = await entry.loadPromise;
    return { produtos: entry.produtos, erro: loadErr };
  }

  entry.loadPromise = (async (): Promise<HybridServiceError | null> => {
    for (const parte of partes) {
      const err = await carregarChunkGestao(entry!.gestaoPath, parte.path, entry!);
      if (err) {
        entry!.loadPromise = null;
        return err;
      }
    }
    entry!.complete = true;
    entry!.loadPromise = null;
    return null;
  })();

  const loadErr = await entry.loadPromise;
  return { produtos: entry.produtos, erro: loadErr };
}

async function ensureGestaoProdutos(
  ctx: RupturaFiltrosProdutos,
  authCtx: PermissionContext | null,
  onProgress?: (p: GestaoLoadProgress) => void,
): Promise<{ produtos: HibridoProdutoGestao[]; erro: HybridServiceError | null }> {
  const scopeErr = assertEscopoHibrido(authCtx, ctx);
  if (scopeErr) return { produtos: [], erro: scopeErr };

  const catalogo = await fetchCatalogoLojas();
  const lojasAlvo = resolverLojasEfetivas(catalogo, ctx);
  const selErr = assertLojasSelecionadas(lojasAlvo);
  if (selErr) return { produtos: [], erro: selErr };

  const bandeiras =
    ctx.bandeira != null
      ? [ctx.bandeira]
      : listarBandeirasDoCatalogo(catalogo, ctx.regional).map((b) => b.bandeira);

  const tarefas: { bandeira: string; loja: number }[] = [];
  for (const bandeira of bandeiras) {
    const lojasBandeira = lojasAlvo.filter((l) =>
      catalogo.some((c) => c.loja === l && c.bandeira === bandeira && c.regional === ctx.regional),
    );
    for (const loja of lojasBandeira) {
      tarefas.push({ bandeira, loja });
    }
  }

  if (!tarefas.length) {
    return {
      produtos: [],
      erro: { code: "bandeira_not_published", message: HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE },
    };
  }

  const produtos: HibridoProdutoGestao[] = [];
  let concluidas = 0;
  let primeiroErro: HybridServiceError | null = null;

  async function carregarTarefa(t: { bandeira: string; loja: number }) {
    const { manifest, erro: mErr } = await carregarManifest({
      regional: ctx.regional,
      bandeira: t.bandeira,
      dataReferencia: ctx.dataReferencia,
    });
    if (mErr) {
      if (!primeiroErro) primeiroErro = { code: "bandeira_not_published", message: HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE };
      concluidas += 1;
      onProgress?.({ atual: concluidas, total: tarefas.length, loja: t.loja });
      return;
    }

    const publicadas = listarLojasPublicadasManifest(manifest!);
    if (!publicadas.includes(t.loja)) {
      if (!primeiroErro) primeiroErro = { code: "loja_not_published", message: HYBRID_LOJA_NAO_PUBLICADA_MESSAGE };
      concluidas += 1;
      onProgress?.({ atual: concluidas, total: tarefas.length, loja: t.loja });
      return;
    }

    const r = await ensureGestaoLoja(manifest!, t.loja);
    if (r.erro && !primeiroErro) primeiroErro = r.erro;
    produtos.push(...r.produtos);
    concluidas += 1;
    onProgress?.({ atual: concluidas, total: tarefas.length, loja: t.loja });
  }

  let next = 0;
  async function worker() {
    while (next < tarefas.length) {
      const i = next++;
      await carregarTarefa(tarefas[i]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(GESTAO_LOJA_CONCURRENCY, tarefas.length) }, () => worker()),
  );

  if (!produtos.length && primeiroErro) {
    return { produtos: [], erro: primeiroErro };
  }

  return { produtos, erro: null };
}

export async function consultarProdutosPaginadosHibrido(input: {
  filtros: RupturaFiltrosProdutos;
  pagina: number;
  tamanho: number;
  authCtx: PermissionContext | null;
  ordenacao?: { coluna: string; direcao: "asc" | "desc" };
  onProgress?: (p: GestaoLoadProgress) => void;
  /** Visão Oficial (default) filtra Base Limpa; integral lista todos produtos gestao.json. */
  visaoOficial?: boolean;
}): Promise<{ dados: RupturaProdutoLoja[]; total: number; erro: HybridServiceError | null }> {
  const { produtos, erro } = await ensureGestaoProdutos(input.filtros, input.authCtx, input.onProgress);
  if (erro) return { dados: [], total: 0, erro };

  const universo =
    input.visaoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : produtos;
  const filtrados = filtrarProdutos(universo, input.filtros);
  const ordenados = ordenarProdutos(filtrados, input.ordenacao);

  const offset = Math.max(0, input.pagina - 1) * input.tamanho;
  const page = ordenados.slice(offset, offset + input.tamanho);

  return {
    dados: page.map((p) => mapProduto(p, input.filtros)),
    total: ordenados.length,
    erro: null,
  };
}

export type ExportGestaoCdsLoja = {
  loja: number;
  bandeira: string;
  produtos: HibridoProdutoGestao[];
  cdsPorProduto: CdsPorProduto;
  publicada: boolean;
};

/** Carrega gestao + cds por loja para exportação oficial (Storage JSON). */
export async function carregarDadosExportBaseHibrido(input: {
  ctx: RupturaFiltrosProdutos;
  authCtx: PermissionContext | null;
  lojasAlvo?: number[];
  onProgress?: (p: GestaoLoadProgress) => void;
}): Promise<{ lojas: ExportGestaoCdsLoja[]; erro: HybridServiceError | null }> {
  const scopeErr = assertEscopoHibrido(input.authCtx, input.ctx);
  if (scopeErr) return { lojas: [], erro: scopeErr };

  const catalogo = await fetchCatalogoLojas();
  const lojasEfetivas = input.lojasAlvo ?? resolverLojasEfetivas(catalogo, input.ctx);
  const selErr = assertLojasSelecionadas(lojasEfetivas);
  if (selErr) return { lojas: [], erro: selErr };

  const bandeiraCtx = input.ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const resultados: ExportGestaoCdsLoja[] = [];
  let concluidas = 0;

  for (const loja of lojasEfetivas) {
    const bandeira =
      catalogo.find((c) => c.loja === loja && c.regional === input.ctx.regional)?.bandeira ?? bandeiraCtx;

    const { manifest, erro: mErr } = await carregarManifest({
      regional: input.ctx.regional,
      bandeira,
      dataReferencia: input.ctx.dataReferencia,
    });
    if (mErr) {
      concluidas += 1;
      input.onProgress?.({ atual: concluidas, total: lojasEfetivas.length, loja });
      continue;
    }

    const publicada = listarLojasPublicadasManifest(manifest!).includes(loja);
    if (!publicada) {
      resultados.push({ loja, bandeira, produtos: [], cdsPorProduto: new Map(), publicada: false });
      concluidas += 1;
      input.onProgress?.({ atual: concluidas, total: lojasEfetivas.length, loja });
      continue;
    }

    const gestao = await ensureGestaoLoja(manifest!, loja);
    if (gestao.erro) {
      return { lojas: [], erro: gestao.erro };
    }

    const paths = lojaPathsFromManifest(manifest!, loja)!;
    const { data: cdsJson, erro: cdsErr } = await downloadStorageJson<
      import("../../../hibrido-v7/manifest/manifestTypes.ts").CdsLojaJson
    >(paths.cds);
    if (cdsErr) return { lojas: [], erro: cdsErr };

    const cdsPorProduto: CdsPorProduto = new Map();
    for (const p of cdsJson?.produtos ?? []) {
      cdsPorProduto.set(p.seqproduto, p.cds);
    }

    resultados.push({
      loja,
      bandeira,
      produtos: gestao.produtos,
      cdsPorProduto,
      publicada: true,
    });
    concluidas += 1;
    input.onProgress?.({ atual: concluidas, total: lojasEfetivas.length, loja });
  }

  if (!resultados.some((r) => r.publicada && r.produtos.length)) {
    return {
      lojas: resultados,
      erro: { code: "loja_not_published", message: HYBRID_LOJA_NAO_PUBLICADA_MESSAGE },
    };
  }

  return { lojas: resultados, erro: null };
}
