import type {
  MotorClassificacaoPrazoPublicacao,
  MotorProdutoLojaConsolidado,
  MotorQualidadeDados,
  MotorStatusOperacional,
} from "../consolidar/consolidacaoTypes.ts";

/** Chave natural dm_produto_loja / dm_produto_loja_cd. */
export type DmChaveProdutoLoja = {
  regional: string;
  dataReferencia: string;
  loja: number;
  seqproduto: number;
};

/** Contrato dm_produto_loja — objeto de publicação, sem persistência. */
export type DmProdutoLoja = DmChaveProdutoLoja & {
  bandeira: string | null;
  descricao: string | null;
  codFornecedor: number | null;
  fornecedor: string | null;
  rede: string | null;
  comprador: string | null;
  statusProduto: string | null;
  familia: number | null;
  divisao: string | null;
  setorCodigo: string | null;
  setorNome: string | null;
  categoriaN1: string | null;
  setorN2: string | null;
  grupoN3: string | null;
  subgrupoN4: string | null;
  tipoN5: string | null;
  mediaVendaUnDia: number | null;
  mediaVendaGp: number | null;
  estoqueLoja: number | null;
  parMin: number | null;
  parMax: number | null;
  pendenciaLoja: number | null;
  diasRuptura: number | null;
  ultimaEntradaLoja: string | null;
  ultimaSaidaLoja: string | null;
  somaEstoqueCd: number | null;
  crossDocking: number | null;
  geraRuptura: boolean | null;
  ruptura104c: boolean | null;
  inventarioUnid: number | null;
  rupturaComInventario: number | null;
  rupturaSemInventario: number | null;
  baseLimpa: string | null;
  ativacaoRecente: boolean | null;
  curtoPrazo: number | null;
  medioPrazo: number | null;
  longoPrazo: number | null;
  classificacaoPrazo: MotorClassificacaoPrazoPublicacao;
  pendenciaCpaCd: number | null;
  diasPedido: number | null;
  acaoCurtoPrazo: string | null;
  acaoMedioPrazo: string | null;
  produtoCentralizado: number | null;
  textoProdutoCentralizado: string | null;
  posicaoCdSelecionada: number | null;
  codigoCdSelecionado: number | null;
  menorDiasRecebimento: number | null;
  statusRecebto: string | null;
  statusEstoqueCds: string | null;
  statusSolicitacaoAtivacaoCd: string | null;
  qtdeEmbCompra: number | null;
  embalagemCompra: string | null;
  custoLiquido: number | null;
  pesoUnid: number | null;
  m3Unid: number | null;
  coberturaDias: number | null;
  statusOperacional: MotorStatusOperacional;
  qualidadeDados: MotorQualidadeDados;
  quantidadeCds: number;
};

/** Contrato dm_produto_loja_cd — uma linha por posição lógica (N ilimitado). */
export type DmProdutoLojaCd = DmChaveProdutoLoja & {
  posicaoLogica: number;
  codigoFisico: number | null;
  estoque: number | null;
  pendencia: number | null;
  statusCompra: string | null;
  diasCompra: number | null;
  diasRecebimento: number | null;
  flagCentralizacao: number | null;
  origemArquivo: string;
  numeroBloco: number;
  posicaoNoArquivo: number;
};

export type DmLote = {
  produtos: DmProdutoLoja[];
  cds: DmProdutoLojaCd[];
};

export type DmValidacaoItem = {
  codigo: string;
  severidade: "aviso" | "erro";
  mensagem: string;
  loja?: number;
  seqproduto?: number;
  campo?: string;
};

export type DmValidacaoResultado = {
  valido: boolean;
  itens: DmValidacaoItem[];
};

export type DmPipelineEntrada = {
  consolidado: readonly MotorProdutoLojaConsolidado[];
  incluirExportacao?: boolean;
  catalogoPorPosicao?: ReadonlyMap<number, number | null>;
};

export type DmExportacaoProduto = {
  loja: number;
  seqproduto: number;
  layout5Cds: Record<string, string | number | null>;
  layout8Cds: Record<string, string | number | null>;
  layoutNCds: Record<string, string | number | null>;
  baseCentral: Record<string, string | number | null>;
  auditoria: Record<string, string | number | null>;
};
