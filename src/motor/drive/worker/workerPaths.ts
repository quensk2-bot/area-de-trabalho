import fs from "node:fs";
import path from "node:path";
import { getMotorTmpDir } from "../../utils/tempOutput.ts";

const WORKER_BASE = path.join(getMotorTmpDir(), "worker");

const INVALID_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export function sanitizarNomeArquivo(nome: string): string {
  const base = path.basename(nome).replace(INVALID_CHARS, "_").replace(/\.+/g, ".").trim();
  if (!base || base === "." || base === "..") return "arquivo";
  return base.slice(0, 200);
}

export function resolverCaminhoSeguro(baseDir: string, nomeArquivo: string): string {
  const safeName = sanitizarNomeArquivo(nomeArquivo);
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(resolvedBase, safeName);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error(`Path traversal bloqueado: ${nomeArquivo}`);
  }
  return resolved;
}

export function diretorioPacoteWorker(pacoteId: string): string {
  return path.join(WORKER_BASE, pacoteId);
}

export function diretorioOriginais(pacoteId: string): string {
  return path.join(diretorioPacoteWorker(pacoteId), "originais");
}

export function diretorioPadronizados(pacoteId: string): string {
  return path.join(diretorioPacoteWorker(pacoteId), "padronizados");
}

export function caminhoWorkerJson(pacoteId: string): string {
  return path.join(diretorioPacoteWorker(pacoteId), "worker.json");
}

export function caminhoPart(caminhoFinal: string): string {
  return `${caminhoFinal}.part`;
}

export function garantirDiretoriosPacote(pacoteId: string): {
  base: string;
  originais: string;
  padronizados: string;
} {
  const base = diretorioPacoteWorker(pacoteId);
  const originais = diretorioOriginais(pacoteId);
  const padronizados = diretorioPadronizados(pacoteId);
  for (const dir of [base, originais, padronizados]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  return { base, originais, padronizados };
}

export function removerDiretorioPacote(pacoteId: string): void {
  const dir = diretorioPacoteWorker(pacoteId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

export { WORKER_BASE };
