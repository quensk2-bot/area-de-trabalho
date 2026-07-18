import type { RupturaCentralAcao } from "../types/rupturaAcoesTypes.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { consumoDb, mapSupabaseError } from "./rupturaDb.ts";

export async function consultarCentralAcoes(
  ctx: RupturaFiltrosContexto,
): Promise<{ dados: RupturaCentralAcao[]; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_central_acoes")
    .select("*")
    .eq("regional", ctx.regional)
    .eq("data_referencia", ctx.dataReferencia)
    .eq("loja", ctx.loja)
    .order("prioridade", { ascending: true })
    .order("dias_pedido", { ascending: false, nullsFirst: false });

  return { dados: (data ?? []) as RupturaCentralAcao[], erro: mapSupabaseError(error) };
}
