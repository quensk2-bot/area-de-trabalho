export type {
  MotorDataMartLote,
  MotorV7Db,
  PersistenciaEntrada,
  PersistenciaMetricas,
  PersistenciaResultado,
  PersistenciaValidacaoResultado,
  DmProdutoLojaRowInsert,
  DmProdutoLojaCdRowInsert,
  ClassificacaoPrazoDb,
} from "./persistenciaTypes.ts";

export {
  mapearClassificacaoPrazoParaDb,
  mapearCrossDockingParaDb,
  mapearFlagCentralizacaoParaDb,
  mapearDmProdutoLojaParaRow,
  mapearDmProdutoLojaCdParaRow,
  mapearLoteProdutosParaRows,
} from "./persistenciaMapper.ts";

export {
  chaveProdutoTemporaria,
  mapearProdutoParaRpcJson,
  mapearCdParaRpcJson,
  montarPayloadRpc,
  type RpcProdutoJson,
  type RpcCdJson,
  type PersistirLoteMotorV1Payload,
} from "./persistenciaRpcPayload.ts";

export {
  persistirLoteMotorAtomico,
  PERSISTENCIA_PRODUCAO_USA_RPC,
  type PersistenciaAtomicaResultado,
  type PersistirLoteAtomicoOptions,
} from "./persistenciaAtomica.ts";

export { validarEntradaPersistencia, validarLotePersistencia } from "./persistenciaValidator.ts";

export { createMotorV7Db, isMotorV7DbConfigurado } from "./persistenciaDb.ts";

export {
  criarExecucaoMotor,
  atualizarExecucaoMotorStatus,
  buscarExecucaoPorHash,
  buscarExecucaoEmAndamento,
  obterProximaVersao,
  ativarExecucao,
  contarVersoesAtivas,
} from "./persistirExecucaoMotor.ts";

export {
  inserirProdutosLoja,
  indexarProdutosInseridos,
  contarProdutosPorExecucao,
} from "./persistirProdutoLoja.ts";

export {
  inserirProdutosLojaCd,
  contarCdsPorExecucao,
  contarCdsAtivosPorExecucao,
} from "./persistirProdutoLojaCd.ts";

export { criarMetricasPersistencia, validarContagensPersistencia } from "./persistenciaMetrics.ts";

export { rollbackExecucaoPorId, contarResiduosRegional } from "./persistenciaRollback.ts";

export { persistirLoteMotor, type PersistirLoteOptions } from "./persistenciaTransaction.ts";

export {
  persistirLoteMotorDirectInsert_TEST_ONLY,
  PERSISTENCIA_DIRECT_INSERT_TEST_ONLY,
} from "./persistenciaDirectInsert.testOnly.ts";

/** Indica que persistencia exige service_role — frontend nunca deve importar este modulo em runtime browser. */
export const PERSISTENCIA_EXCLUSIVA_SERVICE_ROLE = true as const;
