import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { executarMotorParse } from "../services/motorParseService.ts";
import {
  createSyntheticGrupo1Readable,
  runTxtStreamPipelineFromReadable,
} from "../parsers/streaming/index.ts";

const RUPTURA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../importar/RUPTURA");

type BenchmarkRow = {
  id: string;
  modo: "sem_retencao" | "sintetico_pipeline";
  linhasAlvo: number | "completo";
  duracaoMs: number;
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  linhasPorSegundo: number;
  bytesLidos: number;
  totalErros: number;
  errosArmazenados: number;
  errosTruncados: boolean;
  motivoEncerramento: string;
  memoria: {
    heapUsedMbPicoAprox: number;
    rssMbPicoAprox: number;
    externalMbPicoAprox: number;
    nota: string;
  };
};

async function benchSynthetic(id: string, linhas: number): Promise<BenchmarkRow> {
  const source = createSyntheticGrupo1Readable(linhas);
  const inicio = Date.now();
  const r = await runTxtStreamPipelineFromReadable(source, {
    colunasEsperadas: 57,
    maxErrosEmMemoria: 1000,
  });
  const duracaoMs = Date.now() - inicio;
  return {
    id,
    modo: "sintetico_pipeline",
    linhasAlvo: linhas,
    duracaoMs,
    linhasLidas: r.linhasLidas,
    linhasValidas: r.linhasValidas,
    linhasInvalidas: r.linhasInvalidas,
    linhasPorSegundo: duracaoMs > 0 ? Math.round((r.linhasLidas / duracaoMs) * 1000) : r.linhasLidas,
    bytesLidos: r.bytesLidos,
    totalErros: r.totalErros,
    errosArmazenados: r.erros.length,
    errosTruncados: r.errosTruncados,
    motivoEncerramento: r.motivoEncerramento,
    memoria: {
      heapUsedMbPicoAprox: r.memoria.heapUsedMbPicoAprox,
      rssMbPicoAprox: r.memoria.rssMbPicoAprox,
      externalMbPicoAprox: r.memoria.externalMbPicoAprox,
      nota: r.memoria.nota,
    },
  };
}

async function benchArquivoReal(id: string, arquivo: string, tipo: "grupo_ruptura_1" | "grupo_cds_2"): Promise<BenchmarkRow> {
  const caminho = path.join(RUPTURA_DIR, arquivo);
  if (!fs.existsSync(caminho)) {
    throw new Error(`Arquivo não encontrado: ${caminho}`);
  }
  const inicio = Date.now();
  const resultado = await executarMotorParse({
    caminho,
    tipo,
    regional: "COMPER MT",
    dataReferencia: "2026-03-26",
    dryRun: true,
    semRetencao: true,
    maxErrosEmMemoria: 1000,
  });
  const duracaoMs = Date.now() - inicio;
  const m = resultado.metricas;
  return {
    id,
    modo: "sem_retencao",
    linhasAlvo: "completo",
    duracaoMs,
    linhasLidas: m.linhasLidas,
    linhasValidas: m.linhasValidas,
    linhasInvalidas: m.linhasInvalidas,
    linhasPorSegundo: m.linhasPorSegundo,
    bytesLidos: m.bytesLidos ?? 0,
    totalErros: m.totalErros ?? resultado.erros.length,
    errosArmazenados: m.errosArmazenados ?? resultado.erros.length,
    errosTruncados: m.errosTruncados ?? false,
    motivoEncerramento: m.motivoEncerramento ?? "eof",
    memoria: {
      heapUsedMbPicoAprox: m.memoria?.heapUsedMbPicoAprox ?? 0,
      rssMbPicoAprox: m.memoria?.rssMbPicoAprox ?? 0,
      externalMbPicoAprox: m.memoria?.externalMbPicoAprox ?? 0,
      nota: m.memoria?.nota ?? "pico aproximado",
    },
  };
}

async function main(): Promise<void> {
  const resultados: BenchmarkRow[] = [];

  console.log("=== Benchmark Streaming 2E.1 ===\n");

  const a = await benchSynthetic("A_1k", 1_000);
  resultados.push(a);
  console.log(JSON.stringify(a));

  const b = await benchSynthetic("B_10k", 10_000);
  resultados.push(b);
  console.log(JSON.stringify(b));

  const c = await benchSynthetic("C_100k", 100_000);
  resultados.push(c);
  console.log(JSON.stringify(c));

  const ratio = c.memoria.heapUsedMbPicoAprox / Math.max(a.memoria.heapUsedMbPicoAprox, 0.01);
  console.log(`\nRatio memória C/A (heapUsed pico aprox): ${ratio.toFixed(2)}x`);

  const seguro = ratio < 10 && c.motivoEncerramento === "eof";

  if (seguro && fs.existsSync(path.join(RUPTURA_DIR, "1º Grupo de Ruptura.txt"))) {
    console.log("\n--- D: 1º Grupo completo ---");
    const d = await benchArquivoReal("D_grupo1_completo", "1º Grupo de Ruptura.txt", "grupo_ruptura_1");
    resultados.push(d);
    console.log(JSON.stringify(d));

    if (d.motivoEncerramento === "eof" && fs.existsSync(path.join(RUPTURA_DIR, "2º Grupo de Ruptura.txt"))) {
      console.log("\n--- E: 2º Grupo completo ---");
      const e = await benchArquivoReal("E_grupo2_completo", "2º Grupo de Ruptura.txt", "grupo_cds_2");
      resultados.push(e);
      console.log(JSON.stringify(e));
    }
  } else {
    console.log("\n[D/E] Arquivo completo omitido — critério de segurança não atendido ou arquivo ausente.");
  }

  console.log("\n=== Resumo ===");
  console.log(JSON.stringify(resultados, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
