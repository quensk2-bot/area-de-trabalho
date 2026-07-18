export type MotorFormatoCabecalhoCd = "logico" | "fisico" | "misto" | "descricao";

export type MotorCdCampoExportacao =
  | "estoque"
  | "pendencia"
  | "statusCompra"
  | "diasCompra"
  | "diasRecebimento";

export type MotorPerfilExportacaoCd = {
  id: string;
  quantidadePosicoes: number | "auto";
  camposPorCd: MotorCdCampoExportacao[];
  formatoCabecalho: MotorFormatoCabecalhoCd;
  usarCodigoFisico: boolean;
  incluirPosicaoLogica: boolean;
  regional?: string;
  bandeira?: string;
  vigenciaInicio?: string;
  ativo: boolean;
};

export type ExportarCdsEmLayoutEntrada = {
  cds: ReadonlyArray<{
    posicaoLogica: number;
    codigoFisico: number | null;
    estoque: number | null;
    pendencia: number | null;
    statusCompra: string | null;
    diasCompra: number | null;
    diasRecebimento: number | null;
  }>;
  quantidadePosicoes?: number | "auto";
  campos?: MotorCdCampoExportacao[];
  formatoCabecalho?: MotorFormatoCabecalhoCd;
  usarCodigoFisicoNoCabecalho?: boolean;
  incluirPosicaoLogica?: boolean;
  perfil?: MotorPerfilExportacaoCd;
  catalogoPorPosicao?: ReadonlyMap<number, number | null>;
};

export type ExportarCdsEmLayoutResultado = {
  colunas: Record<string, string | number | null>;
  alertas: string[];
  quantidadePosicoes: number;
};
