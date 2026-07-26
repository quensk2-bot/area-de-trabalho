/**
 * Teste de parsing dos campos de ativação e ULTIMACPALOJA.
 *
 * Valida que:
 * - DTA_ULTATIVACAO (timestamp) é preservada como string pelo parser
 * - ULTIMACPALOJA (numérico em dias) é convertido corretamente para número
 * - ULTIMACPACD1..4 são convertidos para números
 * - Campos vazios viram null
 * - O transform inteiro funciona com os novos campos
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import type { MotorLinhaGrupoRuptura } from "../types/motorLinhaTypes.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function linhaBase(overrides: Partial<MotorLinhaGrupoRuptura> = {}): MotorLinhaGrupoRuptura {
  return {
    numeroLinha: 1,
    divisao: "60",
    loja: "73",
    seqproduto: "12345",
    descricao: "PRODUTO TESTE",
    codFornecedor: "725951",
    fornecedor: "FORNECEDOR TESTE LTDA",
    status: null,
    mediaVendaUnDia: "10",
    mediaVendaGp: "10",
    estoque: "5",
    parMin: "2",
    parMax: "10",
    pendencia: "0",
    embalagemCompra: null,
    categoriaOriginal: "ALIMENTAÇÃO BÁSICA",
    statusCompraCd1: null,
    statusCompraCd2: null,
    statusCompraCd3: null,
    statusCompraCd4: null,
    estoqueCd1: null,
    estoqueCd2: null,
    estoqueCd3: null,
    estoqueCd4: null,
    pendenciaCd1: null,
    pendenciaCd2: null,
    pendenciaCd3: null,
    pendenciaCd4: null,
    diasAtivacaoGeral: null,
    dataAtivacaoGeral: null,
    dtaUltAtivacao: null,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    diasCompraLj: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRuptura: "45",
    ultimaCpaLoja: null,
    ultimaCpaCd1: null,
    ultimaCpaCd2: null,
    ultimaCpaCd3: null,
    ultimaCpaCd4: null,
    familia: null,
    custoLiquido: null,
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    dtaUltEntradaCd1: null,
    dtaUltEntradaCd2: null,
    dtaUltEntradaCd3: null,
    dtaUltEntradaCd4: null,
    hierarquia: {
      setor: null,
      setorCodigo: null,
      setor2: null,
      categoria: null,
      grupo: null,
      subgrupo: null,
      tipo: null,
      ambiguidade: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("Transform: DTA_ULTATIVACAO como string preservada", () => {
  it("timestamp ERP preenchido → passa pelo transform como string", () => {
    const linha = linhaBase({
      dtaUltAtivacao: "2015-10-22-00.00.00.000000",
    });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0, "não deve gerar erros");
    assert.equal(itens.length, 1);
    assert.equal(itens[0].dtaUltAtivacao, "2015-10-22-00.00.00.000000");
  });

  it("DTA_ULTATIVACAO vazio → null no normalizado", () => {
    const linha = linhaBase({ dtaUltAtivacao: "" });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].dtaUltAtivacao, null);
  });

  it("DTA_ULTATIVACAO ausente (null) → null no normalizado", () => {
    const linha = linhaBase({ dtaUltAtivacao: null });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].dtaUltAtivacao, null);
  });
});

describe("Transform: ULTIMACPALOJA como número (dias)", () => {
  it("ULTIMACPALOJA = '14' → número 14", () => {
    const linha = linhaBase({ ultimaCpaLoja: "14" });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].ultimaCpaLoja, 14);
  });

  it("ULTIMACPALOJA = vazio → null", () => {
    const linha = linhaBase({ ultimaCpaLoja: "" });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].ultimaCpaLoja, null);
  });

  it("ULTIMACPALOJA = null → null", () => {
    const linha = linhaBase({ ultimaCpaLoja: null });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].ultimaCpaLoja, null);
  });

  it("ULTIMACPALOJA decimal → número (parseDecimalBr suporta)", () => {
    const linha = linhaBase({ ultimaCpaLoja: "25" });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].ultimaCpaLoja, 25);
  });
});

describe("Transform: ULTIMACPACD1..4 como números", () => {
  it("todos preenchidos → números", () => {
    const linha = linhaBase({
      ultimaCpaLoja: "5",
      ultimaCpaCd1: "10",
      ultimaCpaCd2: "20",
      ultimaCpaCd3: "30",
      ultimaCpaCd4: "40",
    });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].ultimaCpaCd1, 10);
    assert.equal(itens[0].ultimaCpaCd2, 20);
    assert.equal(itens[0].ultimaCpaCd3, 30);
    assert.equal(itens[0].ultimaCpaCd4, 40);
  });

  it("vazios → null", () => {
    const linha = linhaBase({
      ultimaCpaLoja: "5",
      ultimaCpaCd1: "",
      ultimaCpaCd2: "",
      ultimaCpaCd3: "",
      ultimaCpaCd4: "",
    });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].ultimaCpaCd1, null);
    assert.equal(itens[0].ultimaCpaCd2, null);
    assert.equal(itens[0].ultimaCpaCd3, null);
    assert.equal(itens[0].ultimaCpaCd4, null);
  });
});

describe("Transform: Campos não relacionados permanecem intactos", () => {
  it("outros campos como estoque, mediaVenda etc continuam funcionando", () => {
    const linha = linhaBase({
      estoque: "15,5",
      mediaVendaUnDia: "8,3",
      parMin: "2",
      parMax: "12",
      estoqueCd1: "1",
      estoqueCd2: "0",
      diasRecebtoCd1: "3",
    });
    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].estoqueLoja, 15.5);
    assert.equal(itens[0].mediaVendaUnDia, 8.3);
    assert.equal(itens[0].parMin, 2);
    assert.equal(itens[0].parMax, 12);
    assert.equal(itens[0].estoqueCd1, 1);
    assert.equal(itens[0].estoqueCd2, 0);
    assert.equal(itens[0].diasRecebtoCd1, 3);
  });
});

describe("Cadeia completa com dados reais", () => {
  it("linha com DTA_ULTATIVACAO real + ULTIMACPALOJA real → ambos no normalizado", () => {
    // Simula uma linha real com dados observados no TXT
    const linha = linhaBase({
      numeroLinha: 42,
      divisao: "62",
      loja: "73",
      seqproduto: "1523864",
      descricao: "MARGARINA QUALY 500G",
      codFornecedor: "101010",
      fornecedor: "FORNECEDOR TESTE",
      dtaUltAtivacao: "2015-10-22-00.00.00.000000",
      ultimaCpaLoja: "14",
      diasRuptura: "60",
      estoque: "3",
      mediaVendaUnDia: "12,5",
    });

    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens.length, 1);

    const item = itens[0];
    // Campos de ativação
    assert.equal(item.dtaUltAtivacao, "2015-10-22-00.00.00.000000");
    assert.equal(item.ultimaCpaLoja, 14);
    // Campos relacionados
    assert.equal(item.loja, 73);
    assert.equal(item.seqproduto, 1523864);
    assert.equal(item.diasRuptura, 60);
    // Campos normais preservados
    assert.equal(item.estoqueLoja, 3);
    assert.equal(item.mediaVendaUnDia, 12.5);
  });

  it("linha com ULTIMACPALOJA vazio e DTA vazio → ambos null", () => {
    const linha = linhaBase({
      dtaUltAtivacao: "",
      ultimaCpaLoja: "",
      diasRuptura: "45",
    });

    const { itens, erros } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(erros.length, 0);
    assert.equal(itens[0].dtaUltAtivacao, null);
    assert.equal(itens[0].ultimaCpaLoja, null);
  });
});
