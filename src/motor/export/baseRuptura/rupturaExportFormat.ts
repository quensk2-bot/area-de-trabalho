/** Formatação de células BASE — espelha rótulos do arquivo conferência (PQ), sem recalcular BRE. */

export function formatRuptura104cTexto(ruptura104c: boolean | null | undefined): string | null {
  if (ruptura104c == null) return null;
  return ruptura104c ? "É Ruptura" : "Não é Ruptura";
}

export function formatFlagRuptura104c(geraRuptura: boolean | null | undefined): string | null {
  if (geraRuptura == null) return null;
  return geraRuptura ? "Gera Ruptura" : "Não Gera Ruptura";
}

export function formatMenorQueTres(ruptura104c: boolean | null | undefined): number | null {
  if (ruptura104c == null) return null;
  return ruptura104c ? 1 : 0;
}

export function formatTextoProduto(descricao: string | null | undefined, seqproduto: number): string | null {
  if (!descricao) return null;
  return `${descricao} - ${seqproduto}`;
}

function normalizarBandeiraInterna(bandeira: string | null | undefined): string {
  if (!bandeira) return "COMPER";
  const norm = bandeira
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
  if (norm.includes("COMPER")) return "COMPER";
  if (norm.includes("FORT")) return "FORT";
  return bandeira.toUpperCase();
}

/** Rótulo interno V7 — catálogo, manifest, storage e modo V7_INTEGRAL. */
export function formatBandeiraExport(bandeira: string | null | undefined): string {
  return normalizarBandeiraInterna(bandeira);
}

/**
 * Rótulo da planilha oficial (PQ) — somente modo OFICIAL_COMPATIVEL.
 * Valores internos (COMPER/FORT) permanecem inalterados fora deste adapter.
 */
export function formatBandeiraExportCompativel(
  regional: string | null | undefined,
  bandeira: string | null | undefined,
): string {
  const band = normalizarBandeiraInterna(bandeira);
  const reg = (regional ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
  if (band === "COMPER" && reg === "MT") return "Comper MT";
  if (band === "FORT" && reg === "MT") return "Fort MT";
  return band;
}

export type ModoBandeiraExport = "v7_integral" | "oficial_compativel";

/** Adapter de BANDEIRA na exportação — integral mantém COMPER/FORT; compatível espelha PQ. */
export function formatBandeiraExportModo(
  regional: string | null | undefined,
  bandeira: string | null | undefined,
  modo: ModoBandeiraExport,
): string {
  if (modo === "oficial_compativel") return formatBandeiraExportCompativel(regional, bandeira);
  return formatBandeiraExport(bandeira);
}
