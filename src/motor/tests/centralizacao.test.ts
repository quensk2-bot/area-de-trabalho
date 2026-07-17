import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorCatalogos } from "../catalog/catalogTypes.ts";
import { loadCatalogos, resolveOrdemCdsCatalogPath, resolveOrdemCdsPadraoPath } from "../catalog/catalogService.ts";
import {
  calcularCentralizacao,
  calcularMenorRecebimento,
  calcularProdutoCentralizado,
  calcularStatusAtivacaoCd,
  calcularStatusEstoqueCds,
  calcularStatusRecebto,
  catalogoOrdemDisponivel,
  construirLookupCentralizadosBatch,
  resolverOrdemCds,
} from "../bre/centralizacao/index.ts";
import { obterFlagsOrdemCd } from "../bre/centralizacao/calcularFlagsOrdemCd.ts";
import {
  TEXTO_NAO_CENTRALIZADO,
  TEXTO_STATUS_RECEBTO_COM_MOV,
  TEXTO_STATUS_RECEBTO_SEM_MOV,
} from "../bre/centralizacao/centralizacaoUtils.ts";
import { compararExcelV7 } from "../compare/compareExcelV7.ts";
import { formatarRelatorioDivergencias } from "../compare/divergenceReport.ts";
import { CAMPOS_PRIORITARIOS_COMPARE } from "../compare/compareTypes.ts";
import { ensureCatalogFixtures } from "./fixtures/catalogFixtures.ts";
import {
  EXCEL_CENTRALIZACAO_DIVERGENTE,
  catalogosFixture,
  entradaBase,
  getExcelCentralizacaoFixture,
} from "./fixtures/excelCentralizacaoExpected.ts";

function catalogosCustom(overrides: Partial<MotorCatalogos>): MotorCatalogos {
  const base = catalogosFixture();
  return { ...base, ...overrides };
}

