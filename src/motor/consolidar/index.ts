export type {
  MotorBlocoCdsComplementarEntrada,
  MotorConsolidacaoContexto,
  MotorConsolidacaoEntrada,
  MotorConsolidacaoErro,
  MotorConsolidacaoIndexes,
  MotorConsolidacaoLoteContexto,
  MotorConsolidacaoMetricas,
  MotorConsolidacaoMetricasCds,
  MotorConsolidacaoResultado,
  MotorDuplicidadeDiagnostico,
  MotorJoinDiagnostico,
  MotorProdutoLojaConsolidado,
  MotorQualidadeDados,
  MotorStatusOperacional,
} from "./consolidacaoTypes.ts";

export {
  chaveCompradorHierarquia,
  chaveConsolidacao,
  chaveLojaProduto,
  chaveRegionalLojaProduto,
  chaveRegionalProduto,
  parseChaveConsolidacao,
  validarChaveConsolidacao,
} from "./consolidacaoKeys.ts";

export {
  construirIndexes,
  contarDuplicidadesCatalogo,
  detectarDuplicidadesBase,
} from "./consolidacaoIndexes.ts";

export {
  ALERTAS_CRITICOS,
  ALERTAS_OPCIONAIS,
  calcularQualidadeDados,
  calcularStatusOperacional,
  criarDuplicidadeDiagnostico,
  criarJoinDiagnostico,
  deduplicarAlertas,
} from "./consolidacaoDiagnostics.ts";

export { criarMetricasVazias, finalizarMetricas, incrementarMetrica } from "./consolidacaoMetrics.ts";

export {
  joinBandeira,
  joinBre,
  joinBlocosCdsComplementares,
  joinCd5,
  joinComprador,
  joinInventario,
  joinOrdemCd,
  joinRede,
  joinValidacao,
} from "./consolidacaoJoins.ts";

export {
  adaptarCdsLegadoCentralizacao,
  adaptarCdsLegadoFlat,
  consolidarCdsProduto,
} from "./cds/index.ts";
export type { MotorBlocoCdsComplementar, ConsolidarCdsProdutoResultado } from "./cds/index.ts";

export { consolidarProdutoLoja } from "./consolidarProdutoLoja.ts";
export { consolidarLote, ordenarProdutos } from "./consolidarLote.ts";
