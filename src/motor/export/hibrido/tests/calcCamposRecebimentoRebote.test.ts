import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcRupDiasRecebtoCd,
  calcRupDiasRecebtoMaiorData,
  calcCurtoPrazoRebtoProximo,
  calcCurtoPrazoNaoRebtoProximo,
  calcCamposRecebimentoRebote,
} from "../calcCapaCamposPq.ts";
import type { MotorProdutoLojaConsolidado } from "../../../consolidar/consolidacaoTypes.ts";

// ---------------------------------------------------------------------------
// calcRupDiasRecebtoCd
// ---------------------------------------------------------------------------
describe("calcRupDiasRecebtoCd", () => {
  it("estoqueCd=1 e dias=5 → 5", () => {
    assert.equal(calcRupDiasRecebtoCd(1, 5), 5);
  });

  it("estoqueCd=1 e dias=0 → 1", () => {
    assert.equal(calcRupDiasRecebtoCd(1, 0), 1);
  });

  it("estoqueCd=0 → 0", () => {
    assert.equal(calcRupDiasRecebtoCd(0, 5), 0);
  });

  it("estoqueCd=null → 0", () => {
    assert.equal(calcRupDiasRecebtoCd(null, 5), 0);
  });

  it("estoqueCd=1 e dias=null → 0", () => {
    assert.equal(calcRupDiasRecebtoCd(1, null), 0);
  });

  it("estoqueCd=1 e dias=undefined → 0", () => {
    assert.equal(calcRupDiasRecebtoCd(1, undefined), 0);
  });
});

// ---------------------------------------------------------------------------
// calcRupDiasRecebtoMaiorData
// ---------------------------------------------------------------------------
describe("calcRupDiasRecebtoMaiorData", () => {
  it("maior entre [1,3,2,0,0] → 3", () => {
    assert.equal(calcRupDiasRecebtoMaiorData([1, 3, 2, 0, 0]), 3);
  });

  it("todos zero → 0", () => {
    assert.equal(calcRupDiasRecebtoMaiorData([0, 0, 0, 0, 0]), 0);
  });

  it("array vazio → 0", () => {
    assert.equal(calcRupDiasRecebtoMaiorData([]), 0);
  });
});

