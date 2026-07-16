import { createHash } from "node:crypto";
import fs from "node:fs";
import { MOTOR_REGIONAIS, type MotorIdempotenciaChave, type MotorRegional } from "./motorWorkflowTypes.ts";

export function isMotorRegional(value: string): value is MotorRegional {
  return (MOTOR_REGIONAIS as readonly string[]).includes(value.toUpperCase());
}

export function normalizarRegional(value: string): MotorRegional {
  const upper = value.trim().toUpperCase();
  if (!isMotorRegional(upper)) {
    throw new Error(`Regional inválida: ${value}. Permitidas: ${MOTOR_REGIONAIS.join(", ")}`);
  }
  return upper;
}

export function calcularHashSha256Arquivo(caminho: string): string {
  const buffer = fs.readFileSync(caminho);
  return createHash("sha256").update(buffer).digest("hex");
}

export function montarChaveIdempotencia(params: {
  regional: MotorRegional;
  dataReferencia: string;
  tipoArquivo: string;
  hashSha256: string;
}): MotorIdempotenciaChave {
  return {
    regional: params.regional,
    dataReferencia: params.dataReferencia,
    tipoArquivo: params.tipoArquivo,
    hashSha256: params.hashSha256,
  };
}

export function formatarChaveIdempotencia(chave: MotorIdempotenciaChave): string {
  return `${chave.regional}|${chave.dataReferencia}|${chave.tipoArquivo}|${chave.hashSha256}`;
}

/** Caminho conceitual no Drive — não cria pastas reais nesta fase */
export function caminhoDriveConceitual(params: {
  regional: MotorRegional;
  ano: string;
  mes: string;
  subpasta: "originais" | "padronizados" | "processados" | "relatorios";
  nomeArquivo?: string;
}): string {
  const base = `V7/Motor Operacional/${params.regional}/${params.ano}/${params.mes}/${params.subpasta}`;
  return params.nomeArquivo ? `${base}/${params.nomeArquivo}` : base;
}

export function extrairAnoMes(dataReferencia: string): { ano: string; mes: string } {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dataReferencia);
  if (!match) {
    throw new Error(`Data de referência inválida (esperado YYYY-MM-DD): ${dataReferencia}`);
  }
  return { ano: match[1], mes: match[2] };
}
