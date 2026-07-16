import type { MotorRegraResultado } from "../breTypes.ts";

export function calcularCrossSumFromValues(
  estSelecInvCd1: number | null,
  estSelecInvCd2: number | null,
  estSelecInvCd3: number | null,
  estSelecInvCd4: number | null,
): number {
  const vals = [estSelecInvCd1, estSelecInvCd2, estSelecInvCd3, estSelecInvCd4];
  return vals.map((v) => (v == null ? 0 : v)).reduce((a, b) => a + b, 0);
}

export function aplicarRuleCrossDocking(
  crossSum: number,
  somaEstoqueCd: number,
  curtoPrazo: 0 | 1,
  modCurtoPrazo: "LJ_Exclusiva" | null,
): MotorRegraResultado {
  const flag: 0 | 1 =
    crossSum >= 1 && curtoPrazo === 1 && somaEstoqueCd <= 0 && modCurtoPrazo !== "LJ_Exclusiva" ? 1 : 0;

  return {
    regra: "cross_docking",
    status: "aplicada",
    resultado: flag,
    entradasUtilizadas: {
      crossSum,
      somaEstoqueCd,
      curtoPrazo,
      modCurtoPrazo: modCurtoPrazo ?? null,
    },
    motivo:
      flag === 1
        ? "Cross Docking=1 — Cross>=1, CP=1, estoque CD<=0, não exclusivo"
        : "Cross Docking=0",
    alertas: [],
    dependenciasAusentes: [],
  };
}
