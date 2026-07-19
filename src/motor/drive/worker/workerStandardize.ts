import fs from "node:fs";
import path from "node:path";
import { executarPadronizacao } from "../../standardize/standardizeService.ts";
import type { MotorStandardizeTipo } from "../../standardize/standardizeTypes.ts";
import { TIPO_PADRONIZACAO } from "./workerContentValidator.ts";
import type { WorkerArquivoDb } from "./workerTypes.ts";

export type PadronizacaoResultado = {
  status: "sucesso" | "erro" | "ignorado";
  caminhoPadronizado: string | null;
  erro: string | null;
};

export function mapearTipoPadronizacao(tipoArquivo: string | null): MotorStandardizeTipo | null {
  if (!tipoArquivo) return null;
  return TIPO_PADRONIZACAO[tipoArquivo] ?? null;
}

export function padronizarArquivoWorker(input: {
  arquivo: WorkerArquivoDb;
  caminhoOriginal: string;
  outputDir: string;
  regional: string;
  dataReferencia: string;
  dryRun?: boolean;
}): PadronizacaoResultado {
  if (!input.arquivo.precisa_padronizacao) {
    return { status: "ignorado", caminhoPadronizado: null, erro: null };
  }

  const tipo = mapearTipoPadronizacao(input.arquivo.tipo_arquivo);
  if (!tipo) {
    return { status: "erro", caminhoPadronizado: null, erro: `Tipo sem mapeamento de padronização: ${input.arquivo.tipo_arquivo}` };
  }

  const statAntes = fs.statSync(input.caminhoOriginal);
  const mtimeAntes = statAntes.mtimeMs;

  try {
    const resultado = executarPadronizacao({
      caminho: input.caminhoOriginal,
      tipo,
      regional: input.regional,
      dataReferencia: input.dataReferencia,
      outputDir: input.outputDir,
      dryRun: input.dryRun ?? false,
      gerarReport: false,
    });

    const statDepois = fs.statSync(input.caminhoOriginal);
    if (statDepois.mtimeMs !== mtimeAntes || statDepois.size !== statAntes.size) {
      return { status: "erro", caminhoPadronizado: null, erro: "Original foi alterado — abortado" };
    }

    if (!resultado.sucesso) {
      return {
        status: "erro",
        caminhoPadronizado: null,
        erro: resultado.report.erros.join("; ") || "Padronização falhou",
      };
    }

    const caminhoPadronizado = resultado.report.arquivoPadraoGerado;
    if (caminhoPadronizado && !path.resolve(caminhoPadronizado).startsWith(path.resolve(input.outputDir))) {
      return { status: "erro", caminhoPadronizado: null, erro: "Saída fora do diretório permitido" };
    }

    return { status: "sucesso", caminhoPadronizado: caminhoPadronizado ?? null, erro: null };
  } catch (err) {
    return { status: "erro", caminhoPadronizado: null, erro: err instanceof Error ? err.message : String(err) };
  }
}
