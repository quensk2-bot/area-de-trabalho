import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "fs";
import iconv from "iconv-lite";
import { HEADER_GRUPO_RUPTURA_57 } from "../constants/headers.ts";
import { parseGrupoCds2 } from "../parsers/parseGrupoCds2.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { parseInventarioLojas } from "../parsers/parseInventarioLojas.ts";
import { parseTxtStream } from "../parsers/parseTxtStream.ts";
import {
  createSyntheticGrupo1Readable,
  runTxtStreamPipeline,
  runTxtStreamPipelineFromReadable,
} from "../parsers/streaming/index.ts";
import { fixturePath } from "./fixtures/fixturePaths.ts";
import { writeFixtures } from "./fixtures/buildFixtures.ts";

writeFixtures();

const TMP = fixturePath("_streaming_tmp");

function writeTmp(name: string, content: string | Buffer): string {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
  const p = `${TMP}/${name}`;
  fs.writeFileSync(p, content);
  return p;
}

describe("streaming pipeline", () => {
  it("14. cabeçalho correto via stream", async () => {
    const result = await parseGrupoRuptura1(fixturePath("grupo_ruptura_1_sample.txt"));
    assert.equal(result.cabecalhoOk, true);
    assert.equal(result.linhas.length, 2);
  });

  it("15. cabeçalho incorreto", async () => {
    const result = await parseGrupoRuptura1(fixturePath("grupo_ruptura_header_errado.txt"));
    assert.equal(result.cabecalhoOk, false);
  });

  it("16. linha inválida continua", async () => {
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    const valida = HEADER_GRUPO_RUPTURA_57.map((h) => (h === "DIVISAO" ? "X" : h === "LOJA" ? "1" : h === "SEQPRODUTO" ? "2" : "")).join(";");
    const p = writeTmp("mista.txt", `${header}\n${valida}\nX;Y\n`);
    const r = await parseTxtStream(p, { colunasEsperadas: 57 });
    assert.equal(r.linhasValidas, 1);
    assert.equal(r.linhasInvalidas, 1);
    assert.equal(r.motivoEncerramento, "eof");
  });

  it("17. limite de linhas encerra cedo", async () => {
    const r = await parseGrupoRuptura1(fixturePath("grupo_ruptura_1_sample.txt"), 1);
    assert.equal(r.linhas.length, 1);
    assert.equal(r.metricas.motivoEncerramento, "limite");
  });

  it("18. arquivo vazio", async () => {
    const p = writeTmp("vazio.txt", "");
    const r = await parseTxtStream(p);
    assert.equal(r.linhasLidas, 0);
    assert.equal(r.motivoEncerramento, "eof");
  });

  it("19. apenas cabeçalho", async () => {
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    const p = writeTmp("so_header.txt", `${header}\n`);
    const r = await parseTxtStream(p, { colunasEsperadas: 57 });
    assert.equal(r.linhasLidas, 0);
  });

  it("20. AbortSignal cancela", async () => {
    const ac = new AbortController();
    ac.abort();
    const source = createSyntheticGrupo1Readable(50_000);
    const r = await runTxtStreamPipelineFromReadable(source, {
      signal: ac.signal,
      colunasEsperadas: 57,
    });
    assert.equal(r.motivoEncerramento, "cancelado");
  });

  it("21. arquivo inexistente", async () => {
    await assert.rejects(() => runTxtStreamPipeline(fixturePath("nao_existe_xyz.txt")), /ENOENT/);
  });

  it("22. métricas memória aproximada", async () => {
    const r = await parseTxtStream(fixturePath("grupo_ruptura_1_sample.txt"), { colunasEsperadas: 57 });
    assert.ok(r.metricas.memoria);
    assert.ok(r.metricas.memoria!.heapUsedMbPicoAprox >= 0);
    assert.match(r.metricas.memoria!.nota, /aproximado/i);
  });

  it("23. maxErrosEmMemoria", async () => {
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    const invalid = "a;b\n".repeat(5);
    const p = writeTmp("muitos_erros.txt", `${header}\n${invalid}`);
    const r = await parseTxtStream(p, { colunasEsperadas: 57, maxErrosEmMemoria: 2 });
    assert.ok(r.totalErros >= 3);
    assert.equal(r.erros.length, 2);
    assert.equal(r.errosTruncados, true);
  });

  it("24. compat Grupo 2", async () => {
    const r = await parseGrupoCds2(fixturePath("grupo_cds_2_sample.txt"));
    assert.equal(r.linhas.length, 2);
  });

  it("25. compat Inventário", async () => {
    const r = await parseInventarioLojas(fixturePath("inventario_lojas_sample.txt"));
    assert.equal(r.linhas.length, 4);
  });

  it("26. sem retenção não acumula linhas", async () => {
    const r = await parseGrupoRuptura1(fixturePath("grupo_ruptura_1_sample.txt"), undefined, { semRetencao: true });
    assert.equal(r.linhas.length, 0);
    assert.equal(r.metricas.linhasValidas, 2);
  });

  it("27. sintético 1000 linhas", async () => {
    const source = createSyntheticGrupo1Readable(1000);
    const r = await runTxtStreamPipelineFromReadable(source, { colunasEsperadas: 57 });
    assert.equal(r.linhasLidas, 1000);
    assert.equal(r.motivoEncerramento, "eof");
  });

  it("28. sintético 10000 linhas sem retenção", async () => {
    const source = createSyntheticGrupo1Readable(10_000);
    const r = await runTxtStreamPipelineFromReadable(source, {
      colunasEsperadas: 57,
      maxErrosEmMemoria: 1000,
    });
    assert.equal(r.linhasLidas, 10_000);
  });

  it("29. motivoEncerramento limite sintético", async () => {
    const source = createSyntheticGrupo1Readable(500);
    const r = await runTxtStreamPipelineFromReadable(source, { colunasEsperadas: 57, limiteLinhas: 10 });
    assert.equal(r.linhasLidas, 10);
    assert.equal(r.motivoEncerramento, "limite");
  });

  it("30. bytesLidos registrados", async () => {
    const p = fixturePath("grupo_ruptura_1_sample.txt");
    const r = await parseTxtStream(p, { colunasEsperadas: 57 });
    assert.ok(r.metricas.bytesLidos != null && r.metricas.bytesLidos > 0);
  });
});

describe("streaming memória relativa", () => {
  it("31. 10k vs 100k sintético — ratio memória não linear 10x", async () => {
    const run = async (n: number) => {
      const source = createSyntheticGrupo1Readable(n);
      const r = await runTxtStreamPipelineFromReadable(source, { colunasEsperadas: 57 });
      return r.memoria.heapUsedMbPicoAprox;
    };
    const p10 = await run(10_000);
    const p100 = await run(100_000);
    if (p10 > 0) {
      assert.ok(p100 / p10 < 8, `ratio ${p100 / p10} deve ser < 8`);
    }
  });
});

describe("streaming sem Buffer.concat integral", () => {
  it("32. parseTxtStream não usa Buffer.concat do arquivo", async () => {
    const original = Buffer.concat;
    let concatCalledWithLarge = false;
    Buffer.concat = ((list: Buffer[]) => {
      const total = list.reduce((s, b) => s + b.length, 0);
      if (total > 500_000) concatCalledWithLarge = true;
      return original(list);
    }) as typeof Buffer.concat;
    try {
      const source = createSyntheticGrupo1Readable(5000);
      await runTxtStreamPipelineFromReadable(source, { colunasEsperadas: 57 });
      assert.equal(concatCalledWithLarge, false);
    } finally {
      Buffer.concat = original;
    }
  });
});
