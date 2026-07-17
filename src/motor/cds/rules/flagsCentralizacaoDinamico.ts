import type { MotorFlagsOrdemCdResultado, MotorOrdemCdsResolvida, PosicaoLogicaCd } from "../../bre/centralizacao/centralizacaoTypes.ts";
import { obterCodigoFisicoPorPosicao } from "../../bre/centralizacao/centralizacaoUtils.ts";

export type FlagCentralizacaoItem = {
  posicaoLogica: number;
  codigoFisico: number | null;
  ativo: boolean;
  valorOriginal: number;
};

export function obterFlagPorPosicao(flags: MotorFlagsOrdemCdResultado, posicao: number): number {
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

export function flagsOrdemParaColecao(
  flags: MotorFlagsOrdemCdResultado,
  ordem: MotorOrdemCdsResolvida,
): FlagCentralizacaoItem[] {
  const posicoes = [1, 2, 3, 4, 5];
  return posicoes.map((posicao) => {
    const valorOriginal = obterFlagPorPosicao(flags, posicao);
    return {
      posicaoLogica: posicao,
      codigoFisico: obterCodigoFisicoPorPosicao(ordem, posicao as PosicaoLogicaCd),
      ativo: valorOriginal > 0,
      valorOriginal,
    };
  });
}

export function somaFlagsCentralizacao(flags: MotorFlagsOrdemCdResultado): number {
  return (
    flags.flagPrimeiroCd +
    flags.flagSegundoCd +
    flags.flagTerceiroCd +
    flags.flagQuartoCd +
    flags.flagQuintoCd
  );
}
