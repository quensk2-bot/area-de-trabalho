import type { MotorAlerta } from "../breTypes.ts";
import type { MotorCentralizacaoEntrada, MotorMenorRecebimentoResultado } from "./centralizacaoTypes.ts";
import {
  MENOR_RECEBTO_NULL_NORMALIZADO,
  POSICOES_LOGICAS,
  listMinIgnorandoNull,
  normalizarDiasRecebto,
  obterDiasRecebtoPorPosicao,
} from "./centralizacaoUtils.ts";
import {
  calcularMenorRecebimentoCds,
  menorRecebimentoDinamicoParaLegado,
} from "../../cds/rules/calcularMenorRecebimentoCds.ts";
import { cdsFromCentralizacaoEntrada } from "../../cds/unificarCdsBre.ts";

function alerta(codigo: string, mensagem: string): MotorAlerta {
  return { codigo, mensagem, severidade: "aviso" };
}

export function calcularMenorRecebimentoLegado(entrada: MotorCentralizacaoEntrada): MotorMenorRecebimentoResultado {
  const diasRecebtoCd1 = normalizarDiasRecebto(entrada.diasRecebtoCd1);
  const diasRecebtoCd2 = normalizarDiasRecebto(entrada.diasRecebtoCd2);
  const diasRecebtoCd3 = normalizarDiasRecebto(entrada.diasRecebtoCd3);
  const diasRecebtoCd4 = normalizarDiasRecebto(entrada.diasRecebtoCd4);
  const diasRecebtoCd5 = normalizarDiasRecebto(entrada.diasRecebtoCd5);

  const valores = [diasRecebtoCd5, diasRecebtoCd4, diasRecebtoCd3, diasRecebtoCd2, diasRecebtoCd1];
  const menorOriginal = listMinIgnorandoNull(valores);
  const menorNormalizado = menorOriginal == null ? MENOR_RECEBTO_NULL_NORMALIZADO : menorOriginal;

  const posicoesComMenorValor: typeof POSICOES_LOGICAS[number][] = [];
  if (menorOriginal != null) {
    for (const pos of POSICOES_LOGICAS) {
      const dias = obterDiasRecebtoPorPosicao(
        { diasRecebtoCd1, diasRecebtoCd2, diasRecebtoCd3, diasRecebtoCd4, diasRecebtoCd5 },
        pos,
      );
      if (dias === menorOriginal) posicoesComMenorValor.push(pos);
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
    diasRecebtoCd1,
    diasRecebtoCd2,
    diasRecebtoCd3,
    diasRecebtoCd4,
    diasRecebtoCd5,
    menorDiasRecebimentoOriginal: menorOriginal,
    menorDiasRecebimentoNormalizado: menorNormalizado,
    posicoesComMenorValor,
    statusRegra: "aplicada",
    alertas,
  };
}

export function calcularMenorRecebimento(entrada: MotorCentralizacaoEntrada): MotorMenorRecebimentoResultado {
  const cds = cdsFromCentralizacaoEntrada(entrada);
  const dinamico = calcularMenorRecebimentoCds(cds);
  const legadoFlat = menorRecebimentoDinamicoParaLegado(dinamico);

  return {
    ...legadoFlat,
    statusRegra: "aplicada",
  };
}
