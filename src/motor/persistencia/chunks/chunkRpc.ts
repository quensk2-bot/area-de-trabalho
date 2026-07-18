import type { MotorV7Db } from "../persistenciaTypes.ts";
import { mapearChunkParaRpc } from "./chunkHasher.ts";
import type { ChunkPlanejado } from "./chunkTypes.ts";

export async function rpcIniciarExecucaoChunk(
  db: MotorV7Db,
  input: {
    regional: string;
    dataReferencia: string;
    hashPacote: string;
    quantidadeProdutosEsperada: number;
    quantidadeCdsEsperada: number;
    totalChunks: number;
    quantidadeArquivos?: number;
  },
): Promise<Record<string, unknown>> {
  const { data, error } = await db.rpc("iniciar_execucao_motor_chunk_v1", {
    p_regional: input.regional,
    p_data_referencia: input.dataReferencia,
    p_hash_pacote: input.hashPacote,
    p_quantidade_produtos_esperada: input.quantidadeProdutosEsperada,
    p_quantidade_cds_esperada: input.quantidadeCdsEsperada,
    p_total_chunks: input.totalChunks,
    p_quantidade_arquivos: input.quantidadeArquivos ?? 0,
  });
  if (error) throw new Error(`iniciar_execucao_motor_chunk_v1: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function rpcPersistirChunk(
  db: MotorV7Db,
  execucaoId: string,
  chunk: ChunkPlanejado,
): Promise<Record<string, unknown>> {
  const rpc = mapearChunkParaRpc(chunk.produtos, chunk.cds);
  const { data, error } = await db.rpc("persistir_lote_motor_chunk_v1", {
    p_execucao_motor_id: execucaoId,
    p_numero_chunk: chunk.numeroChunk,
    p_hash_chunk: chunk.hashChunk,
    p_produtos: rpc.produtos,
    p_cds: rpc.cds,
  });
  if (error) throw new Error(`persistir_lote_motor_chunk_v1 chunk ${chunk.numeroChunk}: ${error.message}`);
  const payload = data as Record<string, unknown>;
  if (payload.status === "chunk_falhou") {
    throw new Error(`persistir_lote_motor_chunk_v1 chunk ${chunk.numeroChunk}: ${String(payload.erro ?? "falha")}`);
  }
  return payload;
}

export async function rpcFinalizarExecucaoChunk(
  db: MotorV7Db,
  execucaoId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await db.rpc("finalizar_execucao_motor_v1", {
    p_execucao_motor_id: execucaoId,
  });
  if (error) throw new Error(`finalizar_execucao_motor_v1: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function rpcCancelarExecucaoChunk(
  db: MotorV7Db,
  execucaoId: string,
  motivo?: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await db.rpc("cancelar_execucao_motor_v1", {
    p_execucao_motor_id: execucaoId,
    p_motivo: motivo ?? null,
  });
  if (error) throw new Error(`cancelar_execucao_motor_v1: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function listarChunksConcluidos(
  db: MotorV7Db,
  execucaoId: string,
): Promise<number[]> {
  const { data, error } = await db
    .from("execucao_motor_chunk")
    .select("numero_chunk, status, hash_chunk")
    .eq("execucao_motor_id", execucaoId)
    .eq("status", "concluido");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { numero_chunk: number }) => r.numero_chunk);
}
