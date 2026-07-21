/** Escopo piloto H6/H9 — MT / COMPER / loja 73 */
export const HIBRIDO_BUCKET = "ruptura-v7";

export const HIBRIDO_PILOTO = {
  regional: "MT",
  bandeira: "COMPER",
  loja: 73,
  competencia: "2026-07",
  dataReferencia: "2026-07-13",
} as const;

/** Limite recomendado por parte de gestao.json (bytes) — ver gerarGestaoLoja.ts */
export const HIBRIDO_GESTAO_CHUNK_MAX_BYTES = 5 * 1024 * 1024;
