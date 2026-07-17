import type { MotorAlerta } from "../../bre/breTypes.ts";
import {
  MENOR_RECEBTO_NULL_NORMALIZADO,
  listMinIgnorandoNull,
  normalizarDiasRecebto,
} from "../../bre/centralizacao/centralizacaoUtils.ts";
import type { PosicaoLogicaCd } from "../../bre/centralizacao/centralizacaoTypes.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";
import { ordenarCdsPorPosicao } from "../validarColecaoCds.ts";

export type MenorRecebimentoDinamico = {
  diasRecebtoPorPosicao: Map<number, number | null>;
  menorDiasRecebimentoOriginal: number | null;
  menorDiasRecebimentoNormalizado: number;
  posicoesComMenorValor: number[];
  alertas: MotorAlerta[];
};

function alerta(codigo: string, mensagem: string): MotorAlerta {
  return { codigo, mensagem, severidade: "aviso" };
}

export function calcularMenorRecebimentoCds(cds: readonly MotorProdutoCdNormalizado[]): MenorRecebimentoDinamico {
  const ordenados = ordenarCdsPorPosicao(cds);
  const diasRecebtoPorPosicao = new Map<number, number | null>();

  for (const cd of ordenados) {
    diasRecebtoPorPosicao.set(cd.posicaoLogica, normalizarDiasRecebto(cd.diasRecebimento));
  }

  const valores = ordenados.map((cd) => diasRecebtoPorPosicao.get(cd.posicaoLogica) ?? null);
  const menorOriginal = listMinIgnorandoNull(valores);
  const menorNormalizado = menorOriginal == null ? MENOR_RECEBTO_NULL_NORMALIZADO : menorOriginal;

  const posicoesComMenorValor: number[] = [];
  if (menorOriginal != null) {
    for (const cd of ordenados) {
      const dias = diasRecebtoPorPosicao.get(cd.posicaoLogica) ?? null;
      if (dias === menorOriginal) posicoesComMenorValor.push(cd.posicaoLogica);
    }
  }

  const alertas: MotorAlerta[] = [];
  if (valores.some((v) => v != null && v < 0)) {
    alertas.push(alerta("DIAS_RECEBTO_NEGATIVO", "Dias de recebimento negativos encontrados"));
  }
  if (menorOriginal === 0 && valores.filter((v) => v === 0).length === valores.filter((v) => v != null).length) {
    alertas.push(alerta("TODOS_DIAS_ZERO", "Todos os dias de recebimento são zero"));
  }

  return {
    diasRecebtoPorPosicao,
    menorDiasRecebimentoOriginal: menorOriginal,
    menorDiasRecebimentoNormalizado: menorNormalizado,
    posicoesComMenorValor,
    alertas,
  };
}

export function menorRecebimentoDinamicoParaLegado(
  dinamico: MenorRecebimentoDinamico,
): {
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
  menorDiasRecebimentoOriginal: number | null;
  menorDiasRecebimentoNormalizado: number;
  posicoesComMenorValor: PosicaoLogicaCd[];
  alertas: MotorAlerta[];
} {
  const get = (pos: number) => dinamico.diasRecebtoPorPosicao.get(pos) ?? null;
  return {
    diasRecebtoCd1: get(1),
    diasRecebtoCd2: get(2),
    diasRecebtoCd3: get(3),
    diasRecebtoCd4: get(4),
    diasRecebtoCd5: get(5),
    menorDiasRecebimentoOriginal: dinamico.menorDiasRecebimentoOriginal,
    menorDiasRecebimentoNormalizado: dinamico.menorDiasRecebimentoNormalizado,
    posicoesComMenorValor: dinamico.posicoesComMenorValor.filter((p): p is PosicaoLogicaCd => p >= 1 && p <= 5),
    alertas: dinamico.alertas,
  };
}
