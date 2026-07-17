import type { MotorAlerta } from "../breTypes.ts";
import type {
  MotorCentralizacaoEntrada,
  MotorFlagsOrdemCdResultado,
  MotorOrdemCdsResolvida,
  MotorStatusEstoqueCdsResultado,
} from "./centralizacaoTypes.ts";
import { POSICOES_LOGICAS, obterCodigoFisicoPorPosicao, obterEstoquePorPosicao } from "./centralizacaoUtils.ts";
import { calcularStatusEstoqueCdsDinamico } from "../../cds/rules/calcularStatusEstoqueCdsDinamico.ts";
import { obterFlagPorPosicao } from "../../cds/rules/flagsCentralizacaoDinamico.ts";
import { cdsFromCentralizacaoEntrada } from "../../cds/unificarCdsBre.ts";

function obterFlagPorPosicaoLegado(flags: MotorFlagsOrdemCdResultado, posicao: number): number {
  return obterFlagPorPosicao(flags, posicao);
}

export function calcularStatusEstoqueCdsLegado(
  entrada: MotorCentralizacaoEntrada,
  ordem: MotorOrdemCdsResolvida,
  flags: MotorFlagsOrdemCdResultado,
): MotorStatusEstoqueCdsResultado {
  const alertas: MotorAlerta[] = [];
  const estoques = [
    entrada.estoqueCd1 ?? 0,
    entrada.estoqueCd2 ?? 0,
    entrada.estoqueCd3 ?? 0,
    entrada.estoqueCd4 ?? 0,
    entrada.estoqueCd5 ?? 0,
  ];
  const soma = estoques.reduce((acc, v) => acc + v, 0);

  if (soma === 0) {
    return {
      texto: "Ruptura CD",
      statusRegra: ordem.bandeira ? "aplicada" : "nao_aplicavel",
      alertas,
    };
  }

  if (!ordem.bandeira) {
    return {
      texto: "Ruptura CD",
      statusRegra: "nao_aplicavel",
      alertas: [{ codigo: "ORDEM_AUSENTE", mensagem: "Status Estoque CDs sem ordem resolvida", severidade: "aviso" }],
    };
  }

  const trechos: string[] = [];
  for (const pos of POSICOES_LOGICAS) {
    const flag = obterFlagPorPosicaoLegado(flags, pos);
    const estoque = obterEstoquePorPosicao(entrada, pos);
    const codigo = obterCodigoFisicoPorPosicao(ordem, pos);
    if (flag > 0 && estoque === 1 && codigo != null) {
      trechos.push(` (${codigo})`);
    }
  }

  return {
    texto: `Estoque no CD:${trechos.join("")}`,
    statusRegra: "aplicada",
    alertas,
  };
}

export function calcularStatusEstoqueCds(
  entrada: MotorCentralizacaoEntrada,
  ordem: MotorOrdemCdsResolvida,
  flags: MotorFlagsOrdemCdResultado,
): MotorStatusEstoqueCdsResultado {
  const cds = cdsFromCentralizacaoEntrada(entrada);
  return calcularStatusEstoqueCdsDinamico(cds, ordem, flags);
}
