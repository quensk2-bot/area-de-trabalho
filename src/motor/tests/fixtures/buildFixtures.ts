import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import iconv from "iconv-lite";
import XLSX from "xlsx";
import { HEADER_GRUPO_RUPTURA_57 } from "../../constants/headers.ts";
import {
  VALIDACAO_COL_ITEM,
  VALIDACAO_COL_LOJA,
  VALIDACAO_COL_RUPTURA,
  VALIDACAO_COL_RUPTURA_MIX,
  VALIDACAO_SHEET_NAME,
} from "../../constants/headers.ts";

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));

function rowGrupo57(values: Partial<Record<string, string>>): string {
  return HEADER_GRUPO_RUPTURA_57.map((h) => values[h] ?? "").join(";");
}

export function buildGrupoRuptura1Sample(): string {
  const header = HEADER_GRUPO_RUPTURA_57.join(";");
  const r1 = rowGrupo57({
    DIVISAO: "NORDESTE",
    LOJA: "103",
    SEQPRODUTO: "2505088",
    DESCCOMPLETA: "PRODUTO TESTE",
    CODFORN: "1001",
    RAZAO: "FORNECEDOR A",
    STATUS: "ATIVO",
    MEDIAVENDAUNDIA: "1,5",
    MEDIAVENDAGP: "2,0",
    ESTOQUE: "10",
    PARMIN: "1",
    PARMAX: "5",
    PENDCPA: "0",
    EMBCPA: "CX",
    CATEGORIA: "60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL \\ CREME DENTAL \\ GEL",
    STATUS_COMPRA_CD1: "COMPRAR",
    ESTQ_CD1: "100",
    PENDCD_CD1: "0",
    DIAS_DA_COMPRACD1: "10",
    DIAS_RECEBTO_CD1: "3",
    ULTIMA_ENTRADALOJA: "01/02/2026",
    ULTIMA_SAIDALOJA: "01/03/2026",
    DIAS_RUPTURA: "7",
    FAMILIA: "100",
    CUSTO_LIQUIDO: "10,50",
  });
  const r2 = rowGrupo57({
    DIVISAO: "NORDESTE",
    LOJA: "104",
    SEQPRODUTO: "2451050",
    DESCCOMPLETA: "PRODUTO B",
    CODFORN: "1002",
    RAZAO: "FORNECEDOR B",
    STATUS: "ATIVO",
    MEDIAVENDAUNDIA: "0,8",
    CATEGORIA: "60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL",
  });
  return `${header}\n${r1}\n${r2}\n`;
}

export function buildGrupoCds2Sample(): string {
  const header = HEADER_GRUPO_RUPTURA_57.join(";");
  const r1 = rowGrupo57({
    SEQPRODUTO: "2505088",
    DESCCOMPLETA: "PROD CD5",
    STATUS_COMPRA_CD1: "COMPRAR_CD5",
    ESTQ_CD1: "500",
    PENDCD_CD1: "10",
    DIAS_DA_COMPRACD1: "12",
    DIAS_RECEBTO_CD1: "5",
    ULTIMACPACD1: "01/05/2026",
  });
  const r2 = rowGrupo57({
    SEQPRODUTO: "2451050",
    DESCCOMPLETA: "PROD CD5 B",
    STATUS_COMPRA_CD1: "PARAR",
    ESTQ_CD1: "200",
    PENDCD_CD1: "5",
    DIAS_DA_COMPRACD1: "8",
    DIAS_RECEBTO_CD1: "3",
  });
  return `${header}\n${r1}\n${r2}\n`;
}

export function buildGrupoRupturaSemQuebraFinal(): string {
  const header = HEADER_GRUPO_RUPTURA_57.join(";");
  const r1 = rowGrupo57({
    DIVISAO: "NORDESTE",
    LOJA: "103",
    SEQPRODUTO: "2505088",
    DESCCOMPLETA: "PRODUTO SEM QUEBRA",
  });
  return `${header}\n${r1}`;
}

export function buildGrupoRupturaHeaderErrado(): string {
  const header = HEADER_GRUPO_RUPTURA_57.map((h, i) => (i === 0 ? "DIVISAO_ERRADA" : h)).join(";");
  const r1 = rowGrupo57({
    DIVISAO: "NORDESTE",
    LOJA: "103",
    SEQPRODUTO: "2505088",
    DESCCOMPLETA: "PRODUTO A",
  });
  return `${header}\n${r1}\n`;
}

export function buildInventarioSample(): string {
  return [
    "Coluna Extra;Código Empresa;Código Produto;Qtd Saída Outras;Outro Campo",
    "X;103;2505088;1,5;Y",
    "X;103;2505088;2,0;Y",
    "X;104;2505088;1;Y",
    "X;104;2505088;1;Y",
  ].join("\n") + "\n";
}

export function buildValidacaoXlsx(): void {
  const rows = [
    {
      [VALIDACAO_COL_LOJA]: 103,
      [VALIDACAO_COL_ITEM]: 2505088,
      [VALIDACAO_COL_RUPTURA_MIX]: 1,
      [VALIDACAO_COL_RUPTURA]: 0,
    },
    {
      [VALIDACAO_COL_LOJA]: 104,
      [VALIDACAO_COL_ITEM]: 2451050,
      [VALIDACAO_COL_RUPTURA_MIX]: 0,
      [VALIDACAO_COL_RUPTURA]: 1,
    },
    {
      [VALIDACAO_COL_LOJA]: 105,
      [VALIDACAO_COL_ITEM]: 2051915,
      [VALIDACAO_COL_RUPTURA_MIX]: 0,
      [VALIDACAO_COL_RUPTURA]: 0,
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, VALIDACAO_SHEET_NAME);
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, "validacao_ruptura_sample.xlsx"));
}

export function writeFixtures(): void {
  fs.writeFileSync(path.join(FIXTURES_DIR, "grupo_ruptura_1_sample.txt"), buildGrupoRuptura1Sample(), "utf8");
  fs.writeFileSync(path.join(FIXTURES_DIR, "grupo_cds_2_sample.txt"), buildGrupoCds2Sample(), "utf8");
  fs.writeFileSync(
    path.join(FIXTURES_DIR, "grupo_ruptura_sem_quebra_final.txt"),
    buildGrupoRupturaSemQuebraFinal(),
    "utf8",
  );
  fs.writeFileSync(
    path.join(FIXTURES_DIR, "grupo_ruptura_header_errado.txt"),
    buildGrupoRupturaHeaderErrado(),
    "utf8",
  );
  fs.writeFileSync(
    path.join(FIXTURES_DIR, "inventario_lojas_sample.txt"),
    iconv.encode(buildInventarioSample(), "win1252"),
  );
  buildValidacaoXlsx();
}

if (process.argv[1]?.includes("buildFixtures")) {
  writeFixtures();
  console.log("Fixtures regeneradas.");
}
