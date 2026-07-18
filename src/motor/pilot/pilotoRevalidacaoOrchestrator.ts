import fs from "fs";
import path from "path";
import { defaultPilotOutputDir, executarPiloto } from "./index.ts";
import { executarRevalidacao } from "./revalidationRunner.ts";

export type PilotoRevalidacaoOpcoes = {
  regional: string;
  loja: number;
  dataReferencia: string;
  sampleSize?: number;
  excelPath?: string;
  outputPilotoDir?: string;
  outputRevalidacaoDir?: string;
  limparTemporarios?: boolean;
};

export type PilotoRevalidacaoResultado = {
  piloto: Awaited<ReturnType<typeof executarPiloto>>;
  revalidacao: Awaited<ReturnType<typeof executarRevalidacao>>;
  consolidadoPath: string;
  outputPilotoDir: string;
  outputRevalidacaoDir: string;
  duracaoTotalMs: number;
};

const EXCEL_CONFERENCIA_PADRAO =
  "C:\\area-de-trabalho-v7\\importar\\RUPTURA\\RESULTADO\\ARQUIVO CONFERENCIA RESULTADO.xlsx";

export async function executarPilotoRevalidacao(
  opcoes: PilotoRevalidacaoOpcoes,
): Promise<PilotoRevalidacaoResultado> {
  const inicio = Date.now();
  const outputPilotoDir =
    opcoes.outputPilotoDir ?? defaultPilotOutputDir(opcoes.regional, opcoes.dataReferencia, opcoes.loja);
  const outputRevalidacaoDir =
    opcoes.outputRevalidacaoDir ??
    path.join(outputPilotoDir, "revalidacao-etapa-d");
  const excelPath = opcoes.excelPath ?? EXCEL_CONFERENCIA_PADRAO;

  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel de conferência ausente: ${excelPath}`);
  }

  const piloto = await executarPiloto({
    regional: opcoes.regional,
    loja: opcoes.loja,
    dataReferencia: opcoes.dataReferencia,
    sampleSize: opcoes.sampleSize ?? 300,
    outputDir: outputPilotoDir,
    modoCompleto: true,
  });

  const consolidadoPath = path.join(outputPilotoDir, `consolidado_loja_${opcoes.loja}.jsonl`);
  const consolidadoLegado = path.join(outputPilotoDir, "consolidado_loja_73.jsonl");
  const consolidadoUsado = fs.existsSync(consolidadoPath)
    ? consolidadoPath
    : fs.existsSync(consolidadoLegado)
      ? consolidadoLegado
      : consolidadoPath;

  const revalidacao = await executarRevalidacao({
    regional: opcoes.regional,
    loja: opcoes.loja,
    dataReferencia: opcoes.dataReferencia,
    consolidadoPath: consolidadoUsado,
    outputDir: outputRevalidacaoDir,
    excelPath,
    formatoSaida: "etapa-d",
  });

  if (opcoes.limparTemporarios) {
    for (const file of ["amostra_300.jsonl", "divergencias.csv", "alertas.json"]) {
      const target = path.join(outputPilotoDir, file);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }

  return {
    piloto,
    revalidacao,
    consolidadoPath: consolidadoUsado,
    outputPilotoDir,
    outputRevalidacaoDir,
    duracaoTotalMs: Date.now() - inicio,
  };
}
