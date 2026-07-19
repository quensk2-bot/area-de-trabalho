import { createHash } from "node:crypto";
import fs from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { calcularHashMetadadosPacoteFromLinhas, sha256HexSync } from "../hashMetadadosPacote.ts";
import type { WorkerArquivoDb } from "./workerTypes.ts";

export class HashCountTransform extends Transform {
  readonly hash = createHash("sha256");
  bytes = 0;

  _transform(chunk: Buffer, _enc: BufferEncoding, cb: (error?: Error | null) => void): void {
    this.hash.update(chunk);
    this.bytes += chunk.length;
    cb(null, chunk);
  }
}

export function hashSha256HexFromStreamResult(transform: HashCountTransform): string {
  return transform.hash.digest("hex");
}

export async function calcularHashArquivoStreaming(caminho: string): Promise<{ sha256: string; bytes: number }> {
  const transform = new HashCountTransform();
  await pipeline(fs.createReadStream(caminho), transform);
  return { sha256: hashSha256HexFromStreamResult(transform), bytes: transform.bytes };
}

const CATEGORIA_ORDEM: Record<string, number> = { pequeno: 1, medio: 2, grande: 3 };

export function ordenarArquivosDownload<T extends Pick<WorkerArquivoDb, "ordem_processamento" | "categoria_tamanho" | "nome_original">>(
  arquivos: T[],
): T[] {
  return [...arquivos].sort((a, b) => {
    const ordA = a.ordem_processamento ?? 999;
    const ordB = b.ordem_processamento ?? 999;
    if (ordA !== ordB) return ordA - ordB;
    const catA = CATEGORIA_ORDEM[a.categoria_tamanho ?? "pequeno"] ?? 9;
    const catB = CATEGORIA_ORDEM[b.categoria_tamanho ?? "pequeno"] ?? 9;
    if (catA !== catB) return catA - catB;
    return a.nome_original.localeCompare(b.nome_original, "pt-BR");
  });
}

export function calcularHashConteudoPacote(
  arquivos: Array<{
    tipo_arquivo: string | null;
    sha256: string | null;
    tamanho_baixado_bytes: number | null;
    ordem_processamento: number | null;
  }>,
): string {
  const ordenados = [...arquivos].sort((a, b) => {
    const ordA = a.ordem_processamento ?? 999;
    const ordB = b.ordem_processamento ?? 999;
    if (ordA !== ordB) return ordA - ordB;
    return String(a.tipo_arquivo ?? "").localeCompare(String(b.tipo_arquivo ?? ""), "pt-BR");
  });
  const linhas = ordenados.map(
    (a) =>
      `${a.tipo_arquivo ?? ""}|${a.sha256 ?? ""}|${a.tamanho_baixado_bytes ?? 0}|${a.ordem_processamento ?? 0}`,
  );
  return calcularHashMetadadosPacoteFromLinhas(linhas);
}

export function hashReduzido(hash: string | null | undefined): string {
  if (!hash) return "";
  return hash.slice(0, 6).toUpperCase();
}

export { sha256HexSync };
