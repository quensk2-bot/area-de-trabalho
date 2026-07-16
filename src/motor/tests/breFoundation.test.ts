import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorBreItemInput } from "../bre/breTypes.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import {
  aplicarRuleAtivacaoRecente,
  aplicarRuleBaseLimpa,
  aplicarRuleCrossDocking,
  aplicarRuleInventario,
  aplicarRuleMenorQueTresCentralizados,
  aplicarRuleRuptura104c,
  aplicarRuleSomaEstoqueCd,
  calcularCrossSumFromValues,
} from "../bre/index.ts";

function produtoBase(overrides: Partial<MotorProdutoLojaNormalizado> = {}): MotorProdutoLojaNormalizado {
  return {
    regional: "NORDESTE",
    dataReferencia: "2026-07-13",
    loja: 103,
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
    embalagemCompra: "UN",
    hierarquia: {
      categoriaOriginal: "MERCEARIA|BEBIDAS|REFRIGERANTES|COLA|LATA",
      divisao: "MERCEARIA",
      setorN2: "BEBIDAS",
      grupoN3: "REFRIGERANTES",
      subgrupoN4: "COLA",
      tipoN5: "LATA",
      niveisEncontrados: 5,
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
    cd5: { seqproduto: 2505088, statusCompraCd5: "A", estoqueCd5: 3, pendenciaCd5: 0, diasCompraCd5: 1, diasRecebtoCd5: 2, ultimaCpaCd5: null },
    validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: false },
    inventario: { loja: 103, produto: 2505088, inventarioUnid: 0 },
    ...overrides,
  };
}

describe("bre foundation", () => {
  it("11. ruptura 104C verdadeira", () => {
    const r = aplicarRuleRuptura104c(itemInput({ validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: true } }));
    assert.equal(r.resultado, 1);
  });

  it("12. ruptura 104C falsa", () => {
    const r = aplicarRuleRuptura104c(itemInput());
    assert.equal(r.resultado, 0);
  });

  it("13. estoque <= 2 sem flag 104C não vira automaticamente Menor que três", () => {
    const r = aplicarRuleRuptura104c(
      itemInput({
        produto: produtoBase({ estoqueLoja: 2 }),
        validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: false },
      }),
    );
    assert.equal(r.resultado, 0);

    const centralizados = aplicarRuleMenorQueTresCentralizados(2, false);
    assert.equal(centralizados.resultado, 1);
    assert.notEqual(r.resultado, centralizados.resultado);
  });

  it("14. inventário > 2", () => {
    const regras = aplicarRuleInventario(
      itemInput({
        inventario: { loja: 103, produto: 2505088, inventarioUnid: 5 },
        validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: true },
      }),
    );
    const inv = regras.find((r) => r.regra === "inventario_unid");
    assert.equal(inv?.resultado, 5);
  });

  it("15. ruptura com inventário", () => {
    const regras = aplicarRuleInventario(
      itemInput({
        inventario: { loja: 103, produto: 2505088, inventarioUnid: 3 },
        validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: true },
      }),
    );
    assert.equal(regras.find((r) => r.regra === "ruptura_inventario")?.resultado, 1);
  });

  it("16. ruptura sem inventário", () => {
    const regras = aplicarRuleInventario(
      itemInput({
        inventario: { loja: 103, produto: 2505088, inventarioUnid: 0 },
        validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: true },
      }),
    );
    assert.equal(regras.find((r) => r.regra === "ruptura_sem_inventario")?.resultado, 1);
  });

  it("17. soma CD1–CD5", () => {
    const r = aplicarRuleSomaEstoqueCd(itemInput());
    assert.equal(r.resultado, 20);
  });

  it("18. null em um CD", () => {
    const r = aplicarRuleSomaEstoqueCd(
      itemInput({
        produto: produtoBase({ estoqueCd3: null }),
        cd5: null,
      }),
    );
    assert.equal(r.resultado, 17);
  });

  it("19. cross docking — cross sum aplicada, flag bloqueada", () => {
    const crossSum = calcularCrossSumFromValues(1, 2, null, 4);
    assert.equal(crossSum, 7);
    const regras = aplicarRuleCrossDocking(crossSum, 0, null);
    assert.equal(regras[0].status, "aplicada");
    assert.equal(regras[1].status, "bloqueada_dependencia");
    assert.equal(regras[1].resultado, null);
  });

  it("20. regra bloqueada por dependência ausente", () => {
    const r = aplicarRuleBaseLimpa(itemInput({ validacao: null }));
    assert.equal(r.resultado, "Não considera Ruptura");
    assert.ok(r.dependenciasAusentes.some((d) => d.nome === "validacao_ruptura"));
  });

  it("base limpa — setor excluído", () => {
    const r = aplicarRuleBaseLimpa(
      itemInput({
        produto: produtoBase({
          hierarquia: {
            categoriaOriginal: null,
            divisao: "MERCEARIA",
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
  });

  it("ativação recente — dentro de 60 dias", () => {
    const r = aplicarRuleAtivacaoRecente("2026-06-01", "2026-07-13");
    assert.equal(r.resultado, true);
  });
});
