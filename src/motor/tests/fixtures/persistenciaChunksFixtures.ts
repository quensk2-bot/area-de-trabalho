import type { DmLote, DmProdutoLoja, DmProdutoLojaCd } from "../../datamart/dmTypes.ts";

export const CHUNK_TESTE_REGIONAL = "TESTE";
export const CHUNK_TESTE_DATA = "2099-01-16";
export const CHUNK_TESTE_LOJA = 9901;

const CD_VARIANTS = [1, 5, 8, 12] as const;

function produto(seq: number, qtdCds: number): DmProdutoLoja {
  return {
    regional: CHUNK_TESTE_REGIONAL,
    dataReferencia: CHUNK_TESTE_DATA,
    bandeira: "TESTE",
    loja: CHUNK_TESTE_LOJA,
    seqproduto: 10000 + seq,
    descricao: `Produto chunk ${seq}`,
    codFornecedor: null,
    fornecedor: null,
    rede: "REDE",
    comprador: "COMPRADOR",
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
    estoqueLoja: 1,
    parMin: 1,
    parMax: 1,
    pendenciaLoja: 0,
    diasRuptura: 0,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    somaEstoqueCd: 10,
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
    classificacaoPrazo: "curto_prazo",
    pendenciaCpaCd: 0,
    diasPedido: 1,
    acaoCurtoPrazo: null,
    acaoMedioPrazo: null,
    produtoCentralizado: 1,
    textoProdutoCentralizado: null,
    posicaoCdSelecionada: 1,
    codigoCdSelecionado: 101,
    menorDiasRecebimento: 1,
    statusRecebto: "OK",
    statusEstoqueCds: "OK",
    statusSolicitacaoAtivacaoCd: "NAO",
    qtdeEmbCompra: 1,
    embalagemCompra: "UN",
    custoLiquido: 1,
    pesoUnid: 1,
    m3Unid: 1,
    coberturaDias: 1,
    statusOperacional: "curto_prazo",
    qualidadeDados: "completo",
    quantidadeCds: qtdCds,
  };
}

function cds(seq: number, qtd: number): DmProdutoLojaCd[] {
  return Array.from({ length: qtd }, (_, i) => ({
    regional: CHUNK_TESTE_REGIONAL,
    dataReferencia: CHUNK_TESTE_DATA,
    loja: CHUNK_TESTE_LOJA,
    seqproduto: 10000 + seq,
    posicaoLogica: i + 1,
    codigoFisico: 100 + i,
    estoque: 1,
    pendencia: 0,
    statusCompra: "LIB",
    diasCompra: 1,
    diasRecebimento: 1,
    flagCentralizacao: i === 0 ? 1 : 0,
    origemArquivo: "fixture-chunk",
    numeroBloco: 2,
    posicaoNoArquivo: i + 1,
  }));
}

/** 1201 produtos — chunks 500+500+201 com CDs 1/5/8/12 alternados. */
export function loteChunkTeste1201(): DmLote {
  const produtos: DmProdutoLoja[] = [];
  const filhas: DmProdutoLojaCd[] = [];
  for (let i = 1; i <= 1201; i++) {
    const qtd = CD_VARIANTS[i % CD_VARIANTS.length];
    produtos.push(produto(i, qtd));
    filhas.push(...cds(i, qtd));
  }
  return { produtos, cds: filhas };
}

export function cloneLoteChunk(lote: DmLote): DmLote {
  return structuredClone(lote);
}

export function totalCdsLote(lote: DmLote): number {
  return lote.cds.length;
}
