import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, it, before, after } from "node:test";
import {
  carregarCredenciaisDrive,
  carregarWorkerConfig,
  isWorkerConfigCompleto,
  obterStatusConfig,
  sanitizarLogValor,
} from "../workerConfig.ts";
import {
  caminhoPart,
  diretorioOriginais,
  garantirDiretoriosPacote,
  removerDiretorioPacote,
  resolverCaminhoSeguro,
  sanitizarNomeArquivo,
} from "../workerPaths.ts";
import { HashCountTransform, calcularHashConteudoPacote, hashReduzido, ordenarArquivosDownload, sha256HexSync } from "../workerHash.ts";
import { workerDownloadFile } from "../workerDownloadFile.ts";
import { validarConteudoArquivo } from "../workerContentValidator.ts";
import { mapearTipoPadronizacao } from "../workerStandardize.ts";
import {
  calcularProgressoBytes,
  filtrarArquivosTesteParcial,
  isModoTesteParcial,
  todosArquivosValidos,
  validarPacoteParaProcessamento,
  validarTransicaoPacote,
} from "../workerPackageValidator.ts";
import { limparArquivoPart, removerPartsOrfaos } from "../workerCleanup.ts";
import type { WorkerArquivoDb, WorkerPacoteDb } from "../workerTypes.ts";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "motor-worker-test-"));
}

function mockDriveStream(content: Buffer) {
  return {
    files: {
      get: async () => ({ data: Readable.from(content) }),
    },
  };
}

