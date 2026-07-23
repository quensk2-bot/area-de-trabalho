import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorBreItemInput } from "../bre/breTypes.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import { aplicarRuleBaseLimpa } from "../bre/rules/ruleBaseLimpa.ts";

function produtoBase(overrides: Partial<MotorProdutoLojaNormalizado> = {}): MotorProdutoLojaNormalizado {
  return {
    regional: "MT",
    dataReferencia: "2026-07-13",
    loja: 73,
    seqproduto: 2505088,
    descricao: "TESTE",
    codFornecedor: 1001,
    fornecedor: "FORN",
    statusProduto: "A",
    familia: null,
    mediaVendaUnDia: 1,
    mediaVendaGp: 1,
    estoqueLoja: 5,
    parMin: 1,
    parMax: 10,
    pendenciaLoja: 0,
    diasCompraLj: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    embalagemCompra: "UN",
    hierarquia: {
      categoriaOriginal: "60-MERCEARIA|34-PERFUMARIA|HIGIENE|",
      divisao: "60-MERCEARIA",
      setorN2: "34-PERFUMARIA",
      grupoN3: "HIGIENE",
      subgrupoN4: null,
      tipoN5: null,
      niveisEncontrados: 3,
      ambiguidade: null,
    },
    estoqueCd1: 10,
    estoqueCd2: 5,
    estoqueCd3: null,
    estoqueCd4: 2,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    statusCompraCd1: "A",
    statusCompraCd2: "A",
    statusCompraCd3: "A",
    statusCompraCd4: "A",
    diasRuptura: 3,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    custoLiquido: 1.5,
    alertas: [],
    ...overrides,
  };
}

function itemInput(overrides: Partial<MotorBreItemInput> = {}): MotorBreItemInput {
  return {
    produto: produtoBase(),
    cd5: null,
    validacao: {
      numeroLinha: 1,
      loja: 73,
      produto: 2505088,
      qtdItemRupturaNoMix: 1,
      qtdItemRuptura: 0,
      geraRuptura: true,
      ruptura104c: false,
    },
    inventario: null,
    ...overrides,
  };
}

describe("ruleBaseLimpa — alinhamento PQ Status Base Limpa", () => {
  it("1. match válido + Flag Ruptura compatível → Base Limpa", () => {
    const r = aplicarRuleBaseLimpa(itemInput());
    assert.equal(r.resultado, "Base Limpa");
    assert.equal(r.entradasUtilizadas.matchValidacaoRuptura, true);
    assert.equal(r.entradasUtilizadas.flagRupturaNull, false);
    assert.equal(r.entradasUtilizadas.flagRuptura, "Gera Ruptura");
    assert.equal(r.entradasUtilizadas.origemFlagRuptura, "validacao_ruptura_join");
  });

  it("2. sem match + Flag Ruptura null → Não considera Ruptura", () => {
    const r = aplicarRuleBaseLimpa(itemInput({ validacao: null }));
    assert.equal(r.resultado, "Não considera Ruptura");
    assert.equal(r.entradasUtilizadas.matchValidacaoRuptura, false);
    assert.equal(r.entradasUtilizadas.flagRupturaNull, true);
    assert.equal(r.entradasUtilizadas.flagRuptura, null);
    assert.equal(r.entradasUtilizadas.origemFlagRuptura, "join_ausente");
  });

  it("3. produto bloqueado por setor excluído → resultado anterior preservado", () => {
    const r = aplicarRuleBaseLimpa(
      itemInput({
        produto: produtoBase({
          hierarquia: {
            categoriaOriginal: null,
            divisao: "60-MERCEARIA",
            setorN2: "38-FLV",
            grupoN3: null,
            subgrupoN4: null,
            tipoN5: null,
            niveisEncontrados: 2,
            ambiguidade: null,
          },
        }),
      }),
    );
    assert.equal(r.resultado, "Não considera Ruptura");
    assert.match(String(r.entradasUtilizadas.motivoBaseLimpa), /SETOR2/);
  });

  it("4. produto sem ruptura (mix≠1) → Não considera Ruptura", () => {
    const r = aplicarRuleBaseLimpa(
      itemInput({
        validacao: {
          numeroLinha: 1,
          loja: 73,
          produto: 2505088,
          qtdItemRupturaNoMix: 0,
          qtdItemRuptura: 0,
          geraRuptura: false,
          ruptura104c: false,
        },
      }),
    );
    assert.equal(r.resultado, "Não considera Ruptura");
    assert.equal(r.entradasUtilizadas.origemFlagRuptura, "validacao_sem_match_pq");
  });

  it("5. produto dos 1.265 extras (5258, geraRuptura false) → deixa de ser Base Limpa", () => {
    const r = aplicarRuleBaseLimpa(
      itemInput({
        produto: produtoBase({ seqproduto: 5258, descricao: "CD.SORRISO 180G DENTE BCO" }),
        validacao: {
          numeroLinha: 1,
          loja: 73,
          produto: 5258,
          qtdItemRupturaNoMix: 0,
          qtdItemRuptura: 0,
          geraRuptura: false,
          ruptura104c: false,
        },
      }),
    );
    assert.equal(r.resultado, "Não considera Ruptura");
    assert.equal(r.entradasUtilizadas.flagRupturaNull, true);
  });

  it("6. produto oficial conhecido (mix=1) → continua Base Limpa", () => {
    const r = aplicarRuleBaseLimpa(
      itemInput({
        produto: produtoBase({ seqproduto: 1252 }),
        validacao: {
          numeroLinha: 1,
          loja: 73,
          produto: 1252,
          qtdItemRupturaNoMix: 1,
          qtdItemRuptura: 1,
          geraRuptura: true,
          ruptura104c: true,
        },
      }),
    );
    assert.equal(r.resultado, "Base Limpa");
    assert.equal(r.entradasUtilizadas.matchValidacaoRuptura, true);
  });
});
