import type { MotorErroValidacao } from "../../types/motorTypes.ts";

export type MotivoEncerramentoStreaming = "eof" | "limite" | "cancelado" | "erro";

export type MemoriaAproximadaSnapshot = {
  heapUsedMb: number;
  rssMb: number;
  externalMb: number;
};

export type MemoriaAproximadaRelatorio = {
  heapUsedMbInicial: number;
  heapUsedMbFinal: number;
  heapUsedMbPicoAprox: number;
  rssMbInicial: number;
  rssMbFinal: number;
  rssMbPicoAprox: number;
  externalMbInicial: number;
  externalMbFinal: number;
  externalMbPicoAprox: number;
  nota: "pico aproximado — heapUsed/rss/external não representam pico exato do SO";
};

export type TxtStreamPipelineOptions = {
  limiteLinhas?: number;
  colunasEsperadas?: number;
  highWaterMark?: number;
  maxErrosEmMemoria?: number;
  signal?: AbortSignal;
  onLinha?: (cabecalhos: string[], numeroLinha: number, colunas: string[]) => void | Promise<void>;
  onProgress?: (info: {
    linhasLidas: number;
    linhasValidas: number;
    linhasInvalidas: number;
    bytesLidos: number;
  }) => void;
};

export type TxtStreamPipelineResult = {
  cabecalhos: string[];
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  totalErros: number;
  erros: MotorErroValidacao[];
  errosTruncados: boolean;
  bytesLidos: number;
  motivoEncerramento: MotivoEncerramentoStreaming;
  memoria: MemoriaAproximadaRelatorio;
  duracaoMs: number;
};

export const DEFAULT_HIGH_WATER_MARK = 64 * 1024;
export const DEFAULT_MAX_ERROS_EM_MEMORIA = 1_000;
