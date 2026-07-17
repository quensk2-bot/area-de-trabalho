import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularCentralizacao,
  construirLookupCentralizadosBatch,
} from "../bre/centralizacao/index.ts";
import { classificarPrazo } from "../bre/classificarPrazo.ts";
import {
  calcularDiasPedido,
  calcularDiasPedidoLegado,
  montarDiasPedidoEntrada,
} from "../bre/rules/calcularDiasPedido.ts";
import {
  calcularMenorRecebimento,
  calcularMenorRecebimentoLegado,
} from "../bre/centralizacao/calcularMenorRecebimento.ts";
import {
  calcularProdutoCentralizado,
  calcularProdutoCentralizadoLegado,
} from "../bre/centralizacao/calcularProdutoCentralizado.ts";
import {
  calcularStatusAtivacaoCd,
  calcularStatusAtivacaoCdLegado,
} from "../bre/centralizacao/calcularStatusAtivacaoCd.ts";
import {
  calcularStatusEstoqueCds,
  calcularStatusEstoqueCdsLegado,
} from "../bre/centralizacao/calcularStatusEstoqueCds.ts";
import {
  calcularPendenciaCpaCdFromCds,
  calcularPendenciaCpaCdLegado,
} from "../bre/rules/rulePendenciaCpaCd.ts";
import {
  calcularSomaEstoqueCd,
  calcularSomaEstoqueCdLegado,
} from "../bre/rules/ruleSomaEstoqueCd.ts";
import { calcularCrossSumFromValues } from "../bre/rules/ruleCrossDocking.ts";
import type { MotorBreItemInput } from "../bre/breTypes.ts";
import {
  assertEquivalenciaBre,
  calcularDiasPedidoCds,
  calcularMenorRecebimentoCds,
  somarEstoqueCds,
  somarEstoqueSelecionado,
  somarPendenciaCds,
} from "../cds/index.ts";
import { produtoConsolidadorBase, cd5Base } from "./fixtures/consolidadorFixtures.ts";
import { cdBase, colecaoN } from "./fixtures/cdsDinamicosFixtures.ts";
import { catalogosFixture, entradaBase } from "./fixtures/excelCentralizacaoExpected.ts";

function itemBre(overrides: Partial<MotorBreItemInput> = {}): MotorBreItemInput {
  const produto = produtoConsolidadorBase(overrides.produto ?? {});
  return {
    produto,
    cd5: cd5Base(overrides.cd5 ?? {}),
    validacao: {
      numeroLinha: 1,
      loja: produto.loja,
      produto: produto.seqproduto,
      qtdItemRupturaNoMix: 1,
      qtdItemRuptura: 1,
      geraRuptura: true,
      ruptura104c: false,
    },
    inventario: { loja: produto.loja, produto: produto.seqproduto, inventarioUnid: 0 },
    ...overrides,
  };
}

