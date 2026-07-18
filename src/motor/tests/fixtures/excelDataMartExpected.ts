import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { DmProdutoLoja, DmProdutoLojaCd } from "../../datamart/dmTypes.ts";
import { cdBase, colecaoN } from "./cdsDinamicosFixtures.ts";

export function consolidadoDataMartBase(
  overrides: Partial<MotorProdutoLojaConsolidado> = {},
): MotorProdutoLojaConsolidado {
  const cds = overrides.cds ?? colecaoN(5, "MT");
  return {
    regional: "MT",
    dataReferencia: "2026-03-26",
    bandeira: "Comper MT",
    loja: 73,
    seqproduto: 1000,
    descricao: "PRODUTO DM",
    codFornecedor: 100,
    fornecedor: "FORN DM",
    rede: "REDE DM",
    comprador: "COMPRADOR DM",
    statusProduto: "A",
    familia: 1,
    divisao: "60-MERCEARIA",
    setorCodigo: "33",
    setorNome: "LIQUIDA",
    categoriaN1: null,
    setorN2: "33-LIQUIDA",
    grupoN3: "BEBIDAS",
    subgrupoN4: null,
    tipoN5: null,
    mediaVendaUnDia: 2,
    mediaVendaGp: 1.5,
    estoqueLoja: 4,
    parMin: 1,
    parMax: 8,
    pendenciaLoja: 0,
    diasRuptura: 2,
    ultimaEntradaLoja: "2026-01-01",
    ultimaSaidaLoja: "2026-01-02",
    cds,
    estoqueCd1: 10,
    estoqueCd2: 20,
    estoqueCd3: 30,
    estoqueCd4: 40,
    estoqueCd5: 50,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    pendenciaCd5: 0,
    statusCompraCd1: "A",
    statusCompraCd2: "A",
    statusCompraCd3: "A",
    statusCompraCd4: "A",
    statusCompraCd5: "A",
    diasCompraCd1: 1,
    diasCompraCd2: 2,
    diasCompraCd3: 3,
    diasCompraCd4: 4,
    diasCompraCd5: 5,
    diasRecebtoCd1: 1,
    diasRecebtoCd2: 2,
    diasRecebtoCd3: 3,
    diasRecebtoCd4: 4,
    diasRecebtoCd5: 5,
    somaEstoqueCd: 150,
    crossSum: 0,
    crossDocking: 0,
    geraRuptura: true,
    ruptura104c: true,
    inventarioUnid: 0,
    rupturaComInventario: 0,
    rupturaSemInventario: 1,
    baseLimpa: "Base Limpa",
    ativacaoRecente: false,
    curtoPrazo: 1,
    medioPrazo: 0,
    longoPrazo: 0,
    classificacaoPrazo: "curto_prazo",
    pendenciaCpaCd: 0,
    diasPedido: 5,
    acaoCurtoPrazo: "Recebimento Próximo",
    acaoMedioPrazo: "Não é Ruptura Médio Prazo",
    primeiroCd: 464,
    segundoCd: 468,
    terceiroCd: 753,
    quartoCd: 904,
    quintoCd: 905,
    menorDiasRecebimento: 1,
    produtoCentralizado: 753,
    textoProdutoCentralizado: "CD 753",
    posicaoCdSelecionada: 3,
    codigoCdSelecionado: 753,
    flagPrimeiroCd: 0,
    flagSegundoCd: 0,
    flagTerceiroCd: 1,
    flagQuartoCd: 0,
    flagQuintoCd: 0,
    statusRecebto: null,
    statusEstoqueCds: "Estoque OK",
    statusSolicitacaoAtivacaoCd: "Ativo",
    qtdeEmbCompra: 1,
    embalagemCompra: "UN",
    custoLiquido: 3.5,
    pesoUnid: 0.5,
    m3Unid: 0.001,
    coberturaDias: 2,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    statusOperacional: "curto_prazo",
    qualidadeDados: "completo",
    alertas: [],
    erros: [],
    fontesAusentes: [],
    ...overrides,
  };
}

export function consolidadoDataMart8Cds(): MotorProdutoLojaConsolidado {
  return consolidadoDataMartBase({
    seqproduto: 2000,
    cds: colecaoN(8, "MT"),
  });
}

export function consolidadoDataMart12Cds(): MotorProdutoLojaConsolidado {
  return consolidadoDataMartBase({
    seqproduto: 3000,
    cds: colecaoN(12, "MT"),
  });
}

export const DM_PRODUTO_LOJA_ESPERADO: Partial<DmProdutoLoja> = {
  regional: "MT",
  dataReferencia: "2026-03-26",
  loja: 73,
  seqproduto: 1000,
  bandeira: "Comper MT",
  rede: "REDE DM",
  comprador: "COMPRADOR DM",
  baseLimpa: "Base Limpa",
  curtoPrazo: 1,
  quantidadeCds: 5,
  statusOperacional: "curto_prazo",
  qualidadeDados: "completo",
};

export const DM_CD_ESPERADO_POS1: Partial<DmProdutoLojaCd> = {
  posicaoLogica: 1,
  estoque: 10,
  pendencia: 0,
  numeroBloco: 1,
};

export const CATALOGO_MT_5CD = new Map<number, number | null>([
  [1, 464],
  [2, 468],
  [3, 753],
  [4, 904],
  [5, 905],
]);

export function consolidadoComFlatDivergente(): MotorProdutoLojaConsolidado {
  const cds = [
    cdBase(1, { estoque: 999, pendencia: 0, origemArquivo: "fonte-cds.txt" }),
    cdBase(2, { estoque: 888, pendencia: 0, origemArquivo: "fonte-cds.txt" }),
  ];
  return consolidadoDataMartBase({
    seqproduto: 4000,
    cds,
    estoqueCd1: 1,
    estoqueCd2: 2,
    estoqueCd3: 3,
    estoqueCd4: 4,
    estoqueCd5: 5,
  });
}
