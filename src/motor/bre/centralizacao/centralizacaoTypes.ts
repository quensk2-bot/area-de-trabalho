import type { MotorAlerta, MotorRegraStatus } from "../breTypes.ts";
import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";

export type PosicaoLogicaCd = 1 | 2 | 3 | 4 | 5;

export type MotorCentralizacaoEntrada = {
  regional: string;
  loja: number;
  divisao: string | null;
  rede: string;
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  estoqueCd5: number | null;
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  statusCompraCd5: string | null;
};

export type MotorOrdemCdsResolvida = {
  regional: string;
  loja: number;
  bandeira: string | null;
  tipoLoja: string | null;
  modalidade: string | null;
  divisaoCatalogo: string | null;
  primeiroCd: number | null;
  segundoCd: number | null;
  terceiroCd: number | null;
  quartoCd: number | null;
  quintoCd: number | null;
  statusRegra: MotorRegraStatus;
  alertas: MotorAlerta[];
};

export type MotorMenorRecebimentoResultado = {
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
  menorDiasRecebimentoOriginal: number | null;
  menorDiasRecebimentoNormalizado: number;
  posicoesComMenorValor: PosicaoLogicaCd[];
  statusRegra: MotorRegraStatus;
  alertas: MotorAlerta[];
};

export type MotorProdutoCentralizadoResultado = {
  produtoCentralizado: number | null;
  textoProdutoCentralizado: string;
  posicaoCdSelecionada: PosicaoLogicaCd | null;
  codigoCdSelecionado: number | null;
  menorDiasRecebimento: number;
  motivo: string;
  alertas: MotorAlerta[];
  statusRegra: MotorRegraStatus;
};

export type MotorFlagsOrdemCdResultado = {
  flagPrimeiroCd: number;
  flagSegundoCd: number;
  flagTerceiroCd: number;
  flagQuartoCd: number;
  flagQuintoCd: number;
  statusRegra: MotorRegraStatus;
  alertas: MotorAlerta[];
};

export type MotorStatusRecebtoResultado = {
  texto: string;
  statusRegra: MotorRegraStatus;
  alertas: MotorAlerta[];
};

export type MotorStatusEstoqueCdsResultado = {
  texto: string;
  statusRegra: MotorRegraStatus;
  alertas: MotorAlerta[];
};

export type MotorStatusAtivacaoCdResultado = {
  texto: string | null;
  statusRegra: MotorRegraStatus;
  alertas: MotorAlerta[];
  dependenciasBloqueadas: string[];
};

export type MotorCentralizacaoResultado = {
  ordem: MotorOrdemCdsResolvida;
  menorRecebimento: MotorMenorRecebimentoResultado;
  produtoCentralizado: MotorProdutoCentralizadoResultado;
  flags: MotorFlagsOrdemCdResultado;
  statusRecebto: MotorStatusRecebtoResultado;
  statusEstoqueCds: MotorStatusEstoqueCdsResultado;
  statusAtivacaoCd: MotorStatusAtivacaoCdResultado;
  centralizacaoDisponivel: boolean;
  alertas: MotorAlerta[];
  statusRegra: MotorRegraStatus;
};

export type MotorCatalogoCentralizacaoContexto = {
  catalogos: MotorCatalogos;
  ordemCdsPath: string | null;
};

export type MotorFlagsLookupKey = string;

export function chaveFlagsCentralizados(divisao: string | null, rede: string): MotorFlagsLookupKey {
  return `${divisao ?? ""}|${rede}`;
}
