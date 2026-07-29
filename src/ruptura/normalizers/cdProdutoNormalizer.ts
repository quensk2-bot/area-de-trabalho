const SLOTS = ["CD1","CD2","CD3","CD4"] as const;
function num(v?: string) { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; }
function pick(row: Record<string,string>, k: string) { return row[k] ?? ""; }
export function normalizarCdGrupo1(row: Record<string,string>, regional: string, loja: string, seqproduto: string, execucaoId: string, arquivoId: string) {
  return SLOTS.map((slot, idx) => ({
    execucao_id: execucaoId, arquivo_id: arquivoId, regional, loja, seqproduto,
    slot_cd: slot, ordem_cd: idx + 1,
    status_compra: pick(row, `STATUS_COMPRA_${slot}`),
    estoque: num(pick(row, `ESTQ_${slot}`)),
    pendencia: num(pick(row, `PENDCD_${slot}`)),
    dias_compra: num(pick(row, `DIAS_DA_COMPRACD${idx+1}`)),
    dias_recebimento: num(pick(row, `DIAS_RECEBTO_${slot}`)),
    ultimo_pedido: pick(row, `ULTIMACPA${slot}`),
    estoque_cross_docking: num(pick(row, `EST_SELECINV_${slot}`)),
  }));
}
export function normalizarCdGrupo2(row: Record<string,string>, regional: string, seqproduto: string, execucaoId: string, arquivoId: string) {
  return [{ execucao_id: execucaoId, arquivo_id: arquivoId, regional, loja: null, seqproduto, slot_cd: "CD5", ordem_cd: 5,
    status_compra: pick(row, "STATUS_COMPRA_CD5") || pick(row, "STATUS_COMPRA_CD1"),
    estoque: num(pick(row, "ESTQ_CD5") || pick(row, "ESTQ_CD1")),
    pendencia: num(pick(row, "PENDCD_CD5") || pick(row, "PENDCD_CD1")),
    dias_compra: num(pick(row, "DIAS_DA_COMPRACD5") || pick(row, "DIAS_DA_COMPRACD1")),
    dias_recebimento: num(pick(row, "DIAS_RECEBTO_CD5") || pick(row, "DIAS_RECEBTO_CD1")),
    ultimo_pedido: pick(row, "ULTIMACPACD5") || pick(row, "ULTIMACPACD1"), estoque_cross_docking: null }];
}
