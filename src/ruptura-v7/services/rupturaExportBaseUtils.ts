import type { PermissionContext } from "../../auth-v7/permissionService.ts";
import { slugBandeiraArquivo } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import type { ModoUniversoExport } from "../hibrido/mapearBaseRupturaHibrido.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_EXPORT_BROWSER_MAX_ROWS } from "../types/rupturaFiltrosTypes.ts";
import { todasLojasSelecionadas } from "../services/lojasFiltroUtils.ts";

export type ModoExportBaseRuptura = "selecao" | "loja_unica" | "bandeira_completa";

export type EstrategiaExportGrande = "auto" | "drive" | "integral_worker" | "oficial_compativel";

export function resolverModoUniversoExport(
  estrategia: EstrategiaExportGrande,
  universoExplicito?: ModoUniversoExport,
): ModoUniversoExport {
  if (universoExplicito) return universoExplicito;
  return estrategia === "integral_worker" || estrategia === "drive" ? "integral" : "oficial_compativel";
}

/** Linhas típicas do universo oficial COMPER MT (interseção PQ). */
export const LINHAS_ESTIMADAS_OFICIAL_COMPATIVEL = 129_828;

export type ExportBaseRupturaInput = {
  ctx: RupturaFiltrosContexto;
  authCtx: PermissionContext | null;
  modo: ModoExportBaseRuptura;
  formato: "xlsx" | "csv";
  universo?: ModoUniversoExport;
  estrategia?: EstrategiaExportGrande;
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

/** Seleção com todas as lojas equivale a bandeira completa para roteamento Drive/Worker. */
export function escopoEquivaleBandeiraCompleta(input: {
  modo: ModoExportBaseRuptura;
  lojas: number[];
  totalEscopo: number;
}): boolean {
  if (input.modo === "bandeira_completa") return true;
  return input.lojas.length === 0 || todasLojasSelecionadas(input.lojas, input.totalEscopo);
}

/** Máximo de lojas exportáveis direto no navegador (~12k linhas/loja COMPER MT). */
export function maxLojasExportBrowser(totalEscopo: number, linhasPorLoja = 12_000): number {
  if (totalEscopo <= 0) return 2;
  const max = Math.floor(RUPTURA_EXPORT_BROWSER_MAX_ROWS / linhasPorLoja);
  return Math.max(1, Math.min(max, totalEscopo));
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
  universo?: ModoUniversoExport;
  sufixo?: string;
}): string {
  const data = input.dataReferencia.slice(0, 10);
  const band = slugBandeiraArquivo(input.bandeira);
  const escopo = input.escopo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const universo =
    input.universo === "oficial_compativel"
      ? "OFICIAL_COMPATIVEL"
      : input.universo === "integral"
        ? "V7_INTEGRAL"
        : "";
  const partes = ["BASE_RUPTURA_V7", input.regional, band, escopo, universo, input.sufixo, data].filter(Boolean);
  return `${partes.join("_")}.${input.extensao}`;
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
