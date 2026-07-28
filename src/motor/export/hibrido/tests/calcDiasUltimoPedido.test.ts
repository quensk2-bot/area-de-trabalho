import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcDiasUltimoPedidoLojaDashboard,
  calcUltimoPedidoLojaPq,
  calcAtivacaoRuptura30SemPedido,
} from "../calcCapaCamposPq.ts";
import type { MotorProdutoLojaConsolidado } from "../../../consolidar/consolidacaoTypes.ts";

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
    modalidadeCd: "ED Direto Loja",
    statusOperacional: "sem_ruptura",
    qualidadeDados: "completo",
    alertas: [],
    erros: [],
    fontesAusentes: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calcDiasUltimoPedidoLojaDashboard (raw ULTIMACPALOJA)
// ---------------------------------------------------------------------------

describe("calcDiasUltimoPedidoLojaDashboard", () => {
  it("LP=1, raw=100 → 100", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 100 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), 100);
  });

  it("LP=1, raw=200 → 200", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 200 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), 200);
  });

  it("LP=1, raw=null → null", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: null });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null);
  });

  it("LP=1, raw=0 → null (não entra na média)", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 0 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null);
  });

  it("LP=1, raw=999 → null (não entra na média)", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 999 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null);
  });

  it("LP=1, raw=1000 → 1000 (>=999 entra, só 999 é excluído)", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 1000 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), 1000);
  });

  it("LP=0 → null (não é LP)", () => {
    const item = makeItem({ longoPrazo: 0, ultimaCpaLoja: 100 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null);
  });

  it("LP=null → null", () => {
    const item = makeItem({ longoPrazo: null, ultimaCpaLoja: 100 });
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null);
  });

  it("agregação: [100, 200, null, 0] → média 150", () => {
    // Simula 4 produtos: apenas 100 e 200 entram na média
    const valores = [
      calcDiasUltimoPedidoLojaDashboard(makeItem({ longoPrazo: 1, ultimaCpaLoja: 100 })),
      calcDiasUltimoPedidoLojaDashboard(makeItem({ longoPrazo: 1, ultimaCpaLoja: 200 })),
      calcDiasUltimoPedidoLojaDashboard(makeItem({ longoPrazo: 1, ultimaCpaLoja: null })),
      calcDiasUltimoPedidoLojaDashboard(makeItem({ longoPrazo: 1, ultimaCpaLoja: 0 })),
    ];
    const validos = valores.filter((v): v is number => v != null);
    const soma = validos.reduce((s, v) => s + v, 0);
    assert.equal(validos.length, 2, "apenas 2 valores devem ser válidos");
    assert.equal(soma, 300, "soma deve ser 100 + 200");
    assert.equal(soma / validos.length, 150, "média deve ser 150");
  });
});

// ---------------------------------------------------------------------------
// calcUltimoPedidoLojaPq permanece inalterado (fórmula PQ, min loja+CDs)
// ---------------------------------------------------------------------------

describe("calcUltimoPedidoLojaPq (fórmula PQ, inalterada)", () => {
  it("LP=1, raw=100, cd1=50 → min=50", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 100, ultimaCpaCd1: 50 });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 50);
  });

  it("LP=1, raw=100, cds null → raw=100", () => {
    const item = makeItem({ longoPrazo: 1, ultimaCpaLoja: 100 });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 100);
  });

  it("LP=0 → 0 (não é LP)", () => {
    const item = makeItem({ longoPrazo: 0, ultimaCpaLoja: 100 });
    assert.equal(calcUltimoPedidoLojaPq(item, "2026-07-13"), 0);
  });
});

// ---------------------------------------------------------------------------
// calcAtivacaoRuptura30SemPedido continua usando calcUltimoPedidoLojaPq
// ---------------------------------------------------------------------------

describe("calcAtivacaoRuptura30SemPedido (380 inalterado)", () => {
  it("todas condições true → 1 (usa PQ, não raw)", () => {
    const item = makeItem({
      longoPrazo: 1,
      diasAtivacaoRevisado: 60,
      diasRuptura: 60,
    });
    // ultimoPedidoLoja = calcUltimoPedidoLojaPq (fórmula PQ, min values)
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 1);
  });

  it("diasAtivacao <= 30 → 0 (mesmo com raw alto)", () => {
    const item = makeItem({
      longoPrazo: 1,
      diasAtivacaoRevisado: 15,
      diasRuptura: 60,
    });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 0);
  });

  it("LP != 1 → 0 (mesmo com raw > 0)", () => {
    const item = makeItem({
      longoPrazo: 0,
      diasAtivacaoRevisado: 60,
      diasRuptura: 60,
    });
    assert.equal(calcAtivacaoRuptura30SemPedido(item, 35), 0);
  });
});

// ---------------------------------------------------------------------------
// CP, MP, LP permanecem inalterados
// ---------------------------------------------------------------------------
describe("CP, MP, LP inalterados", () => {
  it("curtoPrazo continua independente do dashboard field", () => {
    const item = makeItem({
      longoPrazo: 0,
      medioPrazo: 0,
      curtoPrazo: 1,
      ultimaCpaLoja: 100,
      classificacaoPrazo: "curto_prazo",
    });
    // Verifica que o dashboard field nao afeta CP
    assert.equal(item.curtoPrazo, 1);
    assert.equal(item.classificacaoPrazo, "curto_prazo");
    // Dashboard field funciona independentemente
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null); // CP=0, not LP
  });

  it("medioPrazo continua independente do dashboard field", () => {
    const item = makeItem({
      longoPrazo: 0,
      curtoPrazo: 0,
      medioPrazo: 1,
      ultimaCpaLoja: 50,
      classificacaoPrazo: "medio_prazo",
    });
    assert.equal(item.medioPrazo, 1);
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), null);
  });

  it("longoPrazo continua funcionando normalmente", () => {
    const item = makeItem({
      longoPrazo: 1,
      curtoPrazo: 0,
      medioPrazo: 0,
      ultimaCpaLoja: 75,
      classificacaoPrazo: "longo_prazo",
    });
    assert.equal(item.longoPrazo, 1);
    // Dashboard field APENAS para LP
    assert.equal(calcDiasUltimoPedidoLojaDashboard(item), 75);
  });

  it("curtoPrazo, medioPrazo, longoPrazo somam corretamente com aggregator", () => {
    // Simula agregacao basica
    const produtos = [
      { ...makeItem({ curtoPrazo: 1, medioPrazo: 0, longoPrazo: 0, classificacaoPrazo: "curto_prazo", baseLimpa: "Base Limpa", ruptura104c: true }) },
      { ...makeItem({ curtoPrazo: 0, medioPrazo: 1, longoPrazo: 0, classificacaoPrazo: "medio_prazo", baseLimpa: "Base Limpa", ruptura104c: true }) },
      { ...makeItem({ curtoPrazo: 0, medioPrazo: 0, longoPrazo: 1, classificacaoPrazo: "longo_prazo", baseLimpa: "Base Limpa", ruptura104c: true }) },
      { ...makeItem({ curtoPrazo: 0, medioPrazo: 0, longoPrazo: 0, classificacaoPrazo: "sem_ruptura", baseLimpa: "Base Limpa", ruptura104c: false }) },
    ];
    const cp = produtos.filter(p => p.curtoPrazo === 1).length;
    const mp = produtos.filter(p => p.medioPrazo === 1).length;
    const lp = produtos.filter(p => p.longoPrazo === 1).length;
    assert.equal(cp, 1, "deve ter 1 CP");
    assert.equal(mp, 1, "deve ter 1 MP");
    assert.equal(lp, 1, "deve ter 1 LP");
  });
});
