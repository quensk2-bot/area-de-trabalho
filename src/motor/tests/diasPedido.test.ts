import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorDiasPedidoEntrada } from "../bre/breTypes.ts";
import {
  aplicarRuleMedioPrazo,
  calcularDiasPedido,
  calcularPendenciaCpaCd,
} from "../bre/index.ts";

function entrada(overrides: Partial<MotorDiasPedidoEntrada> = {}): MotorDiasPedidoEntrada {
  return {
    pendenciaLoja: 0,
    diasCompraLoja: null,
    pendenciaCd1: 0,
    diasCompraCd1: null,
    pendenciaCd2: 0,
    diasCompraCd2: null,
    pendenciaCd3: 0,
    diasCompraCd3: null,
    pendenciaCd4: 0,
    diasCompraCd4: null,
    pendenciaCd5: 0,
    diasCompraCd5: null,
    ...overrides,
  };
}

describe("dias pedido", () => {
  it("1. PENDCPA=0 e CDs sem pendência → Dias Pedido=0", () => {
    const r = calcularDiasPedido(entrada());
    assert.equal(r.diasPedidoFinal, 0);
    assert.equal(r.mediaDiasPedidoLoja, null);
    assert.equal(r.origemResultado, "nenhum");
  });

  it("2. PENDCPA>0 e dias loja=0 → Dias Pedido=1", () => {
    const r = calcularDiasPedido(entrada({ pendenciaLoja: 5, diasCompraLoja: 0 }));
    assert.equal(r.mediaDiasPedidoLoja, 1);
    assert.equal(r.diasPedidoFinal, 1);
    assert.equal(r.origemResultado, "loja");
  });

  it("3. PENDCPA>0 e dias loja=15 → Dias Pedido=15", () => {
    const r = calcularDiasPedido(entrada({ pendenciaLoja: 2, diasCompraLoja: 15 }));
    assert.equal(r.diasPedidoFinal, 15);
    assert.equal(r.origemResultado, "loja");
  });

  it("4. PENDCPA>0 e CD com dias maior → prevalece loja", () => {
    const r = calcularDiasPedido(
      entrada({
        pendenciaLoja: 1,
        diasCompraLoja: 5,
        pendenciaCd1: 1,
        diasCompraCd1: 40,
      }),
    );
    assert.equal(r.diasPedidoFinal, 5);
    assert.equal(r.origemResultado, "loja");
  });

  it("5. PENDCPA null e CD1=1 com dias 0 → resultado=1", () => {
    const r = calcularDiasPedido(entrada({ pendenciaLoja: null, pendenciaCd1: 1, diasCompraCd1: 0 }));
    assert.equal(r.mediaDiasPedidoCd1, 1);
    assert.equal(r.diasPedidoFinal, 1);
    assert.equal(r.origemResultado, "cd1");
  });

  it("6. CD1=1 com dias 10 → resultado=10", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd1: 1, diasCompraCd1: 10 }));
    assert.equal(r.diasPedidoFinal, 10);
    assert.equal(r.origemResultado, "cd1");
  });

  it("7. CD1=2 com dias 10 → resultado=0", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd1: 2, diasCompraCd1: 10 }));
    assert.equal(r.mediaDiasPedidoCd1, 0);
    assert.equal(r.diasPedidoFinal, 0);
    assert.ok(r.alertas.some((a) => a.codigo === "PENDCD_MAIOR_QUE_1"));
  });

  it("8. CD1=1 e CD2=1 → usar maior dias", () => {
    const r = calcularDiasPedido(
      entrada({
        pendenciaCd1: 1,
        diasCompraCd1: 10,
        pendenciaCd2: 1,
        diasCompraCd2: 25,
      }),
    );
    assert.equal(r.diasPedidoFinal, 25);
    assert.equal(r.origemResultado, "cd2");
  });

  it("9. CD1=1 com dias null → List.Max ignora null, resultado=0", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd1: 1, diasCompraCd1: null }));
    assert.equal(r.mediaDiasPedidoCd1, null);
    assert.equal(r.diasPedidoFinal, 0);
    assert.equal(r.origemResultado, "nenhum");
  });

  it("10. todos campos null → resultado=0", () => {
    const r = calcularDiasPedido(
      entrada({
        pendenciaLoja: null,
        diasCompraLoja: null,
        pendenciaCd1: null,
        diasCompraCd1: null,
        pendenciaCd2: null,
        diasCompraCd2: null,
        pendenciaCd3: null,
        diasCompraCd3: null,
        pendenciaCd4: null,
        diasCompraCd4: null,
        pendenciaCd5: null,
        diasCompraCd5: null,
      }),
    );
    assert.equal(r.diasPedidoFinal, 0);
    assert.equal(r.origemResultado, "nenhum");
  });

  it("11. PENDCPA negativo → não ativa loja", () => {
    const r = calcularDiasPedido(entrada({ pendenciaLoja: -3, diasCompraLoja: 20 }));
    assert.equal(r.mediaDiasPedidoLoja, null);
    assert.equal(r.diasPedidoFinal, 0);
  });

  it("12. PENDCPA positivo com dias negativo → preservar valor e gerar alerta", () => {
    const r = calcularDiasPedido(entrada({ pendenciaLoja: 1, diasCompraLoja: -5 }));
    assert.equal(r.diasPedidoFinal, -5);
    assert.ok(r.alertas.some((a) => a.codigo === "DIAS_COMPRA_LOJA_NEGATIVO"));
  });

  it("13. PENDCD=1 com dias negativo → preservar na média CD e gerar alerta", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd3: 1, diasCompraCd3: -7 }));
    assert.equal(r.mediaDiasPedidoCd3, -7);
    assert.equal(r.diasPedidoFinal, 0);
    assert.equal(r.origemResultado, "cd5");
    assert.ok(r.alertas.some((a) => a.codigo === "DIAS_COMPRA_CD_NEGATIVO"));
  });

  it("14. CD5 participa normalmente", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd5: 1, diasCompraCd5: 18 }));
    assert.equal(r.mediaDiasPedidoCd5, 18);
    assert.equal(r.diasPedidoFinal, 18);
    assert.equal(r.origemResultado, "cd5");
  });

  it("15. origemResultado identifica corretamente a origem", () => {
    const loja = calcularDiasPedido(entrada({ pendenciaLoja: 1, diasCompraLoja: 3 }));
    const cd4 = calcularDiasPedido(entrada({ pendenciaCd4: 1, diasCompraCd4: 7 }));
    assert.equal(loja.origemResultado, "loja");
    assert.equal(cd4.origemResultado, "cd4");
  });

  it("16. empate entre dois CDs → origem determinística sem alterar valor", () => {
    const r = calcularDiasPedido(
      entrada({
        pendenciaCd1: 1,
        diasCompraCd1: 15,
        pendenciaCd2: 1,
        diasCompraCd2: 15,
      }),
    );
    assert.equal(r.diasPedidoFinal, 15);
    assert.equal(r.origemResultado, "cd2");
  });

  it("17. valor decimal em dias → preservado", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd1: 1, diasCompraCd1: 12.5 }));
    assert.equal(r.mediaDiasPedidoCd1, 12.5);
    assert.equal(r.diasPedidoFinal, 12.5);
  });

  it("18. PENDCD=2: MP pode ser 1, mas Dias Pedido do CD é 0", () => {
    const dias = calcularDiasPedido(entrada({ pendenciaCd1: 2, diasCompraCd1: 30 }));
    const pendencia = calcularPendenciaCpaCd({
      pendenciaLoja: 0,
      pendenciaCd1: 2,
      pendenciaCd2: 0,
      pendenciaCd3: 0,
      pendenciaCd4: 0,
      pendenciaCd5: 0,
    });
    const mp = aplicarRuleMedioPrazo({
      statusBaseLimpa: "Base Limpa",
      menorQueTres: 1,
      curtoPrazo: 0,
      pendenciaCpaCd: pendencia.soma,
    });

    assert.equal(dias.mediaDiasPedidoCd1, 0);
    assert.equal(dias.diasPedidoFinal, 0);
    assert.equal(mp.medioPrazo, 1);
  });

  it("19. dias CD como string \"0\" → normaliza para 1", () => {
    const r = calcularDiasPedido(entrada({ pendenciaCd2: 1, diasCompraCd2: "0" }));
    assert.equal(r.mediaDiasPedidoCd2, 1);
    assert.equal(r.diasPedidoFinal, 1);
  });

  it("20. PENDCPA>0 com dias loja null → recorre ao List.Max dos CDs", () => {
    const r = calcularDiasPedido(
      entrada({
        pendenciaLoja: 1,
        diasCompraLoja: null,
        pendenciaCd1: 1,
        diasCompraCd1: 8,
      }),
    );
    assert.equal(r.mediaDiasPedidoLoja, null);
    assert.equal(r.diasPedidoFinal, 8);
    assert.equal(r.origemResultado, "cd1");
  });
});
