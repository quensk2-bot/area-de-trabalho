import type { RupturaManifest } from "./manifestTypes.ts";
import { COMPETENCIA_RE, DATE_RE, isRelativeStoragePath } from "./manifestPaths.ts";

export type ManifestValidationResult = { ok: true; manifest: RupturaManifest } | { ok: false; erros: string[] };

const STATUSES = new Set(["rascunho", "validando", "publicando", "concluido", "falhou"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(obj: Record<string, unknown>, key: string, erros: string[]): string | null {
  const v = obj[key];
  if (typeof v !== "string" || !v.trim()) {
    erros.push(`${key} obrigatório`);
    return null;
  }
  return v.trim();
}

function requireNumber(obj: Record<string, unknown>, key: string, erros: string[]): number | null {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    erros.push(`${key} numérico obrigatório`);
    return null;
  }
  return v;
}

function validateLojaPaths(raw: unknown, erros: string[]): void {
  if (!isRecord(raw)) {
    erros.push("lojas deve ser objeto");
    return;
  }
  for (const [loja, paths] of Object.entries(raw)) {
    if (!/^\d+$/.test(loja)) erros.push(`chave loja inválida: ${loja}`);
    if (!isRecord(paths)) {
      erros.push(`lojas.${loja} inválido`);
      continue;
    }
    for (const key of ["resumo", "gestao", "cds"] as const) {
      const p = paths[key];
      if (typeof p !== "string" || !isRelativeStoragePath(p)) {
        erros.push(`lojas.${loja}.${key} path inválido`);
      }
    }
  }
}

export function validarManifest(raw: unknown): ManifestValidationResult {
  const erros: string[] = [];
  if (!isRecord(raw)) return { ok: false, erros: ["manifest deve ser objeto JSON"] };

  const modulo = requireString(raw, "modulo", erros);
  if (modulo && modulo !== "ruptura") erros.push("modulo deve ser ruptura");

  const regional = requireString(raw, "regional", erros);
  const bandeira = requireString(raw, "bandeira", erros);
  const competencia = requireString(raw, "competencia", erros);
  const dataReferencia = requireString(raw, "dataReferencia", erros);
  const geradoEm = requireString(raw, "geradoEm", erros);
  const hashConteudo = requireString(raw, "hashConteudo", erros);
  const versao = requireNumber(raw, "versao", erros);
  const status = requireString(raw, "status", erros);

  if (competencia && !COMPETENCIA_RE.test(competencia)) erros.push("competencia inválida (YYYY-MM)");
  if (dataReferencia && !DATE_RE.test(dataReferencia)) erros.push("dataReferencia inválida (YYYY-MM-DD)");
  if (status && !STATUSES.has(status)) erros.push("status inválido");
  if (versao != null && versao < 1) erros.push("versao >= 1");

  const dashboardRegional = requireString(raw, "dashboardRegional", erros);
  const dashboardLojas = requireString(raw, "dashboardLojas", erros);

  for (const p of [dashboardRegional, dashboardLojas]) {
    if (p && !isRelativeStoragePath(p)) erros.push(`path dashboard inválido: ${p}`);
  }

  validateLojaPaths(raw.lojas, erros);

  if (erros.length) return { ok: false, erros };

  return {
    ok: true,
    manifest: raw as unknown as RupturaManifest,
  };
}

/** Rejeita URLs públicas ou caminhos absolutos em qualquer artefato. */
export function validarPathPublicacao(path: string): boolean {
  return isRelativeStoragePath(path);
}
