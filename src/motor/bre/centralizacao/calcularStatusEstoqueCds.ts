import type { MotorAlerta } from "../breTypes.ts";
import type {
  MotorCentralizacaoEntrada,
  MotorFlagsOrdemCdResultado,
  MotorOrdemCdsResolvida,
  MotorStatusEstoqueCdsResultado,
} from "./centralizacaoTypes.ts";
import { POSICOES_LOGICAS, obterCodigoFisicoPorPosicao, obterEstoquePorPosicao } from "./centralizacaoUtils.ts";

function obterFlagPorPosicao(flags: MotorFlagsOrdemCdResultado, posicao: number): number {
  switch (posicao) {
    case 1:
      return flags.flagPrimeiroCd;
    case 2:
      return flags.flagSegundoCd;
    case 3:
      return flags.flagTerceiroCd;
    case 4:
      return flags.flagQuartoCd;
    case 5:
      return flags.flagQuintoCd;
    default:
      return 0;
  }
}

export function calcularStatusEstoqueCds(
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
    const flag = obterFlagPorPosicao(flags, pos);
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
