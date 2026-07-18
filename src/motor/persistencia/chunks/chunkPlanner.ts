import type { DmLote } from "../../datamart/dmTypes.ts";
import { chaveProdutoTemporaria } from "../persistenciaRpcPayload.ts";
import { estimarBytesPayload, hashChunkPayload, mapearChunkParaRpc } from "./chunkHasher.ts";
import type { ChunkPlanejado } from "./chunkTypes.ts";
import { CHUNK_LIMITE_BYTES_PADRAO, CHUNK_TAMANHO_PADRAO } from "./chunkTypes.ts";

function ordenarProdutos(lote: DmLote): DmLote["produtos"] {
  return [...lote.produtos].sort((a, b) => a.loja - b.loja || a.seqproduto - b.seqproduto);
}

function cdsDoProduto(lote: DmLote, produto: DmLote["produtos"][number]): DmLote["cds"] {
  const chave = chaveProdutoTemporaria(produto.regional, produto.loja, produto.seqproduto);
  return lote.cds
    .filter((c) => chaveProdutoTemporaria(c.regional, c.loja, c.seqproduto) === chave)
    .sort((a, b) => a.posicaoLogica - b.posicaoLogica);
}

export type PlanejarChunksOpcoes = {
  tamanhoChunk?: number;
  limiteBytes?: number;
};

export function planejarChunks(lote: DmLote, opcoes: PlanejarChunksOpcoes = {}): ChunkPlanejado[] {
  let tamanhoChunk = opcoes.tamanhoChunk ?? CHUNK_TAMANHO_PADRAO;
  const limiteBytes = opcoes.limiteBytes ?? CHUNK_LIMITE_BYTES_PADRAO;
  const produtos = ordenarProdutos(lote);
  const chunks: ChunkPlanejado[] = [];
  let bufferProdutos: DmLote["produtos"] = [];
  let bufferCds: DmLote["cds"] = [];

  const flush = (): void => {
    if (bufferProdutos.length === 0) return;
    const rpc = mapearChunkParaRpc(bufferProdutos, bufferCds);
    chunks.push({
      numeroChunk: chunks.length + 1,
      produtos: [...bufferProdutos],
      cds: [...bufferCds],
      hashChunk: hashChunkPayload(rpc.produtos, rpc.cds),
      tamanhoBytesAprox: estimarBytesPayload(rpc.produtos, rpc.cds),
    });
    bufferProdutos = [];
    bufferCds = [];
  };

  for (const produto of produtos) {
    const filhos = cdsDoProduto(lote, produto);
    const candidatoProdutos = [...bufferProdutos, produto];
    const candidatoCds = [...bufferCds, ...filhos];
    const rpc = mapearChunkParaRpc(candidatoProdutos, candidatoCds);
    const bytes = estimarBytesPayload(rpc.produtos, rpc.cds);

    if (
      bufferProdutos.length > 0 &&
      (candidatoProdutos.length > tamanhoChunk || bytes > limiteBytes)
    ) {
      flush();
      const solo = mapearChunkParaRpc([produto], filhos);
      const soloBytes = estimarBytesPayload(solo.produtos, solo.cds);
      if (soloBytes > limiteBytes && tamanhoChunk > 1) {
        tamanhoChunk = Math.max(1, Math.floor(tamanhoChunk / 2));
      }
      bufferProdutos = [produto];
      bufferCds = [...filhos];
    } else {
      bufferProdutos = candidatoProdutos;
      bufferCds = candidatoCds;
    }

    if (bufferProdutos.length >= tamanhoChunk) {
      flush();
    }
  }

  flush();
  return chunks;
}

export function totalizarChunks(chunks: ChunkPlanejado[]): { produtos: number; cds: number } {
  return {
    produtos: chunks.reduce((s, c) => s + c.produtos.length, 0),
    cds: chunks.reduce((s, c) => s + c.cds.length, 0),
  };
}
