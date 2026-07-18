import type { RupturaProdutoCd } from "../types/rupturaCdTypes.ts";
import { consumoDb, mapSupabaseError } from "./rupturaDb.ts";

export async function consultarCdsProduto(input: {
  regional: string;
  dataReferencia: string;
  loja: number;
  seqproduto: number;
}): Promise<{ dados: RupturaProdutoCd[]; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_produto_loja_cd")
    .select("*")
    .eq("regional", input.regional)
    .eq("data_referencia", input.dataReferencia)
    .eq("loja", input.loja)
    .eq("seqproduto", input.seqproduto)
    .order("posicao_logica", { ascending: true });

  return { dados: (data ?? []) as RupturaProdutoCd[], erro: mapSupabaseError(error) };
}