describe("centralização Fase 2C.3", () => {
  const cat = catalogosFixture();

  it("1. loja com bandeira e cinco CDs", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    assert.equal(ordem.bandeira, "FORT");
    assert.deepEqual([ordem.primeiroCd, ordem.segundoCd, ordem.terceiroCd, ordem.quartoCd, ordem.quintoCd], [
      101, 102, 103, 104, 105,
    ]);
    assert.equal(ordem.statusRegra, "aplicada");
  });

  it("2. loja sem bandeira", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 999);
    assert.equal(ordem.bandeira, null);
    assert.ok(ordem.alertas.some((a) => a.codigo === "LOJA_SEM_BANDEIRA"));
  });

  it("3. bandeira sem ordem", () => {
    const custom = catalogosCustom({
      bandeira: [{ loja: 200, bandeira: "SEM_ORDEM", tipoLoja: "PADRAO" }],
      ordemCd: cat.ordemCd,
    });
    const ordem = resolverOrdemCds(custom, "NORDESTE", 200);
    assert.equal(ordem.bandeira, "SEM_ORDEM");
    assert.equal(ordem.primeiroCd, null);
    assert.ok(ordem.alertas.some((a) => a.codigo === "BANDEIRA_SEM_ORDEM"));
  });

  it("4. ordem parcial", () => {
    const custom = catalogosCustom({
      ordemCd: [
        {
          divisao: "NORDESTE",
          bandeira: "FORT",
          uf: "PE",
          cd1: 101,
          cd2: 102,
          cd3: 0,
          cd4: 0,
          cd5: 0,
        },
      ],
    });
    const ordem = resolverOrdemCds(custom, "NORDESTE", 103);
    assert.equal(ordem.primeiroCd, 101);
    assert.equal(ordem.terceiroCd, null);
    assert.ok(ordem.alertas.some((a) => a.codigo === "ORDEM_INCOMPLETA"));
  });

  it("5. ordem duplicada", () => {
    const custom = catalogosCustom({
      ordemCd: [
        {
          divisao: "NORDESTE",
          bandeira: "FORT",
          uf: "PE",
          cd1: 101,
          cd2: 101,
          cd3: 103,
          cd4: 104,
          cd5: 105,
        },
      ],
    });
    const ordem = resolverOrdemCds(custom, "NORDESTE", 103);
    assert.equal(ordem.statusRegra, "ambigua");
    assert.ok(ordem.alertas.some((a) => a.codigo === "ORDEM_CD_DUPLICADO"));
  });

  it("6. somente CD1 com recebimento", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd1: 45 }));
    assert.equal(menor.menorDiasRecebimentoOriginal, 45);
    assert.deepEqual(menor.posicoesComMenorValor, [1]);
  });

  it("7. somente CD5 com recebimento", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd5: 12 }));
    assert.equal(menor.menorDiasRecebimentoOriginal, 12);
    assert.deepEqual(menor.posicoesComMenorValor, [5]);
  });

  it("8. CD2 com menor valor", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd1: 80, diasRecebtoCd2: 20, diasRecebtoCd3: 50 }));
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const produto = calcularProdutoCentralizado(entradaBase({ diasRecebtoCd1: 80, diasRecebtoCd2: 20 }), ordem, menor);
    assert.equal(produto.codigoCdSelecionado, 102);
    assert.equal(produto.textoProdutoCentralizado, "CD 102");
  });

  it("9. empate CD1 e CD3 — CD1 tem precedência", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd1: 10, diasRecebtoCd3: 10 }));
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const produto = calcularProdutoCentralizado(entradaBase({ diasRecebtoCd1: 10, diasRecebtoCd3: 10 }), ordem, menor);
    assert.equal(produto.posicaoCdSelecionada, 1);
    assert.equal(produto.codigoCdSelecionado, 101);
  });

  it("10. todos null — menor normalizado 999", () => {
    const menor = calcularMenorRecebimento(entradaBase());
    assert.equal(menor.menorDiasRecebimentoOriginal, null);
    assert.equal(menor.menorDiasRecebimentoNormalizado, 999);
  });

  it("11. todos zero", () => {
    const menor = calcularMenorRecebimento(
      entradaBase({
        diasRecebtoCd1: 0,
        diasRecebtoCd2: 0,
        diasRecebtoCd3: 0,
        diasRecebtoCd4: 0,
        diasRecebtoCd5: 0,
      }),
    );
    assert.equal(menor.menorDiasRecebimentoOriginal, 0);
    assert.ok(menor.alertas.some((a) => a.codigo === "TODOS_DIAS_ZERO"));
  });

  it("12. valor negativo", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd2: -5, diasRecebtoCd3: 10 }));
    assert.equal(menor.menorDiasRecebimentoOriginal, -5);
    assert.ok(menor.alertas.some((a) => a.codigo === "DIAS_RECEBTO_NEGATIVO"));
  });

  it("13. código físico diferente da posição lógica", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd2: 5 }));
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const produto = calcularProdutoCentralizado(entradaBase({ diasRecebtoCd2: 5 }), ordem, menor);
    assert.equal(produto.posicaoCdSelecionada, 2);
    assert.equal(produto.codigoCdSelecionado, 102);
    assert.notEqual(produto.codigoCdSelecionado, 2);
  });

  it("14. produto centralizado no CD1", () => {
    const entrada = entradaBase({ diasRecebtoCd1: 30 });
    const r = calcularCentralizacao(entrada, cat, new Map());
    assert.equal(r.produtoCentralizado.textoProdutoCentralizado, "CD 101");
    assert.equal(r.produtoCentralizado.produtoCentralizado, 101);
  });

  it("15. produto centralizado no CD5", () => {
    const entrada = entradaBase({ diasRecebtoCd5: 25 });
    const r = calcularCentralizacao(entrada, cat, new Map());
    assert.equal(r.produtoCentralizado.textoProdutoCentralizado, "CD 105");
    assert.equal(r.produtoCentralizado.posicaoCdSelecionada, 5);
  });

  it("16. não centralizado", () => {
    const entrada = entradaBase();
    const r = calcularCentralizacao(entrada, cat, new Map());
    assert.equal(r.produtoCentralizado.textoProdutoCentralizado, TEXTO_NAO_CENTRALIZADO);
    assert.equal(r.produtoCentralizado.produtoCentralizado, null);
  });

  it("17. status recebto com menor < 120", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd1: 30 }));
    const status = calcularStatusRecebto(menor);
    assert.equal(status.texto, TEXTO_STATUS_RECEBTO_COM_MOV);
  });

  it("18. status recebto com menor >= 120", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd1: 150 }));
    const status = calcularStatusRecebto(menor);
    assert.equal(status.texto, TEXTO_STATUS_RECEBTO_SEM_MOV);
  });

  it("19. status recebto sem movimentação (null)", () => {
    const menor = calcularMenorRecebimento(entradaBase());
    const status = calcularStatusRecebto(menor);
    assert.equal(status.texto, TEXTO_STATUS_RECEBTO_SEM_MOV);
  });

  it("20. flags de ordem via batch", () => {
    const entrada = entradaBase({ diasRecebtoCd1: 30 });
    const lookup = construirLookupCentralizadosBatch([entrada], cat);
    const r = calcularCentralizacao(entrada, cat, lookup);
    assert.equal(r.flags.flagPrimeiroCd, 101);
    assert.equal(r.flags.flagSegundoCd, 0);
  });

  it("21. status estoque com soma zero", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = obterFlagsOrdemCd(new Map(), "NORDESTE", "REDE ALPHA", {
      produtoCentralizado: 101,
      textoProdutoCentralizado: "CD 101",
      posicaoCdSelecionada: 1,
      codigoCdSelecionado: 101,
      menorDiasRecebimento: 30,
      motivo: "",
      alertas: [],
      statusRegra: "aplicada",
    }, ordem);
    const status = calcularStatusEstoqueCds(entradaBase(), ordem, flags);
    assert.equal(status.texto, "Ruptura CD");
  });

  it("22. status estoque com estoque=1", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = obterFlagsOrdemCd(new Map(), "NORDESTE", "REDE ALPHA", {
      produtoCentralizado: 101,
      textoProdutoCentralizado: "CD 101",
      posicaoCdSelecionada: 1,
      codigoCdSelecionado: 101,
      menorDiasRecebimento: 30,
      motivo: "",
      alertas: [],
      statusRegra: "aplicada",
    }, ordem);
    const status = calcularStatusEstoqueCds(entradaBase({ estoqueCd1: 1, estoqueCd2: 5 }), ordem, flags);
    assert.equal(status.texto, "Estoque no CD: (101)");
  });

  it("23. estoque=2 não entra no texto", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = obterFlagsOrdemCd(new Map(), "NORDESTE", "REDE ALPHA", {
      produtoCentralizado: 101,
      textoProdutoCentralizado: "CD 101",
      posicaoCdSelecionada: 1,
      codigoCdSelecionado: 101,
      menorDiasRecebimento: 30,
      motivo: "",
      alertas: [],
      statusRegra: "aplicada",
    }, ordem);
    const status = calcularStatusEstoqueCds(entradaBase({ estoqueCd1: 2 }), ordem, flags);
    assert.equal(status.texto, "Estoque no CD:");
  });

  it("24. múltiplos CDs no status estoque", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = {
      flagPrimeiroCd: 101,
      flagSegundoCd: 102,
      flagTerceiroCd: 0,
      flagQuartoCd: 0,
      flagQuintoCd: 0,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const status = calcularStatusEstoqueCds(
      entradaBase({ estoqueCd1: 1, estoqueCd2: 1, estoqueCd3: 5 }),
      ordem,
      flags,
    );
    assert.equal(status.texto, "Estoque no CD: (101) (102)");
  });

  it("25. CD5 no status estoque", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = {
      flagPrimeiroCd: 0,
      flagSegundoCd: 0,
      flagTerceiroCd: 0,
      flagQuartoCd: 0,
      flagQuintoCd: 105,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const status = calcularStatusEstoqueCds(entradaBase({ estoqueCd5: 1, estoqueCd1: 10 }), ordem, flags);
    assert.equal(status.texto, "Estoque no CD: (105)");
  });

  it("26. status ativação ativo", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = {
      flagPrimeiroCd: 101,
      flagSegundoCd: 0,
      flagTerceiroCd: 0,
      flagQuartoCd: 0,
      flagQuintoCd: 0,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const status = calcularStatusAtivacaoCd(entradaBase(), ordem, flags);
    assert.equal(status.texto, "Ativo no CD");
  });

  it("27. status ativação inativo", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = {
      flagPrimeiroCd: 101,
      flagSegundoCd: 0,
      flagTerceiroCd: 0,
      flagQuartoCd: 0,
      flagQuintoCd: 0,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const status = calcularStatusAtivacaoCd(entradaBase({ statusCompraCd1: "I" }), ordem, flags);
    assert.ok(status.texto?.startsWith("Inativo CD:"));
    assert.ok(status.texto?.includes("(101"));
  });

  it("28. status ativação bloqueado sem flags", () => {
    const ordem = resolverOrdemCds(cat, "NORDESTE", 103);
    const flags = {
      flagPrimeiroCd: 0,
      flagSegundoCd: 0,
      flagTerceiroCd: 0,
      flagQuartoCd: 0,
      flagQuintoCd: 0,
      statusRegra: "aplicada" as const,
      alertas: [],
    };
    const status = calcularStatusAtivacaoCd(entradaBase(), ordem, flags);
    assert.equal(status.texto, TEXTO_NAO_CENTRALIZADO);
  });

  it("29. texto literal preservado (úiltimos)", () => {
    const menor = calcularMenorRecebimento(entradaBase({ diasRecebtoCd1: 30 }));
    const status = calcularStatusRecebto(menor);
    assert.ok(status.texto.includes("úiltimos"));
    assert.ok(!status.texto.includes("últimos"));
  });

  it("30. comparação Excel × V7 centralização", () => {
    const campos = CAMPOS_PRIORITARIOS_COMPARE.filter((c) =>
      ["Menor Recebto CD", "Centralizado", "Status Recebto", "Status Estoque CDs"].includes(c.campo),
    );
    const iguais = compararExcelV7(getExcelCentralizacaoFixture(), campos);
    assert.equal(iguais.resumo.divergentes, 0);
  });

  it("31. divergência detectada no harness", () => {
    const campos = CAMPOS_PRIORITARIOS_COMPARE.filter((c) => c.campo === "Centralizado");
    const divergente = compararExcelV7(EXCEL_CENTRALIZACAO_DIVERGENTE, campos);
    assert.ok(divergente.resumo.divergentes >= 1);
    assert.ok(formatarRelatorioDivergencias(divergente).includes("Centralizado"));
  });

  it("32. catálogo padronizado preferido quando disponível", () => {
    const fixtures = ensureCatalogFixtures();
    const padrao = resolveOrdemCdsPadraoPath("MT", "2026-07-15");
    if (padrao) {
      const resolved = resolveOrdemCdsCatalogPath({
        ordemCds: fixtures.ordemCds,
        regional: "MT",
        dataReferencia: "2026-07-15",
      });
      assert.ok(resolved?.includes("motor_ordem_cds_padrao"));
    } else {
      const resolved = resolveOrdemCdsCatalogPath({ ordemCds: fixtures.ordemCds });
      assert.equal(resolved, fixtures.ordemCds);
    }
  });

  it("33. catalogoOrdemDisponivel exige bandeira, ordem e sequência", () => {
    assert.equal(catalogoOrdemDisponivel(cat), true);
    const vazio = catalogosCustom({ bandeira: [], ordemCd: [], sequenciaCd: [] });
    assert.equal(catalogoOrdemDisponivel(vazio), false);
  });

  it("34. centralização não referencia Centralizados.txt", () => {
    const entrada = entradaBase({ diasRecebtoCd1: 30, estoqueCd1: 1 });
    const r = calcularCentralizacao(entrada, cat, construirLookupCentralizadosBatch([entrada], cat));
    assert.ok(r.centralizacaoDisponivel);
    assert.ok(!r.alertas.some((a) => a.mensagem.toLowerCase().includes("centralizados.txt")));
  });
});
