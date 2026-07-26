import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcUltimoPedidoLojaPq,
  calcAtivacaoRuptura30SemPedido,
} from "../calcCapaCamposPq.ts";
import type { MotorProdutoLojaConsolidado } from "../../../consolidar/consolidacaoTypes.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<MotorProdutoLojaConsolidado> = {}): MotorProdutoLojaConsolidado {
  return {
    loja: 73,
    seqproduto: 1,
    regional: "MT",
    dataReferencia: "2026-07-13",
    bandeira: null,
    descricao: null,
    codFornecedor: null,
    fornecedor: null,
    rede: null,
    comprador: null,
    statusProduto: null,
    familia: null,
    divisao: null,
    setorCodigo: null,
    setorNome: null,
    categoriaN1: null,
    setorN2: null,
    grupoN3: null,
    subgrupoN4: null,
    tipoN5: null,
    mediaVendaUnDia: null,
    mediaVendaGp: null,
    estoqueLoja: null,
    parMin: null,
    parMax: null,
    pendenciaLoja: null,
    diasRuptura: null,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    ultimaCpaLoja: null,
    ultimaCpaCd1: null,
    ultimaCpaCd2: null,
    ultimaCpaCd3: null,
    ultimaCpaCd4: null,
    ultimaCpaCd5: null,
    dtaUltAtivacao: null,
    ultimoPedidoLoja: null,
    diasAtivacaoRevisado: null,
    cds: [],
    estoqueCd1: null,
    estoqueCd2: null,
    estoqueCd3: null,
    estoqueCd4: null,
    estoqueCd5: null,
    pendenciaCd1: null,
    pendenciaCd2: null,
    pendenciaCd3: null,
    pendenciaCd4: null,
    pendenciaCd5: null,
    statusCompraCd1: null,
    statusCompraCd2: null,
    statusCompraCd3: null,
    statusCompraCd4: null,
    statusCompraCd5: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasCompraCd5: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    somaEstoqueCd: null,
    crossSum: null,
    crossDocking: null,
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    origemCross: null,
    geraRuptura: null,
    ruptura104c: false,
    inventarioUnid: null,
    rupturaComInventario: null,
    rupturaSemInventario: null,
    baseLimpa: null,
    ativacaoRecente: null,
    curtoPrazo: null,
    medioPrazo: null,
    longoPrazo: null,
    classificacaoPrazo: "sem_ruptura",
    pendenciaCpaCd: null,
    diasPedido: null,
    acaoCurtoPrazo: null,
    acaoMedioPrazo: null,
    primeiroCd: null,
    segundoCd: null,
    terceiroCd: null,
    quartoCd: null,
    quintoCd: null,
    menorDiasRecebimento: null,
    produtoCentralizado: null,
    textoProdutoCentralizado: null,
    posicaoCdSelecionada: null,
    codigoCdSelecionado: null,
    flagPrimeiroCd: null,
    flagSegundoCd: null,
    flagTerceiroCd: null,
    flagQuartoCd: null,
    flagQuintoCd: null,
    statusRecebto: null,
    statusEstoqueCds: null,
    statusSolicitacaoAtivacaoCd: null,
    qtdeEmbCompra: null,
    embalagemCompra: null,
    custoLiquido: null,
    pesoUnid: null,
    m3Unid: null,
    coberturaDias: null,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    statusOperacional: "sem_ruptura",
    qualidadeDados: "completo",
    alertas: [],
    erros: [],
    fontesAusentes: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calcUltimoPedidoLojaPq (ULTIMACPALOJA é NUMÉRICO — dias)
// ---------------------------------------------------------------------------
describe("calcUltimoPedidoLojaPq", () => {
  it("Longo Prazo = 0 → 0", () => {
    const item = makeItem({ longoPrazo: 0 });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 0);
  });

  it("Longo Prazo = null → 0", () => {
    const item = makeItem({ longoPrazo: null });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 0);
  });

  it("Todos os campos null → 999", () => {
    const item = makeItem({
      longoPrazo: 1,
      ultimaCpaLoja: null,
      ultimaCpaCd1: null,
      ultimaCpaCd2: null,
      ultimaCpaCd3: null,
      ultimaCpaCd4: null,
      ultimaCpaCd5: null,
    });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 999);
  });

  it("Somente ultimaCpaLoja=10 → 10", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 10 });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 10);
  });

  it("ultimaCpaLoja=20, Cd1=10, Cd2=30 → menor=10", () => {
    const item = makeItem({
      longoPrazo: 1,
      ultimaCpaLoja: 20,
      ultimaCpaCd1: 10,
      ultimaCpaCd2: 30,
    });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 10);
  });

  it("ultimaCpaLoja=0 → incluído (0 >= 0)", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 0 });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 0);
  });

  it("ultimaCpaLoja=-1 → filtrado (-1 < 0)", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: -1 });
    // -1 é filtrado (v < 0), então todos null → 999
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 999);
  });

  it("Menor=20, DiasAtivacaoRevisado=15 → 999 (menor > ativacao)", () => {
    const item = makeItem({
      longoPrazo: 1,
      ultimaCpaLoja: 20,
      diasAtivacaoRevisado: 15,
    });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 999);
  });

  it("Menor=10, DiasAtivacaoRevisado=15 → 10 (menor <= ativacao)", () => {
    const item = makeItem({
      longoPrazo: 1,
      ultimaCpaLoja: 10,
      diasAtivacaoRevisado: 15,
    });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 10);
  });
});

// ---------------------------------------------------------------------------
// calcAtivacaoRuptura30SemPedido (nova fórmula)
// ---------------------------------------------------------------------------
describe("calcAtivacaoRuptura30SemPedido (nova fórmula)", () => {
  it("Longo Prazo != 1 → 0", () => {
    const item = makeItem({ longoPrazo: 0, diasRuptura: 60, diasAtivacaoRevisado: 45 });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 0);
  });

  it("Dias Ativação <= 30 → 0", () => {
    const item = makeItem({ longoPrazo: 1, diasAtivacaoRevisado: 25, diasRuptura: 60 });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 0);
  });

  it("Ultimo Pedido <= 30 → 0", () => {
    const item = makeItem({ longoPrazo: 1, diasAtivacaoRevisado: 45, diasRuptura: 60 });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 25), 0);
  });

  it("Dias Ruptura <= 30 → 0", () => {
    const item = makeItem({ longoPrazo: 1, diasAtivacaoRevisado: 45, diasRuptura: 25 });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 0);
  });

  it("Todas as condições verdadeiras → 1", () => {
    const item = makeItem({
      longoPrazo: 1,
      diasAtivacaoRevisado: 45,
      diasRuptura: 60,
    });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 1);
  });

  it("diasAtivacao null → 0 (null ?? 0 = 0 <= 30)", () => {
    const item = makeItem({
      longoPrazo: 1,
      diasAtivacaoRevisado: null,
      diasRuptura: 60,
    });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 0);
  });
});
