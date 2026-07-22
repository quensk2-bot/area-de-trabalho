const fs = require("fs");
const path = require("path");
const X = require("C:/area-de-trabalho-v7/adm/node_modules/xlsx");

const DIR = "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO/";
const FILE_A = path.join(DIR, "ARQUIVO CONFERENCIA RESULTADO.xlsx");
const FILE_B = path.join(DIR, "IMPORTADO 2.xlsx");
const SHEET_A = "Plan1";
const SHEET_B = "BASE";
const KEY_COLS = ["LOJA", "SEQPRODUTO"];
const MAX_DIFFS = 20;

function normKeyPart(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return String(v);
  }
  const s = String(v).trim();
  if (/^-?\d+\.0+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

function makeKey(row) {
  return KEY_COLS.map((c) => normKeyPart(row[c])).join("\u0001");
}

function cellEqual(a, b, col) {
  const na = a == null || a === "";
  const nb = b == null || b === "";
  if (na && nb) return true;
  if (na !== nb) return false;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a === b) return true;
      const diff = Math.abs(a - b);
      if (diff <= 1e-9) return true;
      return false;
    }
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return String(a).trim() === String(b).trim();
}

function formatVal(v) {
  if (v == null) return "(vazio)";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v);
}

function sheetToRows(wb, sheetName) {
  const sh = wb.Sheets[sheetName];
  if (!sh) return { headers: [], rows: [], error: "sheet missing" };
  const data = X.utils.sheet_to_json(sh, { defval: null, raw: true, dateNF: "yyyy-mm-dd" });
  const headers = data.length ? Object.keys(data[0]) : [];
  return { headers, rows: data };
}

function readWorkbookMeta(filePath) {
  const wb = X.readFile(filePath, { cellDates: true });
  const meta = { sheets: {} };
  for (const name of wb.SheetNames) {
    const sh = wb.Sheets[name];
    const ref = sh["!ref"];
    let rowCount = 0;
    let colCount = 0;
    if (ref) {
      const r = X.utils.decode_range(ref);
      rowCount = r.e.r - r.s.r + 1;
      colCount = r.e.c - r.s.c + 1;
    }
    meta.sheets[name] = { rowCount, colCount };
  }
  return { wb, meta };
}

console.log("=== VALIDAÇÃO RUPTURA V7 — COMPARATIVO XLSX ===\n");
console.log("Arquivo A (oficial):", FILE_A);
console.log("Arquivo B (V7):     ", FILE_B);
const statA = fs.statSync(FILE_A);
const statB = fs.statSync(FILE_B);
console.log("Tamanho A:", statA.size, "bytes");
console.log("Tamanho B:", statB.size, "bytes\n");

const { wb: wbA, meta: metaA } = readWorkbookMeta(FILE_A);
const { wb: wbB, meta: metaB } = readWorkbookMeta(FILE_B);

console.log("--- Abas ---");
console.log("A:", JSON.stringify(wbA.SheetNames));
console.log("B:", JSON.stringify(wbB.SheetNames));
const sheetsOnlyA = wbA.SheetNames.filter((s) => !wbB.SheetNames.includes(s));
const sheetsOnlyB = wbB.SheetNames.filter((s) => !wbA.SheetNames.includes(s));
console.log("Somente em A:", sheetsOnlyA.length ? sheetsOnlyA.join(", ") : "(nenhuma)");
console.log("Somente em B:", sheetsOnlyB.length ? sheetsOnlyB.join(", ") : "(nenhuma)");

console.log("\n--- Contagens por aba (incl. cabeçalho se houver linha no range) ---");
for (const n of new Set([...wbA.SheetNames, ...wbB.SheetNames])) {
  const a = metaA.sheets[n];
  const b = metaB.sheets[n];
  console.log(`  ${n}: A=${a ? a.rowCount + "x" + a.colCount : "—"} | B=${b ? b.rowCount + "x" + b.colCount : "—"}`);
}

console.log("\n--- Carregando dados principais ---");
console.log(`A: ${SHEET_A}, B: ${SHEET_B}`);
const partA = sheetToRows(wbA, SHEET_A);
const partB = sheetToRows(wbB, SHEET_B);

const headersA = partA.headers;
const headersB = partB.headers;
console.log("\n--- Cabeçalhos (ordem) ---");
console.log("Colunas A:", headersA.length);
console.log("Colunas B:", headersB.length);
const headersMatchOrder = headersA.length === headersB.length && headersA.every((h, i) => h === headersB[i]);
console.log("Ordem idêntica:", headersMatchOrder ? "SIM" : "NÃO");

const setA = new Set(headersA);
const setB = new Set(headersB);
const onlyInA = headersA.filter((h) => !setB.has(h));
const onlyInB = headersB.filter((h) => !setA.has(h));
const commonCols = headersA.filter((h) => setB.has(h));
console.log("Colunas só em A:", onlyInA.length ? onlyInA.join(", ") : "(nenhuma)");
console.log("Colunas só em B:", onlyInB.length ? onlyInB.join(", ") : "(nenhuma)");
console.log("Colunas em comum:", commonCols.length);

if (!headersMatchOrder) {
  console.log("\nDiferença de ordem (primeiras divergências):");
  const max = Math.max(headersA.length, headersB.length);
  let shown = 0;
  for (let i = 0; i < max && shown < 10; i++) {
    const ha = headersA[i] ?? "(ausente)";
    const hb = headersB[i] ?? "(ausente)";
    if (ha !== hb) {
      console.log(`  pos ${i + 1}: A="${ha}" | B="${hb}"`);
      shown++;
    }
  }
}

