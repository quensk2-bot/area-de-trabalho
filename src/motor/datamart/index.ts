export type {
  DmCampoNulo,
  DmDiagnostico,
} from "./dmDiagnostics.ts";
export { formatarDiagnosticoTexto, gerarDiagnosticoDm } from "./dmDiagnostics.ts";

export {
  exportarAuditoria,
  exportarBaseCentral,
  exportarLayout5Cds,
  exportarLayout8Cds,
  exportarLayoutNCds,
  exportarLegadoFlatSomenteExportacao,
  exportarLote,
  exportarProdutoCompleto,
} from "./dmExporter.ts";

export type {
  DmMetricas,
  DmMetricasCampos,
  DmMetricasCds,
  DmMetricasProdutos,
  DmMetricasQualidade,
} from "./dmMetrics.ts";
export { calcularMetricasDm } from "./dmMetrics.ts";

export {
  chaveDmCd,
  chaveDmProdutoLoja,
  chaveDmTexto,
  DM_CAMPOS_PRODUTO_LOJA,
} from "./dmMapping.ts";
export type { DmCampoProdutoLoja } from "./dmMapping.ts";

export { executarPipelineDm } from "./dmPipeline.ts";
export type { DmPipelineResultado } from "./dmPipeline.ts";

export { mapearConsolidadoParaDmProdutoLoja, mapearLoteParaDmProdutoLoja } from "./dmProdutoLoja.ts";
export { mapearCdsParaDmProdutoLojaCd, mapearLoteParaDmProdutoLojaCd } from "./dmProdutoLojaCd.ts";

export type {
  DmCampoSchema,
  DmPersistencia,
  DmTipoCampo,
} from "./dmSchemas.ts";
export {
  camposPersistiveis,
  DM_SCHEMA_PRODUTO_LOJA,
  DM_SCHEMA_PRODUTO_LOJA_CD,
  obterSchemaPorTabela,
} from "./dmSchemas.ts";

export type {
  DmChaveProdutoLoja,
  DmExportacaoProduto,
  DmLote,
  DmPipelineEntrada,
  DmProdutoLoja,
  DmProdutoLojaCd,
  DmValidacaoItem,
  DmValidacaoResultado,
} from "./dmTypes.ts";

export { validarEntradaConsolidado, validarLoteDm, validarPipeline } from "./dmValidator.ts";
