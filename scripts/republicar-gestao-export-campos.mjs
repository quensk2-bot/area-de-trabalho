#!/usr/bin/env node
/**
 * Reconsolida e republica gestao.json (+ chunks) com os campos da Base Comprador.
 *
 * Segurança:
 * - o modo padrão é dry-run;
 * - a publicação exige --publish;
 * - valida as 15 lojas, CATEGORIA, cobertura de comprador e amostras oficiais;
 * - publica o manifest somente depois de todos os arquivos de gestão.
 *
 * Uso:
 *   node --import tsx scripts/republicar-gestao-export-campos.mjs
 *   node --import tsx scripts/republicar-gestao-export-campos.mjs --publish --versao 2
 */
import "dotenv/config";
import fs from "node:fs";
import { HIBRIDO_BUCKET } from "../src/hibrido-v7/constants.ts";
import { resolvePilotFilePaths } from "../src/motor/pilot/pilotFilePaths.ts";
import { executarMotorRegional } from "../src/motor/pacote/motorRegionalRunner.ts";
import { gerarGestaoLoja } from "../src/motor/export/hibrido/gerarGestaoLoja.ts";
import { competenciaFromDataReferencia } from "../src/hibrido-v7/manifest/manifestPaths.ts";
import {
  buildManifest,
  computeHashConteudo,
  manifestStoragePath,
} from "../src/hibrido-v7/manifest/manifestBuilder.ts";
import { validarArtefatosHibridos } from "../src/motor/export/hibrido/validarArtefatosHibridos.ts";
import { createServiceRoleClient, publicarStoragePrivado } from "../src/motor/export/hibrido/publicarStoragePrivado.ts";

const LOJAS_COMPER_MT = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
const CODIGOS_REFERENCIA_EXCEL = [44440, 44318, 1523864];
const AMOSTRAS_LUCIMARY = [43273, 612480];
const DEPARTAMENTOS_REFERENCIA_EXCEL = new Set(["60-MERCEARIA", "63-BAZAR"]);
const SECOES_REFERENCIA_EXCEL = new Set([
  "31-ALIMENTACAO BASICA",
  "34-PERFUMARIA",
  "51-BASICO BAZAR",
]);
const COBERTURA_MINIMA_COMPRADOR = 0.995;
const REGIONAL = "MT";
const BANDEIRA = "COMPER";
const DATA_REF = "2026-07-13";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const publicar = args.publish === true;
const versao = Number(args.versao ?? "2");

function toPacotePaths(pilot) {
  const { excelRegional: _excel, ...rest } = pilot;
  return rest;
}

