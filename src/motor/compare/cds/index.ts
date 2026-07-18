export type {
  MotorCdCampoComparavel,
  MotorCdComparacaoEstado,
  MotorCdComparacaoItem,
  MotorCdComparacaoOrigem,
  MotorComparacaoCdCampoDetalhe,
  MotorComparacaoCdPosicaoResultado,
  MotorComparacaoCdsProdutoResultado,
  MotorProdutoComparacaoCds,
} from "./motorCdComparacaoTypes.ts";
export { ESTADOS_CD_IGUAIS, posicaoLogicaParaChave } from "./motorCdComparacaoTypes.ts";

export type { MotorPerfilComparacaoCd } from "./motorPerfilComparacaoCd.ts";
export {
  PERFIL_AUDITORIA_COMPLETA,
  PERFIL_EXCEL_MT_LEGADO_5CD,
  PERFIL_LAYOUT_DINAMICO,
  PERFIL_REGIONAL_8CD,
  obterPerfilComparacaoCd,
  resolverQuantidadePosicoesComparacao,
} from "./motorPerfilComparacaoCd.ts";

export {
  enriquecerCodigosFisicosV7,
  mapCdsParaColunasFlatEstoque,
  normalizarV7Cds,
} from "./normalizarV7Cds.ts";

export {
  detectarColunasCdsExcel,
  maxPosicaoDetectadaExcel,
  normalizarExcelCdsDeLinha,
  normalizarLinhaExcelCds,
  resolverPosicaoLogicaColuna,
} from "./normalizarExcelCds.ts";
export type { MotorColunaExcelCdDetectada } from "./normalizarExcelCds.ts";

export { compararCdsPorPosicao, compararCdsProduto } from "./compararCdsPorPosicao.ts";
export type { CompararCdsPorPosicaoOpcoes } from "./compararCdsPorPosicao.ts";

export {
  compararCampoTextoCdSemantico,
  compararProdutoCentralizadoSemantico,
  compararStatusAtivacaoSemantico,
  compararStatusEstoqueSemantico,
} from "./equivalenciaSemanticaCds.ts";
export type { MotorEquivalenciaSemanticaResultado } from "./equivalenciaSemanticaCds.ts";

export { mapConsolidadoCdsParaCompare } from "./mapConsolidadoCdsParaCompare.ts";
export type { MapConsolidadoCdsCompareResultado } from "./mapConsolidadoCdsParaCompare.ts";
