import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import iconv from "iconv-lite";
import {
  ColetorErrosLimitado,
  findNextLineBreak,
  LineSplitterStream,
  runTxtStreamPipelineFromReadable,
} from "../parsers/streaming/index.ts";

describe("streaming win1252 e line splitter", () => {
  it("01. findNextLineBreak CRLF", () => {
    const br = findNextLineBreak("a\r\nb");
    assert.ok(br);
    assert.equal(br.index, 1);
    assert.equal(br.length, 2);
  });

  it("02. findNextLineBreak LF", () => {
    const br = findNextLineBreak("a\nb");
    assert.ok(br);
    assert.equal(br.length, 1);
  });

  it("03. findNextLineBreak CR isolado", () => {
    const br = findNextLineBreak("a\rb");
    assert.ok(br);
    assert.equal(br.length, 1);
  });

  it("04. LineSplitter CRLF em um chunk", async () => {
    const lines = await collectLines(Readable.from(["a\r\nb\r\n"]));
    assert.deepEqual(lines, ["a", "b"]);
  });

  it("05. LineSplitter LF", async () => {
    const lines = await collectLines(Readable.from(["x\ny\n"]));
    assert.deepEqual(lines, ["x", "y"]);
  });

  it("06. LineSplitter CR isolado", async () => {
    const lines = await collectLines(Readable.from(["x\ry\r"]));
    assert.deepEqual(lines, ["x", "y"]);
  });

  it("07. última linha sem quebra", async () => {
    const lines = await collectLines(Readable.from(["only"]));
    assert.deepEqual(lines, ["only"]);
  });

  it("08. chunk termina em CR + próximo LF via pipeline", async () => {
    const source = new Readable({
      read() {
        this.push("HEADER\n");
        this.push("part1\r");
        this.push("\npart2\n");
        this.push(null);
      },
    });
    const lines = await collectLinesFromPipeline(source);
    assert.deepEqual(lines, ["part1", "part2"]);
  });

  it("09. Windows-1252 acentos", async () => {
    const encoded = iconv.encode("HEADER\nCAFÉ;AÇÚCAR\n", "win1252");
    const source = Readable.from([encoded]);
    const lines = await collectLinesFromPipeline(source);
    assert.equal(lines[0], "CAFÉ;AÇÚCAR");
  });

  it("10. linha vazia ignorada no pipeline", async () => {
    const source = Readable.from(["header\n", "\n", "data\n"]);
    const result = await runTxtStreamPipelineFromReadable(source, {
      onLinha: () => {},
    });
    assert.equal(result.linhasLidas, 1);
  });

  it("11. chunk de 1 byte", async () => {
    const text = "H\na\nb\n";
    const chunks = text.split("").map((c) => c);
    const source = Readable.from(chunks);
    const lines = await collectLinesFromPipeline(source);
    assert.deepEqual(lines, ["a", "b"]);
  });

  it("12. ColetorErrosLimitado trunca", () => {
    const c = new ColetorErrosLimitado(3);
    for (let i = 0; i < 5; i++) c.push({ codigoErro: String(i) } as never);
    assert.equal(c.totalErros, 5);
    assert.equal(c.erros.length, 3);
    assert.equal(c.errosTruncados, true);
  });
});

async function collectLines(source: Readable): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const splitter = new LineSplitterStream();
    const lines: string[] = [];
    splitter.on("data", (line: string) => lines.push(line));
    splitter.on("error", reject);
    splitter.on("end", () => resolve(lines));
    source.pipe(splitter);
  });
}

async function collectLinesFromPipeline(source: Readable): Promise<string[]> {
  const lines: string[] = [];
  await runTxtStreamPipelineFromReadable(source, {
    onLinha: (_h, _n, cols) => {
      lines.push(cols.join(";"));
    },
  });
  return lines;
}
