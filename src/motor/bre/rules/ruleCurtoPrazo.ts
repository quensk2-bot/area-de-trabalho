import type { MotorCurtoPrazoResultado } from "../breTypes.ts";

export type CurtoPrazoInput = {
  statusBaseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  menorQueTres: 0 | 1;
  somaEstoqueCd: number;
  crossSum: number;
  modCurtoPrazo: "LJ_Exclusiva" | null;
  ncurtoPrazo: "G" | "NG" | null;
};

function estoqueMaisCross(somaEstoqueCd: number, crossSum: number): number {
  return somaEstoqueCd + crossSum;
}

export function aplicarRuleCurtoPrazo(input: CurtoPrazoInput): MotorCurtoPrazoResultado {
  const estoqueEfetivo = estoqueMaisCross(input.somaEstoqueCd, input.crossSum);
  const entradas = {
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    somaEstoqueCd: input.somaEstoqueCd,
    crossSum: input.crossSum,
    estoqueEfetivo,
    modCurtoPrazo: input.modCurtoPrazo,
    ncurtoPrazo: input.ncurtoPrazo,
  };

  if (input.statusBaseLimpa !== "Base Limpa") {
    return {
      regra: "curto_prazo",
      status: "nao_aplicavel",
      resultado: 0,
      curtoPrazo: 0,
      entradasUtilizadas: entradas,
      motivo: "Fora da Base Limpa — CP não se aplica (filtro L37 do M)",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.menorQueTres !== 1) {
    return {
      regra: "curto_prazo",
      status: "nao_aplicavel",
      resultado: 0,
      curtoPrazo: 0,
      entradasUtilizadas: entradas,
      motivo: "Sem ruptura 104C — Menor que três = 0",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (estoqueEfetivo <= 0) {
    return {
      regra: "curto_prazo",
      status: "aplicada",
      resultado: 0,
      curtoPrazo: 0,
      entradasUtilizadas: entradas,
      motivo: "(Soma_EstoqueCD + Cross) <= 0 — sem estoque efetivo",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.modCurtoPrazo !== "LJ_Exclusiva") {
    return {
      regra: "curto_prazo",
      status: "aplicada",
      resultado: 1,
      curtoPrazo: 1,
      entradasUtilizadas: entradas,
      motivo: "CP=1 — produto comum ou não exclusivo (Mod <> LJ_Exclusiva)",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.ncurtoPrazo === "NG") {
    return {
      regra: "curto_prazo",
      status: "aplicada",
      resultado: 0,
      curtoPrazo: 0,
      entradasUtilizadas: entradas,
      motivo: "Exclusivo com NCurtoPrazo=NG — CP bloqueado (M L77-79)",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (input.modCurtoPrazo === "LJ_Exclusiva" && input.ncurtoPrazo === "G") {
    return {
      regra: "curto_prazo",
      status: "aplicada",
      resultado: 1,
      curtoPrazo: 1,
      entradasUtilizadas: entradas,
      motivo: "Exclusivo LJ_Exclusiva com NCurtoPrazo=G — CP liberado (M L81-84)",
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  return {
    regra: "curto_prazo",
    status: "aplicada",
    resultado: 0,
    curtoPrazo: 0,
    entradasUtilizadas: entradas,
    motivo: "Exclusivo LJ_Exclusiva sem NCurtoPrazo=G — CP=0 (sem correspondência loja)",
    alertas: [{ codigo: "EXCLUSIVO_SEM_NCURTO", mensagem: "Produto exclusivo sem NCurtoPrazo G para a loja", severidade: "info" }],
    dependenciasAusentes: [],
  };
}
