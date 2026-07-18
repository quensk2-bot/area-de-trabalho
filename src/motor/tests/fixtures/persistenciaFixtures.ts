import type { DmLote, DmProdutoLoja, DmProdutoLojaCd } from "../../datamart/dmTypes.ts";

export const PERSISTENCIA_TESTE_REGIONAL = "TESTE";
export const PERSISTENCIA_TESTE_DATA = "2099-01-15";
export const PERSISTENCIA_TESTE_LOJA = 9901;

function produtoBase(overrides: Partial<DmProdutoLoja> & Pick<DmProdutoLoja, "seqproduto" | "quantidadeCds">): DmProdutoLoja {
  return {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    bandeira: "TESTE",
    loja: PERSISTENCIA_TESTE_LOJA,
    descricao: `Produto ${overrides.seqproduto}`,
    codFornecedor: null,
    fornecedor: null,
    rede: "REDE TESTE",
    comprador: "COMPRADOR TESTE",
    statusProduto: "ATIVO",
    familia: null,
    divisao: null,
    setorCodigo: null,
    setorNome: null,
    categoriaN1: null,
    setorN2: null,
    grupoN3: null,
    subgrupoN4: null,
    tipoN5: null,
    mediaVendaUnDia: 1,
    mediaVendaGp: 1,
    estoqueLoja: 10,
    parMin: 1,
    parMax: 5,
    pendenciaLoja: 0,
    diasRuptura: 0,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    somaEstoqueCd: 100,
    crossDocking: 0,
    geraRuptura: true,
    ruptura104c: false,
    inventarioUnid: null,
    rupturaComInventario: null,
    rupturaSemInventario: null,
    baseLimpa: "SIM",
    ativacaoRecente: null,
    curtoPrazo: 1,
    medioPrazo: 0,
    longoPrazo: 0,
    classificacaoPrazo: "CP",
    pendenciaCpaCd: 0,
    diasPedido: 3,
    acaoCurtoPrazo: "ACAO CP",
    acaoMedioPrazo: null,
    produtoCentralizado: 1,
    textoProdutoCentralizado: "CENTRAL",
    posicaoCdSelecionada: 1,
    codigoCdSelecionado: 101,
    menorDiasRecebimento: 2,
    statusRecebto: "OK",
    statusEstoqueCds: "OK",
    statusSolicitacaoAtivacaoCd: "NAO",
    qtdeEmbCompra: 1,
    embalagemCompra: "UN",
    custoLiquido: 1.5,
    pesoUnid: 0.5,
    m3Unid: 0.001,
    coberturaDias: 5,
    statusOperacional: "curto_prazo",
    qualidadeDados: "completo",
    quantidadeCds: overrides.quantidadeCds,
    ...overrides,
  };
}

function cdLinha(
  seqproduto: number,
  posicaoLogica: number,
  overrides: Partial<DmProdutoLojaCd> = {},
): DmProdutoLojaCd {
  return {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    loja: PERSISTENCIA_TESTE_LOJA,
    seqproduto,
    posicaoLogica,
    codigoFisico: 100 + posicaoLogica,
    estoque: posicaoLogica * 10,
    pendencia: 0,
    statusCompra: "LIBERADO",
    diasCompra: 1,
    diasRecebimento: 2,
    flagCentralizacao: posicaoLogica === 1 ? 1 : 0,
    origemArquivo: "fixture-teste.txt",
    numeroBloco: 2,
    posicaoNoArquivo: posicaoLogica,
    ...overrides,
  };
}

/** Lote ficticio: 3 produtos, 1+5+8 CDs = 14 filhas. */
export function lotePersistenciaTesteControlado(): DmLote {
  const produtoA = produtoBase({ seqproduto: 9001, quantidadeCds: 1, classificacaoPrazo: "CP" });
  const produtoB = produtoBase({ seqproduto: 9002, quantidadeCds: 5, classificacaoPrazo: "MP", crossDocking: 1 });
  const produtoC = produtoBase({
    seqproduto: 9003,
    quantidadeCds: 8,
    classificacaoPrazo: "LP",
    qualidadeDados: "completo_com_alertas",
    crossDocking: null,
  });

  const cdsA = [cdLinha(9001, 1)];
  const cdsB = Array.from({ length: 5 }, (_, i) => cdLinha(9002, i + 1));
  const cdsC = Array.from({ length: 8 }, (_, i) => cdLinha(9003, i + 1));

  return {
    produtos: [produtoA, produtoB, produtoC],
    cds: [...cdsA, ...cdsB, ...cdsC],
  };
}

export function loteProduto1Cd(): DmLote {
  const produto = produtoBase({ seqproduto: 8001, quantidadeCds: 1 });
  return { produtos: [produto], cds: [cdLinha(8001, 1)] };
}

export function loteProduto5Cds(): DmLote {
  const produto = produtoBase({ seqproduto: 8002, quantidadeCds: 5 });
  return { produtos: [produto], cds: Array.from({ length: 5 }, (_, i) => cdLinha(8002, i + 1)) };
}

export function loteProduto8Cds(): DmLote {
  const produto = produtoBase({ seqproduto: 8003, quantidadeCds: 8 });
  return { produtos: [produto], cds: Array.from({ length: 8 }, (_, i) => cdLinha(8003, i + 1)) };
}

export function loteCdPosicao12(): DmLote {
  const produto = produtoBase({ seqproduto: 8012, quantidadeCds: 1 });
  return { produtos: [produto], cds: [cdLinha(8012, 12)] };
}

export function loteQualidadeInvalida(): DmLote {
  const lote = loteProduto1Cd();
  lote.produtos[0].qualidadeDados = "invalido";
  return lote;
}

export function loteProdutoDuplicado(): DmLote {
  const p = produtoBase({ seqproduto: 8100, quantidadeCds: 1 });
  return { produtos: [p, { ...p }], cds: [cdLinha(8100, 1), cdLinha(8100, 1)] };
}

export function lotePosicaoDuplicada(): DmLote {
  const produto = produtoBase({ seqproduto: 8200, quantidadeCds: 2 });
  return {
    produtos: [produto],
    cds: [cdLinha(8200, 1), cdLinha(8200, 1, { codigoFisico: 999 })],
  };
}

export function loteQuantidadeCdsDivergente(): DmLote {
  const produto = produtoBase({ seqproduto: 8300, quantidadeCds: 3 });
  return { produtos: [produto], cds: [cdLinha(8300, 1)] };
}

export function cloneLote(lote: DmLote): DmLote {
  return structuredClone(lote);
}
