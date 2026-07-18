export type {
  ConsolidadoCdsLegadoAdapterEntrada,
  ConsolidadoCdsLegadoCampos,
  ConsolidadoCdsLegadoCentralizacao,
} from "./consolidadoCdsLegadoAdapter.ts";
export { adaptarCdsLegadoCentralizacao, adaptarCdsLegadoFlat } from "./consolidadoCdsLegadoAdapter.ts";

export {
  ALERTAS_CDS_CRITICOS,
  ALERTAS_CDS_OPCIONAIS,
  alertaCd,
  temAlertaCdCritico,
  temCodigoFisicoAusente,
} from "./consolidacaoCdsDiagnostics.ts";

export {
  acumularMetricasCdsProduto,
  criarMetricasCdsVazias,
  finalizarMetricasCds,
  posicoesNaoContiguas,
} from "./consolidacaoCdsMetrics.ts";

export type { MotorBlocoCdsComplementar, ConsolidarCdsProdutoParams, ConsolidarCdsProdutoResultado } from "./consolidarCdsProduto.ts";
export { consolidarCdsProduto } from "./consolidarCdsProduto.ts";
