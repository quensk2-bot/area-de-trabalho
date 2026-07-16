import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";

export function aplicarRuleRuptura104c(input: MotorBreItemInput): MotorRegraResultado {
  const ruptura104c = input.validacao?.ruptura104c === true;
  const menorQueTres = ruptura104c ? 1 : 0;

  return {
    regra: "ruptura_104c_menor_que_tres",
    status: "aplicada",
    resultado: menorQueTres,
    entradasUtilizadas: {
      ruptura104c,
      estoqueLoja: input.produto.estoqueLoja,
      validacaoEncontrada: input.validacao != null,
    },
    motivo: ruptura104c
      ? "Menor que três Unidades = 1 (derivado de Ruptura 104C no fluxo principal)"
      : "Menor que três Unidades = 0 — não é ruptura 104C",
    alertas: [],
    dependenciasAusentes: input.validacao ? [] : [{ nome: "validacao_ruptura", descricao: "Validação Ruptura para 104C" }],
  };
}

export function aplicarRuleMenorQueTresCentralizados(estoqueLoja: number | null, statusAtivo60: boolean): MotorRegraResultado {
  const menorPorEstoque = estoqueLoja != null && estoqueLoja <= 2 ? 1 : 0;
  const resultado = statusAtivo60 ? 0 : menorPorEstoque;

  return {
    regra: "menor_que_tres_centralizados",
    status: "aplicada",
    resultado,
    entradasUtilizadas: {
      estoqueLoja: estoqueLoja ?? null,
      statusAtivo60,
    },
    motivo: "Fluxo Centralizados — NÃO misturar com fluxo principal",
    alertas: [{ codigo: "FLUXO_AUXILIAR", mensagem: "Regra auxiliar Centralizados isolada do fluxo principal", severidade: "info" }],
    dependenciasAusentes: [],
  };
}
