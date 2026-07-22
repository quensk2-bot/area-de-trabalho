#!/usr/bin/env node
/**
 * Simula export UI: gestao normalizado + mapearBaseRupturaHibrido + filtro oficial.
 * Saída: importar/RUPTURA/VALIDAÇÃO/IMPORTADO_2_UI_EXPORT_TEST.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePilotFilePaths } from "../src/motor/pilot/pilotFilePaths.ts";
import { executarMotorRegional } from "../src/motor/pacote/motorRegionalRunner.ts";
import { gerarGestaoLoja } from "../src/motor/export/hibrido/gerarGestaoLoja.ts";
import { gerarCdsLoja } from "../src/motor/export/hibrido/gerarCdsLoja.ts";
import { gerarBaseRupturaXlsx } from "../src/motor/export/baseRuptura/index.ts";
import {
  filtrarLinhasUniversoOficial,
  mapearBaseRupturaHibrido,
} from "../src/ruptura-v7/services/hibrido/mapearBaseRupturaHibrido.ts";
import { normalizarProdutosGestaoExport } from "../src/ruptura-v7/services/hibrido/normalizarProdutoGestaoExport.ts";
import chavesOficiais from "../architecture/hibrido-v7/chaves-oficiais-conferencia.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOJAS = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
const REGIONAL = "MT";
const BANDEIRA = "COMPER";
const DATA_REF = "2026-07-13";
const OUT_DIR = "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO";
const OUT_FILE = "IMPORTADO_2_UI_EXPORT_TEST_v2.xlsx";

function toPacotePaths(pilot) {
  const { excelRegional: _excel, ...rest } = pilot;
  return rest;
}

async function main() {
  const inicio = Date.now();
  const paths = toPacotePaths(resolvePilotFilePaths(REGIONAL, DATA_REF));
  for (const [k, v] of Object.entries(paths)) {
    if (!fs.existsSync(v)) throw new Error(`Fonte ausente (${k}): ${v}`);
  }

  console.log(`[ui-export-test] Motor ${REGIONAL}/${DATA_REF}…`);
  const motor = await executarMotorRegional({ regional: REGIONAL, dataReferencia: DATA_REF, paths });
  if (!motor.aprovado) throw new Error(motor.bloqueioMotivo ?? "Motor reprovado");

  const lojaSet = new Set(LOJAS);
  const porLoja = new Map();
  for (const item of motor.consolidado.itens) {
    if (!lojaSet.has(item.loja)) continue;
    if (!porLoja.has(item.loja)) porLoja.set(item.loja, []);
    porLoja.get(item.loja).push(item);
  }

  const linhas = [];
  const camposAusentesSet = new Set();
  const chavesOf = new Set(chavesOficiais.chaves);

  for (const loja of LOJAS) {
    const itens = porLoja.get(loja) ?? [];
    const gestaoGen = gerarGestaoLoja(itens, {
      regional: REGIONAL,
      bandeira: BANDEIRA,
      loja,
      dataReferencia: DATA_REF,
      versao: 2,
    });
    const produtosRaw = gestaoGen.chunked && gestaoGen.partes
      ? gestaoGen.partes.flatMap((p) => p.produtos)
      : (gestaoGen.gestao.produtos ?? []);
    const produtos = normalizarProdutosGestaoExport(produtosRaw);

    const cdsJson = gerarCdsLoja(itens, { regional: REGIONAL, bandeira: BANDEIRA, loja, dataReferencia: DATA_REF });
    const cdsPorProduto = new Map(cdsJson.produtos.map((p) => [p.seqproduto, p.cds]));

    const mapped = mapearBaseRupturaHibrido({
      produtos,
      cdsPorProduto,
      bandeira: BANDEIRA,
      regional: REGIONAL,
      modoUniverso: "oficial_compativel",
    });
    linhas.push(...mapped.linhas);
    for (const c of mapped.camposAusentes) camposAusentesSet.add(c);
  }

  const filtradas = filtrarLinhasUniversoOficial(linhas, chavesOf);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const out = gerarBaseRupturaXlsx({
    outputDir: OUT_DIR,
    filename: OUT_FILE,
    linhas: filtradas,
    resumo: {
      regional: REGIONAL,
      bandeira: BANDEIRA,
      competencia: "2026-07",
      dataReferencia: DATA_REF,
      pacoteId: "ui-export-test",
      execucaoMotorId: null,
      versao: 2,
      hashMetadados: null,
      hashConteudo: null,
      arquivosEncontrados: 0,
      produtosProcessados: filtradas.length,
      cdsProcessados: 0,
      quantidadeLinhasBase: filtradas.length,
      inicio: new Date(inicio).toISOString(),
      fim: new Date().toISOString(),
      duracaoMs: Date.now() - inicio,
      status: "ui_export_test",
      avisos: [],
      erros: [],
      camposAusentes: [...camposAusentesSet],
      modoUniverso: "oficial_compativel",
      linhasUniversoIntegral: linhas.length,
      linhasUniversoOficial: filtradas.length,
    },
  });

  console.log(JSON.stringify({ caminho: out.caminho, linhas: filtradas.length, linhasIntegral: linhas.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
