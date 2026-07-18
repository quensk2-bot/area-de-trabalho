import type { MotorBreItemResultado, MotorBreResultado } from "../../bre/breTypes.ts";
import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";
import type { MotorConsolidacaoEntrada } from "../../consolidar/consolidacaoTypes.ts";
import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../../types/motorProdutoLojaNormalizado.ts";
import type { MotorInventarioAgrupado, MotorLinhaValidacao } from "../../types/motorLinhaTypes.ts";
import { cdBase } from "./cdsDinamicosFixtures.ts";

/** Helper de fixture — monta cds[] bloco 1 a partir dos valores flat do produto (não usado no Consolidador). */
export function cdsBloco1FromProdutoFlat(
  p: Pick<
    MotorProdutoLojaNormalizado,
    | "estoqueCd1"
    | "estoqueCd2"
    | "estoqueCd3"
    | "estoqueCd4"
    | "pendenciaCd1"
    | "pendenciaCd2"
    | "pendenciaCd3"
    | "pendenciaCd4"
    | "statusCompraCd1"
    | "statusCompraCd2"
    | "statusCompraCd3"
    | "statusCompraCd4"
    | "diasCompraCd1"
    | "diasCompraCd2"
    | "diasCompraCd3"
    | "diasCompraCd4"
    | "diasRecebtoCd1"
    | "diasRecebtoCd2"
    | "diasRecebtoCd3"
    | "diasRecebtoCd4"
    | "regional"
  >,
): MotorProdutoCdNormalizado[] {
  const origem = `${p.regional}-grupo1.txt`;
  const posicoes: Array<{
    pos: 1 | 2 | 3 | 4;
    estoque: number | null;
    pendencia: number | null;
    status: string | null;
    diasCompra: number | null;
    diasReceb: number | null;
  }> = [
    { pos: 1, estoque: p.estoqueCd1, pendencia: p.pendenciaCd1, status: p.statusCompraCd1, diasCompra: p.diasCompraCd1, diasReceb: p.diasRecebtoCd1 },
    { pos: 2, estoque: p.estoqueCd2, pendencia: p.pendenciaCd2, status: p.statusCompraCd2, diasCompra: p.diasCompraCd2, diasReceb: p.diasRecebtoCd2 },
    { pos: 3, estoque: p.estoqueCd3, pendencia: p.pendenciaCd3, status: p.statusCompraCd3, diasCompra: p.diasCompraCd3, diasReceb: p.diasRecebtoCd3 },
    { pos: 4, estoque: p.estoqueCd4, pendencia: p.pendenciaCd4, status: p.statusCompraCd4, diasCompra: p.diasCompraCd4, diasReceb: p.diasRecebtoCd4 },
  ];
  return posicoes.map(({ pos, estoque, pendencia, status, diasCompra, diasReceb }) =>
    cdBase(pos, {
      estoque,
      pendencia,
      statusCompra: status,
      diasCompra,
      diasRecebimento: diasReceb,
      origemArquivo: origem,
      numeroBloco: 1,
      posicaoNoArquivo: pos,
    }),
  );
}

/** Helper de fixture — monta cds[] bloco 2 posição 5 a partir do CD5 flat. */
export function cdsBloco2FromCd5Flat(
  cd5: Pick<
    MotorCd5Normalizado,
    "estoqueCd5" | "pendenciaCd5" | "statusCompraCd5" | "diasCompraCd5" | "diasRecebtoCd5"
  >,
  regional = "NORDESTE",
): MotorProdutoCdNormalizado[] {
  return [
    cdBase(5, {
      estoque: cd5.estoqueCd5,
      pendencia: cd5.pendenciaCd5,
      statusCompra: cd5.statusCompraCd5,
      diasCompra: cd5.diasCompraCd5,
      diasRecebimento: cd5.diasRecebtoCd5,
      origemArquivo: `${regional}-grupo2.txt`,
      numeroBloco: 2,
      posicaoNoArquivo: 1,
    }),
  ];
}

export function produtoConsolidadorBase(
  overrides: Partial<MotorProdutoLojaNormalizado> = {},
): MotorProdutoLojaNormalizado {
  const base: MotorProdutoLojaNormalizado = {
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
  if (base.cds.length === 0) {
    base.cds = cdsBloco1FromProdutoFlat(base);
  }
  return base;
}

export function cd5Base(overrides: Partial<MotorCd5Normalizado> = {}): MotorCd5Normalizado {
  const base: MotorCd5Normalizado = {
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
  if (base.cds.length === 0) {
    base.cds = cdsBloco2FromCd5Flat(base);
  }
  return base;
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
      blocosEsperados: [2],
    },
    produtosLoja: [produto],
    cds5: new Map([[2505088, cd5Base()]]),
    inventario: new Map([[chave, inventario]]),
    validacao: new Map([[chave, validacao]]),
    bre: breResultadoBase([breItemBase()]),
    ...overrides,
  };
}

/** Simula saída flat legada (pré-Etapa C) para gate de equivalência MT. */
export function simularFlatLegadoConsolidado(
  produto: MotorProdutoLojaNormalizado,
  estoqueCd5: number | null,
  pendenciaCd5: number | null,
  statusCompraCd5: string | null,
  diasCompraCd5: number | null,
  diasRecebtoCd5: number | null,
) {
  return {
    estoqueCd1: produto.estoqueCd1,
    estoqueCd2: produto.estoqueCd2,
    estoqueCd3: produto.estoqueCd3,
    estoqueCd4: produto.estoqueCd4,
    estoqueCd5,
    pendenciaCd1: produto.pendenciaCd1,
    pendenciaCd2: produto.pendenciaCd2,
    pendenciaCd3: produto.pendenciaCd3,
    pendenciaCd4: produto.pendenciaCd4,
    pendenciaCd5,
    statusCompraCd1: produto.statusCompraCd1,
    statusCompraCd2: produto.statusCompraCd2,
    statusCompraCd3: produto.statusCompraCd3,
    statusCompraCd4: produto.statusCompraCd4,
    statusCompraCd5,
    diasCompraCd1: produto.diasCompraCd1,
    diasCompraCd2: produto.diasCompraCd2,
    diasCompraCd3: produto.diasCompraCd3,
    diasCompraCd4: produto.diasCompraCd4,
    diasCompraCd5,
    diasRecebtoCd1: produto.diasRecebtoCd1,
    diasRecebtoCd2: produto.diasRecebtoCd2,
    diasRecebtoCd3: produto.diasRecebtoCd3,
    diasRecebtoCd4: produto.diasRecebtoCd4,
    diasRecebtoCd5,
  };
}
