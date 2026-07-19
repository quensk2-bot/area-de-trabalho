import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import type { drive_v3 } from "googleapis";
import { HashCountTransform, hashSha256HexFromStreamResult } from "./workerHash.ts";
import { caminhoPart } from "./workerPaths.ts";

export type DownloadProgresso = {
  bytesBaixados: number;
  tamanhoEsperado: number | null;
};

export type DownloadResultado = {
  ok: boolean;
  caminhoFinal: string;
  sha256: string;
  bytes: number;
  erro?: string;
};

export type DownloadOpcoes = {
  driveFileId: string;
  caminhoFinal: string;
  tamanhoEsperado: number | null;
  drive: drive_v3.Drive;
  signal?: AbortSignal;
  onProgress?: (p: DownloadProgresso) => void;
  maxRetries?: number;
  retryBaseMs?: number;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("Download cancelado"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("Download cancelado"));
      },
      { once: true },
    );
  });
}

async function downloadOnce(opts: DownloadOpcoes): Promise<DownloadResultado> {
  const partPath = caminhoPart(opts.caminhoFinal);
  if (fs.existsSync(partPath)) fs.unlinkSync(partPath);

  const dir = opts.caminhoFinal.replace(/[/\\][^/\\]+$/, "");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const res = await opts.drive.files.get(
    { fileId: opts.driveFileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream", signal: opts.signal },
  );

  const hashTransform = new HashCountTransform();
  const writable = fs.createWriteStream(partPath);

  hashTransform.on("data", () => {
    opts.onProgress?.({
      bytesBaixados: hashTransform.bytes,
      tamanhoEsperado: opts.tamanhoEsperado,
    });
  });

  try {
    await pipeline(res.data as NodeJS.ReadableStream, hashTransform, writable, { signal: opts.signal });
  } catch (err) {
    writable.destroy();
    if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
    throw err;
  }

  const bytes = hashTransform.bytes;
  const sha256 = hashSha256HexFromStreamResult(hashTransform);

  if (opts.tamanhoEsperado != null && bytes !== opts.tamanhoEsperado) {
    if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
    return {
      ok: false,
      caminhoFinal: opts.caminhoFinal,
      sha256,
      bytes,
      erro: `Tamanho divergente: esperado ${opts.tamanhoEsperado}, obtido ${bytes}`,
    };
  }

  fs.renameSync(partPath, opts.caminhoFinal);
  return { ok: true, caminhoFinal: opts.caminhoFinal, sha256, bytes };
}

export async function workerDownloadFile(opts: DownloadOpcoes): Promise<DownloadResultado> {
  const maxRetries = opts.maxRetries ?? 3;
  const retryBaseMs = opts.retryBaseMs ?? 500;
  let lastError = "Falha desconhecida";

  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    try {
      const result = await downloadOnce(opts);
      if (result.ok) return result;
      lastError = result.erro ?? "Download inválido";
      if (result.erro?.includes("Tamanho divergente")) return result;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const partPath = caminhoPart(opts.caminhoFinal);
      if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
      if (opts.signal?.aborted) {
        return { ok: false, caminhoFinal: opts.caminhoFinal, sha256: "", bytes: 0, erro: lastError };
      }
    }

    if (tentativa < maxRetries - 1) {
      const backoff = retryBaseMs * 2 ** tentativa;
      await sleep(backoff, opts.signal);
    }
  }

  return { ok: false, caminhoFinal: opts.caminhoFinal, sha256: "", bytes: 0, erro: lastError };
}
