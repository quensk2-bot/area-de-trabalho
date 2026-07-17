export type MotorBlocoCdsOrigem = "erp_relatorio_ruptura" | "erp_relatorio_cds";

export type MotorBlocoCdsEntrada = {
  arquivo: string;
  regional: string;
  dataReferencia: string;
  numeroBloco: number;
  posicaoInicial: number;
  quantidadePosicoes: number;
  hash: string;
  origem: MotorBlocoCdsOrigem;
};

export type MapearBlocoCdsOpcoes = {
  /**
   * Pacote piloto MT: o 2º arquivo alimenta somente a posição lógica 5
   * (coluna CD1 do ERP), ignorando CD2..CD4 do arquivo quando vazias/redundantes.
   */
  mtPilotoSomentePosicao5?: boolean;
  /** Inclui posições mesmo sem valores (bloco 1 ruptura — compatibilidade MT). */
  incluirPosicoesVazias?: boolean;
};

export const PREFIXOS_COLUNA_CD = {
  estoque: "ESTQ_CD",
  pendencia: "PENDCD_CD",
  statusCompra: "STATUS_COMPRA_CD",
  diasCompra: "DIAS_DA_COMPRACD",
  diasRecebimento: "DIAS_RECEBTO_CD",
  ultimaCompra: "ULTIMACPACD",
  estoqueSelecionadoInventario: "EST_SELECINV_CD",
  ultimaEntrada: "DTA_ULTENTRADA_CD",
} as const;
