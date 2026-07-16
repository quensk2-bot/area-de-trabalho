import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  MotorAuxiliaresPedidoEntrada,
  MotorAuxiliaresPedidoResultado,
  MotorAcoesOperacionaisEntrada,
} from "../bre/breTypes.ts";
import {
  calcularAcaoCurtoPrazo,
  calcularAcaoMedioPrazo,
  calcularAcoesOperacionais,
  calcularAuxiliaresPedido,
} from "../bre/index.ts";

function auxBase(overrides: Partial<MotorAuxiliaresPedidoEntrada> = {}): MotorAuxiliaresPedidoResultado {
  return calcularAuxiliaresPedido({
    parMin: 1,
    curtoPrazo: 0,
    medioPrazo: 0,
    menorQueTres: 1,
    modCurtoPrazo: null,
    diasPedido: 0,
    pendenciaLoja: 0,
    pendenciaCpaCd: 0,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    pendenciaCd5: 0,
    estoqueLoja: 0,
    ultimaEntradaLoja: "2026-01-01",
    estoqueCd1: 0,
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
    estoqueCd5: 0,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    ...overrides,
  });
}

function acaoBase(
  overrides: Partial<MotorAcoesOperacionaisEntrada> & { auxOverrides?: Partial<MotorAuxiliaresPedidoEntrada> } = {},
): MotorAcoesOperacionaisEntrada {
  const { auxOverrides, ...rest } = overrides;
  const auxiliares = auxBase(auxOverrides);
  return {
    parMin: 1,
    curtoPrazo: 1,
    medioPrazo: 0,
    diasCompraLj: 3,
    diasPedido: 10,
    auxiliares,
    ...rest,
  };
}

