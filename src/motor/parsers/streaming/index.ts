export type {
  MemoriaAproximadaRelatorio,
  MemoriaAproximadaSnapshot,
  MotivoEncerramentoStreaming,
  TxtStreamPipelineOptions,
  TxtStreamPipelineResult,
} from "./streamingTypes.ts";

export {
  DEFAULT_HIGH_WATER_MARK,
  DEFAULT_MAX_ERROS_EM_MEMORIA,
} from "./streamingTypes.ts";

export { ColetorErrosLimitado, ColetorMemoriaAproximada, snapshotMemoria } from "./streamingMetrics.ts";
export { createWin1252DecoderStream } from "./win1252StreamDecoder.ts";
export { findNextLineBreak, LineSplitterStream } from "./lineSplitterStream.ts";
export {
  createSyntheticGrupo1Readable,
  runTxtStreamPipeline,
  runTxtStreamPipelineFromReadable,
} from "./txtStreamPipeline.ts";
