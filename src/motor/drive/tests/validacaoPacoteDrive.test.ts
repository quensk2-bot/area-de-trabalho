import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularHashMetadadosPacote,
  calcularResumoPacote,
  classificarArquivosPacoteDrive,
  hashReduzido,
  montarDiagnosticoPacote,
} from "../validacaoPacoteDrive.ts";

const f = (nome: string, id: string, size = 100) => ({
  driveFileId: id,
  nome,
  mimeType: "text/plain",
  tamanhoBytes: size,
  modifiedTime: "2026-04-07T10:00:00Z",
  md5Checksum: "md5",
  webViewLink: null,
});

describe("validacaoPacoteDrive.test — Fase 4C.2", () => {
  it("hash reduzido", () => {
    assert.equal(hashReduzido("abcdef123456"), "ABCDEF");
  });

  it("conta categorias de tamanho", () => {
    const arquivos = classificarArquivosPacoteDrive(
      [f("Rede.txt", "1", 1024), f("Plan 6 CD.txt", "2", 10 * 1024 * 1024), f("1º Grupo de Ruptura.txt", "3", 30 * 1024 * 1024)],
      "folder",
    );
    const resumo = calcularResumoPacote(arquivos);
    assert.equal(resumo.quantidadePequenos, 1);
    assert.equal(resumo.quantidadeMedios, 1);
    assert.equal(resumo.quantidadeGrandes, 1);
  });

  it("pacote duplicado no diagnóstico", () => {
    const resumo = calcularResumoPacote(classificarArquivosPacoteDrive([f("Rede.txt", "1")], "f"));
    const diag = montarDiagnosticoPacote({ resumo, pastaCadastrada: true, pacoteDuplicado: true });
    assert.equal(diag.pacoteNaoProcessadoAnteriormente, "warn");
  });

  it("hash estável entre execuções", () => {
    const arquivos = classificarArquivosPacoteDrive([f("Rede.txt", "1"), f("bandeira.csv", "2")], "folder");
    assert.equal(calcularHashMetadadosPacote(arquivos), calcularHashMetadadosPacote(arquivos));
  });
});
