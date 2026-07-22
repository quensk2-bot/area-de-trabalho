#!/usr/bin/env node
/**
 * Gera export de teste AJUSTE-01 a partir do Motor consolidado (MT/COMPER).
 * Saída: importar/RUPTURA/VALIDAÇÃO/IMPORTADO_2_AJUSTE-01.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePilotFilePaths } from "../src/motor/pilot/pilotFilePaths.ts";
import { executarMotorRegional } from "../src/motor/pacote/motorRegionalRunner.ts";
import {
  gerarBaseRupturaXlsx,
  mapearBaseRuptura,
  validarBaseRuptura,
} from "../src/motor/export/baseRuptura/index.ts";
import {
  filtrarLinhasUniversoOficial,
} from "../src/ruptura-v7/services/hibrido/mapearBaseRupturaHibrido.ts";
import chavesOficiais from "../architecture/hibrido-v7/chaves-oficiais-conferencia.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOJAS_COMPER_MT = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
const REGIONAL = "MT";
const DATA_REF = "2026-07-13";
const OUT_DIR = "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO";
const SUFIXO = process.argv[2] ?? "AJUSTE-01";

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

  console.log(`[ajuste-export] Motor ${REGIONAL} / ${DATA_REF}…`);
  const motor = await executarMotorRegional({ regional: REGIONAL, dataReferencia: DATA_REF, paths });
  if (!motor.aprovado) throw new Error(motor.bloqueioMotivo ?? "Motor reprovado");

  const lojaSet = new Set(LOJAS_COMPER_MT);
  const itensComper = motor.consolidado.itens.filter((i) => lojaSet.has(i.loja));
  console.log(`[ajuste-export] Consolidado COMPER MT: ${itensComper.length} produtos`);

  const { linhas, camposAusentes } = mapearBaseRuptura(itensComper, { regional: REGIONAL, modoUniverso: "integral" });
  const val = validarBaseRuptura(linhas);
  if (!val.valido) throw new Error(val.erros.join("; "));

  const chavesOf = new Set(chavesOficiais.chaves);
  const { linhas: linhasCompatRaw } = mapearBaseRuptura(itensComper, {
    regional: REGIONAL,
    modoUniverso: "oficial_compativel",
  });
  const linhasOficial = filtrarLinhasUniversoOficial(linhasCompatRaw, chavesOf);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const baseResumo = {
    regional: REGIONAL,
    bandeira: "COMPER",
    competencia: "2026-07",
    dataReferencia: DATA_REF,
    pacoteId: `ajuste-export-${SUFIXO}`,
    execucaoMotorId: null,
    versao: null,
    hashMetadados: null,
    hashConteudo: null,
    arquivosEncontrados: 11,
    produtosProcessados: 0,
    cdsProcessados: 0,
    quantidadeLinhasBase: 0,
    inicio: new Date(inicio).toISOString(),
    fim: new Date().toISOString(),
    duracaoMs: 0,
    status: "ajuste_export",
    avisos: [],
    erros: [],
    camposAusentes,
  };

  const integral = gerarBaseRupturaXlsx({
    outputDir: OUT_DIR,
    filename: `IMPORTADO_2_${SUFIXO}_V7_INTEGRAL.xlsx`,
    linhas,
    resumo: {
      ...baseResumo,
      produtosProcessados: linhas.length,
      quantidadeLinhasBase: linhas.length,
      modoUniverso: "integral",
      linhasUniversoIntegral: linhas.length,
      linhasUniversoOficial: linhasOficial.length,
      duracaoMs: Date.now() - inicio,
    },
  });

  const compat = gerarBaseRupturaXlsx({
    outputDir: OUT_DIR,
    filename: `IMPORTADO_2_${SUFIXO}.xlsx`,
    linhas: linhasOficial,
    resumo: {
      ...baseResumo,
      produtosProcessados: linhasOficial.length,
      quantidadeLinhasBase: linhasOficial.length,
      modoUniverso: "oficial_compativel",
      linhasUniversoIntegral: linhas.length,
      linhasUniversoOficial: linhasOficial.length,
      duracaoMs: Date.now() - inicio,
    },
  });

  console.log(JSON.stringify({ integral: integral.caminho, oficial_compativel: compat.caminho, linhasIntegral: linhas.length, linhasOficial: linhasOficial.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
