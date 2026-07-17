export type { MotorProdutoCdNormalizado } from "./cdTypes.ts";
export { calcularPosicaoLogica } from "./cdTypes.ts";

export type {
  MotorBlocoCdsEntrada,
  MotorBlocoCdsOrigem,
  MapearBlocoCdsOpcoes,
} from "./blocoCdsTypes.ts";
export { PREFIXOS_COLUNA_CD } from "./blocoCdsTypes.ts";

export type { ValoresCdParseados, PosicaoCdNoBloco } from "./mapearCdsDoBloco.ts";
export {
  detectarPosicoesCdNoCabecalho,
  detectarTodasPosicoesCdNoCabecalho,
  mapearCdsDoPayload,
  mapearCdsDoBloco,
  criarBlocoRuptura,
  criarBlocoGrupo2,
} from "./mapearCdsDoBloco.ts";

export type { MergeBlocosCdsResultado } from "./mergeBlocosCds.ts";
export { mergeBlocosCds } from "./mergeBlocosCds.ts";

export type { ValidacaoColecaoCdsResultado } from "./validarColecaoCds.ts";
export { ordenarCdsPorPosicao, validarColecaoCds } from "./validarColecaoCds.ts";

export type {
  MtCamposCdFlat,
  MtCamposEstoquePendencia,
  MtCamposStatusDias,
} from "./mtCincoCdsAdapter.ts";
export {
  MtCincoCdsAdapter,
  extrairCamposFlatDeCds,
  extrairEstoqueCd,
  extrairEstoquePendenciaDeCds,
  extrairStatusDiasDeCds,
  cdsTemPosicao,
  maxPosicaoLogica,
} from "./mtCincoCdsAdapter.ts";

export { construirCdsDaLinhaRuptura, construirCdsDaLinhaGrupo2, construirCdsDaLinhaGrupo2Completo } from "./construirCdsTransform.ts";
