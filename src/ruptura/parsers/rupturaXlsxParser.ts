import XLSX from "xlsx";
import type { ParsedTxtRow } from "../types/rupturaTypes";
import { normalizeKey } from "../utils/normalize";

export function parseXlsxSheet(filePath: string, sheetName?: string): ParsedTxtRow[] {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const name = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[name], { header: 1, defval: "" });
  const nonEmpty = matrix.filter((row) => row.some((c) => String(c ?? "").trim() !== ""));
  if (!nonEmpty.length) return [];
  const headers = nonEmpty[0].map((c) => normalizeKey(c));
  const rows: ParsedTxtRow[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const payload: Record<string, string> = {};
    headers.forEach((h, idx) => { payload[h] = normalizeKey(nonEmpty[i][idx] ?? ""); });
    rows.push({ numeroLinha: i + 1, payload });
  }
  return rows;
}