const rowsA = partA.rows;
const rowsB = partB.rows;
console.log("\n--- Linhas de dados (sheet_to_json) ---");
console.log("Linhas A:", rowsA.length);
console.log("Linhas B:", rowsB.length);

const mapA = new Map();
const mapB = new Map();
const dupA = [];
const dupB = [];

for (let i = 0; i < rowsA.length; i++) {
  const k = makeKey(rowsA[i]);
  if (mapA.has(k)) dupA.push({ i: i + 2, k });
  else mapA.set(k, { row: rowsA[i], excelRow: i + 2 });
}
for (let i = 0; i < rowsB.length; i++) {
  const k = makeKey(rowsB[i]);
  if (mapB.has(k)) dupB.push({ i: i + 2, k });
  else mapB.set(k, { row: rowsB[i], excelRow: i + 2 });
}

console.log("\n--- Chaves LOJA + SEQPRODUTO ---");
console.log("Chaves únicas A:", mapA.size);
console.log("Chaves únicas B:", mapB.size);
console.log("Duplicatas A:", dupA.length);
console.log("Duplicatas B:", dupB.length);

const keysA = new Set(mapA.keys());
const keysB = new Set(mapB.keys());
let onlyKeysA = 0;
let onlyKeysB = 0;
for (const k of keysA) if (!keysB.has(k)) onlyKeysA++;
for (const k of keysB) if (!keysA.has(k)) onlyKeysB++;
const matchingKeys = mapA.size - onlyKeysA;

console.log("Chaves em ambos:", matchingKeys);
console.log("Chaves só em A:", onlyKeysA);
console.log("Chaves só em B:", onlyKeysB);

const compareCols = commonCols.filter((c) => !KEY_COLS.includes(c));
const diffs = [];
let cellsCompared = 0;
let cellsMatch = 0;

for (const k of keysA) {
  if (!keysB.has(k)) continue;
  const { row: ra, excelRow: rowNumA } = mapA.get(k);
  const { row: rb, excelRow: rowNumB } = mapB.get(k);
  for (const col of compareCols) {
    cellsCompared++;
    const va = ra[col];
    const vb = rb[col];
    if (cellEqual(va, vb, col)) {
      cellsMatch++;
    } else {
      if (diffs.length < MAX_DIFFS) {
        const parts = k.split("\u0001");
        diffs.push({
          sheetA: SHEET_A,
          sheetB: SHEET_B,
          rowA: rowNumA,
          rowB: rowNumB,
          loja: parts[0],
          seq: parts[1],
          col,
          valA: formatVal(va),
          valB: formatVal(vb),
        });
      }
    }
  }
}

let schemaIdentical = headersMatchOrder && onlyInA.length === 0 && onlyInB.length === 0;
let dataIdentical =
  rowsA.length === rowsB.length &&
  onlyKeysA === 0 &&
  onlyKeysB === 0 &&
  dupA.length === 0 &&
  dupB.length === 0 &&
  diffs.length === 0 &&
  cellsCompared === cellsMatch;

const identical = schemaIdentical && dataIdentical && sheetsOnlyA.length === 0 && sheetsOnlyB.length === 0;

let decision = "INCONCLUSIVO";
if (identical) decision = "APP OK";
else if (onlyKeysA > 0 || onlyKeysB > 0 || diffs.length > 0 || rowsA.length !== rowsB.length) decision = "APP NOT OK";
else if (onlyInA.length || onlyInB.length || !headersMatchOrder) decision = "APP NOT OK";

console.log("\n========== RESULTADO ==========");
console.log("IDENTICAL:", identical ? "SIM" : "NÃO");
console.log("Decisão:", decision);
console.log("\nResumo:");
console.log(`  Linhas dados: A=${rowsA.length}, B=${rowsB.length}`);
console.log(`  Colunas: A=${headersA.length}, B=${headersB.length}, comum=${commonCols.length}`);
console.log(`  Chaves coincidentes: ${matchingKeys}`);
console.log(`  Chaves divergentes: só A=${onlyKeysA}, só B=${onlyKeysB}`);
console.log(`  Células comparadas (chaves comuns, cols alinhadas): ${cellsCompared}`);
console.log(`  Células iguais: ${cellsMatch}`);
console.log(`  Células divergentes (amostra max ${MAX_DIFFS}): ${cellsCompared - cellsMatch}`);

if (!identical && diffs.length) {
  console.log("\nPrimeiras diferenças (até 20):");
  diffs.forEach((d, idx) => {
    console.log(
      `${idx + 1}. aba A=${d.sheetA} lin ${d.rowA} / aba B=${d.sheetB} lin ${d.rowB} | LOJA=${d.loja} SEQ=${d.seq} | col "${d.col}" | A="${d.valA}" vs B="${d.valB}"`
    );
  });
}

if (onlyKeysA > 0 && diffs.length < MAX_DIFFS) {
  console.log("\nAmostra chaves só em A (até 5):");
  let n = 0;
  for (const k of keysA) {
    if (keysB.has(k)) continue;
    const p = k.split("\u0001");
    console.log(`  LOJA=${p[0]} SEQPRODUTO=${p[1]}`);
    if (++n >= 5) break;
  }
}
if (onlyKeysB > 0 && diffs.length < MAX_DIFFS) {
  console.log("\nAmostra chaves só em B (até 5):");
  let n = 0;
  for (const k of keysB) {
    if (keysA.has(k)) continue;
    const p = k.split("\u0001");
    console.log(`  LOJA=${p[0]} SEQPRODUTO=${p[1]}`);
    if (++n >= 5) break;
  }
}

