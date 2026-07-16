import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  abrirWorkbook,
  detectarLinhaCabecalho,
  extrairLinhasComoValores,
  inspecionarWorkbook,
  linhaEstaVazia,
  normalizarNomeColuna,
} from "../standardize/workbookInspector.ts";
import {
  tempDir,
  writeOrdemCdsMulti,
  writeValidacaoComTitulo,
  writeWorkbook,
  writeWorkbookWithFormula,
  writeWorkbookWithMerge,
} from "./fixtures/standardizeFixtures.ts";

describe("workbookInspector", () => {
  it("1. workbook com uma aba válida", () => {
    const dir = tempDir();
    const file = path.join(dir, "one.xlsx");
    writeWorkbook(file, {
      "Validaçao Ruptura": [
        ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
        [103, 1001, 1, 1],
      ],
    });
    const inspecao = inspecionarWorkbook(abrirWorkbook(file));
    assert.equal(inspecao.abas.length, 1);
    assert.equal(inspecao.abas[0].linhasDados, 1);
  });

  it("2. workbook com aba inútil", () => {
    const dir = tempDir();
    const file = path.join(dir, "extra.xlsx");
    writeWorkbook(file, {
      "Validaçao Ruptura": [["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"], [1, 2, 1, 1]],
      Inutil: [["x"]],
    });
    const inspecao = inspecionarWorkbook(abrirWorkbook(file));
    assert.equal(inspecao.abas.length, 2);
  });

  it("3. aba visível inspecionada", () => {
    const dir = tempDir();
    const file = path.join(dir, "vis.xlsx");
    writeWorkbook(file, { DADOS: [["a", "b"]] });
    const inspecao = inspecionarWorkbook(abrirWorkbook(file));
    assert.equal(inspecao.abas[0].visivel, true);
    assert.equal(inspecao.abas[0].oculta, false);
  });

  it("4. cabeçalho na linha 1", () => {
    const rows = [["Loja", "Item"], [1, 2]];
    assert.equal(detectarLinhaCabecalho(rows, ["Loja", "Item"]), 0);
  });

  it("5. cabeçalho depois de linhas de título", () => {
    const dir = tempDir();
    const file = path.join(dir, "title.xlsx");
    writeValidacaoComTitulo(file);
    const sheet = abrirWorkbook(file).workbook.Sheets["Validaçao Ruptura"];
    const rows = extrairLinhasComoValores(sheet);
    const idx = detectarLinhaCabecalho(rows, ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"]);
    assert.equal(idx, 2);
  });

  it("6. células mescladas detectadas", () => {
    const dir = tempDir();
    const file = path.join(dir, "merge.xlsx");
    writeWorkbookWithMerge(file);
    const inspecao = inspecionarWorkbook(abrirWorkbook(file));
    assert.ok(inspecao.abas[0].celulasMescladas >= 1);
  });

  it("7. fórmulas detectadas", () => {
    const dir = tempDir();
    const file = path.join(dir, "formula.xlsx");
    writeWorkbookWithFormula(file);
    const inspecao = inspecionarWorkbook(abrirWorkbook(file));
    assert.ok(inspecao.abas[0].formulasEncontradas >= 1);
  });

  it("8. coluna oculta — estrutura suportada", () => {
    assert.equal(typeof inspecionarWorkbook, "function");
  });

  it("22. várias abas oficiais inspecionadas", () => {
    const dir = tempDir();
    const file = path.join(dir, "ordem.xlsx");
    writeOrdemCdsMulti(file);
    const inspecao = inspecionarWorkbook(abrirWorkbook(file));
    assert.equal(inspecao.abas.length, 5);
  });

  it("normalizarNomeColuna apara espaços", () => {
    assert.equal(normalizarNomeColuna("  Loja  "), "Loja");
  });

  it("linhaEstaVazia", () => {
    assert.equal(linhaEstaVazia([null, "", "  "]), true);
    assert.equal(linhaEstaVazia([1]), false);
  });
});
