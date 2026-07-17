import type { MotorBreItemResultado, MotorBreResultado } from "../../bre/breTypes.ts";
import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";
import type { MotorConsolidacaoEntrada } from "../../consolidar/consolidacaoTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../../types/motorProdutoLojaNormalizado.ts";
import type { MotorInventarioAgrupado, MotorLinhaValidacao } from "../../types/motorLinhaTypes.ts";

export function produtoConsolidadorBase(
  overrides: Partial<MotorProdutoLojaNormalizado> = {},
): MotorProdutoLojaNormalizado {
  return {
    regional: "NORDESTE",
    dataReferencia: "2026-07-13",
    loja: 103,
    seqproduto: 2505088,
    descricao: "PROD TESTE",
    codFornecedor: 1001,
    fornecedor: "FORN A",
    statusProduto: "A",
    familia: 10,
    mediaVendaUnDia: 2,
    mediaVendaGp: 1.5,
    estoqueLoja: 4,
    parMin: 1,
    parMax: 8,
    pendenciaLoja: 0,
    diasCompraLj: null,
    diasCompraCd1: 5,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasRecebtoCd1: 3,
    diasRecebtoCd2: 10,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
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
    estoqueCd2: 5,
    estoqueCd3: null,
    estoqueCd4: 2,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    statusCompraCd1: "A",
    statusCompraCd2: "A",
    statusCompraCd3: "A",
    statusCompraCd4: "A",
    diasRuptura: 2,
    ultimaEntradaLoja: "2026-01-01",
    ultimaSaidaLoja: "2026-01-02",
    custoLiquido: 3.5,
    cds: [],
    alertas: [],
    ...overrides,
  };
}

export function cd5Base(overrides: Partial<MotorCd5Normalizado> = {}): MotorCd5Normalizado {
  return {
    seqproduto: 2505088,
    statusCompraCd5: "A",
    estoqueCd5: 3,
    pendenciaCd5: 0,
    diasCompraCd5: 1,
    diasRecebtoCd5: 2,
    ultimaCpaCd5: null,
    cds: [],
    ...overrides,
  };
}

export function breItemBase(overrides: Partial<MotorBreItemResultado> = {}): MotorBreItemResultado {
  return {
    loja: 103,
    seqproduto: 2505088,
    statusBaseLimpa: "Base Limpa",
    diasAtivacaoRevisado: 10,
    statusAtivo60Dias: false,
    menorQueTresUnidades: 0,
    flagRuptura: "Gera Ruptura",
    ruptura104c: false,
    inventarioUnid: 0,
    rupturaInventario: 0,
    rupturaSemInventario: 0,
    somaEstoqueCd: 20,
    pendenciaCpaCd: 0,
    crossSum: 0,
    crossDocking: 0,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    classificacaoPrazo: "CP",
    curtoPrazo: 1,
    medioPrazo: 0,
    longoPrazo: 0,
    mediaDiasPedidoLoja: null,
    mediaDiasPedidoCd1: 5,
    mediaDiasPedidoCd2: null,
    mediaDiasPedidoCd3: null,
    mediaDiasPedidoCd4: null,
    mediaDiasPedidoCd5: 1,
    diasPedido: 5,
    origemDiasPedido: "cd1",
    avaliarPedido: 0,
    pendenciaIndevida: 0,
    pedidoSuperior30Dias: 0,
    possuiPedidoCompra: "Não",
    semEntradaSemPedido: "Ok",
    curtoPrazoRebtoProximo: 1,
    curtoPrazoNaoRebtoProximo: 0,
    acaoCurtoPrazo: "Recebimento Próximo/ Pedido Dentro do Prazo",
    acaoMedioPrazo: "Não é Ruptura Médio Prazo",
    statusEstoqueCds: "Estoque CD OK",
    statusSolicitacaoAtivacaoCd: "Ativo",
    menorRecebimentoCd: 3,
    produtoCentralizado: 101,
    textoProdutoCentralizado: "CD 101",
    statusRecebtoCentralizacao: "Com Movimentação nos úiltimos 120 dias",
    flagPrimeiroCd: 1,
    flagSegundoCd: 0,
    flagTerceiroCd: 0,
    flagQuartoCd: 0,
    flagQuintoCd: 0,
    posicaoCdSelecionada: 1,
    codigoCdSelecionado: 101,
    primeiroCd: 101,
    segundoCd: 102,
    terceiroCd: 103,
    quartoCd: 104,
    quintoCd: 105,
    regras: [],
    alertas: [],
    ...overrides,
  };
}

export function breResultadoBase(
  itens: MotorBreItemResultado[],
  overrides: Partial<MotorBreResultado> = {},
): MotorBreResultado {
  return {
    regional: "NORDESTE",
    dataReferencia: "2026-07-13",
    itens,
    metricas: {
      itensProcessados: itens.length,
      regrasAplicadas: 1,
      regrasBloqueadas: 0,
      regrasAmbiguas: 0,
      duracaoMs: 1,
    },
    erros: [],
    alertas: [],
    ...overrides,
  };
}

export function entradaConsolidadorBase(
  catalogos: MotorCatalogos,
  overrides: Partial<MotorConsolidacaoEntrada> = {},
): MotorConsolidacaoEntrada {
  const produto = produtoConsolidadorBase();
  const chave = `${produto.loja}|${produto.seqproduto}`;
  const inventario: MotorInventarioAgrupado = { loja: 103, produto: 2505088, inventarioUnid: 0 };
  const validacao: MotorLinhaValidacao = {
    numeroLinha: 1,
    loja: 103,
    produto: 2505088,
    qtdItemRupturaNoMix: 1,
    qtdItemRuptura: 1,
    geraRuptura: true,
    ruptura104c: false,
  };

  return {
    contexto: {
      regional: "NORDESTE",
      dataReferencia: "2026-07-13",
      catalogos,
    },
    produtosLoja: [produto],
    cds5: new Map([[2505088, cd5Base()]]),
    inventario: new Map([[chave, inventario]]),
    validacao: new Map([[chave, validacao]]),
    bre: breResultadoBase([breItemBase()]),
    ...overrides,
  };
}
