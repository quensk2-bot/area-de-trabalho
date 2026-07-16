import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import type { MotorStandardizeInspecao, MotorStandardizeSheetInspecao } from "./standardizeTypes.ts";

export type WorkbookAberto = {
  caminho: string;
  formato: "xlsx" | "xls" | "csv";
  workbook: XLSX.WorkBook;
};

export function normalizarNomeColuna(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

export function linhaEstaVazia(row: unknown[]): boolean {
  return !row.some((c) => c != null && String(c).trim() !== "");
}

export function abrirWorkbook(caminho: string): WorkbookAberto {
  if (!fs.existsSync(caminho)) {
    throw new Error(`Arquivo não encontrado: ${caminho}`);
  }
  const ext = path.extname(caminho).toLowerCase();
  if (ext === ".csv") {
    const raw = fs.readFileSync(caminho, "utf8");
    const sep = raw.includes(";") ? ";" : ",";
    const rows = raw.split(/\r?\n/).filter((l) => l.length > 0).map((l) => l.split(sep));
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "DADOS");
    return { caminho, formato: "csv", workbook };
  }
  const formato = ext === ".xls" ? "xls" : "xlsx";
  const workbook = XLSX.readFile(caminho, { cellFormula: true });
  return { caminho, formato, workbook };
}

function sheetMetaOculta(workbook: XLSX.WorkBook, sheetName: string): boolean {
  const sheets = workbook.Workbook?.Sheets;
  if (!sheets) return false;
  const meta = sheets.find((s) => s.name === sheetName);
  return meta?.Hidden === 1 || meta?.Hidden === 2;
}

function contarFormulas(sheet: XLSX.WorkSheet): number {
  if (!sheet["!ref"]) return 0;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  let count = 0;
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.f) count++;
    }
  }
  return count;
}

function contarColunasOcultas(sheet: XLSX.WorkSheet): number {
  const cols = sheet["!cols"];
  if (!cols) return 0;
  return cols.filter((col) => col?.hidden).length;
}

export function detectarLinhaCabecalho(
  rows: unknown[][],
  colunasEsperadas: string[],
  aliases: string[] = [],
): number {
  const esperados = new Set(
    [...colunasEsperadas, ...aliases].map((c) => normalizarNomeColuna(c).toLowerCase()),
  );
  const minMatch = Math.max(1, Math.ceil(colunasEsperadas.length * 0.5));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || linhaEstaVazia(row)) continue;
    const headers = row.map((c) => (c == null ? "" : normalizarNomeColuna(String(c)).toLowerCase()));
    const matches = headers.filter((h) => h !== "" && esperados.has(h)).length;
    if (matches >= minMatch) return i;
  }
  return 0;
}

export function extrairLinhasComoValores(sheet: XLSX.WorkSheet): unknown[][] {
  if (!sheet["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const rows: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: unknown[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      row.push(cell?.v ?? null);
    }
    rows.push(row);
  }
  return rows;
}

export function inspecionarWorkbook(aberto: WorkbookAberto): MotorStandardizeInspecao {
  const stat = fs.statSync(aberto.caminho);
  const abas: MotorStandardizeSheetInspecao[] = (aberto.workbook.SheetNames ?? []).map((nome) => {
    const sheet = aberto.workbook.Sheets[nome];
    if (!sheet) {
      return {
        nome,
        visivel: !sheetMetaOculta(aberto.workbook, nome),
        oculta: sheetMetaOculta(aberto.workbook, nome),
        linhaCabecalho: 0,
        cabecalhosEncontrados: [],
        linhasDados: 0,
        formulasEncontradas: 0,
        celulasMescladas: 0,
        colunasOcultas: 0,
        linhasVazias: 0,
        colunasVazias: 0,
      };
    }
    const rows = extrairLinhasComoValores(sheet);
    const headerIdx = rows.findIndex((r) => !linhaEstaVazia(r));
    const headers =
      headerIdx >= 0
        ? rows[headerIdx].map((c) => (c == null ? "" : normalizarNomeColuna(String(c)))).filter((h) => h !== "")
        : [];
    const dataRows = rows.slice(headerIdx + 1).filter((r) => !linhaEstaVazia(r));
    const emptyAfter = rows.slice(headerIdx + 1).length - dataRows.length;

    return {
      nome: nome,
      visivel: !sheetMetaOculta(aberto.workbook, nome),
      oculta: sheetMetaOculta(aberto.workbook, nome),
      linhaCabecalho: headerIdx + 1,
      cabecalhosEncontrados: headers,
      linhasDados: dataRows.length,
      formulasEncontradas: contarFormulas(sheet),
      celulasMescladas: sheet["!merges"]?.length ?? 0,
      colunasOcultas: contarColunasOcultas(sheet),
      linhasVazias: emptyAfter,
      colunasVazias: 0,
    };
  });

  return {
    caminho: aberto.caminho,
    formato: aberto.formato,
    tamanhoBytes: stat.size,
    abas,
  };
}

export function encontrarAbaOrigem(workbook: XLSX.WorkBook, nomesOrigem: string[]): string | null {
  for (const nome of nomesOrigem) {
    if (workbook.SheetNames.includes(nome)) return nome;
  }
  const lowerMap = new Map(workbook.SheetNames.map((n) => [n.toLowerCase(), n]));
  for (const nome of nomesOrigem) {
    const found = lowerMap.get(nome.toLowerCase());
    if (found) return found;
  }
  return null;
}
