import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";

export function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "motor-std-"));
}

export function writeWorkbook(filePath: string, sheets: Record<string, unknown[][]>): void {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  XLSX.writeFile(wb, filePath);
}

export function writeWorkbookWithFormula(filePath: string): void {
  const wb = XLSX.utils.book_new();
  const sheet: XLSX.WorkSheet = {
    A1: { t: "s", v: "Loja" },
    B1: { t: "s", v: "Item" },
    C1: { t: "s", v: "Qtd Item Ruptura no Mix" },
    D1: { t: "s", v: "Qtd Item Ruptura" },
    A2: { t: "n", v: 103 },
    B2: { t: "n", v: 1001 },
    C2: { t: "n", f: "1+0", v: 1 },
    D2: { t: "n", v: 1 },
  };
  sheet["!ref"] = "A1:D2";
  XLSX.utils.book_append_sheet(wb, sheet, "Validaçao Ruptura");
  XLSX.writeFile(wb, filePath);
}

export function writeWorkbookWithMerge(filePath: string): void {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Título Mesclado", null],
    ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
    [103, 1001, 1, 1],
  ]);
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, sheet, "Validaçao Ruptura");
  XLSX.writeFile(wb, filePath);
}

export function writeOrdemCdsMulti(filePath: string): void {
  writeWorkbook(filePath, {
    Ordem: [["DIVISÃO", "BANDEIRA", "UF", "1º", "2º", "3º", "4º", "5º"], ["NORDESTE", "FORT", "PE", 101, 102, 103, 104, 105]],
    Bandeira: [
      ["LOJA", "BANDEIRA", "TIPO LOJA"],
      [103, "FORT", "COMPACTA"],
    ],
    Sequência: [["DIVISÃO", "BANDEIRA", "UF", "CD", "ORDEM"], ["NORDESTE", "FORT", "PE", 101, "1º"]],
    Modalidade: [
      ["Column1", "Column2"],
      ["Modalidade", "Tipo Loja"],
      ["CD Teste", "COMPACTA"],
    ],
    Inutil: [["lixo"]],
  });
}

export function writeValidacaoComTitulo(filePath: string): void {
  writeWorkbook(filePath, {
    "Validaçao Ruptura": [
      ["Relatório de Ruptura"],
      [null, null, null, null],
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
      [103, 1001, 1, 1],
      [103, 1002, 1, 0],
    ],
  });
}

export function writeValidacaoComDuplicata(filePath: string): void {
  writeWorkbook(filePath, {
    "Validaçao Ruptura": [
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
      [103, 1001, 1, 1],
      [103, 1001, 1, 1],
    ],
  });
}

export function writeValidacaoColunaAusente(filePath: string): void {
  writeWorkbook(filePath, {
    "Validaçao Ruptura": [
      ["Loja", "Item"],
      [103, 1001],
    ],
  });
}

export function writeValidacaoHeadersEspacos(filePath: string): void {
  writeWorkbook(filePath, {
    "Validaçao Ruptura": [
      ["  Loja  ", " Item", "Qtd Item Ruptura no Mix ", " Qtd Item Ruptura"],
      [103, 1001, 1, 1],
    ],
  });
}

export function writeCsvValidacao(filePath: string): void {
  fs.writeFileSync(
    filePath,
    "Loja;Item;Qtd Item Ruptura no Mix;Qtd Item Ruptura\n103;1001;1;1\n",
    "utf8",
  );
}

export function writeValidacaoCodigoZero(filePath: string): void {
  writeWorkbook(filePath, {
    "Validaçao Ruptura": [
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
      ["0103", "0001001", 1, 1],
    ],
  });
}

export function writeValidacaoDecimal(filePath: string): void {
  writeWorkbook(filePath, {
    "Validaçao Ruptura": [
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
      [103, 1001, "1,5", 1],
    ],
  });
}
