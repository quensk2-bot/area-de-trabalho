import fs from "fs";
import iconv from "iconv-lite";
import type { ParsedTxtRow } from "../types/rupturaTypes";
import { normalizeKey } from "../utils/normalize";
export function readTxtWin1252(filePath: string) { return iconv.decode(fs.readFileSync(filePath), "win1252"); }
export function parseTxtSemicolon(content: string): ParsedTxtRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const headers = lines[0].split(";").map((h) => normalizeKey(h));
  const rows: ParsedTxtRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const payload: Record<string, string> = {};
    headers.forEach((h, idx) => { payload[h] = normalizeKey(cols[idx] ?? ""); });
    rows.push({ numeroLinha: i + 1, payload });
  }
  return rows;
}
