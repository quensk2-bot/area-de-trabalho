#!/usr/bin/env node
/** Análise completa homologação — metadados, colunas, BANDEIRA, delta baseline. */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const X = require(path.join(__dirname, "../node_modules/xlsx"));

const DIR = "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO/";
const FILE_OFICIAL = path.join(DIR, "ARQUIVO CONFERENCIA RESULTADO.xlsx");
const FILE_AJUSTE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(DIR, "IMPORTADO_2_AJUSTE-02.xlsx");
const FILE_AJUSTE_01 = path.join(DIR, "IMPORTADO_2_AJUSTE-01.xlsx");
const FILE_BASELINE = path.join(DIR, "IMPORTADO 2.xlsx");
const SHEET_A = "Plan1";
const SHEET_B = "BASE";
const KEY_COLS = ["LOJA", "SEQPRODUTO"];

const COLUNAS_PQ = new Set([
  "% Rup Inventário", "% Ruptura Sem Inventário", "% < 3", "Sku´s Curto Prazo", "% Curto Prazo",
  "Rup (X) Dias Recebto Maior data", "Curto Prazo Rebto Próximo", "Curto Prazo Não Rebto Próximo",
  "Sku´s Médio Prazo", "% Longo Prazo", "Sku´s Longo Prazo", "Avaliar Pedido", "Pendência Indevida",
  "% Médio Prazo", "Ativação e Ruptura > 30 Dias Sem Pedido", "Último Pedido Loja e CD´s (Com ou sem Compra)",
  "Sku´s", "Último Pedido (revisado)", "Dias Ativação", "Estrura Real", "Itens Vda Pendência", "% Rup Sem Pendência Vda",
]);

const ACAO_MAP = {
  PENDCPA: "D", BANDEIRA: "C", PRODUTO: "B", COMPRADOR: "B", CATEGORIA: "B", EMBCPA: "B",
};

function sha256(file) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

function fileMeta(file, sheet) {
  const st = fs.statSync(file);
  const wb = X.readFile(file, { cellDates: true });
  const sh = wb.Sheets[sheet];
  const ref = sh?.["!ref"];
  let rows = 0, cols = 0;
  if (ref) {
    const r = X.utils.decode_range(ref);
    rows = r.e.r - r.s.r + 1;
    cols = r.e.c - r.s.c + 1;
  }
  const data = X.utils.sheet_to_json(sh, { defval: null, raw: true });
  return {
    path: file,
    size: st.size,
    mtime: st.mtime.toISOString(),
    sha256: sha256(file),
    sheet,
    rows,
    cols,
    dataRows: data.length,
    sheets: wb.SheetNames,
  };
}

