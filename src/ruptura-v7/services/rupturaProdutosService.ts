import type { RupturaFiltrosProdutos } from "../types/rupturaFiltrosTypes.ts";
import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import { consumoDb, mapSupabaseError } from "./rupturaDb.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aplicarFiltrosProdutoQuery(query: any, filtros: RupturaFiltrosProdutos): any {
  let q = query
    .eq("regional", filtros.regional)
    .eq("data_referencia", filtros.dataReferencia)
    .eq("loja", filtros.loja);

  if (filtros.bandeira) q = q.eq("bandeira", filtros.bandeira);
  if (filtros.divisao) q = q.eq("divisao", filtros.divisao);
  if (filtros.setor) q = q.eq("setor_n2", filtros.setor);
  if (filtros.grupo) q = q.eq("grupo_n3", filtros.grupo);
  if (filtros.rede) q = q.eq("rede", filtros.rede);
  if (filtros.comprador) q = q.eq("comprador", filtros.comprador);
  if (filtros.statusOperacional) q = q.eq("status_operacional", filtros.statusOperacional);
  if (filtros.codigoCd != null) q = q.eq("codigo_cd_selecionado", filtros.codigoCd);

  if (filtros.fornecedor) {
    q = q.or(`razao_fornecedor.ilike.%${filtros.fornecedor}%,cod_fornecedor.eq.${Number.isFinite(Number(filtros.fornecedor)) ? filtros.fornecedor : -1}`);
  }

  if (filtros.classificacao) {
    const vals = Array.isArray(filtros.classificacao) ? filtros.classificacao : [filtros.classificacao];
    q = q.in("classificacao_prazo", vals);
  }

  if (filtros.qualidade) {
    const vals = Array.isArray(filtros.qualidade) ? filtros.qualidade : [filtros.qualidade];
    q = q.in("qualidade_dados", vals);
  }

  if (filtros.possuiEstoqueCd === true) q = q.gt("soma_estoque_cd", 0);
  if (filtros.possuiEstoqueCd === false) q = q.or("soma_estoque_cd.is.null,soma_estoque_cd.lte.0");

  if (filtros.possuiPendencia === true) q = q.gt("pendencia_cpa_cd", 0);
  if (filtros.possuiPendencia === false) q = q.or("pendencia_cpa_cd.is.null,pendencia_cpa_cd.lte.0");

  if (filtros.centralizado === true) q = q.gt("produto_centralizado", 0);
  if (filtros.centralizado === false) q = q.or("produto_centralizado.is.null,produto_centralizado.lte.0");

  if (filtros.busca && filtros.busca.length >= 2) {
    const term = filtros.busca.trim();
    const asNum = Number(term);
    if (Number.isFinite(asNum) && String(asNum) === term) {
      q = q.or(`seqproduto.eq.${asNum},descricao.ilike.%${term}%`);
    } else {
      q = q.ilike("descricao", `%${term}%`);
    }
  }

  return q;
}

export type ProdutosConsultaResultado = {
  dados: RupturaProdutoLoja[];
  total: number;
  erro: { message: string; code?: string } | null;
};

export async function consultarProdutosPaginados(input: {
  filtros: RupturaFiltrosProdutos;
  pagina: number;
  tamanho: number;
  ordenacao?: { coluna: string; direcao: "asc" | "desc" };
  signal?: AbortSignal;
}): Promise<ProdutosConsultaResultado> {
  const offset = Math.max(0, input.pagina - 1) * input.tamanho;
  const limite = Math.min(Math.max(1, input.tamanho), 500);

  let query = consumoDb()
    .from("vw_ruptura_produto_loja")
    .select("*", { count: "exact" });

  query = aplicarFiltrosProdutoQuery(query, input.filtros);

  const coluna = input.ordenacao?.coluna ?? "descricao";
  const asc = input.ordenacao?.direcao !== "desc";
  query = query.order(coluna, { ascending: asc }).range(offset, offset + limite - 1);

  const built = input.signal ? query.abortSignal(input.signal) : query;
  const { data, error, count } = await built;

  return {
    dados: (data ?? []) as RupturaProdutoLoja[],
    total: count ?? 0,
    erro: mapSupabaseError(error),
  };
}

export async function consultarProdutoDetalhe(input: {
  regional: string;
  dataReferencia: string;
  loja: number;
  seqproduto: number;
}): Promise<{ dado: RupturaProdutoLoja | null; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_produto_loja")
    .select("*")
    .eq("regional", input.regional)
    .eq("data_referencia", input.dataReferencia)
    .eq("loja", input.loja)
    .eq("seqproduto", input.seqproduto)
    .maybeSingle();

  return { dado: (data as RupturaProdutoLoja | null) ?? null, erro: mapSupabaseError(error) };
}

export async function consultarProdutosLote(input: {
  filtros: RupturaFiltrosProdutos;
  offset: number;
  limite: number;
}): Promise<{ dados: RupturaProdutoLoja[]; erro: { message: string } | null }> {
  let query = consumoDb().from("vw_ruptura_produto_loja").select("*");
  query = aplicarFiltrosProdutoQuery(query, input.filtros);
  query = query.order("seqproduto", { ascending: true }).range(input.offset, input.offset + input.limite - 1);

  const { data, error } = await query;
  return { dados: (data ?? []) as RupturaProdutoLoja[], erro: mapSupabaseError(error) };
}

export async function contarProdutosFiltrados(
  filtros: RupturaFiltrosProdutos,
): Promise<{ total: number; erro: { message: string } | null }> {
  let query = consumoDb().from("vw_ruptura_produto_loja").select("*", { count: "exact", head: true });
  query = aplicarFiltrosProdutoQuery(query, filtros);
  const { count, error } = await query;
  return { total: count ?? 0, erro: mapSupabaseError(error) };
}
