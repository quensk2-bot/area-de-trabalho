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
};

export type MotorErroValidacao = {
  numeroLinha: number | null;
  campo: string | null;
  valorOriginal: string | null;
  codigoErro: string;
  mensagem: string;
  severidade: MotorSeveridadeErro;
};

export type MotorMetricasProcessamento = {
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  duracaoMs: number;
  linhasPorSegundo: number;
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
