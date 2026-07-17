import type { MotorAlerta } from "../breTypes.ts";
import type { MotorMenorRecebimentoResultado, MotorStatusRecebtoResultado } from "./centralizacaoTypes.ts";
import {
  LIMITE_MOVIMENTACAO_120_DIAS,
  TEXTO_STATUS_RECEBTO_COM_MOV,
  TEXTO_STATUS_RECEBTO_SEM_MOV,
} from "./centralizacaoUtils.ts";

export function calcularStatusRecebto(menor: MotorMenorRecebimentoResultado): MotorStatusRecebtoResultado {
  const original = menor.menorDiasRecebimentoOriginal;
  let texto: string;

  if (original == null) {
    texto = TEXTO_STATUS_RECEBTO_SEM_MOV;
  } else if (original < LIMITE_MOVIMENTACAO_120_DIAS) {
    texto = TEXTO_STATUS_RECEBTO_COM_MOV;
  } else {
    texto = TEXTO_STATUS_RECEBTO_SEM_MOV;
  }

  return {
    texto,
    statusRegra: "aplicada",
    alertas: [] as MotorAlerta[],
  };
}

export function statusRecebtoComMovimentacao(texto: string): boolean {
  return texto === TEXTO_STATUS_RECEBTO_COM_MOV;
}
