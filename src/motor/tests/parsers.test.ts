import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "fs";
import iconv from "iconv-lite";
import path from "path";
import { HEADER_GRUPO_RUPTURA_57 } from "../constants/headers.ts";
import { parseGrupoCds2 } from "../parsers/parseGrupoCds2.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { parseInventarioLojas } from "../parsers/parseInventarioLojas.ts";
import { parseValidacaoRuptura } from "../parsers/parseValidacaoRuptura.ts";
import { parseTxtStream } from "../parsers/parseTxtStream.ts";
import { validateHeader } from "../validators/validateHeader.ts";
import { fixturePath } from "./fixtures/fixturePaths.ts";
import { writeFixtures } from "./fixtures/buildFixtures.ts";

writeFixtures();

describe("parsers", () => {
  it("1. cabeçalho correto — grupo ruptura 1", async () => {
    const result = await parseGrupoRuptura1(fixturePath("grupo_ruptura_1_sample.txt"));
    assert.equal(result.cabecalhoOk, true);
    assert.equal(result.cabecalhos.length, 57);
    assert.equal(result.linhas.length, 2);
  });

  it("2. cabeçalho incorreto — grupo ruptura 1", async () => {
    const result = await parseGrupoRuptura1(fixturePath("grupo_ruptura_header_errado.txt"));
    assert.equal(result.cabecalhoOk, false);
    assert.ok(result.erros.some((e) => e.codigoErro === "CABECALHO_COLUNA_AUSENTE"));
  });

  it("7. colunas faltantes na linha", async () => {
    const tmp = fixturePath("_tmp_colunas_faltantes.txt");
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    fs.writeFileSync(tmp, `${header}\nNORDESTE;103;2505088\n`, "utf8");
    const result = await parseTxtStream(tmp, { colunasEsperadas: 57 });
    assert.ok(result.linhasInvalidas >= 1);
    assert.ok(result.erros.some((e) => e.codigoErro === "COLUNAS_FALTANTES"));
    fs.unlinkSync(tmp);
  });

  it("8. colunas excedentes na linha", async () => {
    const tmp = fixturePath("_tmp_colunas_excedentes.txt");
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    const extra = "EXTRA1;EXTRA2";
    const row = Array(57).fill("X").join(";") + ";" + extra;
    fs.writeFileSync(tmp, `${header}\n${row}\n`, "utf8");
    const result = await parseTxtStream(tmp, { colunasEsperadas: 57 });
    assert.ok(result.erros.some((e) => e.codigoErro === "COLUNAS_EXCEDENTES"));
    fs.unlinkSync(tmp);
  });

  it("9. Windows-1252 com acentuação", async () => {
    const tmp = fixturePath("_tmp_win1252.txt");
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    const row = HEADER_GRUPO_RUPTURA_57.map((h) => {
      if (h === "DIVISAO") return "NORDESTE";
      if (h === "LOJA") return "103";
      if (h === "SEQPRODUTO") return "2505088";
      if (h === "DESCCOMPLETA") return "CAFÉ AÇÚCAR";
      return "";
    }).join(";");
    const content = `${header}\n${row}\n`;
    fs.writeFileSync(tmp, iconv.encode(content, "win1252"));
    const result = await parseGrupoRuptura1(tmp);
    assert.equal(result.linhas[0].descricao, "CAFÉ AÇÚCAR");
    fs.unlinkSync(tmp);
  });

  it("17. limite de linhas", async () => {
    const result = await parseGrupoRuptura1(fixturePath("grupo_ruptura_1_sample.txt"), 1);
    assert.equal(result.linhas.length, 1);
    assert.equal(result.metricas.linhasLidas, 1);
  });

  it("21. última linha sem quebra final", async () => {
    const result = await parseGrupoRuptura1(fixturePath("grupo_ruptura_sem_quebra_final.txt"));
    assert.equal(result.linhas.length, 1);
    assert.equal(result.linhas[0].seqproduto, "2505088");
  });

  it("11. CD1 grupo 2 mapeado para CD5", async () => {
    const result = await parseGrupoCds2(fixturePath("grupo_cds_2_sample.txt"));
    assert.equal(result.cabecalhoOk, true);
    assert.equal(result.linhas.length, 2);
    assert.equal(result.linhas[0].statusCompraCd5, "COMPRAR_CD5");
    assert.equal(result.linhas[0].estoqueCd5, "500");
    assert.equal(result.linhas[0].pendenciaCd5, "10");
    assert.equal(result.linhas[0].diasCompraCd5, "12");
    assert.equal(result.linhas[0].diasRecebtoCd5, "5");
  });

  it("12. inventário com cabeçalho dinâmico", async () => {
    const result = await parseInventarioLojas(fixturePath("inventario_lojas_sample.txt"));
    assert.equal(result.cabecalhoOk, true);
    assert.equal(result.linhas.length, 4);
  });

  it("22. inventário com coluna extra no cabeçalho", async () => {
    const result = await parseInventarioLojas(fixturePath("inventario_lojas_sample.txt"));
    assert.ok(result.cabecalhos.includes("Coluna Extra"));
    assert.ok(result.cabecalhos.includes("Código Empresa"));
  });

  it("13. gera_ruptura quando Mix = 1", async () => {
    const xlsx = fixturePath("validacao_ruptura_sample.xlsx");
    const result = await parseValidacaoRuptura(xlsx);
    const comMix = result.linhas.find((l) => l.loja === 103);
    assert.ok(comMix);
    assert.equal(comMix.geraRuptura, true);
    assert.equal(comMix.ruptura104c, false);
  });

  it("14. ruptura_104c quando Ruptura = 1", async () => {
    const xlsx = fixturePath("validacao_ruptura_sample.xlsx");
    const result = await parseValidacaoRuptura(xlsx);
    const com104c = result.linhas.find((l) => l.loja === 104);
    assert.ok(com104c);
    assert.equal(com104c.geraRuptura, false);
    assert.equal(com104c.ruptura104c, true);
  });

  it("25. linha válida preservada com outra inválida", async () => {
    const tmp = fixturePath("_tmp_mista.txt");
    const header = HEADER_GRUPO_RUPTURA_57.join(";");
    const valida = HEADER_GRUPO_RUPTURA_57.map((h) => {
      if (h === "DIVISAO") return "NORDESTE";
      if (h === "LOJA") return "103";
      if (h === "SEQPRODUTO") return "2505088";
      if (h === "DESCCOMPLETA") return "OK";
      return "";
    }).join(";");
    fs.writeFileSync(tmp, `${header}\n${valida}\nNORDESTE;103\n`, "utf8");
    const result = await parseTxtStream(tmp, { colunasEsperadas: 57 });
    assert.equal(result.linhasValidas, 1);
    assert.equal(result.linhasInvalidas, 1);
    fs.unlinkSync(tmp);
  });

  it("validateHeader — cabeçalho oficial", () => {
    const result = validateHeader([...HEADER_GRUPO_RUPTURA_57], HEADER_GRUPO_RUPTURA_57);
    assert.equal(result.ok, true);
  });
});
