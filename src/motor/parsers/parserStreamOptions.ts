import type { TxtStreamOptions } from "./parseTxtStream.ts";

export type ParserStreamOptions = Pick<
  TxtStreamOptions,
  "highWaterMark" | "maxErrosEmMemoria" | "signal"
> & {
  semRetencao?: boolean;
};

export function streamOptionsToTxt(opts?: ParserStreamOptions): TxtStreamOptions {
  if (!opts) return {};
  return {
    highWaterMark: opts.highWaterMark,
    maxErrosEmMemoria: opts.maxErrosEmMemoria,
    signal: opts.signal,
  };
}
