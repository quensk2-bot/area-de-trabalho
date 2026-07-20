import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import type {
  RupturaOficialHierarquia,
  RupturaOficialLoja,
  UniversoLeituraOficial,
} from "../types/rupturaOficialTypes.ts";
import { consumoDb, mapSupabaseError } from "./rupturaDb.ts";

type QueryResult<T> = { dado?: T; dados?: T[]; erro: ReturnType<typeof mapSupabaseError> };

function ctxFilters(ctx: RupturaFiltrosContexto) {
  return {
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: ctx.loja,
  };
}

export async function consultarOficialLoja(
  ctx: RupturaFiltrosContexto,
  universo: UniversoLeituraOficial,
): Promise<QueryResult<RupturaOficialLoja>> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_oficial_loja")
    .select("*")
    .match({ ...ctxFilters(ctx), universo_leitura: universo })
    .maybeSingle();

  return { dado: data as RupturaOficialLoja | undefined, erro: mapSupabaseError(error) };
}

export async function consultarOficialDivisoes(
  ctx: RupturaFiltrosContexto,
): Promise<QueryResult<RupturaOficialHierarquia>> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_oficial_divisao")
    .select("*")
    .match(ctxFilters(ctx))
    .order("setor");

  return { dados: (data ?? []) as RupturaOficialHierarquia[], erro: mapSupabaseError(error) };
}

export async function consultarOficialSetores(
  ctx: RupturaFiltrosContexto,
  setor?: string,
): Promise<QueryResult<RupturaOficialHierarquia>> {
  let query = consumoDb().from("vw_ruptura_oficial_setor").select("*").match(ctxFilters(ctx)).order("setor2");
  if (setor) query = query.eq("setor", setor);
  const { data, error } = await query;
  return { dados: (data ?? []) as RupturaOficialHierarquia[], erro: mapSupabaseError(error) };
}

export async function consultarOficialCategorias(
  ctx: RupturaFiltrosContexto,
  setor: string,
  setor2: string,
): Promise<QueryResult<RupturaOficialHierarquia>> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_base_oficial")
    .select(
      "regional,data_referencia,loja,setor,setor2,categoria,versao,menor_que_tres_unidades,curto_prazo,cross_docking,medio_prazo,longo_prazo,dias_pedido,ruptura_inventario,ruptura_sem_inventario,itens_vda_pendencia,rup_sem_pendencia_vda",
    )
    .match({ ...ctxFilters(ctx), setor, setor2 })
    .eq("universo_oficial_elegivel", true);

  if (error) return { dados: [], erro: mapSupabaseError(error) };

  const map = new Map<string, RupturaOficialHierarquia>();
  for (const row of data ?? []) {
    const cat = String(row.categoria ?? "—");
    const cur = map.get(cat) ?? {
      regional: row.regional,
      data_referencia: row.data_referencia,
      loja: row.loja,
      setor: row.setor,
      setor2: row.setor2,
      categoria: cat,
      versao: row.versao,
      total_skus: 0,
      total_ruptura: 0,
      pct_ruptura: null,
      total_curto_prazo: 0,
      total_itens_cross: 0,
      havia_estoque_no_cd: null,
      recebimento_proximo: null,
      media_dias_recebimento_cd: null,
      pct_curto_prazo: null,
      total_medio_prazo: 0,
      pedido_maior_30_dias: 0,
      pedido_maior_60_dias: 0,
      media_dias_pedido: null,
      pct_medio_prazo: null,
      total_longo_prazo: 0,
      ruptura_sem_pedido_periodo: null,
      dias_ultimo_pedido_loja: null,
      pct_longo_prazo: null,
      itens_ruptura_via_inventario: 0,
      pct_impacto_inventario: null,
      pct_ruptura_sem_inventario: null,
      itens_vda_pendencia: 0,
      pct_rup_sem_pendencia_vda: null,
    };
    cur.total_skus += 1;
    cur.total_ruptura += Number(row.menor_que_tres_unidades ?? 0);
    cur.total_curto_prazo += Number(row.curto_prazo ?? 0);
    cur.total_itens_cross += Number(row.cross_docking ?? 0);
    cur.total_medio_prazo += Number(row.medio_prazo ?? 0);
    cur.total_longo_prazo += Number(row.longo_prazo ?? 0);
    if (Number(row.medio_prazo) === 1 && Number(row.dias_pedido ?? 0) > 30) cur.pedido_maior_30_dias += 1;
    if (Number(row.medio_prazo) === 1 && Number(row.dias_pedido ?? 0) > 59) cur.pedido_maior_60_dias += 1;
    cur.itens_ruptura_via_inventario += Number(row.ruptura_inventario ?? 0);
    cur.itens_vda_pendencia += Number(row.itens_vda_pendencia ?? 0);
    map.set(cat, cur);
  }

  const dados = Array.from(map.values()).map((a) => ({
    ...a,
    pct_ruptura: a.total_skus ? Math.round((a.total_ruptura / a.total_skus) * 10000) / 100 : null,
    pct_curto_prazo: a.total_ruptura ? Math.round((a.total_curto_prazo / a.total_ruptura) * 10000) / 100 : null,
    pct_medio_prazo: a.total_ruptura ? Math.round((a.total_medio_prazo / a.total_ruptura) * 10000) / 100 : null,
    pct_longo_prazo: a.total_ruptura ? Math.round((a.total_longo_prazo / a.total_ruptura) * 10000) / 100 : null,
    pct_impacto_inventario: a.total_skus ? Math.round((a.itens_ruptura_via_inventario / a.total_skus) * 10000) / 100 : null,
    pct_ruptura_sem_inventario: a.total_skus
      ? Math.round(((a.total_ruptura - a.itens_ruptura_via_inventario) / a.total_skus) * 10000) / 100
      : null,
    pct_rup_sem_pendencia_vda: a.total_skus
      ? Math.round(((a.total_ruptura - a.itens_vda_pendencia) / a.total_skus) * 10000) / 100
      : null,
  }));

  return { dados, erro: null };
}
