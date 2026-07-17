export {
  normalizeProdutoCentralizado,
  normalizeStatusEstoqueCds,
  normalizeStatusAtivacaoCd,
  compararCampoCd,
} from "./normalizeProdutoCentralizado.ts";

export { buildCdMapping, resolverBandeiraLoja, codigoParaPosicao, posicaoParaCodigo, posicaoLogicaFromIndice } from "./buildCdMapping.ts";
export { buildV7CdContexto } from "./buildV7CdContexto.ts";
export { extrairCodigosFisicos, normalizarTextoCdBasico, conjuntosCodigosEquivalentes } from "./normalizeCdText.ts";
export * from "./cdNormalizationTypes.ts";
