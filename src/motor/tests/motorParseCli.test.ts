import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "fs";
import path from "path";
import { runMotorParseCli } from "../cli/motorParseCli.ts";
import { executarMotorParse, MotorParseError } from "../services/motorParseService.ts";
import { getMotorTmpDir } from "../utils/tempOutput.ts";
import { fixturePath } from "./fixtures/fixturePaths.ts";
import { writeFixtures } from "./fixtures/buildFixtures.ts";

writeFixtures();

describe("motorParseCli e serviço", () => {
  it("18. dry-run não gera saída", async () => {
    const outputName = `dry_run_test_${Date.now()}.jsonl`;
    const code = await runMotorParseCli([
      "--file", fixturePath("grupo_ruptura_1_sample.txt"),
      "--tipo", "grupo_ruptura_1",
      "--regional", "NORDESTE",
      "--data", "2026-07-15",
      "--dry-run",
      "--output", outputName,
    ]);
    assert.equal(code, 0);
    const outputPath = path.join(getMotorTmpDir(), outputName);
    assert.equal(fs.existsSync(outputPath), false);
  });

  it("19. arquivo inexistente", async () => {
    await assert.rejects(
      () =>
        executarMotorParse({
          caminho: fixturePath("nao_existe.txt"),
          tipo: "grupo_ruptura_1",
          regional: "NORDESTE",
          dataReferencia: "2026-07-15",
          dryRun: true,
        }),
      (err: unknown) => err instanceof MotorParseError && err.codigo === "ARQUIVO_INEXISTENTE",
    );
  });

  it("20. tipo inválido via CLI", async () => {
    const code = await runMotorParseCli([
      "--file", fixturePath("grupo_ruptura_1_sample.txt"),
      "--tipo", "tipo_desconhecido",
    ]);
    assert.equal(code, 1);
  });

  it("serviço — grupo ruptura 1 com output", async () => {
    const outputName = `service_test_${Date.now()}.jsonl`;
    const result = await executarMotorParse({
      caminho: fixturePath("grupo_ruptura_1_sample.txt"),
      tipo: "grupo_ruptura_1",
      regional: "NORDESTE",
      dataReferencia: "2026-07-15",
      dryRun: false,
      outputPath: outputName,
    });
    assert.equal(result.itens.length, 2);
    const outputPath = path.join(getMotorTmpDir(), outputName);
    assert.equal(fs.existsSync(outputPath), true);
    fs.unlinkSync(outputPath);
  });

  it("serviço — validação ruptura XLSX", async () => {
    const xlsx = fixturePath("validacao_ruptura_sample.xlsx");
    const result = await executarMotorParse({
      caminho: xlsx,
      tipo: "validacao_ruptura",
      regional: "NORDESTE",
      dataReferencia: "2026-07-15",
      dryRun: true,
    });
    assert.equal(result.itens.length, 3);
  });

  it("serviço — inventário agrupado", async () => {
    const result = await executarMotorParse({
      caminho: fixturePath("inventario_lojas_sample.txt"),
      tipo: "inventario_lojas",
      regional: "NORDESTE",
      dataReferencia: "2026-07-15",
      dryRun: true,
    });
    assert.equal(result.itens.length, 1);
    assert.equal(result.itens[0].inventarioUnid, 3.5);
  });
});
