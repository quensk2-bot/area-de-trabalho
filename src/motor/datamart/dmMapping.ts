import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import type { DmChaveProdutoLoja } from "./dmTypes.ts";

export function chaveDmProdutoLoja(item: Pick<MotorProdutoLojaConsolidado, "regional" | "dataReferencia" | "loja" | "seqproduto">): DmChaveProdutoLoja {
  return {
    regional: item.regional,
    dataReferencia: item.dataReferencia,
    loja: item.loja,
    seqproduto: item.seqproduto,
  };
}

export function chaveDmTexto(chave: DmChaveProdutoLoja): string {
  return `${chave.regional}|${chave.dataReferencia}|${chave.loja}|${chave.seqproduto}`;
}

export function chaveDmCd(chave: DmChaveProdutoLoja, posicaoLogica: number): string {
  return `${chaveDmTexto(chave)}|${posicaoLogica}`;
}

/** Campos do consolidado mapeados 1:1 para dm_produto_loja (sem cds[] nem legado flat). */
export const DM_CAMPOS_PRODUTO_LOJA = [
  "bandeira",
  "descricao",
  "codFornecedor",
  "fornecedor",
  "rede",
  "comprador",
  "statusProduto",
  "familia",
  "divisao",
  "setorCodigo",
  "setorNome",
  "categoriaN1",
  "setorN2",
  "grupoN3",
  "subgrupoN4",
  "tipoN5",
  "mediaVendaUnDia",
  "mediaVendaGp",
  "estoqueLoja",
  "parMin",
  "parMax",
  "pendenciaLoja",
  "diasRuptura",
  "ultimaEntradaLoja",
  "ultimaSaidaLoja",
  "somaEstoqueCd",
  "crossDocking",
  "geraRuptura",
  "ruptura104c",
  "inventarioUnid",
  "rupturaComInventario",
  "rupturaSemInventario",
  "baseLimpa",
  "ativacaoRecente",
  "curtoPrazo",
  "medioPrazo",
  "longoPrazo",
  "classificacaoPrazo",
  "pendenciaCpaCd",
  "diasPedido",
  "acaoCurtoPrazo",
  "acaoMedioPrazo",
  "produtoCentralizado",
  "textoProdutoCentralizado",
  "posicaoCdSelecionada",
  "codigoCdSelecionado",
  "menorDiasRecebimento",
  "statusRecebto",
  "statusEstoqueCds",
  "statusSolicitacaoAtivacaoCd",
  "qtdeEmbCompra",
  "embalagemCompra",
  "custoLiquido",
  "pesoUnid",
  "m3Unid",
  "coberturaDias",
  "statusOperacional",
  "qualidadeDados",
] as const satisfies readonly (keyof MotorProdutoLojaConsolidado)[];

export type DmCampoProdutoLoja = (typeof DM_CAMPOS_PRODUTO_LOJA)[number];