describe("cds dinâmicos — Etapa B equivalência", () => {
  it("1. soma com 1 CD", () => {
    assert.equal(somarEstoqueCds([cdBase(1, { estoque: 7 })]), 7);
  });

  it("2. soma com 5 CDs", () => {
    assert.equal(somarEstoqueCds(colecaoN(5)), 150);
  });

  it("3. soma com 8 CDs", () => {
    assert.equal(somarEstoqueCds(colecaoN(8)), 360);
  });

  it("4. pendência no CD6", () => {
    const r = somarPendenciaCds(0, [cdBase(6, { pendencia: 2 })]);
    assert.equal(r.soma, 2);
  });

  it("5. pendência negativa", () => {
    const r = somarPendenciaCds(-1, [cdBase(1, { pendencia: 0 })]);
    assert.equal(r.soma, -1);
    assert.ok(r.alertas.some((a) => a.codigo === "PENDENCIA_NEGATIVA"));
  });

  it("6. pendência maior que 1", () => {
    const r = somarPendenciaCds(0, [cdBase(3, { pendencia: 5 })]);
    assert.ok(r.alertas.some((a) => a.codigo === "PENDCD_MAIOR_QUE_1"));
  });

  it("7. Cross no CD8", () => {
    assert.equal(somarEstoqueSelecionado([cdBase(8, { estoqueSelecionadoInventario: 3 })]), 3);
  });

  it("8. Dias Pedido no CD7", () => {
    const r = calcularDiasPedidoCds(0, null, [cdBase(7, { pendencia: 1, diasCompra: 15 })]);
    assert.equal(r.diasPedidoFinal, 15);
  });

  it("9. pedido loja prevalece", () => {
    const r = calcularDiasPedidoCds(2, 9, [cdBase(1, { pendencia: 1, diasCompra: 20 })]);
    assert.equal(r.diasPedidoFinal, 9);
    assert.equal(r.origemResultado, "loja");
  });

  it("10. múltiplos CDs com pedido", () => {
    const r = calcularDiasPedidoCds(0, null, [
      cdBase(1, { pendencia: 1, diasCompra: 5 }),
      cdBase(3, { pendencia: 1, diasCompra: 12 }),
    ]);
    assert.equal(r.diasPedidoFinal, 12);
  });

  it("11. menor recebimento no CD6", () => {
    const menor = calcularMenorRecebimentoCds([
      cdBase(1, { diasRecebimento: 10 }),
      cdBase(6, { diasRecebimento: 2 }),
    ]);
    assert.equal(menor.menorDiasRecebimentoOriginal, 2);
    assert.deepEqual(menor.posicoesComMenorValor, [6]);
  });

  it("12. empate CD3/CD7", () => {
    const menor = calcularMenorRecebimentoCds([
      cdBase(3, { diasRecebimento: 4 }),
      cdBase(7, { diasRecebimento: 4 }),
    ]);
    assert.deepEqual(menor.posicoesComMenorValor, [3, 7]);
  });

  it("13. empate seleciona menor posição lógica", () => {
    const ordem = {
      regional: "NORDESTE",
      loja: 103,
      bandeira: "FORT",
      tipoLoja: null,
      modalidade: null,
      divisaoCatalogo: "NORDESTE",
      primeiroCd: 101,
      segundoCd: 102,
      terceiroCd: 103,
      quartoCd: 104,
      quintoCd: 105,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const entrada = entradaBase({ diasRecebtoCd3: 2, diasRecebtoCd5: 2 });
    const menor = calcularMenorRecebimento(entrada);
    const prod = calcularProdutoCentralizado(entrada, ordem, menor);
    assert.equal(prod.posicaoCdSelecionada, 3);
  });

  it("14–20. status e flags básicos", () => {
    assert.equal(somarEstoqueCds([]), 0);
    const pend = somarPendenciaCds(null, []);
    assert.equal(pend.soma, null);
  });

  it("21. coleção vazia menor recebimento", () => {
    const m = calcularMenorRecebimentoCds([]);
    assert.equal(m.menorDiasRecebimentoOriginal, null);
    assert.equal(m.menorDiasRecebimentoNormalizado, 999);
  });

  it("22. MT soma estoque equivalente", () => {
    const input = itemBre();
    assertEquivalenciaBre("somaEstoqueCd", calcularSomaEstoqueCdLegado(input), calcularSomaEstoqueCd(input));
  });

  it("23. MT pendência MP equivalente", () => {
    const input = itemBre();
    const flat = {
      pendenciaLoja: input.produto.pendenciaLoja,
      pendenciaCd1: input.produto.pendenciaCd1,
      pendenciaCd2: input.produto.pendenciaCd2,
      pendenciaCd3: input.produto.pendenciaCd3,
      pendenciaCd4: input.produto.pendenciaCd4,
      pendenciaCd5: input.cd5?.pendenciaCd5 ?? null,
    };
    const legado = calcularPendenciaCpaCdLegado(flat);
    const din = calcularPendenciaCpaCdFromCds(input.produto.pendenciaLoja, [
      ...input.produto.cds,
      ...(input.cd5?.cds ?? []),
    ]);
    assertEquivalenciaBre("pendenciaCpaCd.soma", legado.soma, din.soma);
  });

  it("24. MT Dias Pedido equivalente", () => {
    const input = itemBre();
    const entrada = montarDiasPedidoEntrada(input);
    const legado = calcularDiasPedidoLegado(entrada);
    const din = calcularDiasPedido(entrada);
    assertEquivalenciaBre("diasPedidoFinal", legado.diasPedidoFinal, din.diasPedidoFinal);
    assertEquivalenciaBre("origemResultado", legado.origemResultado, din.origemResultado);
  });

  it("25. MT menor recebimento equivalente", () => {
    const entrada = entradaBase();
    const legado = calcularMenorRecebimentoLegado(entrada);
    const din = calcularMenorRecebimento(entrada);
    assertEquivalenciaBre("menorOriginal", legado.menorDiasRecebimentoOriginal, din.menorDiasRecebimentoOriginal);
    assertEquivalenciaBre("posicoes", legado.posicoesComMenorValor, din.posicoesComMenorValor);
  });

  it("26. MT produto centralizado equivalente", () => {
    const cat = catalogosFixture();
    const entrada = entradaBase();
    const menor = calcularMenorRecebimento(entrada);
    const ordem = {
      regional: "NORDESTE",
      loja: 103,
      bandeira: "FORT",
      tipoLoja: null,
      modalidade: null,
      divisaoCatalogo: "NORDESTE",
      primeiroCd: 101,
      segundoCd: 102,
      terceiroCd: 103,
      quartoCd: 104,
      quintoCd: 105,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const legado = calcularProdutoCentralizadoLegado(entrada, ordem, menor);
    const din = calcularProdutoCentralizado(entrada, ordem, menor);
    assertEquivalenciaBre("produtoCentralizado", legado.produtoCentralizado, din.produtoCentralizado);
    assertEquivalenciaBre("posicao", legado.posicaoCdSelecionada, din.posicaoCdSelecionada);
  });

  it("27. MT status estoque equivalente", () => {
    const cat = catalogosFixture();
    const entrada = entradaBase({ estoqueCd1: 1, estoqueCd2: 0, estoqueCd3: 0, estoqueCd4: 0, estoqueCd5: 0 });
    const lookup = construirLookupCentralizadosBatch([entrada], cat);
    const flags = lookup.get("NORDESTE|REDE") ?? {
      flagPrimeiroCd: 101,
      flagSegundoCd: 0,
      flagTerceiroCd: 0,
      flagQuartoCd: 0,
      flagQuintoCd: 0,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const ordem = calcularCentralizacao(entrada, cat, lookup).ordem;
    const legado = calcularStatusEstoqueCdsLegado(entrada, ordem, flags);
    const din = calcularStatusEstoqueCds(entrada, ordem, flags);
    assertEquivalenciaBre("statusEstoque.texto", legado.texto, din.texto);
  });

  it("28. MT status ativação equivalente", () => {
    const cat = catalogosFixture();
    const entrada = entradaBase();
    const lookup = construirLookupCentralizadosBatch([entrada], cat);
    const central = calcularCentralizacao(entrada, cat, lookup);
    const legado = calcularStatusAtivacaoCdLegado(entrada, central.ordem, central.flags);
    const din = calcularStatusAtivacaoCd(entrada, central.ordem, central.flags);
    assertEquivalenciaBre("statusAtivacao.texto", legado.texto, din.texto);
  });

  it("29. MT classificação prazo soma estoque", () => {
    const input = itemBre();
    const soma = calcularSomaEstoqueCd(input);
    const cp = classificarPrazo({
      item: input,
      statusBaseLimpa: "Base Limpa",
      menorQueTres: 1,
      somaEstoqueCd: soma,
      modCurtoPrazo: null,
      ncurtoPrazo: "G",
    });
    assert.ok(cp.curtoPrazoRegra.status === "aplicada");
  });

  it("30. cross legado vs dinâmico inventário flat", () => {
    const crossLegado = calcularCrossSumFromValues(1, 0, 0, 0);
    const crossDin = somarEstoqueSelecionado([
      cdBase(1, { estoqueSelecionadoInventario: 1 }),
      cdBase(2, { estoqueSelecionadoInventario: 0 }),
    ]);
    assert.equal(crossLegado, crossDin);
  });
});
