import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { limparAba } from "../standardize/workbookCleaner.ts";
import { validacaoRupturaContract } from "../standardize/standards/validacaoRupturaContract.ts";
import {
  tempDir,
  writeValidacaoComDuplicata,
  writeValidacaoComTitulo,
  writeValidacaoDecimal,
  writeValidacaoHeadersEspacos,
  writeWorkbook,
} from "./fixtures/standardizeFixtures.ts";
import { abrirWorkbook, extrairLinhasComoValores } from "../standardize/workbookInspector.ts";

const abaContrato = validacaoRupturaContract.abas[0];

describe("workbookCleaner", () => {
  it("9. linha vazia removida", () => {
    const rows = [
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
      [103, 1001, 1, 1],
      [null, null, null, null],
    ];
    const r = limparAba(rows, abaContrato);
    assert.equal(r.linhas.length, 1);
    assert.equal(r.linhasVaziasRemovidas, 1);
  });

  it("10. coluna vazia — linha com dados parciais preservada", () => {
    const rows = [
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura", ""],
      [103, 1001, 1, 1, null],
    ];
    const r = limparAba(rows, abaContrato);
    assert.equal(r.linhas.length, 1);
  });

  it("11. duplicidade removida", () => {
    const dir = tempDir();
    const file = path.join(dir, "dup.xlsx");
    writeValidacaoComDuplicata(file);
    const sheet = abrirWorkbook(file).workbook.Sheets["Validaçao Ruptura"];
    const r = limparAba(extrairLinhasComoValores(sheet), abaContrato);
    assert.equal(r.duplicidadesRemovidas, 1);
    assert.equal(r.linhas.length, 1);
  });

  it("13. cabeçalho com espaços normalizado", () => {
    const dir = tempDir();
    const file = path.join(dir, "spaces.xlsx");
    writeValidacaoHeadersEspacos(file);
    const sheet = abrirWorkbook(file).workbook.Sheets["Validaçao Ruptura"];
    const r = limparAba(extrairLinhasComoValores(sheet), abaContrato);
    assert.equal(r.linhas.length, 1);
    assert.ok("Loja" in r.cabecalhosNormalizados);
  });

  it("14. data preservada como texto quando coluna text", () => {
    const rows = [
      ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
      [103, 1001, 1, 1],
    ];
    const r = limparAba(rows, abaContrato);
    assert.equal(r.linhas[0].Loja, 103);
  });

  it("15. decimal normalizado em coluna int", () => {
    const dir = tempDir();
    const file = path.join(dir, "dec.xlsx");
    writeValidacaoDecimal(file);
    const sheet = abrirWorkbook(file).workbook.Sheets["Validaçao Ruptura"];
    const r = limparAba(extrairLinhasComoValores(sheet), abaContrato);
    assert.equal(r.linhas[0]["Qtd Item Ruptura no Mix"], 1);
  });

  it("16. código com zero inicial preservado como texto em campo int truncado", () => {
    const dir = tempDir();
    const file = path.join(dir, "zero.xlsx");
    writeWorkbook(file, {
      "Validaçao Ruptura": [
        ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
        ["0103", "0001001", 1, 1],
      ],
    });
    const sheet = abrirWorkbook(file).workbook.Sheets["Validaçao Ruptura"];
    const r = limparAba(extrairLinhasComoValores(sheet), abaContrato);
    assert.equal(r.linhas[0].Loja, 103);
    assert.equal(r.linhas[0].Item, 1001);
  });

  it("5 título — limpeza após scan", () => {
    const dir = tempDir();
    const file = path.join(dir, "titulo.xlsx");
    writeValidacaoComTitulo(file);
    const sheet = abrirWorkbook(file).workbook.Sheets["Validaçao Ruptura"];
    const r = limparAba(extrairLinhasComoValores(sheet), abaContrato);
    assert.equal(r.linhas.length, 2);
  });
});