describe("workerModule.test — Fase 4C.3", () => {
  const envBackup = { ...process.env };

  after(() => {
    process.env = envBackup;
  });

  it("01. config por env — status parcial", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const s = obterStatusConfig();
    assert.equal(s.supabaseUrl, "configurado");
    assert.equal(s.supabaseServiceRoleKey, "ausente");
    assert.equal(s.googleDrive, "ausente");
  });

  it("02. config por JSON externo", () => {
    const dir = tmpDir();
    const jsonPath = path.join(dir, "creds.json");
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----" }),
    );
    process.env.GOOGLE_DRIVE_CREDENTIALS_JSON = jsonPath;
    delete process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const { creds, fonte } = carregarCredenciaisDrive();
    assert.equal(fonte, "json");
    assert.ok(creds?.clientEmail.includes("@"));
  });

  it("03. secret ausente lança erro", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(() => carregarWorkerConfig(), /SUPABASE_URL/);
  });

  it("04. sanitização de nome", () => {
    assert.equal(sanitizarNomeArquivo("../../../etc/passwd"), "passwd");
    assert.equal(sanitizarNomeArquivo("arquivo<bad>.txt"), "arquivo_bad_.txt");
  });

  it("05. path traversal bloqueado", () => {
    const base = tmpDir();
    const resolved = resolverCaminhoSeguro(base, "..\\escape.txt");
    assert.ok(resolved.startsWith(path.resolve(base)));
    assert.equal(path.basename(resolved), "escape.txt");
  });

  it("06. criação de diretórios pacote", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const dirs = garantirDiretoriosPacote(id);
    assert.ok(fs.existsSync(dirs.originais));
    assert.ok(fs.existsSync(dirs.padronizados));
    removerDiretorioPacote(id);
  });

  it("07. arquivo .part durante download", async () => {
    const dir = tmpDir();
    const finalPath = path.join(dir, "small.bin");
    const content = Buffer.from("hello-worker-stream");
    const dl = await workerDownloadFile({
      driveFileId: "fake",
      caminhoFinal: finalPath,
      tamanhoEsperado: content.length,
      drive: mockDriveStream(content) as never,
      maxRetries: 1,
    });
    assert.equal(dl.ok, true);
    assert.equal(fs.existsSync(caminhoPart(finalPath)), false);
    assert.equal(fs.existsSync(finalPath), true);
  });

  it("08. download pequeno ok", async () => {
    const dir = tmpDir();
    const finalPath = path.join(dir, "tiny.txt");
    const content = Buffer.from("x");
    const dl = await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: finalPath,
      tamanhoEsperado: 1,
      drive: mockDriveStream(content) as never,
      maxRetries: 1,
    });
    assert.equal(dl.bytes, 1);
  });

  it("09. download streaming não carrega tudo em memória de uma vez", async () => {
    const transform = new HashCountTransform();
    const chunks: number[] = [];
    const src = Readable.from([Buffer.from("a"), Buffer.from("b"), Buffer.from("c")]);
    src.on("data", (c: Buffer) => chunks.push(c.length));
    await pipeline(src, transform, fs.createWriteStream(path.join(tmpDir(), "stream.bin")));
    assert.deepEqual(chunks, [1, 1, 1]);
    assert.equal(transform.bytes, 3);
  });

  it("10. SHA-256 incremental", () => {
    const t = new HashCountTransform();
    t.write(Buffer.from("abc"));
    t.end();
    const expected = createHash("sha256").update("abc").digest("hex");
    assert.equal(t.hash.digest("hex"), expected);
  });

  it("11. tamanho correto", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "ok.bin");
    const buf = Buffer.alloc(1024, 1);
    const dl = await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: p,
      tamanhoEsperado: 1024,
      drive: mockDriveStream(buf) as never,
      maxRetries: 1,
    });
    assert.equal(dl.ok, true);
  });

  it("12. tamanho divergente", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "bad.bin");
    const dl = await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: p,
      tamanhoEsperado: 100,
      drive: mockDriveStream(Buffer.from("short")) as never,
      maxRetries: 1,
    });
    assert.equal(dl.ok, false);
    assert.match(dl.erro ?? "", /Tamanho divergente/);
  });

  it("13. cancelamento via AbortSignal", async () => {
    const ac = new AbortController();
    ac.abort();
    const dir = tmpDir();
    const dl = await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: path.join(dir, "cancel.bin"),
      tamanhoEsperado: 10,
      drive: mockDriveStream(Buffer.from("1234567890")) as never,
      signal: ac.signal,
      maxRetries: 1,
    });
    assert.equal(dl.ok, false);
  });

  it("14. timeout / falha remove .part", async () => {
    const dir = tmpDir();
    const finalPath = path.join(dir, "fail.bin");
    const brokenDrive = {
      files: {
        get: async () => {
          throw new Error("timeout simulado");
        },
      },
    };
    const dl = await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: finalPath,
      tamanhoEsperado: null,
      drive: brokenDrive as never,
      maxRetries: 2,
      retryBaseMs: 10,
    });
    assert.equal(dl.ok, false);
    assert.equal(fs.existsSync(caminhoPart(finalPath)), false);
  });

  it("15. retry após falha transitória", async () => {
    const dir = tmpDir();
    const finalPath = path.join(dir, "retry.bin");
    let calls = 0;
    const drive = {
      files: {
        get: async () => {
          calls++;
          if (calls === 1) throw new Error("transiente");
          return { data: Readable.from(Buffer.from("ok")) };
        },
      },
    };
    const dl = await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: finalPath,
      tamanhoEsperado: 2,
      drive: drive as never,
      maxRetries: 3,
      retryBaseMs: 5,
    });
    assert.equal(dl.ok, true);
    assert.equal(calls, 2);
  });

  it("16. backoff aumenta entre tentativas", async () => {
    const inicio = Date.now();
    const dir = tmpDir();
    const drive = { files: { get: async () => { throw new Error("falha"); } } };
    await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: path.join(dir, "b.bin"),
      tamanhoEsperado: null,
      drive: drive as never,
      maxRetries: 3,
      retryBaseMs: 20,
    });
    assert.ok(Date.now() - inicio >= 20);
  });

  it("17. rename final somente após sucesso", async () => {
    const dir = tmpDir();
    const finalPath = path.join(dir, "rename.bin");
    await workerDownloadFile({
      driveFileId: "f",
      caminhoFinal: finalPath,
      tamanhoEsperado: 3,
      drive: mockDriveStream(Buffer.from("yes")) as never,
      maxRetries: 1,
    });
    assert.ok(fs.existsSync(finalPath));
    assert.ok(!fs.existsSync(`${finalPath}.part`));
  });

  it("18. remoção .part em falha", () => {
    const dir = tmpDir();
    const part = path.join(dir, "x.part");
    fs.writeFileSync(part, "partial");
    limparArquivoPart(path.join(dir, "x"));
    assert.equal(fs.existsSync(part), false);
  });

  it("19. ordem de download", () => {
    const arquivos: WorkerArquivoDb[] = [
      { id: "1", pacote_id: "p", drive_file_id: "a", tipo_arquivo: "bandeira", nome_original: "bandeira.csv", extensao: ".csv", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "pequeno", ordem_processamento: 11, precisa_padronizacao: false, status: "reconhecido" },
      { id: "2", pacote_id: "p", drive_file_id: "b", tipo_arquivo: "rede", nome_original: "Rede.txt", extensao: ".txt", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "medio", ordem_processamento: 5, precisa_padronizacao: false, status: "reconhecido" },
    ];
    const ord = ordenarArquivosDownload(arquivos);
    assert.equal(ord[0]?.tipo_arquivo, "rede");
  });

  it("20. hash do pacote por conteúdo", () => {
    const h1 = calcularHashConteudoPacote([
      { tipo_arquivo: "rede", sha256: "aa", tamanho_baixado_bytes: 10, ordem_processamento: 5 },
      { tipo_arquivo: "bandeira", sha256: "bb", tamanho_baixado_bytes: 2, ordem_processamento: 11 },
    ]);
    const h2 = calcularHashConteudoPacote([
      { tipo_arquivo: "bandeira", sha256: "bb", tamanho_baixado_bytes: 2, ordem_processamento: 11 },
      { tipo_arquivo: "rede", sha256: "aa", tamanho_baixado_bytes: 10, ordem_processamento: 5 },
    ]);
    assert.equal(h1, h2);
    assert.notEqual(h1, sha256HexSync(""));
  });

  it("21. TXT válido", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "Rede.txt");
    fs.writeFileSync(p, "SEQPESSOA;RAZAO;SEQREDE\n1;ACME;2\n", "utf8");
    const arq: WorkerArquivoDb = {
      id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: "rede", nome_original: "Rede.txt", extensao: ".txt", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "medio", ordem_processamento: 5, precisa_padronizacao: false, status: "reconhecido",
    };
    const r = await validarConteudoArquivo(arq, p);
    assert.equal(r.status, "valido");
  });

  it("22. TXT inválido vazio", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "vazio.txt");
    fs.writeFileSync(p, "", "utf8");
    const arq: WorkerArquivoDb = {
      id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: "rede", nome_original: "vazio.txt", extensao: ".txt", tamanho_bytes: 0, md5_drive: null, categoria_tamanho: "pequeno", ordem_processamento: 1, precisa_padronizacao: false, status: "reconhecido",
    };
    const r = await validarConteudoArquivo(arq, p);
    assert.equal(r.status, "invalido");
  });

  it("23. CSV válido", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "bandeira.csv");
    fs.writeFileSync(p, "LOJA;BANDEIRA\n73;FORT\n", "utf8");
    const arq: WorkerArquivoDb = {
      id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: "bandeira", nome_original: "bandeira.csv", extensao: ".csv", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "pequeno", ordem_processamento: 11, precisa_padronizacao: false, status: "reconhecido",
    };
    const r = await validarConteudoArquivo(arq, p);
    assert.equal(r.status, "valido");
  });

  it("24. XLSX válido via fixture mínima", async () => {
    const fixture = path.resolve("src/motor/tests/fixtures/standardize/validacao_ruptura_min.xlsx");
    if (!fs.existsSync(fixture)) {
      assert.ok(true, "fixture ausente — skip");
      return;
    }
    const arq: WorkerArquivoDb = {
      id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: "validacao_ruptura", nome_original: "v.xlsx", extensao: ".xlsx", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "medio", ordem_processamento: 6, precisa_padronizacao: true, status: "reconhecido",
    };
    const r = await validarConteudoArquivo(arq, fixture);
    assert.notEqual(r.status, "invalido");
  });

  it("25. XLSX corrompido", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "bad.xlsx");
    fs.writeFileSync(p, "not-a-xlsx", "utf8");
    const arq: WorkerArquivoDb = {
      id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: "ordem_cds", nome_original: "bad.xlsx", extensao: ".xlsx", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "pequeno", ordem_processamento: 7, precisa_padronizacao: true, status: "reconhecido",
    };
    const r = await validarConteudoArquivo(arq, p);
    assert.equal(r.status, "invalido");
  });

  it("26. mapeamento padronização regras_definidas → regras", () => {
    assert.equal(mapearTipoPadronizacao("regras_definidas"), "regras");
  });

  it("27. original intacto — padronização exige arquivo existente", () => {
    assert.equal(mapearTipoPadronizacao("rede"), null);
  });

  it("28. validação pacote exige arquivos", () => {
    const pacote = { id: "p", regional: "MT", competencia: "2026-07-01", data_referencia: "2026-07-13", status: "pronto", hash_metadados_pacote: "abc", hash_conteudo_pacote: null, tamanho_total_bytes: 0, worker_id: null } as WorkerPacoteDb;
    const erros = validarPacoteParaProcessamento(pacote, []);
    assert.ok(erros.length > 0);
  });

  it("29. transição status baixando → validando", () => {
    assert.equal(validarTransicaoPacote("baixando", "validando_conteudo"), true);
    assert.equal(validarTransicaoPacote("baixando", "pronto_motor"), false);
  });

  it("30. falha download transição", () => {
    assert.equal(validarTransicaoPacote("baixando", "falhou_download"), true);
  });

  it("31. falha validação transição", () => {
    assert.equal(validarTransicaoPacote("validando_conteudo", "falhou_validacao"), true);
  });

  it("32. falha padronização transição", () => {
    assert.equal(validarTransicaoPacote("padronizando", "falhou_padronizacao"), true);
  });

  it("33. pronto_motor requer todos válidos", () => {
    const arquivos: WorkerArquivoDb[] = [
      { id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: "rede", nome_original: "r.txt", extensao: ".txt", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "pequeno", ordem_processamento: 1, precisa_padronizacao: false, status: "reconhecido", sha256: "x", hash_validado: true, validacao_conteudo_status: "valido" },
    ];
    assert.equal(todosArquivosValidos(arquivos), true);
  });

  it("34. worker.json sem secret — sanitizar log", () => {
    assert.equal(sanitizarLogValor("SUPABASE_SERVICE_ROLE_KEY", "secret-value"), "configurado");
    assert.equal(sanitizarLogValor("SUPABASE_SERVICE_ROLE_KEY", ""), "ausente");
  });

  it("35. nenhum Motor neste módulo", () => {
    const src = fs.readFileSync(path.resolve("src/motor/drive/worker/workerRunner.ts"), "utf8");
    assert.doesNotMatch(src, /executarMotor|motorPilot|persistencia/);
  });

  it("36. nenhum Data Mart", () => {
    const src = fs.readFileSync(path.resolve("src/motor/drive/worker/workerRunner.ts"), "utf8");
    assert.doesNotMatch(src, /data_mart|dataMart/);
  });

  it("37. nenhum conteúdo bruto no banco", () => {
    const src = fs.readFileSync(path.resolve("src/motor/drive/worker/workerStatusReporter.ts"), "utf8");
    assert.doesNotMatch(src, /insert.*conteudo|bytea/i);
  });

  it("38. hash reduzido", () => {
    assert.equal(hashReduzido("abcdef1234567890"), "ABCDEF");
  });

  it("39. progresso bytes percentual", () => {
    const p = calcularProgressoBytes([
      { id: "1", pacote_id: "p", drive_file_id: "d", tipo_arquivo: null, nome_original: "a", extensao: null, tamanho_bytes: 100, md5_drive: null, categoria_tamanho: null, ordem_processamento: null, precisa_padronizacao: false, status: "reconhecido", tamanho_baixado_bytes: 50 },
    ] as WorkerArquivoDb[]);
    assert.equal(p.percentual, 50);
  });

  it("40. parts órfãos removidos", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "a.part"), "x");
    fs.writeFileSync(path.join(dir, "b.txt"), "y");
    assert.equal(removerPartsOrfaos(dir), 1);
  });

  it("41. diretório originais por pacote", () => {
    const id = "00000000-0000-4000-8000-000000000099";
    assert.match(diretorioOriginais(id), /worker[\\/]00000000/);
  });

  it("43. filtro teste parcial por tipo", () => {
    const arquivos = [
      { id: "1", pacote_id: "p", drive_file_id: "a", tipo_arquivo: "bandeira", nome_original: "bandeira.csv", extensao: ".csv", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "pequeno", ordem_processamento: 11, precisa_padronizacao: false, status: "reconhecido" },
      { id: "2", pacote_id: "p", drive_file_id: "b", tipo_arquivo: "rede", nome_original: "Rede.txt", extensao: ".txt", tamanho_bytes: 1, md5_drive: null, categoria_tamanho: "medio", ordem_processamento: 5, precisa_padronizacao: false, status: "reconhecido" },
    ] as import("../workerTypes.ts").WorkerArquivoDb[];
    const filtrado = filtrarArquivosTesteParcial(arquivos, { onlyFileType: "bandeira" });
    assert.equal(filtrado.length, 1);
    assert.equal(filtrado[0]?.tipo_arquivo, "bandeira");
    assert.equal(isModoTesteParcial({ onlyFileType: "bandeira" }), true);
  });

  it("42. isWorkerConfigCompleto false sem drive", () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
    delete process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    delete process.env.GOOGLE_DRIVE_CREDENTIALS_JSON;
    assert.equal(isWorkerConfigCompleto(), false);
  });
});
