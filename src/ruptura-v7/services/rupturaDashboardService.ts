import type { RupturaDashboardFornecedor, RupturaDashboardLoja, RupturaDashboardSetor } from "../types/rupturaDashboardTypes.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import type { RupturaCdEstoqueAgregado } from "../types/rupturaDashboardTypes.ts";
import type { RupturaProdutoCd } from "../types/rupturaCdTypes.ts";
import { consumoDb, mapSupabaseError } from "./rupturaDb.ts";

export async function consultarDashboardLoja(
  ctx: RupturaFiltrosContexto,
): Promise<{ dado: RupturaDashboardLoja | null; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_dashboard_loja")
    .select("*")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .eq("loja", ctx.loja)
    .maybeSingle();

  return { dado: (data as RupturaDashboardLoja | null) ?? null, erro: mapSupabaseError(error) };
}

export async function consultarDashboardSetores(
  ctx: RupturaFiltrosContexto,
): Promise<{ dados: RupturaDashboardSetor[]; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_dashboard_setor")
    .select("*")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .eq("loja", ctx.loja)
    .order("total_ruptura", { ascending: false });

  return { dados: (data ?? []) as RupturaDashboardSetor[], erro: mapSupabaseError(error) };
}

export async function consultarDashboardFornecedores(
  ctx: RupturaFiltrosContexto,
  limite = 10,
): Promise<{ dados: RupturaDashboardFornecedor[]; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_dashboard_fornecedor")
    .select("*")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .eq("loja", ctx.loja)
    .order("total_ruptura", { ascending: false })
    .limit(limite);

  return { dados: (data ?? []) as RupturaDashboardFornecedor[], erro: mapSupabaseError(error) };
}

export async function consultarCompradoresTop(
  ctx: RupturaFiltrosContexto,
  limite = 10,
): Promise<{ dados: { comprador: string; total_ruptura: number }[]; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_dashboard_fornecedor")
    .select("comprador, total_ruptura")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .eq("loja", ctx.loja);

  if (error) return { dados: [], erro: mapSupabaseError(error) };

  const map = new Map<string, number>();
  for (const row of (data ?? []) as { comprador: string | null; total_ruptura: number }[]) {
    const key = row.comprador ?? "(sem comprador)";
    map.set(key, (map.get(key) ?? 0) + (row.total_ruptura ?? 0));
  }

  const dados = [...map.entries()]
    .map(([comprador, total_ruptura]) => ({ comprador, total_ruptura }))
    .sort((a, b) => b.total_ruptura - a.total_ruptura)
    .slice(0, limite);

  return { dados, erro: null };
}

/** regra_de_consumo: agrega estoque por codigo CD fisico no cliente a partir da View de CDs (nao flat CD1..5). */
export async function consultarEstoquePorCd(
  ctx: RupturaFiltrosContexto,
): Promise<{ dados: RupturaCdEstoqueAgregado[]; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_produto_loja_cd")
    .select("codigo_cd_fisico, posicao_logica, estoque")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .eq("loja", ctx.loja);

  if (error) return { dados: [], erro: mapSupabaseError(error) };

  const map = new Map<string, RupturaCdEstoqueAgregado>();
  for (const row of (data ?? []) as Pick<RupturaProdutoCd, "codigo_cd_fisico" | "posicao_logica" | "estoque">[]) {
    const key = `${row.codigo_cd_fisico ?? "null"}:${row.posicao_logica}`;
    const prev = map.get(key) ?? {
      codigo_cd_fisico: row.codigo_cd_fisico,
      posicao_logica: row.posicao_logica,
      total_estoque: 0,
      total_produtos: 0,
    };
    prev.total_estoque += Number(row.estoque ?? 0);
    prev.total_produtos += 1;
    map.set(key, prev);
  }

  const dados = [...map.values()].sort((a, b) => a.posicao_logica - b.posicao_logica);
  return { dados, erro: null };
}

export async function consultarExecucaoAtiva(
  ctx: Pick<RupturaFiltrosContexto, "regional" | "dataReferencia">,
) {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_execucao_ativa")
    .select("*")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .maybeSingle();

  return { dado: data, erro: mapSupabaseError(error) };
}
