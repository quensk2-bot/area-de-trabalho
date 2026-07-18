export type MotorCdComparacaoEstado =
  | "igual_exato"
  | "igual_semantico"
  | "divergente_posicao"
  | "divergente_codigo"
  | "divergente_valor"
  | "posicao_ausente_excel"
  | "posicao_ausente_v7"
  | "codigo_fisico_ausente"
  | "coluna_nao_reconhecida"
  | "cadastro_ausente"
  | "vigencia_ausente"
  | "nao_comparavel";

export type MotorCdComparacaoOrigem = "excel" | "v7" | "txt";

export type MotorCdComparacaoItem = {
  posicaoLogica: number;
  codigoFisico: number | null;
  estoque: number | null;
  pendencia: number | null;
  statusCompra: string | null;
  diasCompra: number | null;
  diasRecebimento: number | null;
  flagCentralizacao: number | null;
  origem: MotorCdComparacaoOrigem;
  alertas: string[];
};

export type MotorProdutoComparacaoCds = {
  regional: string;
  bandeira: string | null;
  loja: number;
  seqproduto: number;
  cds: MotorCdComparacaoItem[];
};

export type MotorCdCampoComparavel =
  | "estoque"
  | "pendencia"
  | "statusCompra"
  | "diasCompra"
  | "diasRecebimento"
  | "flagCentralizacao";

export type MotorComparacaoCdCampoDetalhe = {
  campo: MotorCdCampoComparavel;
  valorExcel: string | number | null;
  valorV7: string | number | null;
  estado: MotorCdComparacaoEstado;
};

export type MotorComparacaoCdPosicaoResultado = {
  posicaoLogica: number;
  estado: MotorCdComparacaoEstado;
  codigoExcel: number | null;
  codigoV7: number | null;
  camposIguais: MotorCdCampoComparavel[];
  camposDivergentes: MotorCdCampoComparavel[];
  alertas: string[];
  detalhes: MotorComparacaoCdCampoDetalhe[];
};

export type MotorComparacaoCdsProdutoResultado = {
  loja: number;
  seqproduto: number;
  posicoes: MotorComparacaoCdPosicaoResultado[];
  divergencias: number;
  alertas: string[];
};

export const ESTADOS_CD_IGUAIS: ReadonlySet<MotorCdComparacaoEstado> = new Set([
  "igual_exato",
  "igual_semantico",
]);

export function posicaoLogicaParaChave(posicao: number): string {
  return `CD${posicao}`;
}