function textoPreenchido(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

function listarProdutosGerados(gen) {
  if (gen.chunked) return (gen.partes ?? []).flatMap((parte) => parte.produtos);
  return gen.gestao.produtos ?? [];
}

function validarBaseComprador(produtos) {
  const universoOficial = produtos.filter((produto) => produto.baseLimpa === "Base Limpa");
  const semCategoria = universoOficial.filter((produto) => !textoPreenchido(produto.grupoN3));
  const semComprador = universoOficial.filter((produto) => !textoPreenchido(produto.comprador));
  const codigosSemComprador = [...new Set(semComprador.map((produto) => Number(produto.seqproduto)))].sort(
    (a, b) => a - b,
  );
  const codigosSemCompradorRecorteExcel = [
    ...new Set(
      semComprador
        .filter(
          (produto) =>
            DEPARTAMENTOS_REFERENCIA_EXCEL.has(String(produto.divisao)) &&
            SECOES_REFERENCIA_EXCEL.has(String(produto.setorN2)),
        )
        .map((produto) => Number(produto.seqproduto)),
    ),
  ].sort((a, b) => a - b);
  const codigosReferenciaAindaSemComprador = CODIGOS_REFERENCIA_EXCEL.filter((codigo) =>
    codigosSemComprador.includes(codigo),
  );
  const coberturaComprador =
    universoOficial.length > 0 ? (universoOficial.length - semComprador.length) / universoOficial.length : 0;

  const erros = [];
  if (semCategoria.length > 0) {
    erros.push(
      `CATEGORIA/grupoN3 vazia em ${semCategoria.length} registro(s); exemplos: ${semCategoria
        .slice(0, 10)
        .map((produto) => `${produto.loja}/${produto.seqproduto}`)
        .join(", ")}`,
    );
  }
  if (coberturaComprador < COBERTURA_MINIMA_COMPRADOR) {
    erros.push(
      `Cobertura de comprador abaixo de ${(COBERTURA_MINIMA_COMPRADOR * 100).toFixed(2)}%: ${(coberturaComprador * 100).toFixed(2)}%`,
    );
  }

  for (const codigo of AMOSTRAS_LUCIMARY) {
    const ocorrencias = produtos.filter((produto) => Number(produto.seqproduto) === codigo);
    if (ocorrencias.length === 0) {
      erros.push(`Amostra ${codigo} ausente na reconsolidação`);
      continue;
    }
    const invalidas = ocorrencias.filter(
      (produto) => String(produto.comprador ?? "").trim().toUpperCase() !== "LUCIMARY",
    );
    if (invalidas.length > 0) {
      erros.push(
        `Amostra ${codigo} não resolveu LUCIMARY em ${invalidas.length}/${ocorrencias.length} loja(s)`,
      );
    }
  }

  return {
    ok: erros.length === 0,
    erros,
    totalRegistrosGerados: produtos.length,
    totalRegistrosUniversoOficial: universoOficial.length,
    categoriasPreenchidas: universoOficial.length - semCategoria.length,
    categoriasVazias: semCategoria.length,
    registrosSemComprador: semComprador.length,
    coberturaCompradorPercentual: Number((coberturaComprador * 100).toFixed(4)),
    quantidadeCodigosSemComprador: codigosSemComprador.length,
    codigosSemComprador: codigosSemComprador.length <= 30 ? codigosSemComprador : codigosSemComprador.slice(0, 30),
    codigosSemCompradorRecorteExcel,
    codigosReferenciaAindaSemComprador,
  };
}

async function main() {
  if (!Number.isInteger(versao) || versao < 1) {
    throw new Error(`--versao inválida: ${String(args.versao ?? "")}`);
  }
  if (args["dry-run"] === true && publicar) {
    throw new Error("Use somente um modo: --dry-run ou --publish");
  }

  const paths = toPacotePaths(resolvePilotFilePaths(REGIONAL, DATA_REF));
  for (const [k, v] of Object.entries(paths)) {
    if (!fs.existsSync(v)) throw new Error(`Fonte ausente (${k}): ${v}`);
  }

  console.log(`[republish-gestao] Motor ${REGIONAL}/${DATA_REF}...`);
  const motor = await executarMotorRegional({ regional: REGIONAL, dataReferencia: DATA_REF, paths });
  if (!motor.aprovado) throw new Error(motor.bloqueioMotivo ?? "Motor reprovado");

  const competencia = competenciaFromDataReferencia(DATA_REF);
  const lojaSet = new Set(LOJAS_COMPER_MT);
  const porLoja = new Map();
  for (const item of motor.consolidado.itens) {
    if (!lojaSet.has(item.loja)) continue;
    if (!porLoja.has(item.loja)) porLoja.set(item.loja, []);
    porLoja.get(item.loja).push(item);
  }

  const artefatosGestao = [];
  const produtosGerados = [];
  for (const loja of LOJAS_COMPER_MT) {
    const itens = porLoja.get(loja) ?? [];
    if (itens.length === 0) throw new Error(`Loja ${loja} não possui produtos na reconsolidação`);

    const gen = gerarGestaoLoja(itens, {
      regional: REGIONAL,
      bandeira: BANDEIRA,
      loja,
      dataReferencia: DATA_REF,
      versao,
    });
    const base = `${REGIONAL}/${BANDEIRA}/${competencia}/lojas/${loja}`;
    artefatosGestao.push({
      path: `${base}/gestao.json`,
      json: gen.gestao,
      bytes: Buffer.byteLength(JSON.stringify(gen.gestao)),
    });
    if (gen.chunked && gen.partes) {
      for (const parte of gen.partes) {
        artefatosGestao.push({
          path: `${base}/${parte.pathSuffix}`,
          json: { produtos: parte.produtos },
          bytes: parte.bytes,
        });
      }
    }

    const produtosLoja = listarProdutosGerados(gen);
    produtosGerados.push(...produtosLoja);
    const categoriasVazias = produtosLoja.filter((produto) => !textoPreenchido(produto.grupoN3)).length;
    const compradoresVazios = produtosLoja.filter((produto) => !textoPreenchido(produto.comprador)).length;
    console.log(
      `  loja ${loja}: ${itens.length} produtos | categoria vazia: ${categoriasVazias} | comprador vazio: ${compradoresVazios}`,
    );
  }

  const auditoria = validarBaseComprador(produtosGerados);
  console.log("[republish-gestao] Auditoria Base Comprador:");
  console.log(JSON.stringify(auditoria, null, 2));
  if (!auditoria.ok) {
    throw new Error(`Publicação bloqueada: ${auditoria.erros.join("; ")}`);
  }

  let supabase = null;
  let manifestAnterior = null;
  const manifestPath = `${REGIONAL}/${BANDEIRA}/${competencia}/manifest.json`;
  if (publicar) {
    supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage.from(HIBRIDO_BUCKET).download(manifestPath);
    if (error || !data) {
      throw new Error(`Não foi possível validar o manifest atual antes da publicação: ${error?.message ?? "vazio"}`);
    }
    manifestAnterior = JSON.parse(await data.text());
    const versaoAtual = Number(manifestAnterior?.versao);
    if (!Number.isInteger(versaoAtual) || versao <= versaoAtual) {
      throw new Error(`A nova versão (${versao}) deve ser maior que a versão atual (${String(versaoAtual)})`);
    }
  }

  const hashConteudo = computeHashConteudo(artefatosGestao.map((artefato) => JSON.stringify(artefato.json)));
  const manifest = buildManifest({
    regional: REGIONAL,
    bandeira: BANDEIRA,
    competencia,
    dataReferencia: DATA_REF,
    versao,
    lojas: LOJAS_COMPER_MT,
    hashConteudo,
    baseXlsxDriveFileId: manifestAnterior?.baseXlsxDriveFileId ?? null,
    baseCsvDriveFileId: manifestAnterior?.baseCsvDriveFileId ?? null,
  });
  const artefatoManifest = {
    path: manifestStoragePath(manifest),
    json: manifest,
    bytes: Buffer.byteLength(JSON.stringify(manifest)),
  };
  const validacao = validarArtefatosHibridos([artefatoManifest, ...artefatosGestao]);
  if (!validacao.ok) throw new Error(`Artefatos inválidos: ${validacao.erros.join("; ")}`);

  console.log(
    `[republish-gestao] ${artefatosGestao.length} artefatos de gestão + manifest | versão ${versao} | ${publicar ? "PUBLICAÇÃO" : "DRY-RUN"}`,
  );
  if (!publicar) {
    console.log("[republish-gestao] Dry-run concluído — nenhum upload realizado.");
    return;
  }

  if (!supabase) throw new Error("Cliente de publicação indisponível");
  const pubGestao = await publicarStoragePrivado({ supabase, artefatos: artefatosGestao, upsert: true });
  if (!pubGestao.ok) {
    throw new Error(`Falha antes do manifest; manifest preservado: ${pubGestao.erros.join("; ")}`);
  }

  const pubManifest = await publicarStoragePrivado({ supabase, artefatos: [artefatoManifest], upsert: true });
  if (!pubManifest.ok) throw new Error(`Gestão enviada, mas manifest falhou: ${pubManifest.erros.join("; ")}`);
  console.log(JSON.stringify({ ok: true, paths: pubGestao.paths.length + pubManifest.paths.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
