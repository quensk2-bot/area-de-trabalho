import { Transform } from "node:stream";

export type LineBreakMatch = {
  index: number;
  length: number;
};

/** Localiza próxima quebra: CRLF, LF ou CR isolado. */
export function findNextLineBreak(text: string): LineBreakMatch | null {
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\r") {
      if (text[i + 1] === "\n") return { index: i, length: 2 };
      return { index: i, length: 1 };
    }
    if (c === "\n") return { index: i, length: 1 };
  }
  return null;
}

/**
 * Transform: texto → linhas completas (sem terminador).
 * Suporta CRLF, LF, CR, chunk terminando em CR + próximo iniciando em LF.
 */
export class LineSplitterStream extends Transform {
  private buffer = "";

  constructor() {
    super({ decodeStrings: true, objectMode: true });
  }

  _transform(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    this.buffer += text;
    this.drainCompleteLines();
    callback();
  }

  _flush(callback: (error?: Error | null) => void): void {
    if (this.buffer.endsWith("\r")) {
      const line = this.buffer.slice(0, -1);
      if (line.length > 0) {
        this.push(line);
      }
      this.buffer = "";
    } else if (this.buffer.length > 0) {
      this.push(this.buffer);
      this.buffer = "";
    }
    callback();
  }

  private drainCompleteLines(): void {
    while (true) {
      const br = findNextLineBreak(this.buffer);
      if (!br) break;

      // CR no fim do buffer pode ser CRLF partido entre chunks — aguarda próximo chunk.
      if (
        br.length === 1 &&
        this.buffer[br.index] === "\r" &&
        br.index === this.buffer.length - 1
      ) {
        break;
      }

      const line = this.buffer.slice(0, br.index);
      this.buffer = this.buffer.slice(br.index + br.length);
      this.push(line);
    }
  }
}
