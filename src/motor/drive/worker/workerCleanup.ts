import fs from "node:fs";
import { caminhoPart, removerDiretorioPacote } from "./workerPaths.ts";

export function limparArquivoPart(caminhoFinal: string): void {
  const part = caminhoPart(caminhoFinal);
  if (fs.existsSync(part)) fs.unlinkSync(part);
}

export function limparPacoteWorker(pacoteId: string, keepFiles: boolean): void {
  if (keepFiles) return;
  removerDiretorioPacote(pacoteId);
}

export function removerPartsOrfaos(diretorio: string): number {
  if (!fs.existsSync(diretorio)) return 0;
  let removidos = 0;
  for (const nome of fs.readdirSync(diretorio)) {
    if (nome.endsWith(".part")) {
      fs.unlinkSync(`${diretorio}/${nome}`);
      removidos++;
    }
  }
  return removidos;
}
