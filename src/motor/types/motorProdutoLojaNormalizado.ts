import type { MotorProdutoCdNormalizado } from "../cds/cdTypes.ts";

export type MotorHierarquiaMercadologica = {
  categoriaOriginal: string | null;
  divisao: string | null;
  setorN2: string | null;
  grupoN3: string | null;
  subgrupoN4: string | null;
  tipoN5: string | null;
  niveisEncontrados: number;
  ambiguidade: string | null;
};

export type MotorProdutoLojaNormalizado = {
  regional: string;
  dataReferencia: string;
  loja: number;
  seqproduto: number;
  descricao: string | null;
  codFornecedor: number | null;
  fornecedor: string | null;
  statusProduto: string | null;
  familia: number | null;
  mediaVendaUnDia: number | null;
  mediaVendaGp: number | null;
  estoqueLoja: number | null;
  parMin: number | null;
  parMax: number | null;
  pendenciaLoja: number | null;
  diasCompraLj: number | null;
  diasCompraCd1: number | null;
  diasCompraCd2: number | null;
  diasCompraCd3: number | null;
  diasCompraCd4: number | null;
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  embalagemCompra: string | null;
  hierarquia: MotorHierarquiaMercadologica;
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  pendenciaCd1: number | null;
  pendenciaCd2: number | null;
  pendenciaCd3: number | null;
  pendenciaCd4: number | null;
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  diasRuptura: number | null;
  ultimaEntradaLoja: string | null;
  ultimaSaidaLoja: string | null;
  custoLiquido: number | null;
  /** Coleção dinâmica de CDs — fonte de verdade (Etapa A). Campos CD1..5 são compatibilidade. */
  cds: MotorProdutoCdNormalizado[];
  alertas: string[];
};

export type MotorCd5Normalizado = {
  seqproduto: number;
  statusCompraCd5: string | null;
  estoqueCd5: number | null;
  pendenciaCd5: number | null;
  diasCompraCd5: number | null;
  diasRecebtoCd5: number | null;
  ultimaCpaCd5: string | null;
  /** Posição lógica 5 (e futuras do bloco 2) na coleção dinâmica. */
  cds: MotorProdutoCdNormalizado[];
};
