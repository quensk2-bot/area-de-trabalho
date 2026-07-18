import { createHash } from "node:crypto";
import type { RpcCdJson, RpcProdutoJson } from "../persistenciaRpcPayload.ts";
import { mapearCdParaRpcJson, mapearProdutoParaRpcJson } from "../persistenciaRpcPayload.ts";

export function hashDeterministicoJson(valor: unknown): string {
  const json = JSON.stringify(valor);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

export function hashPacoteLote(produtos: RpcProdutoJson[], cds: RpcCdJson[]): string {
  return hashDeterministicoJson({ produtos, cds });
}

export function hashChunkPayload(produtos: RpcProdutoJson[], cds: RpcCdJson[]): string {
  return hashDeterministicoJson({ produtos, cds });
}

export function mapearChunkParaRpc(produtos: Parameters<typeof mapearProdutoParaRpcJson>[0][], cds: Parameters<typeof mapearCdParaRpcJson>[0][]): {
  produtos: RpcProdutoJson[];
  cds: RpcCdJson[];
} {
  return {
    produtos: produtos.map(mapearProdutoParaRpcJson),
    cds: cds.map(mapearCdParaRpcJson),
  };
}

export function estimarBytesPayload(produtos: RpcProdutoJson[], cds: RpcCdJson[]): number {
  return Buffer.byteLength(JSON.stringify({ produtos, cds }), "utf8");
}
