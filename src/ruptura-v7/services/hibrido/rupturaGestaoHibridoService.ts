import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import type { GestaoJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";
import type { RupturaFiltrosProdutos } from "../../types/rupturaFiltrosTypes.ts";
import type { RupturaProdutoLoja } from "../../types/rupturaTypes.ts";
import { carregarManifest, lojaPathsFromManifest } from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";
import { assertEscopoHibrido, HIBRIDO_BANDEIRA_DEFAULT } from "./hibridoScope.ts";
import { isOrdenacaoGestaoDefault, ordenarProdutosGestaoDefault } from "./gestaoOrdering.ts";
import { filtrarProdutos } from "./gestaoFilters.ts";

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
    pendencia_loja: null,
    inventario_unidades: null,
    classificacao_prazo: p.classificacaoPrazo,
    curto_prazo: null,
    medio_prazo: null,
    longo_prazo: null,
    base_limpa: null,
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
  entry.produtos.push(...(chunk.data?.produtos ?? []));
  return null;
}

/**
 * Carrega gestão com cache por path. Chunks são baixados sequencialmente uma vez;
 * paginação subsequente reutiliza cache (sem re-download de 10k+ produtos).
 */
async function ensureGestaoProdutos(
  ctx: RupturaFiltrosProdutos,
  authCtx: PermissionContext | null,
): Promise<{ produtos: HibridoProdutoGestao[]; erro: HybridServiceError | null }> {
  const scopeErr = assertEscopoHibrido(authCtx, ctx);
  if (scopeErr) return { produtos: [], erro: scopeErr };

  const bandeira = ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const { manifest, erro: mErr } = await carregarManifest({
    regional: ctx.regional,
    bandeira,
    dataReferencia: ctx.dataReferencia,
  });
  if (mErr) return { produtos: [], erro: mErr };

  const paths = lojaPathsFromManifest(manifest!, ctx.loja);
  if (!paths) return { produtos: [], erro: { code: "not_published", message: "Gestão não publicada." } };

  const cacheKey = paths.gestao;
  let entry = gestaoCache.get(cacheKey);

  if (!entry) {
    const { data, erro } = await downloadStorageJson<GestaoJson>(paths.gestao);
    if (erro) return { produtos: [], erro };

    entry = {
      meta: data!,
      gestaoPath: paths.gestao,
      chunksLoaded: new Set(),
      produtos: (data!.produtos ?? []) as HibridoProdutoGestao[],
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

export async function consultarProdutosPaginadosHibrido(input: {
  filtros: RupturaFiltrosProdutos;
  pagina: number;
  tamanho: number;
  authCtx: PermissionContext | null;
  ordenacao?: { coluna: string; direcao: "asc" | "desc" };
}): Promise<{ dados: RupturaProdutoLoja[]; total: number; erro: HybridServiceError | null }> {
  const { produtos, erro } = await ensureGestaoProdutos(input.filtros, input.authCtx);
  if (erro) return { dados: [], total: 0, erro };

  const filtrados = filtrarProdutos(produtos, input.filtros);
  const ordenados = ordenarProdutos(filtrados, input.ordenacao);

  const offset = Math.max(0, input.pagina - 1) * input.tamanho;
  const page = ordenados.slice(offset, offset + input.tamanho);

  return {
    dados: page.map((p) => mapProduto(p, input.filtros)),
    total: ordenados.length,
    erro: null,
  };
}

export const EXPORT_HIBRIDO_DISABLED =
  "Download privado via Drive será liberado na próxima etapa. Exportação CSV/XLSX indisponível no modo híbrido.";
