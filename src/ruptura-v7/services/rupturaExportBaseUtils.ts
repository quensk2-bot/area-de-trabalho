import type { PermissionContext } from "../../auth-v7/permissionService.ts";
import { slugBandeiraArquivo } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { todasLojasSelecionadas } from "../services/lojasFiltroUtils.ts";

export type ModoExportBaseRuptura = "selecao" | "loja_unica" | "bandeira_completa";

export type ExportBaseRupturaInput = {
  ctx: RupturaFiltrosContexto;
  authCtx: PermissionContext | null;
  modo: ModoExportBaseRuptura;
  formato: "xlsx" | "csv";
  somenteCamposAusentes?: boolean;
  onProgress?: (msg: string) => void;
};

export type ExportBaseRupturaResultado = {
  ok: boolean;
  erro?: string;
  filename?: string;
  estrategia?: "drive" | "storage" | "browser" | "worker";
  linhas?: number;
};

export function canExportBandeiraCompleta(authCtx: PermissionContext | null): boolean {
  if (!authCtx) return false;
  if (authCtx.nivel === "ADM" || authCtx.nivel === "N0" || authCtx.nivel === "N1") return true;
  return false;
}

export function inferirModoExport(ctx: RupturaFiltrosContexto, totalEscopo: number): ModoExportBaseRuptura {
  if (ctx.lojas.length === 1) return "loja_unica";
  if (ctx.lojas.length === 0 || todasLojasSelecionadas(ctx.lojas, totalEscopo)) return "selecao";
  return "selecao";
}

export function escopoArquivoExport(input: {
  modo: ModoExportBaseRuptura;
  lojas: number[];
  totalEscopo: number;
}): string {
  if (input.modo === "bandeira_completa") return "BANDEIRA_COMPLETA";
  if (input.modo === "loja_unica" || input.lojas.length === 1) return `LOJA_${input.lojas[0]}`;
  if (input.lojas.length === 0 || todasLojasSelecionadas(input.lojas, input.totalEscopo)) {
    return "SELECAO_TODAS";
  }
  return `SELECAO_${input.lojas.length}LOJAS`;
}

export function nomeArquivoExportRuptura(input: {
  regional: string;
  bandeira: string | null;
  escopo: string;
  dataReferencia: string;
  extensao: "xlsx" | "csv";
}): string {
  const data = input.dataReferencia.slice(0, 10);
  const band = slugBandeiraArquivo(input.bandeira);
  const escopo = input.escopo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `BASE_RUPTURA_V7_${input.regional}_${band}_${escopo}_${data}.${input.extensao}`;
}

export function resumirEscopoExport(input: {
  ctx: RupturaFiltrosContexto;
  modo: ModoExportBaseRuptura;
  lojas: number[];
  totalEscopo: number;
  bandeira: string;
}): string {
  const escopo = escopoArquivoExport({ modo: input.modo, lojas: input.lojas, totalEscopo: input.totalEscopo });
  return [
    `Regional: ${input.ctx.regional}`,
    `Bandeira: ${input.bandeira}`,
    `Data: ${input.ctx.dataReferencia.slice(0, 10)}`,
    `Escopo: ${escopo.replace(/_/g, " ")}`,
    `Lojas: ${input.lojas.length ? input.lojas.join(", ") : "todas do escopo"}`,
  ].join("\n");
}
