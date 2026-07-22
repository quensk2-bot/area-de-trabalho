#!/usr/bin/env node
/** Auditoria universo V7 vs oficial — classifica produtos só-V7. */
const fs = require("fs");
const path = require("path");
const X = require(path.join(__dirname, "../node_modules/xlsx"));

const DIR = "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO/";
const FILE_A = path.join(DIR, "ARQUIVO CONFERENCIA RESULTADO.xlsx");
const FILE_B = path.join(DIR, "IMPORTADO 2.xlsx");

function normKeyPart(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  const s = String(v).trim();
  if (/^-?\d+\.0+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

function makeKey(row) {
  return `${normKeyPart(row.LOJA)}\u0001${normKeyPart(row.SEQPRODUTO)}`;
}

function loadRows(file, sheet) {
  const wb = X.readFile(file, { cellDates: true });
  return X.utils.sheet_to_json(wb.Sheets[sheet], { defval: null, raw: true });
}

const rowsA = loadRows(FILE_A, "Plan1");
const rowsB = loadRows(FILE_B, "BASE");

const mapA = new Map(rowsA.map((r) => [makeKey(r), r]));
const mapB = new Map(rowsB.map((r) => [makeKey(r), r]));

const onlyB = [];
for (const [k, r] of mapB) {
  if (!mapA.has(k)) onlyB.push(r);
}

const byLoja = {};
const byClass = { curto: 0, medio: 0, longo: 0, indeterminado: 0 };
for (const r of onlyB) {
  const loja = r.LOJA;
  byLoja[loja] = (byLoja[loja] ?? 0) + 1;
  const cp = r["Curto Prazo"] === 1;
  const mp = r["Médio Prazo"] === 1;
  const lp = r["Longo Prazo"] === 1;
  if (cp) byClass.curto++;
  else if (mp) byClass.medio++;
  else if (lp) byClass.longo++;
  else byClass.indeterminado++;
}

const report = {
  geradoEm: new Date().toISOString(),
  oficial: { linhas: rowsA.length, chaves: mapA.size },
  v7: { linhas: rowsB.length, chaves: mapB.size },
  chavesEmAmbos: [...mapA.keys()].filter((k) => mapB.has(k)).length,
  chavesSoOficial: [...mapA.keys()].filter((k) => !mapB.has(k)).length,
  chavesSoV7: onlyB.length,
  classificacaoSoV7: byClass,
  lojasSoV7: Object.entries(byLoja)
    .map(([loja, qtd]) => ({ loja: Number(loja), qtd }))
    .sort((a, b) => b.qtd - a.qtd),
  amostraSoV7: onlyB.slice(0, 10).map((r) => ({ LOJA: r.LOJA, SEQPRODUTO: r.SEQPRODUTO, DESCCOMPLETA: r.DESCCOMPLETA })),
  modosExport: {
    integral: "Todos produtos publicados no JSON gestao (universo V7 completo)",
    oficial_compativel: "Filtrado às chaves LOJA+SEQPRODUTO do arquivo conferência",
  },
};

const out = path.join(__dirname, "../architecture/hibrido-v7/EXPORT-UNIVERSO-AUDITORIA.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
