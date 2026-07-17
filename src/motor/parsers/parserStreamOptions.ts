import type { TxtStreamOptions } from "./parseTxtStream.ts";

export type ParserStreamOptions = Pick<
  TxtStreamOptions,
  "highWaterMark" | "maxErrosEmMemoria" | "signal"
> & {
  semRetencao?: boolean;
  /** Filtro precoce por linha mapeada (antes de reter/transformar). */
  filtroLinha?: (payload: Record<string, string>) => boolean;
};

export function streamOptionsToTxt(opts?: ParserStreamOptions): TxtStreamOptions {
  if (!opts) return {};
  return {
    highWaterMark: opts.highWaterMark,
    maxErrosEmMemoria: opts.maxErrosEmMemoria,
    signal: opts.signal,
  };
}
