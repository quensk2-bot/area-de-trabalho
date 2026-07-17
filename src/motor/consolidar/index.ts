export type {
  MotorConsolidacaoContexto,
  MotorConsolidacaoEntrada,
  MotorConsolidacaoErro,
  MotorConsolidacaoIndexes,
  MotorConsolidacaoLoteContexto,
  MotorConsolidacaoMetricas,
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
  joinCd5,
  joinComprador,
  joinInventario,
  joinOrdemCd,
  joinRede,
  joinValidacao,
} from "./consolidacaoJoins.ts";

export { consolidarProdutoLoja } from "./consolidarProdutoLoja.ts";
export { consolidarLote, ordenarProdutos } from "./consolidarLote.ts";
