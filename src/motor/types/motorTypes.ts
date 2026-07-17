import type { MotorTipoArquivo } from "../constants/tiposArquivo.ts";

export type MotorSeveridadeErro = "info" | "aviso" | "erro" | "critico";

export type MotorArquivoEntrada = {
  caminho: string;
  tipo: MotorTipoArquivo;
  regional: string;
  dataReferencia: string;
  limiteLinhas?: number;
  dryRun: boolean;
  outputPath?: string;
  highWaterMark?: number;
  maxErrosEmMemoria?: number;
  semRetencao?: boolean;
  signal?: AbortSignal;
};

export type MotorErroValidacao = {
  numeroLinha: number | null;
  campo: string | null;
  valorOriginal: string | null;
  codigoErro: string;
  mensagem: string;
  severidade: MotorSeveridadeErro;
};

export type MotorMetricasMemoriaAproximada = {
  heapUsedMbInicial: number;
  heapUsedMbFinal: number;
  heapUsedMbPicoAprox: number;
  rssMbInicial: number;
  rssMbFinal: number;
  rssMbPicoAprox: number;
  externalMbInicial: number;
  externalMbFinal: number;
  externalMbPicoAprox: number;
  nota: string;
};

export type MotivoEncerramentoMetricas = "eof" | "limite" | "cancelado" | "erro";

export type MotorMetricasProcessamento = {
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  duracaoMs: number;
  linhasPorSegundo: number;
  bytesLidos?: number;
  totalErros?: number;
  errosArmazenados?: number;
  errosTruncados?: boolean;
  motivoEncerramento?: MotivoEncerramentoMetricas;
  cancelado?: boolean;
  concluido?: boolean;
  memoria?: MotorMetricasMemoriaAproximada;
};

export type MotorResultadoParser<TLinha> = {
  tipo: MotorTipoArquivo;
  cabecalhoOk: boolean;
  cabecalhos: string[];
  linhas: TLinha[];
  erros: MotorErroValidacao[];
  metricas: MotorMetricasProcessamento;
};

export type MotorResultadoTransformacao<TSaida> = {
  tipo: MotorTipoArquivo;
  regional: string;
  dataReferencia: string;
  itens: TSaida[];
  erros: MotorErroValidacao[];
  alertas: string[];
  metricas: MotorMetricasProcessamento;
};
