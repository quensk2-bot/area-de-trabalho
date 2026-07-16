import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import XLSX from "xlsx";
import { executarPadronizacao, MotorStandardizeError } from "../standardize/standardizeService.ts";
import { formatarRelatorioPadronizacao } from "../standardize/standardizeReport.ts";
import { obterContratoPorTipo } from "../standardize/standards/standardContracts.ts";
import { avaliarFase } from "../workflow/motorWorkflowStatus.ts";
import { MOTOR_REGIONAIS } from "../workflow/motorWorkflowTypes.ts";
import { normalizarRegional } from "../workflow/motorWorkflowUtils.ts";
import {
  tempDir,
  writeCsvValidacao,
  writeOrdemCdsMulti,
  writeValidacaoColunaAusente,
  writeValidacaoComDuplicata,
  writeWorkbook,
} from "./fixtures/standardizeFixtures.ts";

describe("standardizeService", () => {
  it("12. coluna obrigatória ausente gera erro", () => {
    const dir = tempDir();
    const out = path.join(dir, "out");
    const file = path.join(dir, "bad.xlsx");
    writeValidacaoColunaAusente(file);
    const r = executarPadronizacao({
      caminho: file,
      tipo: "validacao_ruptura",
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: out,
      dryRun: true,
      gerarReport: false,
    });
    assert.ok(r.report.erros.length > 0);
    assert.equal(r.report.statusFinal, "dry_run");
  });

  it("17. regional ausente rejeitada", () => {
    assert.throws(() => normalizarRegional(""), /Regional inválida/);
  });

  it("18. tipo inválido via contrato", () => {
    assert.throws(() => obterContratoPorTipo("invalido" as never), /Contrato não encontrado/);
  });

  it("19. dry-run não cria planilha padrão", () => {
    const dir = tempDir();
    const out = path.join(dir, "out");
    const file = path.join(dir, "ok.xlsx");
    writeWorkbook(file, {
      "Validaçao Ruptura": [
        ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
        [103, 1001, 1, 1],
      ],
    });
    const r = executarPadronizacao({
      caminho: file,
      tipo: "validacao_ruptura",
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: out,
      dryRun: true,
      gerarReport: false,
    });
    assert.equal(r.report.arquivoPadraoGerado, null);
    assert.equal(r.report.dryRun, true);
  });

  it("20. original não sobrescrito", () => {
    const dir = tempDir();
    const out = path.join(dir, "out");
    const file = path.join(dir, "orig.xlsx");
    writeWorkbook(file, {
      "Validaçao Ruptura": [
        ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
        [103, 1001, 1, 1],
      ],
    });
    const before = fs.readFileSync(file);
    executarPadronizacao({
      caminho: file,
      tipo: "validacao_ruptura",
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: out,
      dryRun: false,
      gerarReport: true,
    });
    const after = fs.readFileSync(file);
    assert.equal(before.equals(after), true);
  });

  it("21. relatório correto", () => {
    const dir = tempDir();
    const file = path.join(dir, "rep.xlsx");
    writeValidacaoComDuplicata(file);
    const r = executarPadronizacao({
      caminho: file,
      tipo: "validacao_ruptura",
      regional: "SP",
      dataReferencia: "2026-07-15",
      outputDir: path.join(dir, "out"),
      dryRun: true,
      gerarReport: false,
    });
    const texto = formatarRelatorioPadronizacao(r.report);
    assert.ok(texto.includes("Regional: SP"));
    assert.ok(texto.includes("Duplicidades removidas"));
  });

  it("23. aba oficial ausente em ordem_cds parcial", () => {
    const dir = tempDir();
    const file = path.join(dir, "partial.xlsx");
    writeWorkbook(file, { Ordem: [["DIVISÃO", "BANDEIRA", "UF", "1º", "2º", "3º", "4º", "5º"], ["X", "Y", "PE", 1, 2, 3, 4, 5]] });
    const r = executarPadronizacao({
      caminho: file,
      tipo: "ordem_cds",
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: path.join(dir, "out"),
      dryRun: true,
      gerarReport: false,
    });
    assert.ok(r.report.erros.length > 0);
  });

  it("24. planilha padrão gerada sem fórmulas", () => {
    const dir = tempDir();
    const out = path.join(dir, "out");
    const file = path.join(dir, "clean.xlsx");
    writeWorkbook(file, {
      "Validaçao Ruptura": [
        ["Loja", "Item", "Qtd Item Ruptura no Mix", "Qtd Item Ruptura"],
        [103, 1001, 1, 1],
      ],
    });
    const r = executarPadronizacao({
      caminho: file,
      tipo: "validacao_ruptura",
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: out,
      dryRun: false,
      gerarReport: false,
    });
    assert.ok(r.report.arquivoPadraoGerado);
    const wb = XLSX.readFile(r.report.arquivoPadraoGerado!, { cellFormula: true });
    const sheet = wb.Sheets["DADOS"];
    assert.ok(sheet);
    const range = sheet["!ref"];
    assert.ok(range);
  });

  it("25. status aguardando arquivo real", () => {
    const contrato = obterContratoPorTipo("ordem_cds");
    assert.equal(contrato.statusValidacao, "preliminar_aguardando_arquivo_real");
  });

  it("ordem_cds multi-aba padronizada", () => {
    const dir = tempDir();
    const out = path.join(dir, "out");
    const file = path.join(dir, "ordem.xlsx");
    writeOrdemCdsMulti(file);
    const r = executarPadronizacao({
      caminho: file,
      tipo: "ordem_cds",
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: out,
      dryRun: false,
      gerarReport: true,
    });
    assert.ok(r.report.abasUsadas.includes("Ordem"));
    assert.ok(r.report.abasIgnoradas.includes("Inutil"));
    assert.ok(fs.existsSync(path.join(out, "motor_ordem_cds_padrao.xlsx")));
  });

  it("CSV convertido e padronizado", () => {
    const dir = tempDir();
    const file = path.join(dir, "val.csv");
    writeCsvValidacao(file);
    const r = executarPadronizacao({
      caminho: file,
      tipo: "validacao_ruptura",
      regional: "MG",
      dataReferencia: "2026-07-15",
      outputDir: path.join(dir, "out"),
      dryRun: false,
      gerarReport: false,
    });
    assert.equal(r.report.linhasValidas, 1);
  });

  it("todas regionais aceitas", () => {
    for (const reg of MOTOR_REGIONAIS) {
      assert.equal(normalizarRegional(reg), reg);
    }
  });

  it("workflow fase padronizar bloqueada sem arquivos", () => {
    const estado = avaliarFase("padronizar_planilhas", {
      regional: "MT",
      dataReferencia: "2026-07-15",
      arquivosOriginaisEnviados: [],
      arquivosPadronizados: [],
      pacoteValidado: false,
      parserExecutado: false,
      transformacoesExecutadas: false,
      breExecutado: false,
      excelV7Validado: false,
    });
    assert.equal(estado.status, "bloqueada");
    assert.ok(estado.motivoBloqueio?.includes("F02"));
  });

  it("MotorStandardizeError para arquivo ausente", () => {
    assert.throws(
      () =>
        executarPadronizacao({
          caminho: "/nao/existe.xlsx",
          tipo: "regras",
          regional: "MT",
          dataReferencia: "2026-07-15",
          outputDir: tempDir(),
          dryRun: true,
          gerarReport: false,
        }),
      (e: unknown) => e instanceof MotorStandardizeError,
    );
  });
});