function normKeyPart(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  const s = String(v).trim();
  if (/^-?\d+\.0+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

function makeKey(row) {
  return KEY_COLS.map((c) => normKeyPart(row[c])).join("\u0001");
}

function cellEqual(a, b) {
  const na = a == null || a === "";
  const nb = b == null || b === "";
  if (na && nb) return true;
  if (na !== nb) return false;
  if (typeof a === "number" && typeof b === "number") return a === b || Math.abs(a - b) <= 1e-9;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return String(a).trim() === String(b).trim();
}

function fillPct(rows, col) {
  if (!rows.length) return 0;
  let filled = 0;
  for (const r of rows) {
    const v = r[col];
    if (v != null && v !== "") filled++;
  }
  return (filled / rows.length) * 100;
}

function load(file, sheet) {
  const wb = X.readFile(file, { cellDates: true });
  const rows = X.utils.sheet_to_json(wb.Sheets[sheet], { defval: null, raw: true });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

function buildMap(rows) {
  const map = new Map();
  let dups = 0;
  for (const r of rows) {
    const k = makeKey(r);
    if (map.has(k)) dups++;
    else map.set(k, r);
  }
  return { map, dups };
}

function classifyCol(col, fillO, fillV, pctEqual) {
  if (COLUNAS_PQ.has(col)) return "A";
  if (col === "BANDEIRA") return "C";
  if (col === "PENDCPA") return "D";
  if (fillO < 1 && fillV < 1) return "E";
  return "B";
}

function analyzePair(fileA, sheetA, fileB, sheetB, label) {
  const a = load(fileA, sheetA);
  const b = load(fileB, sheetB);
  const mapA = buildMap(a.rows);
  const mapB = buildMap(b.rows);
  const keysA = new Set(mapA.map.keys());
  const keysB = new Set(mapB.map.keys());
  let onlyA = 0, onlyB = 0, both = 0;
  for (const k of keysA) {
    if (keysB.has(k)) both++;
    else onlyA++;
  }
  for (const k of keysB) if (!keysA.has(k)) onlyB++;

  const headersMatch = a.headers.length === b.headers.length && a.headers.every((h, i) => h === b.headers[i]);
  const commonKeys = [...keysA].filter((k) => keysB.has(k));
  const colStats = [];

  for (const col of a.headers) {
    if (KEY_COLS.includes(col)) continue;
    let compared = 0, equal = 0;
    for (const k of commonKeys) {
      compared++;
      if (cellEqual(mapA.map.get(k)[col], mapB.map.get(k)[col])) equal++;
    }
    const fillO = fillPct(a.rows, col);
    const fillV = fillPct(b.rows, col);
    const pctEq = compared ? (equal / compared) * 100 : 0;
    colStats.push({
      col,
      fillOficial: fillO,
      fillV7: fillV,
      compared,
      equal,
      divergent: compared - equal,
      pctEqual: pctEq,
      acao: classifyCol(col, fillO, fillV, pctEq),
    });
  }

  return {
    label,
    headersMatch,
    colsA: a.headers.length,
    colsB: b.headers.length,
    rowsA: a.rows.length,
    rowsB: b.rows.length,
    keysA: mapA.map.size,
    keysB: mapB.map.size,
    dupsA: mapA.dups,
    dupsB: mapB.dups,
    both,
    onlyA,
    onlyB,
    colStats,
    headers: a.headers,
  };
}

function bandeiraAnalysis(rows) {
  const counts = {};
  for (const r of rows) {
    const b = r.BANDEIRA ?? "(vazio)";
    counts[b] = (counts[b] ?? 0) + 1;
  }
  return counts;
}

function produtoCheck(rows) {
  const filled = rows.filter((r) => r.PRODUTO != null && r.PRODUTO !== "");
  const withSuffix = filled.filter((r) => String(r.PRODUTO).includes(` - ${r.SEQPRODUTO}`));
  const samples = filled.slice(0, 5).map((r) => ({ LOJA: r.LOJA, SEQ: r.SEQPRODUTO, PRODUTO: r.PRODUTO, DESCCOMPLETA: r.DESCCOMPLETA }));
  return {
    total: rows.length,
    filled: filled.length,
    fillPct: (filled.length / Math.max(1, rows.length)) * 100,
    withCorrectFormat: withSuffix.length,
    formatPct: filled.length ? (withSuffix.length / filled.length) * 100 : 0,
    broken: filled.length - withSuffix.length,
    samples,
  };
}

// --- main ---
const metaOficial = fileMeta(FILE_OFICIAL, SHEET_A);
const metaAjuste = fileMeta(FILE_AJUSTE, SHEET_B);
const metaBaseline = fs.existsSync(FILE_BASELINE) ? fileMeta(FILE_BASELINE, SHEET_B) : null;

const cmpAjuste = analyzePair(FILE_OFICIAL, SHEET_A, FILE_AJUSTE, SHEET_B, "oficial_vs_AJUSTE-01");
const cmpBaseline = fs.existsSync(FILE_BASELINE)
  ? analyzePair(FILE_OFICIAL, SHEET_A, FILE_BASELINE, SHEET_B, "oficial_vs_IMPORTADO2")
  : null;

const ajusteRows = load(FILE_AJUSTE, SHEET_B).rows;
const oficialRows = load(FILE_OFICIAL, SHEET_A).rows;
const produto = produtoCheck(ajusteRows);
const bandeiraOficial = bandeiraAnalysis(oficialRows);
const bandeiraAjuste = bandeiraAnalysis(ajusteRows);

const mapeaveis = cmpAjuste.colStats.filter((c) => !COLUNAS_PQ.has(c.col));
const mapeaveisCells = mapeaveis.reduce((s, c) => ({ compared: s.compared + c.compared, equal: s.equal + c.equal }), { compared: 0, equal: 0 });
const allCells = cmpAjuste.colStats.reduce((s, c) => ({ compared: s.compared + c.compared, equal: s.equal + c.equal }), { compared: 0, equal: 0 });

const delta = cmpBaseline ? {
  schemaFixed: !cmpBaseline.headersMatch && cmpAjuste.headersMatch,
  onlyV7Before: cmpBaseline.onlyB,
  onlyV7After: cmpAjuste.onlyB,
  mapeavelEqualBefore: cmpBaseline.colStats.filter((c) => !COLUNAS_PQ.has(c.col)).reduce((s, c) => s + c.equal, 0),
  mapeavelEqualAfter: mapeaveisCells.equal,
  mapeavelCompared: mapeaveisCells.compared,
  fillImprovements: cmpAjuste.colStats.map((c) => {
    const b = cmpBaseline.colStats.find((x) => x.col === c.col);
    return { col: c.col, fillBefore: b?.fillV7 ?? 0, fillAfter: c.fillV7, delta: c.fillV7 - (b?.fillV7 ?? 0) };
  }).filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 15),
} : null;

const out = {
  geradoEm: new Date().toISOString(),
  metaOficial,
  metaAjuste,
  metaBaseline: metaBaseline ? { path: metaBaseline.path, size: metaBaseline.size, sha256: metaBaseline.sha256, mtime: metaBaseline.mtime, dataRows: metaBaseline.dataRows } : null,
  cmpAjuste: {
    headersMatch: cmpAjuste.headersMatch,
    universe: { keysA: cmpAjuste.keysA, keysB: cmpAjuste.keysB, both: cmpAjuste.both, onlyA: cmpAjuste.onlyA, onlyB: cmpAjuste.onlyB, dupsA: cmpAjuste.dupsA, dupsB: cmpAjuste.dupsB },
    mapeaveis: { compared: mapeaveisCells.compared, equal: mapeaveisCells.equal, pctEqual: (mapeaveisCells.equal / Math.max(1, mapeaveisCells.compared)) * 100 },
    completo: { compared: allCells.compared, equal: allCells.equal, pctEqual: (allCells.equal / Math.max(1, allCells.compared)) * 100 },
    colStats: cmpAjuste.colStats,
  },
  bandeira: { oficial: bandeiraOficial, ajuste: bandeiraAjuste },
  produto,
  delta,
};

const outPath = path.join(__dirname, "../architecture/hibrido-v7/homologacao-analise.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
