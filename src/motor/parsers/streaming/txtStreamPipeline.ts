import { createReadStream } from "node:fs";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { MotorErroValidacao } from "../../types/motorTypes.ts";
import { splitTxtLine } from "../../utils/chunkIterator.ts";
import { validateRowColumnCount } from "../../validators/validateRow.ts";
import { LineSplitterStream } from "./lineSplitterStream.ts";
import { ColetorErrosLimitado, ColetorMemoriaAproximada } from "./streamingMetrics.ts";
import {
  DEFAULT_HIGH_WATER_MARK,
  DEFAULT_MAX_ERROS_EM_MEMORIA,
  type MotivoEncerramentoStreaming,
  type TxtStreamPipelineOptions,
  type TxtStreamPipelineResult,
} from "./streamingTypes.ts";
import { createWin1252DecoderStream } from "./win1252StreamDecoder.ts";

function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.name === "AbortError" || err.message.includes("Abort");
  }
  return false;
}

function isPrematureClose(err: unknown): boolean {
  if (err instanceof Error) {
    return err.code === "ERR_STREAM_PREMATURE_CLOSE" || err.message.includes("Premature close");
  }
  return false;
}

export async function runTxtStreamPipeline(
  filePath: string,
  options: TxtStreamPipelineOptions = {},
): Promise<TxtStreamPipelineResult> {
  const highWaterMark = options.highWaterMark ?? DEFAULT_HIGH_WATER_MARK;
  let bytesLidos = 0;

  const readable = createReadStream(filePath, { highWaterMark });
  readable.on("data", (chunk: Buffer | string) => {
    bytesLidos += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
  });

  return runTxtStreamPipelineFromReadable(readable, options, () => bytesLidos);
}

export async function runTxtStreamPipelineFromReadable(
  source: Readable,
  options: TxtStreamPipelineOptions = {},
  bytesLidosProvider?: () => number,
): Promise<TxtStreamPipelineResult> {
  const inicio = Date.now();
  const memoria = new ColetorMemoriaAproximada();
  const maxErros = options.maxErrosEmMemoria ?? DEFAULT_MAX_ERROS_EM_MEMORIA;
  const coletorErros = new ColetorErrosLimitado<MotorErroValidacao>(maxErros);

  let cabecalhos: string[] = [];
  let linhasLidas = 0;
  let linhasValidas = 0;
  let linhasInvalidas = 0;
  let isHeader = true;
  let numeroLinha = 0;
  let motivoEncerramento: MotivoEncerramentoStreaming = "eof";
  let pararLeitura = false;

  const limite = options.limiteLinhas;
  const colunasEsperadas = options.colunasEsperadas;

  const decoder = createWin1252DecoderStream();
  const splitter = new LineSplitterStream();
  const pipelineAc = new AbortController();

  const abortHandler = (): void => {
    motivoEncerramento = "cancelado";
    pararLeitura = true;
    pipelineAc.abort();
  };

  if (options.signal?.aborted) {
    const duracaoMs = Date.now() - inicio;
    memoria.amostrar();
    return {
      cabecalhos: [],
      linhasLidas: 0,
      linhasValidas: 0,
      linhasInvalidas: 0,
      totalErros: 0,
      erros: [],
      errosTruncados: false,
      bytesLidos: bytesLidosProvider?.() ?? 0,
      motivoEncerramento: "cancelado",
      memoria: memoria.finalizar(),
      duracaoMs,
    };
  }

  options.signal?.addEventListener("abort", abortHandler, { once: true });

  async function processarLinha(line: string): Promise<void> {
    if (pararLeitura) return;

    if (line.trim() === "") return;

    numeroLinha += 1;

    if (isHeader) {
      cabecalhos = splitTxtLine(line).map((h) => h.trim());
      isHeader = false;
      return;
    }

    if (limite != null && linhasLidas >= limite) {
      motivoEncerramento = "limite";
      pararLeitura = true;
      pipelineAc.abort();
      return;
    }

    linhasLidas += 1;

    if (linhasLidas % 1000 === 0) {
      memoria.amostrar();
      options.onProgress?.({
        linhasLidas,
        linhasValidas,
        linhasInvalidas,
        bytesLidos: bytesLidosProvider?.() ?? 0,
      });
    }

    const colunas = splitTxtLine(line);

    if (colunasEsperadas != null) {
      const validacao = validateRowColumnCount(numeroLinha, colunas.length, colunasEsperadas);
      if (!validacao.ok) {
        linhasInvalidas += 1;
        coletorErros.pushMany(validacao.erros);
        return;
      }
    }

    linhasValidas += 1;
    await options.onLinha?.(cabecalhos, numeroLinha, colunas);
  }

  const consumer = new Writable({
    objectMode: true,
    write(chunk: Buffer | string, _encoding, callback) {
      const line = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      Promise.resolve(processarLinha(line))
        .then(() => callback())
        .catch((err: unknown) => {
          if (motivoEncerramento !== "limite" && motivoEncerramento !== "cancelado") {
            motivoEncerramento = "erro";
          }
          callback(err instanceof Error ? err : new Error(String(err)));
        });
    },
  });

  try {
    await pipeline(source, decoder, splitter, consumer, { signal: pipelineAc.signal });
    if (motivoEncerramento !== "limite" && motivoEncerramento !== "cancelado") {
      motivoEncerramento = "eof";
    }
  } catch (err) {
    if (motivoEncerramento === "limite" || motivoEncerramento === "cancelado") {
      // encerramento intencional via AbortSignal
    } else if (isAbortError(err)) {
      motivoEncerramento = "cancelado";
    } else if (isPrematureClose(err)) {
      motivoEncerramento = motivoEncerramento === "limite" ? "limite" : "erro";
    } else {
      motivoEncerramento = "erro";
      throw err;
    }
  } finally {
    options.signal?.removeEventListener("abort", abortHandler);
  }

  const duracaoMs = Date.now() - inicio;
  memoria.amostrar();

  return {
    cabecalhos,
    linhasLidas,
    linhasValidas,
    linhasInvalidas,
    totalErros: coletorErros.totalErros,
    erros: coletorErros.erros,
    errosTruncados: coletorErros.errosTruncados,
    bytesLidos: bytesLidosProvider?.() ?? 0,
    motivoEncerramento,
    memoria: memoria.finalizar(),
    duracaoMs,
  };
}

/** Gera linhas sintéticas estilo G1 (57 colunas) sem arquivo gigante. */
export function createSyntheticGrupo1Readable(totalLinhasDados: number): Readable {
  const header = "DIVISAO;LOJA;SEQPRODUTO;" + Array(54).fill("COL").join(";");
  let emittedHeader = false;
  let index = 0;

  return new Readable({
    read() {
      if (!emittedHeader) {
        emittedHeader = true;
        this.push(`${header}\n`);
        return;
      }
      if (index >= totalLinhasDados) {
        this.push(null);
        return;
      }
      index += 1;
      const cols = ["NORDESTE", "103", String(1_000_000 + index), ...Array(54).fill("")];
      this.push(`${cols.join(";")}\n`);
    },
  });
}
