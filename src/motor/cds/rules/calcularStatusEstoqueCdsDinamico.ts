import type { MotorAlerta } from "../../bre/breTypes.ts";
import type { MotorFlagsOrdemCdResultado, MotorOrdemCdsResolvida, PosicaoLogicaCd } from "../../bre/centralizacao/centralizacaoTypes.ts";
import {
  obterCodigoFisicoPorPosicao,
  obterEstoquePorPosicao,
} from "../../bre/centralizacao/centralizacaoUtils.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";
import { somarEstoqueCds } from "./somarEstoqueCds.ts";
import { flagsOrdemParaColecao, obterFlagPorPosicao } from "./flagsCentralizacaoDinamico.ts";
import { ordenarCdsPorPosicao } from "../validarColecaoCds.ts";

export type StatusEstoqueCdsDinamico = {
  texto: string;
  statusRegra: "aplicada" | "nao_aplicavel";
  alertas: MotorAlerta[];
};

function estoquePorPosicaoCds(cds: readonly MotorProdutoCdNormalizado[], posicao: number): number | null {
  return cds.find((c) => c.posicaoLogica === posicao)?.estoque ?? null;
}

export function calcularStatusEstoqueCdsDinamico(
  cds: readonly MotorProdutoCdNormalizado[],
  ordem: MotorOrdemCdsResolvida,
  flags: MotorFlagsOrdemCdResultado,
): StatusEstoqueCdsDinamico {
  const alertas: MotorAlerta[] = [];
  const soma = somarEstoqueCds(cds);

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

  const flagsColecao = flagsOrdemParaColecao(flags, ordem);
  const trechos: string[] = [];

  for (const flag of flagsColecao.sort((a, b) => a.posicaoLogica - b.posicaoLogica)) {
    const estoque =
      flag.posicaoLogica <= 5
        ? obterEstoquePorPosicao(
            {
              estoqueCd1: estoquePorPosicaoCds(cds, 1),
              estoqueCd2: estoquePorPosicaoCds(cds, 2),
              estoqueCd3: estoquePorPosicaoCds(cds, 3),
              estoqueCd4: estoquePorPosicaoCds(cds, 4),
              estoqueCd5: estoquePorPosicaoCds(cds, 5),
            },
            flag.posicaoLogica as PosicaoLogicaCd,
          )
        : estoquePorPosicaoCds(cds, flag.posicaoLogica);

    if (flag.valorOriginal > 0 && estoque === 1 && flag.codigoFisico != null) {
      trechos.push(` (${flag.codigoFisico})`);
    }
  }

  for (const cd of ordenarCdsPorPosicao(cds)) {
    if (cd.posicaoLogica <= 5) continue;
    const flagValor = obterFlagPorPosicao(flags, cd.posicaoLogica);
    const codigo = cd.codigoFisico;
    if (flagValor > 0 && cd.estoque === 1 && codigo != null) {
      trechos.push(` (${codigo})`);
    }
  }

  return {
    texto: `Estoque no CD:${trechos.join("")}`,
    statusRegra: "aplicada",
    alertas,
  };
}
