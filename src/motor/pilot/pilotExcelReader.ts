import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import type { PilotExcelFonte } from "./pilotTypes.ts";

const EXCEL_SHEET = "BASE";

export type ExcelBaseRow = Record<string, string | number | boolean | null> & {
  LOJA: number;
  SEQPRODUTO: number;
};

function normalizeCell(value: unknown): string | number | boolean | null {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (text === "") return null;
  const num = Number(text.replace(",", "."));
  if (!Number.isNaN(num) && /^-?\d+([.,]\d+)?$/.test(text.replace(/\s/g, ""))) return num;
  return text;
}

export function lerExcelRegionalLoja(excelPath: string, loja: number): {
  fonte: PilotExcelFonte;
  linhas: ExcelBaseRow[];
} {
  const workbook = XLSX.readFile(excelPath);
  const isConferencia = excelPath.includes("RESULTADO");
  const sheetName = workbook.SheetNames.includes(EXCEL_SHEET)
    ? EXCEL_SHEET
    : workbook.SheetNames.includes("Plan1")
      ? "Plan1"
      : workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: null });

  const lojaSheet = workbook.SheetNames.includes("LOJA")
    ? XLSX.utils.sheet_to_json<(string | null)[]>(workbook.Sheets.LOJA, { header: 1, defval: null })
    : [];
  const dataExportacao =
    lojaSheet.flat().find((v) => typeof v === "string" && /\d{2}\/\d{2}\/\d{4}/.test(v))?.toString() ?? null;

  const linhasLoja: ExcelBaseRow[] = [];
  for (const row of rows) {
    const lojaVal = normalizeCell(row.LOJA);
    if (lojaVal == null || Number(lojaVal) !== loja) continue;
    const produto = normalizeCell(row.SEQPRODUTO);
    if (produto == null) continue;

    const mapped: ExcelBaseRow = { LOJA: loja, SEQPRODUTO: Number(produto) };
    for (const [key, val] of Object.entries(row)) {
      mapped[key] = normalizeCell(val);
    }
    mapped.Soma_EstoqueCD =
      [mapped.ESTQ_CD1, mapped.ESTQ_CD2, mapped.ESTQ_CD3, mapped.ESTQ_CD4, mapped.ESTQ_CD5]
        .map((v) => (typeof v === "number" ? v : 0))
        .reduce((a, b) => a + b, 0) || null;
    mapped["Pendência Cpa CD"] = mapped.PENDCPA ?? null;
    linhasLoja.push(mapped);
  }

  const camposPresentes = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    fonte: {
      arquivo: path.basename(excelPath),
      aba: sheetName,
      consulta: isConferencia
        ? "RESULTADO/ARQUIVO CONFERENCIA RESULTADO.xlsx → Plan1"
        : "Power Query → BASE (workbook regional v23.3)",
      dataExportacao,
      loja,
      linhasLoja: linhasLoja.length,
      camposPresentes,
    },
    linhas: linhasLoja,
  };
}

export function indexarExcelPorChave(linhas: ExcelBaseRow[]): Map<string, ExcelBaseRow> {
  const map = new Map<string, ExcelBaseRow>();
  for (const row of linhas) {
    map.set(`${row.LOJA}|${row.SEQPRODUTO}`, row);
  }
  return map;
}

export function hashArquivo(caminho: string): string {
  const stat = fs.statSync(caminho);
  return `${stat.size}:${stat.mtimeMs}`;
}
