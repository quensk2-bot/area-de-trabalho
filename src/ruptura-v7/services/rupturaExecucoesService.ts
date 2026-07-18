import type { RupturaExecucao } from "../types/rupturaExecucaoTypes.ts";
import { consumoDb, mapSupabaseError } from "./rupturaDb.ts";

export async function consultarExecucoes(filtros?: {
  regional?: string;
  dataReferencia?: string;
}): Promise<{ dados: RupturaExecucao[]; erro: { message: string } | null }> {
  let query = consumoDb()
    .from("vw_ruptura_execucoes")
    .select("*")
    .order("data_referencia", { ascending: false })
    .order("versao", { ascending: false });

  if (filtros?.regional) query = query.eq("regional", filtros.regional);
  if (filtros?.dataReferencia) query = query.eq("data_referencia", filtros.dataReferencia);

  const { data, error } = await query.limit(100);
  return { dados: (data ?? []) as RupturaExecucao[], erro: mapSupabaseError(error) };
}

export async function consultarExecucaoPorId(
  execucaoId: string,
): Promise<{ dado: RupturaExecucao | null; erro: { message: string } | null }> {
  const { data, error } = await consumoDb()
    .from("vw_ruptura_execucoes")
    .select("*")
    .eq("execucao_id", execucaoId)
    .maybeSingle();

  return { dado: (data as RupturaExecucao | null) ?? null, erro: mapSupabaseError(error) };
}
