import type { MotorMedioPrazoResultado } from "../breTypes.ts";

export type MedioPrazoInput = {
  statusBaseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  menorQueTres: 0 | 1;
  curtoPrazo: 0 | 1;
  pendenciaCpaCd: number | null;
  alertasPendencia?: { codigo: string; mensagem: string; severidade: "info" | "aviso" | "erro" }[];
};

export function aplicarRuleMedioPrazo(input: MedioPrazoInput): MotorMedioPrazoResultado {
  const pendenciaPositiva = input.pendenciaCpaCd != null && input.pendenciaCpaCd > 0;
  const entradas = {
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    curtoPrazo: input.curtoPrazo,
    pendenciaCpaCd: input.pendenciaCpaCd,
  };

  if (input.statusBaseLimpa !== "Base Limpa") {
    return {
      regra: "medio_prazo",
      status: "nao_aplicavel",
      resultado: 0,
      medioPrazo: 0,
      somaPendencia: input.pendenciaCpaCd,
      entradasUtilizadas: entradas,
      motivo: "Fora da Base Limpa — MP não se aplica",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.menorQueTres !== 1) {
    return {
      regra: "medio_prazo",
      status: "nao_aplicavel",
      resultado: 0,
      medioPrazo: 0,
      somaPendencia: input.pendenciaCpaCd,
      entradasUtilizadas: entradas,
      motivo: "Sem ruptura 104C — MP não se aplica",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.curtoPrazo === 1) {
    return {
      regra: "medio_prazo",
      status: "aplicada",
      resultado: 0,
      medioPrazo: 0,
      somaPendencia: input.pendenciaCpaCd,
      entradasUtilizadas: entradas,
      motivo: "CP=1 bloqueia MP",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  const medioPrazo: 0 | 1 = pendenciaPositiva ? 1 : 0;
  const alertas = [...(input.alertasPendencia ?? [])];

  return {
    regra: "medio_prazo",
    status: "aplicada",
    resultado: medioPrazo,
    medioPrazo,
    somaPendencia: input.pendenciaCpaCd,
    entradasUtilizadas: entradas,
    motivo: medioPrazo === 1 ? "MP=1 — Pendência Cpa CD > 0 com CP=0" : "MP=0 — pendência ausente ou <= 0",
    alertas,
    dependenciasAusentes: [],
  };
}
