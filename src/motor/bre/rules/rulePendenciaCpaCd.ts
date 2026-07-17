import type { MotorAlerta, MotorPendenciaAgregadaResultado } from "../breTypes.ts";
import { listSumNullable } from "../utils/listSum.ts";
import { somarPendenciaCds } from "../../cds/rules/somarPendenciaCds.ts";
import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";

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

export function calcularPendenciaCpaCdLegado(input: PendenciaCpaCdInput): MotorPendenciaAgregadaResultado {
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

export function calcularPendenciaCpaCdFromCds(
  pendenciaLoja: number | null,
  cds: readonly MotorProdutoCdNormalizado[],
): MotorPendenciaAgregadaResultado {
  const dinamico = somarPendenciaCds(pendenciaLoja, cds);
  const flat = {
    pendenciaLoja,
    pendenciaCd1: cds.find((c) => c.posicaoLogica === 1)?.pendencia ?? null,
    pendenciaCd2: cds.find((c) => c.posicaoLogica === 2)?.pendencia ?? null,
    pendenciaCd3: cds.find((c) => c.posicaoLogica === 3)?.pendencia ?? null,
    pendenciaCd4: cds.find((c) => c.posicaoLogica === 4)?.pendencia ?? null,
    pendenciaCd5: cds.find((c) => c.posicaoLogica === 5)?.pendencia ?? null,
  };

  return {
    regra: "pendencia_cpa_cd",
    status: "aplicada",
    resultado: dinamico.soma,
    soma: dinamico.soma,
    entradasUtilizadas: flat,
    motivo:
      dinamico.soma == null
        ? "Todos os campos de pendência são null — soma null, MP=0"
        : dinamico.soma > 0
          ? "Pendência agregada > 0"
          : "Pendência agregada = 0",
    alertas: dinamico.alertas,
    dependenciasAusentes: [],
  };
}

export function calcularPendenciaCpaCd(input: PendenciaCpaCdInput): MotorPendenciaAgregadaResultado {
  return calcularPendenciaCpaCdLegado(input);
}
