#!/usr/bin/env node
/**
 * Comparativo em camadas — schema, universo, colunas mapeáveis, completo.
 * Uso: node scripts/compare-ruptura-validacao-layered.cjs [arquivoB]
 */
const fs = require("fs");
const path = require("path");
const X = require(path.join(__dirname, "../node_modules/xlsx"));

const DIR = "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO/";
const FILE_A = path.join(DIR, "ARQUIVO CONFERENCIA RESULTADO.xlsx");
const FILE_B = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(DIR, "IMPORTADO 2.xlsx");
const SHEET_A = "Plan1";
const SHEET_B = process.argv[3] === "--sheet-b" ? process.argv[4] : "BASE";
const KEY_COLS = ["LOJA", "SEQPRODUTO"];
const MAX_DIFFS = 20;

const COLUNAS_PQ = new Set([
  "% Rup Inventário",
  "% Ruptura Sem Inventário",
  "% < 3",
  "Sku´s Curto Prazo",
  "% Curto Prazo",
  "Rup (X) Dias Recebto Maior data",
  "Curto Prazo Rebto Próximo",
  "Curto Prazo Não Rebto Próximo",
  "Sku´s Médio Prazo",
  "% Longo Prazo",
  "Sku´s Longo Prazo",
  "Avaliar Pedido",
  "Pendência Indevida",
  "% Médio Prazo",
  "Ativação e Ruptura > 30 Dias Sem Pedido",
  "Último Pedido Loja e CD´s (Com ou sem Compra)",
  "Sku´s",
  "Último Pedido (revisado)",
  "Dias Ativação",
  "Estrura Real",
  "Itens Vda Pendência",
  "% Rup Sem Pendência Vda",
]);

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
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return true;
    return Math.abs(a - b) <= 1e-9;
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return String(a).trim() === String(b).trim();
}

function formatVal(v) {
  if (v == null) return "(vazio)";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function sheetToRows(wb, sheetName) {
  const sh = wb.Sheets[sheetName];
  if (!sh) return { headers: [], rows: [], error: "sheet missing" };
  const data = X.utils.sheet_to_json(sh, { defval: null, raw: true });
  return { headers: data.length ? Object.keys(data[0]) : [], rows: data };
}

function buildMaps(rows) {
  const map = new Map();
  const dups = [];
  for (let i = 0; i < rows.length; i++) {
    const k = makeKey(rows[i]);
    if (map.has(k)) dups.push(i + 2);
    else map.set(k, { row: rows[i], excelRow: i + 2 });
  }
  return { map, dups };
}

function compareLayer(keysA, mapA, mapB, cols) {
  let cellsCompared = 0;
  let cellsMatch = 0;
  const diffs = [];
  for (const k of keysA) {
    if (!mapB.has(k)) continue;
    const ra = mapA.get(k).row;
    const rb = mapB.get(k).row;
    for (const col of cols) {
      cellsCompared++;
      if (cellEqual(ra[col], rb[col])) cellsMatch++;
      else if (diffs.length < MAX_DIFFS) {
        const p = k.split("\u0001");
        diffs.push({ loja: p[0], seq: p[1], col, valA: formatVal(ra[col]), valB: formatVal(rb[col]) });
      }
    }
  }
  return { cellsCompared, cellsMatch, diffs };
}

console.log("=== COMPARATIVO EM CAMADAS — RUPTURA V7 ===\n");
console.log("Oficial:", FILE_A);
console.log("V7:     ", FILE_B, `(aba ${SHEET_B})\n`);

const wbA = X.readFile(FILE_A, { cellDates: true });
const wbB = X.readFile(FILE_B, { cellDates: true });
const partA = sheetToRows(wbA, SHEET_A);
const partB = sheetToRows(wbB, SHEET_B);

const headersMatchOrder =
  partA.headers.length === partB.headers.length && partA.headers.every((h, i) => h === partB.headers[i]);
const commonCols = partA.headers.filter((h) => partB.headers.includes(h));
const colsMapeaveis = commonCols.filter((c) => !KEY_COLS.includes(c) && !COLUNAS_PQ.has(c));

const mapA = buildMaps(partA.rows);
const mapB = buildMaps(partB.rows);
const keysA = new Set(mapA.map.keys());
const keysB = new Set(mapB.map.keys());
let onlyA = 0;
let onlyB = 0;
for (const k of keysA) if (!keysB.has(k)) onlyA++;
for (const k of keysB) if (!keysA.has(k)) onlyB++;
const matchingKeys = [...keysA].filter((k) => keysB.has(k)).length;

console.log("--- Camada 1: Schema ---");
console.log("Ordem idêntica:", headersMatchOrder ? "SIM" : "NÃO");
console.log("Colunas:", partA.headers.length, "oficial /", partB.headers.length, "V7");

console.log("\n--- Camada 2: Universo (LOJA+SEQPRODUTO) ---");
console.log("Chaves oficial:", mapA.map.size, "| V7:", mapB.map.size);
console.log("Em ambos:", matchingKeys, "| só oficial:", onlyA, "| só V7:", onlyB);

console.log("\n--- Camada 3: Colunas mapeáveis (excl. PQ) ---");
const l3 = compareLayer(keysA, mapA.map, mapB.map, colsMapeaveis);
console.log("Cols:", colsMapeaveis.length);
console.log("Células:", l3.cellsCompared, "| iguais:", l3.cellsMatch, "| divergentes:", l3.cellsCompared - l3.cellsMatch);

console.log("\n--- Camada 4: Todas colunas comuns ---");
const l4 = compareLayer(keysA, mapA.map, mapB.map, commonCols.filter((c) => !KEY_COLS.includes(c)));
console.log("Células:", l4.cellsCompared, "| iguais:", l4.cellsMatch, "| divergentes:", l4.cellsCompared - l4.cellsMatch);

console.log("\n========== DECISÃO POR CAMADA ==========");
const dec = (ok, warn) => (ok ? "APP OK" : warn ? "APP RESSALVAS" : "APP NOT OK");
console.log("Schema:   ", dec(headersMatchOrder, !headersMatchOrder && commonCols.length === 62));
console.log("Universo: ", dec(onlyA === 0 && onlyB === 0, onlyB > 0 || onlyA > 0));
console.log("Mapeável: ", dec(l3.diffs.length === 0, l3.cellsMatch / Math.max(1, l3.cellsCompared) > 0.8));
console.log("Completo: ", dec(l4.diffs.length === 0, false));

if (l3.diffs.length) {
  console.log("\nPrimeiras diferenças (mapeáveis):");
  l3.diffs.forEach((d, i) => {
    console.log(`${i + 1}. LOJA=${d.loja} SEQ=${d.seq} | ${d.col} | A="${d.valA}" vs B="${d.valB}"`);
  });
}

// PENDCPA amostra
const pendDiffs = [];
for (const k of keysA) {
  if (!keysB.has(k)) continue;
  const a = mapA.map.get(k).row.PENDCPA;
  const b = mapB.map.get(k).row.PENDCPA;
  if (!cellEqual(a, b)) pendDiffs.push({ k, a, b });
  if (pendDiffs.length >= 50) break;
}
if (pendDiffs.length) {
  const outPath = path.join(__dirname, "../architecture/hibrido-v7/pendcpa-amostra-50.json");
  fs.writeFileSync(outPath, JSON.stringify({ amostra: pendDiffs.length, itens: pendDiffs }, null, 2));
  console.log("\nPENDCPA: amostra", pendDiffs.length, "divergências →", outPath);
}
