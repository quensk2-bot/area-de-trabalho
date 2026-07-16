import fs from "fs";
import iconv from "iconv-lite";

export function readTxtWin1252(filePath: string): string {
  return iconv.decode(fs.readFileSync(filePath), "win1252");
}

export function splitTxtRows(content: string): string[] {
  return content.split(/\r?\n/).filter((line) => line.trim() !== "");
}

export function parseTxtSemicolon(content: string): { headers: string[]; rows: string[][] } {
  const lines = splitTxtRows(content);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(";").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(";"));
  return { headers, rows };
}

export function pickColumn(row: string[], headers: string[], name: string): string | null {
  const idx = headers.indexOf(name);
  if (idx < 0) return null;
  const value = row[idx]?.trim();
  return value === "" ? null : value ?? null;
}

export function parseNumero(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function deduplicar<T>(itens: T[], chaveFn: (item: T) => string): { itens: T[]; removidas: number } {
  const vistos = new Set<string>();
  const resultado: T[] = [];
  let removidas = 0;
  for (const item of itens) {
    const chave = chaveFn(item);
    if (vistos.has(chave)) {
      removidas++;
      continue;
    }
    vistos.add(chave);
    resultado.push(item);
  }
  return { itens: resultado, removidas };
}
