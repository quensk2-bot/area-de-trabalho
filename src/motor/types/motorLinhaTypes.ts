import type { MotorHierarquiaMercadologica } from "./motorProdutoLojaNormalizado.ts";

export type MotorLinhaGrupoRuptura = {
  numeroLinha: number;
  divisao: string | null;
  loja: string | null;
  seqproduto: string | null;
  descricao: string | null;
  codFornecedor: string | null;
  fornecedor: string | null;
  status: string | null;
  mediaVendaUnDia: string | null;
  mediaVendaGp: string | null;
  estoque: string | null;
  parMin: string | null;
  parMax: string | null;
  pendencia: string | null;
  embalagemCompra: string | null;
  categoriaOriginal: string | null;
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  estoqueCd1: string | null;
  estoqueCd2: string | null;
  estoqueCd3: string | null;
  estoqueCd4: string | null;
  pendenciaCd1: string | null;
  pendenciaCd2: string | null;
  pendenciaCd3: string | null;
  pendenciaCd4: string | null;
  diasAtivacaoGeral: string | null;
  dataAtivacaoGeral: string | null;
  dtaUltAtivacao: string | null;
  ultimaEntradaLoja: string | null;
  ultimaSaidaLoja: string | null;
  diasCompraLj: string | null;
  diasCompraCd1: string | null;
  diasCompraCd2: string | null;
  diasCompraCd3: string | null;
  diasCompraCd4: string | null;
  diasRecebtoCd1: string | null;
  diasRecebtoCd2: string | null;
  diasRecebtoCd3: string | null;
  diasRecebtoCd4: string | null;
  diasRuptura: string | null;
  ultimaCpaLoja: string | null;
  ultimaCpaCd1: string | null;
  ultimaCpaCd2: string | null;
  ultimaCpaCd3: string | null;
  ultimaCpaCd4: string | null;
  familia: string | null;
  custoLiquido: string | null;
  estSelecInvCd1: string | null;
  estSelecInvCd2: string | null;
  estSelecInvCd3: string | null;
  estSelecInvCd4: string | null;
  dtaUltEntradaCd1: string | null;
  dtaUltEntradaCd2: string | null;
  dtaUltEntradaCd3: string | null;
  dtaUltEntradaCd4: string | null;
  hierarquia: MotorHierarquiaMercadologica;
};

export type MotorLinhaGrupoCds = {
  numeroLinha: number;
  seqproduto: string | null;
  statusCompraCd5: string | null;
  estoqueCd5: string | null;
  pendenciaCd5: string | null;
  diasCompraCd5: string | null;
  diasRecebtoCd5: string | null;
  ultimaCpaCd5: string | null;
};

export type MotorLinhaInventario = {
  numeroLinha: number;
  loja: string | null;
  produto: string | null;
  qtdSaidaOutras: string | null;
};

export type MotorInventarioAgrupado = {
  loja: number;
  produto: number;
  inventarioUnid: number;
};

export type MotorLinhaValidacao = {
  numeroLinha: number;
  loja: number | null;
  produto: number | null;
  qtdItemRupturaNoMix: number | null;
  qtdItemRuptura: number | null;
  geraRuptura: boolean;
  ruptura104c: boolean;
};
