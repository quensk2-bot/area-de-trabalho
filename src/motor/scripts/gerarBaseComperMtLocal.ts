/**
 * Gera BASE Ruptura MT/COMPER localmente — sem Supabase/PostgreSQL.
 * Saída: src/motor/.tmp/hibrido/MT/COMPER/
 */
import fs from "node:fs";
import path from "node:path";
import { resolvePilotFilePaths } from "../pilot/pilotFilePaths.ts";
import type { PacoteMotorFilePaths } from "../pacote/pacoteFilePaths.ts";
import { executarMotorRegional } from "../pacote/motorRegionalRunner.ts";
import {
  gerarBaseRupturaCsv,
  gerarBaseRupturaXlsx,
  mapearBaseRuptura,
  nomeArquivoBaseRuptura,
  validarBaseRuptura,
} from "../export/baseRuptura/index.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";

const LOJAS_COMPER_MT = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
const REGIONAL = "MT";
const DATA_REF = "2026-07-13";
const OUTPUT_BASE = path.join(process.cwd(), "src", "motor", ".tmp", "hibrido", "MT", "COMPER");

function toPacotePaths(pilot: ReturnType<typeof resolvePilotFilePaths>): PacoteMotorFilePaths {
  const { excelRegional: _excel, ...rest } = pilot;
  return rest;
}

function escreverJsonl(caminho: string, itens: MotorProdutoLojaConsolidado[]): void {
  const dir = path.dirname(caminho);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stream = fs.createWriteStream(caminho, { encoding: "utf8" });
  for (const item of itens) stream.write(JSON.stringify(item) + "\n");
  stream.end();
}

async function main(): Promise<void> {
  const inicio = Date.now();
  const paths = toPacotePaths(resolvePilotFilePaths(REGIONAL, DATA_REF));
  for (const [k, v] of Object.entries(paths)) {
    if (!fs.existsSync(v)) throw new Error(`Fonte ausente (${k}): ${v}`);
  }

  console.log(`[gerarBaseComperMt] Motor regional ${REGIONAL} / ${DATA_REF}…`);
  const motor = await executarMotorRegional({ regional: REGIONAL, dataReferencia: DATA_REF, paths });

  if (!motor.aprovado) {
    console.error("Motor reprovado:", motor.bloqueioMotivo);
    process.exit(1);
  }

  const lojaSet = new Set(LOJAS_COMPER_MT);
  const itensComper = motor.consolidado.itens.filter((i) => lojaSet.has(i.loja));
  const lojasEncontradas = [...new Set(itensComper.map((i) => i.loja))].sort((a, b) => a - b);

  console.log(
    `[gerarBaseComperMt] Consolidado total=${motor.consolidado.itens.length}, COMPER MT=${itensComper.length}, lojas=${lojasEncontradas.join(",")}`,
  );

  const faltantes = LOJAS_COMPER_MT.filter((l) => !lojasEncontradas.includes(l));
  if (faltantes.length > 0) {
    console.warn(`[gerarBaseComperMt] Lojas sem dados: ${faltantes.join(", ")}`);
  }

  const { linhas, camposAusentes } = mapearBaseRuptura(itensComper);
  const valBase = validarBaseRuptura(linhas);
  if (!valBase.valido) {
    console.error("BASE inválida:", valBase.erros.join("; "));
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_BASE)) fs.mkdirSync(OUTPUT_BASE, { recursive: true });

  const bandeira = itensComper.find((i) => i.bandeira)?.bandeira ?? "Comper MT";
  const nomeXlsx = nomeArquivoBaseRuptura({ regional: REGIONAL, bandeira, dataReferencia: DATA_REF, extensao: "xlsx" });
  const nomeCsv = nomeArquivoBaseRuptura({ regional: REGIONAL, bandeira, dataReferencia: DATA_REF, extensao: "csv" });

  const xlsx = gerarBaseRupturaXlsx({
    outputDir: OUTPUT_BASE,
    filename: nomeXlsx,
    linhas,
    resumo: {
      regional: REGIONAL,
      bandeira,
      competencia: "2026-07",
      dataReferencia: DATA_REF,
      pacoteId: "local-comper-mt",
      execucaoMotorId: null,
      versao: null,
      hashMetadados: null,
      hashConteudo: null,
      arquivosEncontrados: 11,
      produtosProcessados: itensComper.length,
      cdsProcessados: itensComper.reduce((s, i) => s + (i.cds?.length ?? 0), 0),
      quantidadeLinhasBase: linhas.length,
      inicio: new Date(inicio).toISOString(),
      fim: new Date().toISOString(),
      duracaoMs: Date.now() - inicio,
      status: "concluido",
      avisos: camposAusentes.length ? [`${camposAusentes.length} colunas ausentes no V7`] : [],
      erros: [],
      camposAusentes,
    },
  });

  const csv = gerarBaseRupturaCsv({ outputDir: OUTPUT_BASE, filename: nomeCsv, linhas });

  const consolidadoDir = path.join(OUTPUT_BASE, "consolidados");
  const porLoja: Record<number, number> = {};
  for (const loja of lojasEncontradas) {
    const subset = itensComper.filter((i) => i.loja === loja);
    porLoja[loja] = subset.length;
    escreverJsonl(path.join(consolidadoDir, `consolidado_loja_${loja}.jsonl`), subset);
  }

  const relatorio = {
    regional: REGIONAL,
    bandeira,
    dataReferencia: DATA_REF,
    lojasEsperadas: LOJAS_COMPER_MT.length,
    lojasEncontradas: lojasEncontradas.length,
    lojasFaltantes: faltantes,
    produtosComper: itensComper.length,
    produtosPorLoja: porLoja,
    caminhoXlsx: xlsx.caminho,
    caminhoCsv: csv,
    linhasBase: linhas.length,
    duracaoMs: Date.now() - inicio,
    memoria: motor.metricas.memoria,
    metricas: motor.metricas,
  };

  fs.writeFileSync(path.join(OUTPUT_BASE, "relatorio_geracao.json"), JSON.stringify(relatorio, null, 2), "utf8");
  console.log(JSON.stringify(relatorio, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
