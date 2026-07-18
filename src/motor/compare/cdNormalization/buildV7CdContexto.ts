import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { MotorV7CdContexto } from "./cdNormalizationTypes.ts";
import { MOTOR_CD_POSICOES } from "./cdNormalizationTypes.ts";
import { posicaoLogicaFromIndice } from "./buildCdMapping.ts";

export function buildV7CdContexto(item: MotorProdutoLojaConsolidado): MotorV7CdContexto {
  const flags = {
    CD1: item.flagPrimeiroCd,
    CD2: item.flagSegundoCd,
    CD3: item.flagTerceiroCd,
    CD4: item.flagQuartoCd,
    CD5: item.flagQuintoCd,
  } as Record<(typeof MOTOR_CD_POSICOES)[number], number | null>;

  const codigosFisicos = {
    CD1: item.primeiroCd,
    CD2: item.segundoCd,
    CD3: item.terceiroCd,
    CD4: item.quartoCd,
    CD5: item.quintoCd,
  } as Record<(typeof MOTOR_CD_POSICOES)[number], number | null>;

  if (item.cds.length > 0) {
    for (const cd of item.cds) {
      if (cd.posicaoLogica >= 1 && cd.posicaoLogica <= 5) {
        const pos = MOTOR_CD_POSICOES[cd.posicaoLogica - 1];
        if (cd.codigoFisico != null) codigosFisicos[pos] = cd.codigoFisico;
      }
    }
  }

  return {
    posicaoCdSelecionada: posicaoLogicaFromIndice(item.posicaoCdSelecionada),
    codigoCdSelecionado: item.codigoCdSelecionado,
    flags,
    codigosFisicos,
    textoProdutoCentralizado: item.textoProdutoCentralizado,
    statusEstoqueCds: item.statusEstoqueCds,
    statusSolicitacaoAtivacaoCd: item.statusSolicitacaoAtivacaoCd,
  };
}
