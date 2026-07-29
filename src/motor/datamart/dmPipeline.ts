import type { DmDiagnostico } from "./dmDiagnostics.ts";
import { gerarDiagnosticoDm } from "./dmDiagnostics.ts";
import { exportarLote } from "./dmExporter.ts";
import type { DmMetricas } from "./dmMetrics.ts";
import { calcularMetricasDm } from "./dmMetrics.ts";
import { mapearLoteParaDmProdutoLoja } from "./dmProdutoLoja.ts";
import { mapearLoteParaDmProdutoLojaCd } from "./dmProdutoLojaCd.ts";
import type { DmLote, DmPipelineEntrada, DmValidacaoResultado } from "./dmTypes.ts";
import { validarPipeline, validarPipelineProducao } from "./dmValidator.ts";

export type DmPipelineResultado = {
  lote: DmLote;
  validacao: DmValidacaoResultado;
  metricas: DmMetricas;
  diagnostico: DmDiagnostico;
  exportacao: import("./dmTypes.ts").DmExportacaoProduto[];
  duracaoMs: number;
  timingMs?: {
    mapProdutos: number;
    mapCds: number;
    validacao: number;
    metricas: number;
    diagnostico: number;
    exportacao: number;
    total: number;
  };
};

/**
 * Pipeline de publicação Data Mart — sem banco, sem recálculo.
 *
 * Consolidado → Validação → Mapeamento → Data Mart → Exportador
 */
export function executarPipelineDm(entrada: DmPipelineEntrada): DmPipelineResultado {
  const inicioTotal = Date.now();
  const {
    consolidado,
    incluirExportacao = true,
    incluirDiagnostico = true,
    incluirValidacaoCompleta = true,
    catalogoPorPosicao,
    onProgresso,
  } = entrada;

  let t0 = Date.now();
  onProgresso?.("dm_map_produtos");
  const produtos = mapearLoteParaDmProdutoLoja(consolidado);
  const mapProdutos = Date.now() - t0;

  t0 = Date.now();
  onProgresso?.("dm_map_cds", { produtos: produtos.length });
  const cds = mapearLoteParaDmProdutoLojaCd(consolidado);
  const mapCds = Date.now() - t0;

  const lote = { produtos, cds };

  t0 = Date.now();
  onProgresso?.("dm_validacao", { produtos: produtos.length, cds: cds.length, modo: incluirValidacaoCompleta ? "completa" : "producao" });
  const validacao = incluirValidacaoCompleta
    ? validarPipeline(consolidado, lote)
    : validarPipelineProducao(lote);
  const validacaoMs = Date.now() - t0;

  t0 = Date.now();
  onProgresso?.("dm_metricas");
  const metricas = calcularMetricasDm(lote, Date.now() - inicioTotal);
  const metricasMs = Date.now() - t0;

  t0 = Date.now();
  onProgresso?.("dm_diagnostico", { incluirDiagnostico });
  const diagnostico = incluirDiagnostico ? gerarDiagnosticoDm(lote, consolidado) : {
    camposNulos: [],
    camposSemOrigem: [],
    qualidadePorProduto: [],
    alertasConsolidado: [],
    duplicidades: [],
    produtosPorQuantidadeCds: {},
    resumo: {
      totalProdutos: lote.produtos.length,
      totalLinhasCd: lote.cds.length,
      produtosComAlertas: 0,
      produtosComErros: 0,
      produtosSemCds: 0,
    },
  };
  const diagnosticoMs = Date.now() - t0;

  t0 = Date.now();
  const exportacao = incluirExportacao ? exportarLote(consolidado, catalogoPorPosicao) : [];
  const exportacaoMs = Date.now() - t0;

  const duracaoMs = Date.now() - inicioTotal;

  return {
    lote,
    validacao,
    metricas,
    diagnostico,
    exportacao,
    duracaoMs,
    timingMs: {
      mapProdutos,
      mapCds,
      validacao: validacaoMs,
      metricas: metricasMs,
      diagnostico: diagnosticoMs,
      exportacao: exportacaoMs,
      total: duracaoMs,
    },
  };
}
