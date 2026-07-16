import type { MotorAlerta, MotorPendenciaAgregadaResultado } from "../breTypes.ts";
import { listSumNullable } from "../utils/listSum.ts";

export type PendenciaCpaCdInput = {
  pendenciaLoja: number | null;
  pendenciaCd1: number | null;
  pendenciaCd2: number | null;
  pendenciaCd3: number | null;
  pendenciaCd4: number | null;
  pendenciaCd5: number | null;
};

function alertasPendencia(input: PendenciaCpaCdInput): MotorAlerta[] {
  const alertas: MotorAlerta[] = [];
  const campos = [
    ["pendencia_cd1", input.pendenciaCd1],
    ["pendencia_cd2", input.pendenciaCd2],
    ["pendencia_cd3", input.pendenciaCd3],
    ["pendencia_cd4", input.pendenciaCd4],
    ["pendencia_cd5", input.pendenciaCd5],
    ["pendencia_loja", input.pendenciaLoja],
  ] as const;

  for (const [nome, valor] of campos) {
    if (valor != null && valor < 0) {
      alertas.push({
        codigo: "PENDENCIA_NEGATIVA",
        mensagem: `${nome}=${valor} — valor negativo preservado na soma`,
        severidade: "aviso",
      });
    }
    if (nome.startsWith("pendencia_cd") && valor != null && valor > 1) {
      alertas.push({
        codigo: "PENDCD_MAIOR_QUE_1",
        mensagem: `${nome}=${valor} — MP usa soma >0, mas Dias Pedido usa =1`,
        severidade: "aviso",
      });
    }
  }

  return alertas;
}

export function calcularPendenciaCpaCd(input: PendenciaCpaCdInput): MotorPendenciaAgregadaResultado {
  const valores = [
    input.pendenciaLoja,
    input.pendenciaCd1,
    input.pendenciaCd2,
    input.pendenciaCd3,
    input.pendenciaCd4,
    input.pendenciaCd5,
  ];
  const soma = listSumNullable(valores);
  const alertas = alertasPendencia(input);

  return {
    regra: "pendencia_cpa_cd",
    status: "aplicada",
    resultado: soma,
    soma,
    entradasUtilizadas: {
      pendenciaLoja: input.pendenciaLoja,
      pendenciaCd1: input.pendenciaCd1,
      pendenciaCd2: input.pendenciaCd2,
      pendenciaCd3: input.pendenciaCd3,
      pendenciaCd4: input.pendenciaCd4,
      pendenciaCd5: input.pendenciaCd5,
    },
    motivo:
      soma == null
        ? "Todos os campos de pendência são null — soma null, MP=0"
        : soma > 0
          ? "Pendência agregada > 0"
          : "Pendência agregada = 0",
    alertas,
    dependenciasAusentes: [],
  };
}
