export type {
  ChunkPlanejado,
  ChunkProgresso,
  ChunkProgressoCallback,
  ChunkProgressoEtapa,
  PersistirLoteChunkedEntrada,
  PersistirLoteChunkedResultado,
} from "./chunkTypes.ts";
export { CHUNK_TAMANHO_PADRAO, CHUNK_LIMITE_BYTES_PADRAO } from "./chunkTypes.ts";

export { planejarChunks, totalizarChunks } from "./chunkPlanner.ts";
export { hashChunkPayload, hashPacoteLote, estimarBytesPayload, mapearChunkParaRpc } from "./chunkHasher.ts";
export { calcularMetricasChunks } from "./chunkMetrics.ts";
export { criarProgressoInicial, atualizarProgresso, emitirProgresso } from "./chunkProgress.ts";

export { rpcIniciarExecucaoChunk, rpcPersistirChunk, listarChunksConcluidos, rpcFinalizarExecucaoChunk, rpcCancelarExecucaoChunk } from "./chunkRpc.ts";

export {
  persistirLoteMotorChunked,
  type PersistirLoteChunkedOpcoes,
} from "./persistirLoteMotorChunked.ts";

export const PERSISTENCIA_CHUNKED_USA_RPC = true as const;
