import { HIBRIDO_PILOTO } from "../constants.ts";

const COMPETENCIA_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function competenciaFromDataReferencia(dataReferencia: string): string {
  return dataReferencia.slice(0, 7);
}

export function manifestRootPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${input.regional}/${input.bandeira}/${input.competencia}`;
}

export function manifestFilePath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${manifestRootPath(input)}/manifest.json`;
}

export function dashboardRegionalPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${manifestRootPath(input)}/dashboard/regional.json`;
}

export function dashboardLojasPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${manifestRootPath(input)}/dashboard/lojas.json`;
}

export function dashboardRegionalOficialPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${manifestRootPath(input)}/dashboard/regional-oficial.json`;
}

export function dashboardLojasOficialPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${manifestRootPath(input)}/dashboard/lojas-oficial.json`;
}

export function lojaResumoPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
}): string {
  return `${manifestRootPath(input)}/lojas/${input.loja}/resumo.json`;
}

export function lojaResumoOficialPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
}): string {
  return `${manifestRootPath(input)}/lojas/${input.loja}/resumo-oficial.json`;
}

export function lojaGestaoPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
}): string {
  return `${manifestRootPath(input)}/lojas/${input.loja}/gestao.json`;
}

export function lojaCdsPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
}): string {
  return `${manifestRootPath(input)}/lojas/${input.loja}/cds.json`;
}

export function lojaGestaoChunkPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
  parte: number;
}): string {
  const n = String(input.parte).padStart(3, "0");
  return `${manifestRootPath(input)}/lojas/${input.loja}/gestao/parte-${n}.json`;
}

export function lojaGestaoIndexPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
}): string {
  return `${manifestRootPath(input)}/lojas/${input.loja}/gestao/index.json`;
}

/** Índice PQ de compradores (rede|setor|…) para resolver ** Não Identificado no frontend. */
export function catalogoCompradoresPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): string {
  return `${manifestRootPath(input)}/catalogo-compradores.json`;
}

/** Valida path relativo Storage (sem .., URL ou caminho local). */
export function isRelativeStoragePath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (/^https?:\/\//i.test(path)) return false;
  if (/^[a-z]:\\/i.test(path) || path.includes("\\")) return false;
  if (/service_role|secret/i.test(path)) return false;
  const segments = path.split("/");
  return segments.every((s) => s.length > 0);
}

export function isPilotoPath(path: string): boolean {
  const prefix = `${HIBRIDO_PILOTO.regional}/${HIBRIDO_PILOTO.bandeira}/${HIBRIDO_PILOTO.competencia}`;
  return path.startsWith(prefix);
}

export { COMPETENCIA_RE, DATE_RE };