// ---------------------------------------------------------------------------
// calcCurtoPrazoRebtoProximo
// ---------------------------------------------------------------------------
describe("calcCurtoPrazoRebtoProximo", () => {
  const makeItem = (ruptura104c: boolean): Pick<MotorProdutoLojaConsolidado, "ruptura104c"> => ({
    ruptura104c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  it("maior=3 e ruptura=true → 1", () => {
    assert.equal(calcCurtoPrazoRebtoProximo(3, makeItem(true)), 1);
  });

  it("maior=4 e ruptura=true → 1 (limite inferior <5)", () => {
    assert.equal(calcCurtoPrazoRebtoProximo(4, makeItem(true)), 1);
  });

  it("maior=5 e ruptura=true → 0 (>=5)", () => {
    assert.equal(calcCurtoPrazoRebtoProximo(5, makeItem(true)), 0);
  });

  it("maior=7 e ruptura=true → 0 (>=5)", () => {
    assert.equal(calcCurtoPrazoRebtoProximo(7, makeItem(true)), 0);
  });

  it("maior=0 → 0", () => {
    assert.equal(calcCurtoPrazoRebtoProximo(0, makeItem(true)), 0);
  });

  it("maior=3 e ruptura=false → 0", () => {
    assert.equal(calcCurtoPrazoRebtoProximo(3, makeItem(false)), 0);
  });
});

// ---------------------------------------------------------------------------
// calcCurtoPrazoNaoRebtoProximo
// ---------------------------------------------------------------------------
describe("calcCurtoPrazoNaoRebtoProximo", () => {
  const makeItem = (ruptura104c: boolean): Pick<MotorProdutoLojaConsolidado, "ruptura104c"> => ({
    ruptura104c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  it("maior=7 e ruptura=true → 1", () => {
    assert.equal(calcCurtoPrazoNaoRebtoProximo(7, makeItem(true)), 1);
  });

  it("maior=5 e ruptura=true → 1 (limite >4)", () => {
    assert.equal(calcCurtoPrazoNaoRebtoProximo(5, makeItem(true)), 1);
  });

  it("maior=4 e ruptura=true → 0 (<=4)", () => {
    assert.equal(calcCurtoPrazoNaoRebtoProximo(4, makeItem(true)), 0);
  });

  it("maior=3 e ruptura=true → 0 (<=4)", () => {
    assert.equal(calcCurtoPrazoNaoRebtoProximo(3, makeItem(true)), 0);
  });

  it("maior=7 e ruptura=false → 0 (sem ruptura)", () => {
    assert.equal(calcCurtoPrazoNaoRebtoProximo(7, makeItem(false)), 0);
  });

  it("maior=0 → 0", () => {
    assert.equal(calcCurtoPrazoNaoRebtoProximo(0, makeItem(true)), 0);
  });
});

// ---------------------------------------------------------------------------
// calcCamposRecebimentoRebote (integração)
// ---------------------------------------------------------------------------
function makeConsolidado(overrides: Partial<MotorProdutoLojaConsolidado> = {}): MotorProdutoLojaConsolidado {
  return {
    loja: 73,
    seqproduto: 1,
    regional: "MT",
    dataReferencia: "2026-07-13",
    estoqueCd1: null,
    estoqueCd2: null,
    estoqueCd3: null,
    estoqueCd4: null,
    estoqueCd5: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    cds: [],
    ruptura104c: false,
    classificacaoPrazo: "sem_ruptura",
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
    somaEstoqueCd: null,
    crossSum: null,
    crossDocking: null,
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    origemCross: null,
    geraRuptura: null,
    inventarioUnid: null,
    rupturaComInventario: null,
    rupturaSemInventario: null,
    baseLimpa: null,
    ativacaoRecente: null,
    curtoPrazo: null,
    medioPrazo: null,
    longoPrazo: null,
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
    rupDiasRecebtoMaiorData: null,
    curtoPrazoRebtoProximo: null,
    curtoPrazoNaoRebtoProximo: null,
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

describe("calcCamposRecebimentoRebote (via campos flat)", () => {
  it("CD1 com estoque=1 e dias=5 → CD1=5, CD2-5=0, maior=5, Não Rebto=1", () => {
    const item = makeConsolidado({
      estoqueCd1: 1,
      diasRecebtoCd1: 5,
      ruptura104c: true,
    });
    const r = calcCamposRecebimentoRebote(item);
    assert.equal(r.rupDiasRecebtoCd1, 5);
    assert.equal(r.rupDiasRecebtoCd2, 0);
    assert.equal(r.rupDiasRecebtoCd3, 0);
    assert.equal(r.rupDiasRecebtoCd4, 0);
    assert.equal(r.rupDiasRecebtoCd5, 0);
    assert.equal(r.rupDiasRecebtoMaiorData, 5);
    assert.equal(r.curtoPrazoRebtoProximo, 0);
    assert.equal(r.curtoPrazoNaoRebtoProximo, 1);
  });

  it("CD2 com estoque=1 e dias=3 → CD2=3, maior=3, Rebto Próximo=1", () => {
    const item = makeConsolidado({
      estoqueCd2: 1,
      diasRecebtoCd2: 3,
      ruptura104c: true,
    });
    const r = calcCamposRecebimentoRebote(item);
    assert.equal(r.rupDiasRecebtoCd2, 3);
    assert.equal(r.rupDiasRecebtoMaiorData, 3);
    assert.equal(r.curtoPrazoRebtoProximo, 1);
    assert.equal(r.curtoPrazoNaoRebtoProximo, 0);
  });

  it("todos os CDs sem estoque → todos zero, maior=0, ambos rebotes=0", () => {
    const item = makeConsolidado({
      estoqueCd1: 0,
      estoqueCd2: 0,
      estoqueCd3: 0,
      estoqueCd4: 0,
      estoqueCd5: 0,
      ruptura104c: true,
    });
    const r = calcCamposRecebimentoRebote(item);
    assert.equal(r.rupDiasRecebtoMaiorData, 0);
    assert.equal(r.curtoPrazoRebtoProximo, 0);
    assert.equal(r.curtoPrazoNaoRebtoProximo, 0);
  });

  it("sem ruptura (ruptura104c=false) → ambos rebotes=0 mesmo com maior>0", () => {
    const item = makeConsolidado({
      estoqueCd1: 1,
      diasRecebtoCd1: 3,
      ruptura104c: false,
    });
    const r = calcCamposRecebimentoRebote(item);
    assert.equal(r.rupDiasRecebtoMaiorData, 3);
    assert.equal(r.curtoPrazoRebtoProximo, 0);
    assert.equal(r.curtoPrazoNaoRebtoProximo, 0);
  });

  it("CD com estoque=1 e dias=0 → normalizado para 1", () => {
    const item = makeConsolidado({
      estoqueCd3: 1,
      diasRecebtoCd3: 0,
      ruptura104c: true,
    });
    const r = calcCamposRecebimentoRebote(item);
    assert.equal(r.rupDiasRecebtoCd3, 1);
    assert.equal(r.rupDiasRecebtoMaiorData, 1);
    assert.equal(r.curtoPrazoRebtoProximo, 1);
    assert.equal(r.curtoPrazoNaoRebtoProximo, 0);
  });
});
