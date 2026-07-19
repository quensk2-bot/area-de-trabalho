import type { EntradaCatalogoMotor } from "./catalogoArquivosMotor.ts";
import { CATALOGO_ARQUIVOS_MOTOR_MT } from "./catalogoArquivosMotor.ts";
import { normalizarNomeArquivoDrive } from "./normalizarNomeArquivoDrive.ts";

export function extensaoArquivo(nome: string): string {
  const idx = nome.lastIndexOf(".");
  return idx >= 0 ? nome.slice(idx).toLowerCase() : "";
}

export function reconhecerTipoArquivoDrive(
  nome: string,
  catalogo: readonly EntradaCatalogoMotor[] = CATALOGO_ARQUIVOS_MOTOR_MT,
): EntradaCatalogoMotor | null {
  const base = normalizarNomeArquivoDrive(nome);
  const ext = extensaoArquivo(nome);
  for (const entrada of catalogo) {
    if (!entrada.formatosPermitidos.includes(ext)) continue;
    if (entrada.padroesNome.some((rx) => rx.test(base) || rx.test(nome))) return entrada;
  }
  return null;
}
