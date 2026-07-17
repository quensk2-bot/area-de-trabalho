import type { MotorAlerta } from "../../bre/breTypes.ts";
import { listSumNullable } from "../../bre/utils/listSum.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";

export type PendenciaAgregadaDinamica = {
  soma: number | null;
  alertas: MotorAlerta[];
};

function alertasPendenciaCds(
  pendenciaLoja: number | null,
  cds: readonly MotorProdutoCdNormalizado[],
): MotorAlerta[] {
  const alertas: MotorAlerta[] = [];

  if (pendenciaLoja != null && pendenciaLoja < 0) {
    alertas.push({
      codigo: "PENDENCIA_NEGATIVA",
      mensagem: `pendencia_loja=${pendenciaLoja} — valor negativo preservado na soma`,
      severidade: "aviso",
    });
  }

  for (const cd of cds) {
    const valor = cd.pendencia;
    if (valor != null && valor < 0) {
      alertas.push({
        codigo: "PENDENCIA_NEGATIVA",
        mensagem: `pendencia_cd${cd.posicaoLogica}=${valor} — valor negativo preservado na soma`,
        severidade: "aviso",
      });
    }
    if (valor != null && valor > 1) {
      alertas.push({
        codigo: "PENDCD_MAIOR_QUE_1",
        mensagem: `pendencia_cd${cd.posicaoLogica}=${valor} — MP usa soma >0, mas Dias Pedido usa =1`,
        severidade: "aviso",
      });
    }
  }

  return alertas;
}

export function somarPendenciaCds(
  pendenciaLoja: number | null,
  cds: readonly MotorProdutoCdNormalizado[],
): PendenciaAgregadaDinamica {
  const valores = [pendenciaLoja, ...cds.map((cd) => cd.pendencia)];
  const soma = listSumNullable(valores);
  return {
    soma,
    alertas: alertasPendenciaCds(pendenciaLoja, cds),
  };
}
