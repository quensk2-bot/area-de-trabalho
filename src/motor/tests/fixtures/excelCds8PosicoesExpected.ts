/** Cabeçalhos Excel dinâmicos para cenários 8 e 12 posições (Etapa D). */
export function headersExcelCds(n: number): string[] {
  const headers = ["LOJA", "SEQPRODUTO"];
  for (let pos = 1; pos <= n; pos++) {
    headers.push(`ESTQ_CD${pos}`);
    headers.push(`PENDCD_CD${pos}`);
    headers.push(`STATUS_COMPRA_CD${pos}`);
    headers.push(`DIAS_DA_COMPRACD${pos}`);
    headers.push(`DIAS_RECEBTO_CD${pos}`);
  }
  return headers;
}

export const HEADERS_EXCEL_8CD = headersExcelCds(8);
export const HEADERS_EXCEL_12CD = headersExcelCds(12);

export function linhaExcelCds(n: number, loja = 73, seqproduto = 1000): Record<string, number> {
  const row: Record<string, number> = { LOJA: loja, SEQPRODUTO: seqproduto };
  for (let pos = 1; pos <= n; pos++) {
    row[`ESTQ_CD${pos}`] = pos * 10;
    row[`PENDCD_CD${pos}`] = pos;
    row[`STATUS_COMPRA_CD${pos}`] = pos;
    row[`DIAS_DA_COMPRACD${pos}`] = pos + 1;
    row[`DIAS_RECEBTO_CD${pos}`] = pos + 2;
  }
  return row;
}

export const LINHA_EXCEL_8CD = linhaExcelCds(8);
export const LINHA_EXCEL_12CD = linhaExcelCds(12);