describe("ações operacionais", () => {
  describe("ação curto prazo", () => {
    it("1. CP=0 → sem ação CP", () => {
      const r = calcularAcaoCurtoPrazo(acaoBase({ curtoPrazo: 0 }));
      assert.equal(r, "Nâo é Ruptura Curto Prazo");
    });

    it("2. PARMIN=0 → Sem parâmetro", () => {
      const r = calcularAcaoCurtoPrazo(acaoBase({ parMin: 0 }));
      assert.equal(r, "Sem parâmetro");
    });

    it("3. PARMIN null → Sem parâmetro", () => {
      const r = calcularAcaoCurtoPrazo(acaoBase({ parMin: null }));
      assert.equal(r, "Sem parâmetro");
    });

    it("4. CP=1 com recebimento próximo", () => {
      const aux = auxBase({
        estoqueCd1: 1,
        diasRecebtoCd1: 3,
      });
      const r = calcularAcaoCurtoPrazo({
        ...acaoBase(),
        auxiliares: aux,
      });
      assert.equal(r, "Recebimento Próximo/ Pedido dentro do Prazo");
    });

    it("5. CP=1 com estoque anterior no CD", () => {
      const aux = auxBase({
        estoqueCd2: 1,
        diasRecebtoCd2: 10,
      });
      const r = calcularAcaoCurtoPrazo({
        ...acaoBase(),
        auxiliares: aux,
      });
      assert.equal(r, "Havia estoque no CD/ Pedido dentro do Prazo");
    });

    it("6. CP=1 e DIAS_DA_COMPRALJ=0", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 });
      const r = calcularAcaoCurtoPrazo({
        ...acaoBase({ diasCompraLj: 0 }),
        auxiliares: aux,
      });
      assert.equal(r, "Recebimento Próximo/ Pedido dentro do Prazo");
    });

    it("7. CP=1 e DIAS_DA_COMPRALJ positivo antigo", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 });
      const r = calcularAcaoCurtoPrazo({
        ...acaoBase({ diasCompraLj: 8 }),
        auxiliares: aux,
      });
      assert.equal(r, "Recebimento Próximo/ Pedido Antigo (Avaliar Cancelamento)");
    });

    it("8. pedido apenas no CD → Não Existe Pedido", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 });
      const r = calcularAcaoCurtoPrazo({
        ...acaoBase({ diasCompraLj: null }),
        auxiliares: aux,
      });
      assert.equal(r, "Recebimento Próximo/ Não Existe Pedido");
    });

    it("9. Cross Docking não altera texto diretamente", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 });
      const comCross = calcularAcaoCurtoPrazo({ ...acaoBase({ diasCompraLj: 2 }), auxiliares: aux });
      assert.equal(comCross, "Recebimento Próximo/ Pedido dentro do Prazo");
    });

    it("10. produto exclusivo CP — mesma ação final", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2, modCurtoPrazo: "LJ_Exclusiva" });
      const r = calcularAcaoCurtoPrazo({ ...acaoBase(), auxiliares: aux });
      assert.equal(r, "Nâo é Ruptura Curto Prazo");
    });
  });

  describe("ação médio prazo", () => {
    it("11. MP=0 → sem ação MP", () => {
      const r = calcularAcaoMedioPrazo(acaoBase({ medioPrazo: 0, diasPedido: 45 }));
      assert.equal(r, "Não é Ruptura Médio Prazo");
    });

    it("12. MP=1 dentro do prazo", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 10 });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: 10 }),
        auxiliares: aux,
      });
      assert.equal(r, "Pedido dentro do prazo");
    });

    it("13. MP=1 entre 20 e 30 dias", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 25 });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: 25 }),
        auxiliares: aux,
      });
      assert.equal(r, "Pedidos dentre 20 há 30 dias");
    });

    it("14. MP=1 entre 30 e 60 dias", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 45 });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: 45 }),
        auxiliares: aux,
      });
      assert.equal(r, "Pedido dentre 30 há 60 Dias");
    });

    it("15. MP=1 superior a 60 dias", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 65 });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: 65 }),
        auxiliares: aux,
      });
      assert.equal(r, "Superior há 60 Dias");
    });

    it("16. Dias Pedido=0 com MP=1", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 0 });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: 0 }),
        auxiliares: aux,
      });
      assert.equal(r, "Pedido dentro do prazo");
    });

    it("17. Dias Pedido null com MP=1", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: null });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: null }),
        auxiliares: aux,
      });
      assert.equal(r, "Pedido dentro do prazo");
    });

    it("18. pendência loja positiva — possui pedido", () => {
      const aux = auxBase({ pendenciaLoja: 5, pendenciaCpaCd: 5 });
      assert.equal(aux.possuiPedidoCompra, "Sim");
    });

    it("19. pendência apenas em CD", () => {
      const aux = auxBase({ pendenciaLoja: 0, pendenciaCd1: 1, pendenciaCpaCd: 1 });
      assert.equal(aux.possuiPedidoCompra, "Sim");
    });

    it("20. PENDCD=2 com MP=1 e Dias Pedido=0", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 0, pendenciaCd1: 2, pendenciaCpaCd: 2 });
      const r = calcularAcaoMedioPrazo({
        ...acaoBase({ curtoPrazo: 0, medioPrazo: 1, diasPedido: 0 }),
        auxiliares: aux,
      });
      assert.equal(r, "Pedido dentro do prazo");
    });
  });

  describe("auxiliares", () => {
    it("21. Avaliar Pedido", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 45 });
      assert.equal(aux.avaliarPedido, 1);
      assert.equal(aux.pendenciaIndevida, 0);
    });

    it("22. Pendência Indevida", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 70 });
      assert.equal(aux.pendenciaIndevida, 1);
    });

    it("23. Pedido Superior há 30 Dias", () => {
      const aux = auxBase({ medioPrazo: 1, diasPedido: 35 });
      assert.equal(aux.pedidoSuperior30Dias, 1);
    });

    it("24. Possui Pedido de Compra", () => {
      assert.equal(auxBase({ pendenciaLoja: 0, pendenciaCpaCd: 0 }).possuiPedidoCompra, "Não");
      assert.equal(auxBase({ pendenciaLoja: 1, pendenciaCpaCd: 1 }).possuiPedidoCompra, "Sim");
    });

    it("25. Sem Entrada Sem Pedido", () => {
      const ok = auxBase();
      assert.equal(ok.semEntradaSemPedido, "Ok");
      const ruptura = auxBase({
        ultimaEntradaLoja: null,
        estoqueLoja: 0,
        pendenciaLoja: 0,
        pendenciaCd1: 0,
      });
      assert.equal(ruptura.semEntradaSemPedido, "Ruptura Cadastro Novo / Sem Entrada & Sem Pedido");
    });

    it("26. Recebimento Próximo", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 });
      assert.equal(aux.curtoPrazoRebtoProximo, 1);
      assert.equal(aux.curtoPrazoNaoRebtoProximo, 0);
    });

    it("27. dependência de centralização bloqueada", () => {
      const aux = auxBase();
      assert.equal(aux.statusRegra, "bloqueada_dependencia");
      assert.equal(aux.statusEstoqueCds, null);
      assert.equal(aux.statusSolicitacaoAtivacaoCd, null);
      assert.ok(aux.dependenciasBloqueadas.includes("status_estoque_cds"));
    });

    it("28. textos idênticos ao fixture via calcularAcoesOperacionais", () => {
      const aux = auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 });
      const r = calcularAcoesOperacionais({
        parMin: 1,
        curtoPrazo: 1,
        medioPrazo: 0,
        diasCompraLj: 3,
        diasPedido: 3,
        auxiliares: aux,
      });
      assert.equal(r.acaoCurtoPrazo, "Recebimento Próximo/ Pedido dentro do Prazo");
    });

    it("29. nenhuma correção ortográfica — Nâo com circunflexo", () => {
      const r = calcularAcaoCurtoPrazo(acaoBase({ curtoPrazo: 0, parMin: 1 }));
      assert.ok(r.includes("Nâo"));
      assert.ok(!r.includes("Nao "));
    });

    it("30. ações CP e MP coerentes com classificação", () => {
      const cp = calcularAcoesOperacionais({
        parMin: 1,
        curtoPrazo: 1,
        medioPrazo: 0,
        diasCompraLj: 2,
        diasPedido: 2,
        auxiliares: auxBase({ estoqueCd1: 1, diasRecebtoCd1: 2 }),
      });
      const mp = calcularAcoesOperacionais({
        parMin: 1,
        curtoPrazo: 0,
        medioPrazo: 1,
        diasCompraLj: null,
        diasPedido: 45,
        auxiliares: auxBase({ medioPrazo: 1, diasPedido: 45, pendenciaCpaCd: 1 }),
      });
      assert.notEqual(cp.acaoCurtoPrazo, "Nâo é Ruptura Curto Prazo");
      assert.equal(mp.acaoMedioPrazo, "Pedido dentre 30 há 60 Dias");
    });
  });
});
