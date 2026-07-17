import fs from "node:fs";
import iconv from "iconv-lite";
import type { MotorErroValidacao, MotorMetricasProcessamento } from "../types/motorTypes.ts";
import { criarMetricas } from "../utils/progress.ts";
import {
  runTxtStreamPipeline,
  type MotivoEncerramentoStreaming,
  type TxtStreamPipelineOptions,
} from "./streaming/index.ts";

export type TxtStreamOptions = {
  limiteLinhas?: number;
  colunasEsperadas?: number;
  highWaterMark?: number;
  maxErrosEmMemoria?: number;
  signal?: AbortSignal;
  onLinha?: (cabecalhos: string[], numeroLinha: number, colunas: string[]) => void | Promise<void>;
  onProgress?: TxtStreamPipelineOptions["onProgress"];
};

export type TxtStreamResult = {
  cabecalhos: string[];
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  erros: MotorErroValidacao[];
  totalErros: number;
  errosTruncados: boolean;
  motivoEncerramento: MotivoEncerramentoStreaming;
  metricas: MotorMetricasProcessamento;
};

function metricasFromPipeline(
  inicio: number,
  pipeline: Awaited<ReturnType<typeof runTxtStreamPipeline>>,
): MotorMetricasProcessamento {
  const base = criarMetricas(inicio, pipeline.linhasLidas, pipeline.linhasValidas, pipeline.linhasInvalidas);
  return {
    ...base,
    bytesLidos: pipeline.bytesLidos,
    totalErros: pipeline.totalErros,
    errosArmazenados: pipeline.erros.length,
    errosTruncados: pipeline.errosTruncados,
    motivoEncerramento: pipeline.motivoEncerramento,
    cancelado: pipeline.motivoEncerramento === "cancelado",
    concluido: pipeline.motivoEncerramento === "eof" || pipeline.motivoEncerramento === "limite",
    memoria: pipeline.memoria,
  };
}

export async function parseTxtStream(filePath: string, options: TxtStreamOptions = {}): Promise<TxtStreamResult> {
  const inicio = Date.now();
  const pipeline = await runTxtStreamPipeline(filePath, {
    limiteLinhas: options.limiteLinhas,
    colunasEsperadas: options.colunasEsperadas,
    highWaterMark: options.highWaterMark,
    maxErrosEmMemoria: options.maxErrosEmMemoria,
    signal: options.signal,
    onLinha: options.onLinha,
    onProgress: options.onProgress,
  });

  return {
    cabecalhos: pipeline.cabecalhos,
    linhasLidas: pipeline.linhasLidas,
    linhasValidas: pipeline.linhasValidas,
    linhasInvalidas: pipeline.linhasInvalidas,
    erros: pipeline.erros,
    totalErros: pipeline.totalErros,
    errosTruncados: pipeline.errosTruncados,
    motivoEncerramento: pipeline.motivoEncerramento,
    metricas: metricasFromPipeline(inicio, pipeline),
  };
}

export function readTxtWin1252(filePath: string): string {
  return iconv.decode(fs.readFileSync(filePath), "win1252");
}

export function splitTxtContent(content: string): string[] {
  if (content.endsWith("\n") || content.endsWith("\r")) {
    return content.split(/\r?\n/).filter((l) => l.length > 0 || l.includes(";"));
  }
  const parts = content.split(/\r?\n/);
  return parts.filter((l, idx) => l.length > 0 || idx < parts.length);
}
