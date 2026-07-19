import type { CategoriaTamanhoDrive } from "./catalogoArquivosMotor.ts";

const MB = 1024 * 1024;

export function classificarTamanhoArquivoDrive(tamanhoBytes: number | null | undefined): CategoriaTamanhoDrive {
  if (tamanhoBytes == null || tamanhoBytes < 0) return "pequeno";
  if (tamanhoBytes < 5 * MB) return "pequeno";
  if (tamanhoBytes < 25 * MB) return "medio";
  return "grande";
}

export function rotuloImpactoTamanho(categoria: CategoriaTamanhoDrive): string {
  if (categoria === "pequeno") return "🟢 Pequeno";
  if (categoria === "medio") return "🟡 Médio";
  return "🔴 Grande";
}
