import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorProdutoLojaConsolidado } from "../../motor/consolidar/consolidacaoTypes.ts";
import { gerarGestaoLoja } from "../../motor/export/hibrido/gerarGestaoLoja.ts";
import { normalizarProdutoGestaoExport } from "../../ruptura-v7/services/hibrido/normalizarProdutoGestaoExport.ts";
import { produtoParaBaseCompradorLinha } from "../../ruptura-v7/utils/mapearBaseCompradorFromGestao.ts";

describe("grupoN3 / CATEGORIA no JSON híbrido", () => {
  it("publica grupoN3 explicitamente no gestao.json novo", () => {
    const item = {
      loja: 73,
      seqproduto: 43273,
      grupoN3: "BISCOITOS",
      categoriaN1: "MERCEARIA LEGADO",
    } as MotorProdutoLojaConsolidado;

    const resultado = gerarGestaoLoja([item], {
      regional: "MT",
      bandeira: "COMPER",
      loja: 73,
      dataReferencia: "2026-07-13",
      versao: 1,
    });

    assert.equal(resultado.gestao.produtos[0]?.grupoN3, "BISCOITOS");
  });

  it("normaliza grupoN3 camelCase e snake_case", () => {
    assert.equal(normalizarProdutoGestaoExport({ grupoN3: "BEBIDAS" }).grupoN3, "BEBIDAS");
    assert.equal(normalizarProdutoGestaoExport({ grupo_n3: "HIGIENE" }).grupoN3, "HIGIENE");
  });

  it("usa categoriaN1 apenas como fallback de JSON antigo", () => {
    const antigo = normalizarProdutoGestaoExport({
      loja: 73,
      seqproduto: 612480,
      categoriaN1: "LEGADO",
    });
    assert.equal(antigo.grupoN3, null);
    assert.equal(produtoParaBaseCompradorLinha(antigo).categoria, "LEGADO");
  });

  it("não substitui grupoN3 válido por categoriaN1 ou null", () => {
    const atual = normalizarProdutoGestaoExport({
      loja: 73,
      seqproduto: 43273,
      grupoN3: "CATEGORIA OFICIAL",
      categoriaN1: "LEGADO",
    });
    assert.equal(produtoParaBaseCompradorLinha(atual).categoria, "CATEGORIA OFICIAL");
  });
});
