import type { DmLote } from "../../datamart/dmTypes.ts";
import { chaveProdutoTemporaria } from "../persistenciaRpcPayload.ts";
import { estimarBytesPayload, hashChunkPayload, mapearChunkParaRpc } from "./chunkHasher.ts";
import type { ChunkPlanejado } from "./chunkTypes.ts";
import { CHUNK_LIMITE_BYTES_PADRAO, CHUNK_TAMANHO_PADRAO } from "./chunkTypes.ts";

export type PlanejarChunksOpcoes = {
  tamanhoChunk?: number;
  limiteBytes?: number;
};

function ordenarProdutos(lote: DmLote): DmLote["produtos"] {
  return [...lote.produtos].sort((a, b) => a.loja - b.loja || a.seqproduto - b.seqproduto);
}

function indexarCdsPorProduto(lote: DmLote): Map<string, DmLote["cds"]> {
  const map = new Map<string, DmLote["cds"]>();
  for (const cd of lote.cds) {
    const chave = chaveProdutoTemporaria(cd.regional, cd.loja, cd.seqproduto);
    const grupo = map.get(chave);
    if (grupo) grupo.push(cd);
    else map.set(chave, [cd]);
  }
  for (const grupo of map.values()) {
    grupo.sort((a, b) => a.posicaoLogica - b.posicaoLogica);
  }
  return map;
}

function montarChunk(
  numeroChunk: number,
  produtos: DmLote["produtos"],
  cds: DmLote["cds"],
): ChunkPlanejado {
  const rpc = mapearChunkParaRpc(produtos, cds);
  return {
    numeroChunk,
    produtos,
    cds,
    hashChunk: hashChunkPayload(rpc.produtos, rpc.cds),
    tamanhoBytesAprox: estimarBytesPayload(rpc.produtos, rpc.cds),
  };
}

/**
 * Planeja chunks O(n): indexa CDs uma vez, fatia produtos em lotes fixos,
 * serializa JSON apenas por chunk (não por produto).
 */
export function planejarChunks(lote: DmLote, opcoes: PlanejarChunksOpcoes = {}): ChunkPlanejado[] {
  const tamanhoChunk = opcoes.tamanhoChunk ?? CHUNK_TAMANHO_PADRAO;
  const limiteBytes = opcoes.limiteBytes ?? CHUNK_LIMITE_BYTES_PADRAO;
  const produtos = ordenarProdutos(lote);
  const cdsPorProduto = indexarCdsPorProduto(lote);
  const chunks: ChunkPlanejado[] = [];

  let bufferProdutos: DmLote["produtos"] = [];
  let bufferCds: DmLote["cds"] = [];

  const flush = (): void => {
    if (bufferProdutos.length === 0) return;
    chunks.push(montarChunk(chunks.length + 1, bufferProdutos, bufferCds));
    bufferProdutos = [];
    bufferCds = [];
  };

  for (const produto of produtos) {
    const filhos = cdsPorProduto.get(
      chaveProdutoTemporaria(produto.regional, produto.loja, produto.seqproduto),
    ) ?? [];

    bufferProdutos.push(produto);
    if (filhos.length > 0) bufferCds.push(...filhos);

    if (bufferProdutos.length >= tamanhoChunk) {
      const candidato = montarChunk(0, bufferProdutos, bufferCds);
      if (candidato.tamanhoBytesAprox > limiteBytes && bufferProdutos.length > 1) {
        const ultimo = bufferProdutos.pop()!;
        const ultimoFilhos =
          cdsPorProduto.get(
            chaveProdutoTemporaria(ultimo.regional, ultimo.loja, ultimo.seqproduto),
          ) ?? [];
        bufferCds = bufferCds.slice(0, bufferCds.length - ultimoFilhos.length);
        flush();
        bufferProdutos = [ultimo];
        bufferCds = [...ultimoFilhos];
      } else {
        flush();
      }
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
