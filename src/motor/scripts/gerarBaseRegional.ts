/**
 * Gera BASE Ruptura para qualquer regional+bandeira — sem Supabase/PostgreSQL.
 * Uso: npm run motor:gerar-regional -- --regional MT --bandeira COMPER --data-referencia 2026-07-13 [--dry-run]
 *
 * A lista de lojas é resolvida dinamicamente do bandeira.csv.
 * Nenhuma loja, regional, bandeira ou data fixa no código.
 */
import "dotenv/config";
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
import { resolveLojasFromBandeiraCsv } from "../catalog/resolverLojas.ts";

function parseArgv(): { regional: string; bandeira: string; dataReferencia: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let regional = "";
  let bandeira = "";
  let dataReferencia = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--regional") {
      regional = args[++i]?.trim().toUpperCase() ?? "";
    } else if (args[i] === "--bandeira") {
      bandeira = args[++i]?.trim().toUpperCase() ?? "";
    } else if (args[i] === "--data-referencia") {
      dataReferencia = args[++i]?.trim() ?? "";
    }
  }

  if (!regional) {
    console.error("ERRO: --regional é obrigatório. Use: --regional MT");
    process.exit(1);
  }
  if (!bandeira) {
    console.error("ERRO: --bandeira é obrigatório. Use: --bandeira COMPER");
    process.exit(1);
  }
  if (!dataReferencia) {
    console.error("ERRO: --data-referencia é obrigatório. Use: --data-referencia 2026-07-13");
    process.exit(1);
  }

  return { regional, bandeira, dataReferencia, dryRun };
}

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
  const { regional, bandeira, dataReferencia, dryRun } = parseArgv();
  const inicio = Date.now();

  // 1. Resolver lojas do catálogo (bandeira.csv)
  const lojasEsperadas = await resolveLojasFromBandeiraCsv(regional, bandeira);
  if (lojasEsperadas.length === 0) {
    console.error(`❌ Nenhuma loja encontrada para ${regional}/${bandeira} no bandeira.csv.`);
    process.exit(1);
  }

  console.log(`[gerarBaseRegional] Regional: ${regional} / ${dataReferencia}`);
  console.log(`[gerarBaseRegional] Bandeira: ${bandeira}`);
  console.log(`[gerarBaseRegional] Lojas esperadas: ${lojasEsperadas.length} → ${lojasEsperadas.join(", ")}`);

  // 2. Executar motor
  const paths = toPacotePaths(resolvePilotFilePaths(regional, dataReferencia));
  for (const [k, v] of Object.entries(paths)) {
    if (!fs.existsSync(v)) throw new Error(`Fonte ausente (${k}): ${v}`);
  }

  if (!dryRun) {
    console.log(`[gerarBaseRegional] Motor ${regional} / ${dataReferencia}…`);
  }

  const motor = await executarMotorRegional({ regional, dataReferencia, paths });
  if (!motor.aprovado) {
    console.error("❌ Motor reprovado:", motor.bloqueioMotivo);
    process.exit(1);
  }

  // 3. Filtrar pelas lojas da bandeira
  const lojaSet = new Set(lojasEsperadas);
  const itensBandeira = motor.consolidado.itens.filter((i) => lojaSet.has(i.loja));
  const lojasEncontradas = [...new Set(itensBandeira.map((i) => i.loja))].sort((a, b) => a - b);
  const faltantes = lojasEsperadas.filter((l) => !lojasEncontradas.includes(l));

  console.log(
    `[gerarBaseRegional] Consolidado total=${motor.consolidado.itens.length}, ${bandeira}=${itensBandeira.length}, lojas=${lojasEncontradas.join(",")}`,
  );

  if (faltantes.length > 0) {
    console.error(`❌ ${faltantes.length} loja(s) esperada(s) sem dados: ${faltantes.join(", ")}`);
    console.error(`   Encontradas ${lojasEncontradas.length}/${lojasEsperadas.length}.`);
    console.error(`   Abortando — não gerar pacote parcial.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n✅ Dry-run concluído — nenhum consolidado gerado.`);
    console.log(`   Lojas encontradas: ${lojasEncontradas.length}/${lojasEsperadas.length}`);
    console.log(`   Produtos: ${itensBandeira.length}`);
    return;
  }

  // 4. Mapear base ruptura
  const { linhas, camposAusentes } = mapearBaseRuptura(itensBandeira);
  const valBase = validarBaseRuptura(linhas);
  if (!valBase.valido) {
    console.error("❌ BASE inválida:", valBase.erros.join("; "));
    process.exit(1);
  }

  // 5. Diretório de saída dinâmico
  const outputBase = path.join(process.cwd(), "src", "motor", ".tmp", "hibrido", regional, bandeira);
  if (!fs.existsSync(outputBase)) fs.mkdirSync(outputBase, { recursive: true });

  const bandeiraLabel = itensBandeira.find((i) => i.bandeira)?.bandeira ?? bandeira;
  const competencia = dataReferencia.slice(0, 7);
  const nomeXlsx = nomeArquivoBaseRuptura({ regional, bandeira: bandeiraLabel, dataReferencia, extensao: "xlsx" });
  const nomeCsv = nomeArquivoBaseRuptura({ regional, bandeira: bandeiraLabel, dataReferencia, extensao: "csv" });

  const xlsx = gerarBaseRupturaXlsx({
    outputDir: outputBase,
    filename: nomeXlsx,
    linhas,
    resumo: {
      regional,
      bandeira: bandeiraLabel,
      competencia,
      dataReferencia,
      pacoteId: `local-${regional.toLowerCase()}-${bandeira.toLowerCase()}`,
      execucaoMotorId: null,
      versao: null,
      hashMetadados: null,
      hashConteudo: null,
      arquivosEncontrados: 11,
      produtosProcessados: itensBandeira.length,
      cdsProcessados: itensBandeira.reduce((s, i) => s + (i.cds?.length ?? 0), 0),
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

  const csv = gerarBaseRupturaCsv({ outputDir: outputBase, filename: nomeCsv, linhas });

  // 6. Gerar consolidados por loja
  const consolidadoDir = path.join(outputBase, "consolidados");
  const porLoja: Record<number, number> = {};
  for (const loja of lojasEncontradas) {
    const subset = itensBandeira.filter((i) => i.loja === loja);
    porLoja[loja] = subset.length;
    escreverJsonl(path.join(consolidadoDir, `consolidado_loja_${loja}.jsonl`), subset);
  }

  const relatorio = {
    regional,
    bandeira: bandeiraLabel,
    dataReferencia,
    lojasEsperadas: lojasEsperadas.length,
    lojasEncontradas: lojasEncontradas.length,
    lojasFaltantes: faltantes,
    produtosBandeira: itensBandeira.length,
    produtosPorLoja: porLoja,
    caminhoXlsx: xlsx.caminho,
    caminhoCsv: csv,
    linhasBase: linhas.length,
    duracaoMs: Date.now() - inicio,
    memoria: motor.metricas.memoria,
    metricas: motor.metricas,
  };

  fs.writeFileSync(path.join(outputBase, "relatorio_geracao.json"), JSON.stringify(relatorio, null, 2), "utf8");
  console.log(JSON.stringify(relatorio, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
