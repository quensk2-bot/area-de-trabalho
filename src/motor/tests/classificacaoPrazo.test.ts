import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorBreItemInput } from "../bre/breTypes.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import {
  aplicarRuleCurtoPrazo,
  aplicarRuleLongoPrazo,
  aplicarRuleMedioPrazo,
  calcularPendenciaCpaCd,
  classificarPrazo,
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
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
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
    cd5: { seqproduto: 2505088, statusCompraCd5: "A", estoqueCd5: 0, pendenciaCd5: 0, diasCompraCd5: 1, diasRecebtoCd5: 2, ultimaCpaCd5: null },
    validacao: { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: true },
    inventario: { loja: 103, produto: 2505088, inventarioUnid: 0 },
    estSelecInv: { estSelecInvCd1: 0, estSelecInvCd2: 0, estSelecInvCd3: 0, estSelecInvCd4: 0 },
    ...overrides,
  };
}

const baseLimpa = "Base Limpa" as const;

describe("classificação prazo", () => {
  describe("curto prazo", () => {
    it("1. ruptura + estoque CD → CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 10, crossSum: 0, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.curtoPrazo, 1);
    });

    it("2. ruptura + Cross → CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 0, crossSum: 3, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.curtoPrazo, 1);
    });

    it("3. sem ruptura + estoque CD → não CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 0, somaEstoqueCd: 10, crossSum: 0, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.curtoPrazo, 0);
    });

    it("4. ruptura sem estoque e sem Cross → não CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 0, crossSum: 0, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.curtoPrazo, 0);
    });

    it("5. exclusivo + G → CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 5, crossSum: 0, modCurtoPrazo: "LJ_Exclusiva", ncurtoPrazo: "G" });
      assert.equal(r.curtoPrazo, 1);
    });

    it("6. exclusivo + NG → não CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 5, crossSum: 0, modCurtoPrazo: "LJ_Exclusiva", ncurtoPrazo: "NG" });
      assert.equal(r.curtoPrazo, 0);
    });

    it("7. exclusivo sem correspondência → CP=0", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 5, crossSum: 0, modCurtoPrazo: "LJ_Exclusiva", ncurtoPrazo: null });
      assert.equal(r.curtoPrazo, 0);
    });

    it("8. fora da Base Limpa → não CP", () => {
      const r = aplicarRuleCurtoPrazo({ statusBaseLimpa: "Não considera Ruptura", menorQueTres: 1, somaEstoqueCd: 10, crossSum: 0, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.curtoPrazo, 0);
      assert.equal(r.status, "nao_aplicavel");
    });

    it("9. CD1 null e CD2 positivo → CP", () => {
      const r = classificarPrazo({
        item: itemInput({ produto: produtoBase({ estoqueCd1: null, estoqueCd2: 5 }) }),
        statusBaseLimpa: baseLimpa,
        menorQueTres: 1,
        somaEstoqueCd: 5,
        modCurtoPrazo: null,
        ncurtoPrazo: null,
      });
      assert.equal(r.curtoPrazo, 1);
    });

    it("10. todos CDs null, Cross zero → não CP", () => {
      const r = classificarPrazo({
        item: itemInput({
          produto: produtoBase({ estoqueCd1: null, estoqueCd2: null, estoqueCd3: null, estoqueCd4: null }),
          cd5: null,
          estSelecInv: { estSelecInvCd1: null, estSelecInvCd2: null, estSelecInvCd3: null, estSelecInvCd4: null },
        }),
        statusBaseLimpa: baseLimpa,
        menorQueTres: 1,
        somaEstoqueCd: 0,
        modCurtoPrazo: null,
        ncurtoPrazo: null,
      });
      assert.equal(r.curtoPrazo, 0);
    });
  });

  describe("médio prazo", () => {
    it("11. ruptura, CP=0, tudo zero → MP=0", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: 0, pendenciaCd1: 0, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 0);
    });

    it("12. PENDCPA positivo sozinho → MP=1", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: 144, pendenciaCd1: 0, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 1);
    });

    it("13. PENDCD1=1 sozinho → MP=1", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: 0, pendenciaCd1: 1, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 1);
    });

    it("14. PENDCD1=2 → MP=1", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: 0, pendenciaCd1: 2, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      assert.ok(p.alertas.some((a) => a.codigo === "PENDCD_MAIOR_QUE_1"));
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 1);
    });

    it("15. CP=1 com pendência → MP=0", () => {
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 1, pendenciaCpaCd: 144 });
      assert.equal(r.medioPrazo, 0);
    });

    it("16. sem ruptura com pendência → MP=0", () => {
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 0, curtoPrazo: 0, pendenciaCpaCd: 10 });
      assert.equal(r.medioPrazo, 0);
    });

    it("17. todos null → MP=0", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: null, pendenciaCd1: null, pendenciaCd2: null, pendenciaCd3: null, pendenciaCd4: null, pendenciaCd5: null });
      assert.equal(p.soma, null);
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 0);
    });

    it("18. pendência negativa total → MP=0", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: -5, pendenciaCd1: 0, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      assert.ok(p.alertas.some((a) => a.codigo === "PENDENCIA_NEGATIVA"));
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 0);
    });

    it("19. positivo compensa negativo e soma >0 → MP=1", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: 5, pendenciaCd1: -2, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      assert.equal(p.soma, 3);
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 1);
    });

    it("20. soma igual a zero → MP=0", () => {
      const p = calcularPendenciaCpaCd({ pendenciaLoja: 0, pendenciaCd1: 0, pendenciaCd2: 0, pendenciaCd3: 0, pendenciaCd4: 0, pendenciaCd5: 0 });
      const r = aplicarRuleMedioPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, pendenciaCpaCd: p.soma });
      assert.equal(r.medioPrazo, 0);
    });
  });

  describe("longo prazo", () => {
    it("21. ruptura, CP=0, MP=0 → LP=1", () => {
      const r = aplicarRuleLongoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, medioPrazo: 0 });
      assert.equal(r.longoPrazo, 1);
    });

    it("22. CP=1 → LP=0", () => {
      const r = aplicarRuleLongoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 1, medioPrazo: 0 });
      assert.equal(r.longoPrazo, 0);
    });

    it("23. MP=1 → LP=0", () => {
      const r = aplicarRuleLongoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 1, curtoPrazo: 0, medioPrazo: 1 });
      assert.equal(r.longoPrazo, 0);
    });

    it("24. sem ruptura → LP=0", () => {
      const r = aplicarRuleLongoPrazo({ statusBaseLimpa: baseLimpa, menorQueTres: 0, curtoPrazo: 0, medioPrazo: 0 });
      assert.equal(r.longoPrazo, 0);
    });
  });

  describe("classificação final", () => {
    it("25. classificação CP exclusiva", () => {
      const r = classificarPrazo({ item: itemInput(), statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 10, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.classificacaoPrazo, "CP");
      assert.equal(r.curtoPrazo, 1);
      assert.equal(r.medioPrazo, 0);
      assert.equal(r.longoPrazo, 0);
    });

    it("26. classificação MP exclusiva", () => {
      const r = classificarPrazo({
        item: itemInput({ produto: produtoBase({ estoqueCd1: 0, pendenciaLoja: 10 }) }),
        statusBaseLimpa: baseLimpa,
        menorQueTres: 1,
        somaEstoqueCd: 0,
        modCurtoPrazo: null,
        ncurtoPrazo: null,
      });
      assert.equal(r.classificacaoPrazo, "MP");
      assert.equal(r.curtoPrazo, 0);
      assert.equal(r.medioPrazo, 1);
      assert.equal(r.longoPrazo, 0);
    });

    it("27. classificação LP exclusiva", () => {
      const r = classificarPrazo({
        item: itemInput({ produto: produtoBase({ estoqueCd1: 0, pendenciaLoja: 0 }) }),
        statusBaseLimpa: baseLimpa,
        menorQueTres: 1,
        somaEstoqueCd: 0,
        modCurtoPrazo: null,
        ncurtoPrazo: null,
      });
      assert.equal(r.classificacaoPrazo, "LP");
      assert.equal(r.longoPrazo, 1);
    });

    it("28. sem classificação", () => {
      const r = classificarPrazo({ item: itemInput(), statusBaseLimpa: baseLimpa, menorQueTres: 0, somaEstoqueCd: 10, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.classificacaoPrazo, null);
    });

    it("29. nunca duas flags simultâneas", () => {
      const casos = [
        classificarPrazo({ item: itemInput(), statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 10, modCurtoPrazo: null, ncurtoPrazo: null }),
        classificarPrazo({ item: itemInput({ produto: produtoBase({ estoqueCd1: 0, pendenciaLoja: 5 }) }), statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 0, modCurtoPrazo: null, ncurtoPrazo: null }),
        classificarPrazo({ item: itemInput({ produto: produtoBase({ estoqueCd1: 0 }) }), statusBaseLimpa: baseLimpa, menorQueTres: 1, somaEstoqueCd: 0, modCurtoPrazo: null, ncurtoPrazo: null }),
      ];
      for (const r of casos) {
        assert.equal(r.exclusividadeGarantida, true);
        assert.ok((r.curtoPrazo + r.medioPrazo + r.longoPrazo) <= 1);
      }
    });

    it("30. fora da base limpa → classificação null", () => {
      const r = classificarPrazo({ item: itemInput(), statusBaseLimpa: "Não considera Ruptura", menorQueTres: 1, somaEstoqueCd: 10, modCurtoPrazo: null, ncurtoPrazo: null });
      assert.equal(r.classificacaoPrazo, null);
      assert.equal(r.curtoPrazo, 0);
      assert.equal(r.medioPrazo, 0);
      assert.equal(r.longoPrazo, 0);
    });
  });
});
