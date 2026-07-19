import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOGO_ARQUIVOS_MOTOR_MT } from "../catalogoArquivosMotor.ts";
import {
  classificarArquivosListados,
  resumoCatalogoMt,
} from "../validacaoPacoteDrive.ts";
import { normalizarNomeArquivoDrive } from "../normalizarNomeArquivoDrive.ts";
import { reconhecerTipoArquivoDrive } from "../reconhecerTipoArquivoDrive.ts";
import { classificarTamanhoArquivoDrive } from "../classificarTamanhoArquivoDrive.ts";
import {
  calcularHashMetadadosPacote,
  calcularResumoPacote,
  classificarArquivosPacoteDrive,
  determinarStatusPacote,
  montarDiagnosticoPacote,
} from "../validacaoPacoteDrive.ts";

const base = (nome: string, size = 100, id = "1") => ({
  driveFileId: id,
  nome,
  mimeType: "text/plain",
  tamanhoBytes: size,
  modifiedTime: "2026-04-07T10:00:00Z",
  md5Checksum: "abc123",
  webViewLink: null,
});

describe("catalogoArquivosMotor — Fase 4C.1/4C.2", () => {
  it("reconhece TXT do 1º Grupo de Ruptura", () => {
    assert.equal(reconhecerTipoArquivoDrive("1º Grupo de Ruptura.txt")?.tipoArquivo, "grupo_ruptura_1");
  });

  it("reconhece nome com acento", () => {
    assert.equal(reconhecerTipoArquivoDrive("Validação Ruptura.xlsx")?.tipoArquivo, "validacao_ruptura");
  });

  it("reconhece regras definidas", () => {
    assert.equal(reconhecerTipoArquivoDrive("Regras definidas.xlsx")?.tipoArquivo, "regras_definidas");
  });

  it("reconhece apóstrofo em Ordem CD´s", () => {
    assert.equal(reconhecerTipoArquivoDrive("Ordem CD´s.xlsx")?.tipoArquivo, "ordem_cds");
  });

  it("marca arquivo desconhecido", () => {
    assert.equal(reconhecerTipoArquivoDrive("planilha_qualquer.xlsx"), null);
  });

  it("detecta duplicidade de tipo", () => {
    const out = classificarArquivosListados([
      base("Rede.txt", 100, "1"),
      base("Rede.txt", 100, "2"),
    ]);
    assert.equal(out.filter((x) => x.status === "duplicado").length, 1);
  });

  it("detecta arquivo vazio", () => {
    const out = classificarArquivosListados([base("bandeira.csv", 0)]);
    assert.ok(out[0]?.vazio);
  });

  it("pacote incompleto quando falta obrigatório", () => {
    const out = classificarArquivosListados([base("Rede.txt")]);
    assert.equal(resumoCatalogoMt(out).pacoteCompleto, false);
  });

  it("normaliza nome para comparação", () => {
    assert.equal(normalizarNomeArquivoDrive("  Validação  Ruptura.txt  "), "validacao ruptura");
  });

  it("catálogo MT possui 11 tipos obrigatórios", () => {
    assert.equal(CATALOGO_ARQUIVOS_MOTOR_MT.filter((c) => c.obrigatorio).length, 11);
  });
});

describe("validacaoPacoteDrive — Fase 4C.2", () => {
  it("classifica pequeno", () => {
    assert.equal(classificarTamanhoArquivoDrive(1024), "pequeno");
  });

  it("classifica medio", () => {
    assert.equal(classificarTamanhoArquivoDrive(10 * 1024 * 1024), "medio");
  });

  it("classifica grande", () => {
    assert.equal(classificarTamanhoArquivoDrive(30 * 1024 * 1024), "grande");
  });

  it("hash determinístico", () => {
    const arquivos = classificarArquivosPacoteDrive([base("Rede.txt"), base("bandeira.csv", 200, "2")], "folder");
    const h1 = calcularHashMetadadosPacote(arquivos);
    const h2 = calcularHashMetadadosPacote([...arquivos].reverse());
    assert.equal(h1, h2);
  });

  it("hash muda com modifiedTime", () => {
    const a = classificarArquivosPacoteDrive([base("Rede.txt")], "folder");
    const b = classificarArquivosPacoteDrive([{ ...base("Rede.txt"), modifiedTime: "2026-04-08T10:00:00Z" }], "folder");
    assert.notEqual(calcularHashMetadadosPacote(a), calcularHashMetadadosPacote(b));
  });

  it("resumo pacote completo com 11 arquivos simulados", () => {
    const nomes = [
      "1º Grupo de Ruptura.txt",
      "2º Grupo de Ruptura.txt",
      "Inventário Lojas.txt",
      "Plan 6 CD.txt",
      "Rede.txt",
      "Validação Ruptura.xlsx",
      "Ordem CD´s.xlsx",
      "Compradores da regional.xlsx",
      "Regras definidas.xlsx",
      "Estrutura Fake.xlsx",
      "bandeira.csv",
    ];
    const arquivos = classificarArquivosPacoteDrive(
      nomes.map((nome, i) => base(nome, 1000 * (i + 1), String(i + 1))),
      "folder",
    );
    const resumo = calcularResumoPacote(arquivos);
    assert.equal(resumo.pacoteCompleto, true);
    assert.equal(resumo.quantidadeValidos, 11);
  });

  it("tamanho acima do limite gera invalido", () => {
    const out = classificarArquivosPacoteDrive([base("bandeira.csv", 99999999)], "folder");
    assert.equal(out[0]?.status, "invalido");
  });

  it("determina status duplicado", () => {
    const resumo = calcularResumoPacote(classificarArquivosPacoteDrive([base("Rede.txt")], "f"));
    assert.equal(determinarStatusPacote(resumo, true), "duplicado");
  });

  it("diagnóstico alerta competência divergente", () => {
    const resumo = calcularResumoPacote(classificarArquivosPacoteDrive([base("Rede.txt")], "f"));
    const diag = montarDiagnosticoPacote({ resumo, pastaCadastrada: true, competenciaDivergente: true });
    assert.equal(diag.competenciaCoerente, "warn");
  });

  it("ordem de processamento respeitada no catálogo", () => {
    assert.equal(CATALOGO_ARQUIVOS_MOTOR_MT[0]?.ordemProcessamento, 1);
    assert.equal(CATALOGO_ARQUIVOS_MOTOR_MT[10]?.ordemProcessamento, 11);
  });
});
