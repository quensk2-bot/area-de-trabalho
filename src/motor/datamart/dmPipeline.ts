import type { DmDiagnostico } from "./dmDiagnostics.ts";
import { gerarDiagnosticoDm } from "./dmDiagnostics.ts";
import { exportarLote } from "./dmExporter.ts";
import type { DmMetricas } from "./dmMetrics.ts";
import { calcularMetricasDm } from "./dmMetrics.ts";
import { mapearLoteParaDmProdutoLoja } from "./dmProdutoLoja.ts";
import { mapearLoteParaDmProdutoLojaCd } from "./dmProdutoLojaCd.ts";
import type { DmLote, DmPipelineEntrada, DmValidacaoResultado } from "./dmTypes.ts";
import { validarPipeline } from "./dmValidator.ts";

export type DmPipelineResultado = {
  lote: DmLote;
  validacao: DmValidacaoResultado;
  metricas: DmMetricas;
  diagnostico: DmDiagnostico;
  exportacao: import("./dmTypes.ts").DmExportacaoProduto[];
  duracaoMs: number;
};

/**
 * Pipeline de publicação Data Mart — sem banco, sem recálculo.
 *
 * Consolidado → Validação → Mapeamento → Data Mart → Exportador
 */
export function executarPipelineDm(entrada: DmPipelineEntrada): DmPipelineResultado {
  const inicio = Date.now();
  const { consolidado, incluirExportacao = true, catalogoPorPosicao } = entrada;

  const produtos = mapearLoteParaDmProdutoLoja(consolidado);
  const cds = mapearLoteParaDmProdutoLojaCd(consolidado);
  const lote = { produtos, cds };

  const validacao = validarPipeline(consolidado, lote);
  const duracaoMs = Date.now() - inicio;
  const metricas = calcularMetricasDm(lote, duracaoMs);
  const diagnostico = gerarDiagnosticoDm(lote, consolidado);
  const exportacao = incluirExportacao ? exportarLote(consolidado, catalogoPorPosicao) : [];

  return {
    lote,
    validacao,
    metricas,
    diagnostico,
    exportacao,
    duracaoMs,
  };
}
