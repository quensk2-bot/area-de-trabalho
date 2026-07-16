import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";

function num(value: number | null | undefined): number {
  return value ?? 0;
}

export function calcularCrossSumFromValues(
  estSelecInvCd1: number | null,
  estSelecInvCd2: number | null,
  estSelecInvCd3: number | null,
  estSelecInvCd4: number | null,
): number {
  return num(estSelecInvCd1) + num(estSelecInvCd2) + num(estSelecInvCd3) + num(estSelecInvCd4);
}

export function calcularCrossSum(input: MotorBreItemInput): number {
  const inv = input.estSelecInv;
  return calcularCrossSumFromValues(
    inv?.estSelecInvCd1 ?? null,
    inv?.estSelecInvCd2 ?? null,
    inv?.estSelecInvCd3 ?? null,
    inv?.estSelecInvCd4 ?? null,
  );
}

export function aplicarRuleCrossDocking(
  crossSum: number,
  somaEstoqueCd: number,
  modCurtoPrazo: "LJ_Exclusiva" | null,
): MotorRegraResultado[] {
  const crossSumRule: MotorRegraResultado = {
    regra: "cross_sum",
    status: "aplicada",
    resultado: crossSum,
    entradasUtilizadas: {
      crossSum,
    },
    motivo: "Soma EST_SELECINV_CD1..4 (null tratado como 0 no M)",
    alertas: [],
    dependenciasAusentes: [],
  };

  const crossDockingFlag: MotorRegraResultado = {
    regra: "cross_docking",
    status: "bloqueada_dependencia",
    resultado: null,
    entradasUtilizadas: {
      crossSum,
      somaEstoqueCd,
      modCurtoPrazo: modCurtoPrazo ?? null,
    },
    motivo: "Flag Cross Docking depende de Curto Prazo — bloqueada até Fase 2B.2",
    alertas: [{ codigo: "CP_NAO_IMPLEMENTADO", mensagem: "Curto Prazo final não implementado nesta etapa", severidade: "info" }],
    dependenciasAusentes: [{ nome: "curto_prazo", descricao: "Classificação Curto Prazo (Fase 2B.2)" }],
  };

  return [crossSumRule, crossDockingFlag];
}
