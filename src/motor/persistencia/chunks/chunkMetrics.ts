import type { ChunkPlanejado } from "./chunkTypes.ts";

export type ChunkMetricas = {
  totalChunks: number;
  produtosTotal: number;
  cdsTotal: number;
  bytesTotalAprox: number;
  duracaoMs: number;
  retries: number;
};

export function calcularMetricasChunks(
  chunks: ChunkPlanejado[],
  duracaoMs: number,
  retries = 0,
): ChunkMetricas {
  return {
    totalChunks: chunks.length,
    produtosTotal: chunks.reduce((s, c) => s + c.produtos.length, 0),
    cdsTotal: chunks.reduce((s, c) => s + c.cds.length, 0),
    bytesTotalAprox: chunks.reduce((s, c) => s + c.tamanhoBytesAprox, 0),
    duracaoMs,
    retries,
  };
}
