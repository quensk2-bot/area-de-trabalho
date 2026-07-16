import type { MotorLongoPrazoResultado } from "../breTypes.ts";

export type LongoPrazoInput = {
  statusBaseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  menorQueTres: 0 | 1;
  curtoPrazo: 0 | 1;
  medioPrazo: 0 | 1;
};

export function aplicarRuleLongoPrazo(input: LongoPrazoInput): MotorLongoPrazoResultado {
  const entradas = {
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    curtoPrazo: input.curtoPrazo,
    medioPrazo: input.medioPrazo,
  };

  if (input.statusBaseLimpa !== "Base Limpa") {
    return {
      regra: "longo_prazo",
      status: "nao_aplicavel",
      resultado: 0,
      longoPrazo: 0,
      entradasUtilizadas: entradas,
      motivo: "Fora da Base Limpa — LP não se aplica",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.menorQueTres !== 1) {
    return {
      regra: "longo_prazo",
      status: "nao_aplicavel",
      resultado: 0,
      longoPrazo: 0,
      entradasUtilizadas: entradas,
      motivo: "Sem ruptura 104C — LP não se aplica",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  const longoPrazo: 0 | 1 =
    input.curtoPrazo === 0 && input.medioPrazo === 0 ? 1 : 0;

  return {
    regra: "longo_prazo",
    status: "aplicada",
    resultado: longoPrazo,
    longoPrazo,
    entradasUtilizadas: entradas,
    motivo:
      longoPrazo === 1
        ? "LP=1 — classificação residual (CP=0 e MP=0)"
        : "LP=0 — bloqueado por CP ou MP",
    alertas: [],
    dependenciasAusentes: [],
  };
}
