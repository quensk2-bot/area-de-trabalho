import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";
import { SETORES_EXCLUIDOS_SETOR, SETORES_EXCLUIDOS_SETOR2 } from "../breTypes.ts";

/**
 * PQ literal (1º Grupo de Ruptura → BaseLimpa):
 * usa [Flag Ruptura] do left join com Validação Ruptura (tabela filtrada mix=1).
 * null → "Não considera Ruptura"; demais casos → "Base Limpa".
 */
function resolverFlagRupturaPq(input: MotorBreItemInput): {
  matchValidacaoRuptura: boolean;
  flagRupturaNull: boolean;
  flagRuptura: "Gera Ruptura" | null;
  origemFlagRuptura: "validacao_ruptura_join" | "join_ausente" | "validacao_sem_match_pq";
} {
  const matchValidacaoRuptura = input.validacao?.qtdItemRupturaNoMix === 1;
  const flagRupturaNull = !matchValidacaoRuptura;
  const origemFlagRuptura = matchValidacaoRuptura
    ? "validacao_ruptura_join"
    : input.validacao == null
      ? "join_ausente"
      : "validacao_sem_match_pq";

  return {
    matchValidacaoRuptura,
    flagRupturaNull,
    flagRuptura: matchValidacaoRuptura ? "Gera Ruptura" : null,
    origemFlagRuptura,
  };
}

export function aplicarRuleBaseLimpa(input: MotorBreItemInput): MotorRegraResultado {
  const setor2 = input.produto.hierarquia.setorN2;
  const setor = input.produto.hierarquia.divisao;
  const { matchValidacaoRuptura, flagRupturaNull, flagRuptura, origemFlagRuptura } =
    resolverFlagRupturaPq(input);

  const entradas = {
    setor2: setor2 ?? null,
    setor: setor ?? null,
    flagRuptura,
    matchValidacaoRuptura,
    flagRupturaNull,
    origemFlagRuptura,
  };

  if (setor2 && SETORES_EXCLUIDOS_SETOR2.has(setor2)) {
    return {
      regra: "base_limpa",
      status: "aplicada",
      resultado: "Não considera Ruptura",
      entradasUtilizadas: { ...entradas, motivoBaseLimpa: `SETOR2 ${setor2} excluído por lista oficial` },
      motivo: `SETOR2 ${setor2} excluído por lista oficial`,
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (setor && SETORES_EXCLUIDOS_SETOR.has(setor)) {
    return {
      regra: "base_limpa",
      status: "aplicada",
      resultado: "Não considera Ruptura",
      entradasUtilizadas: { ...entradas, motivoBaseLimpa: `SETOR ${setor} excluído por lista oficial` },
      motivo: `SETOR ${setor} excluído por lista oficial`,
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (flagRupturaNull) {
    return {
      regra: "base_limpa",
      status: "aplicada",
      resultado: "Não considera Ruptura",
      entradasUtilizadas: {
        ...entradas,
        motivoBaseLimpa: "Flag Ruptura null (sem match Validação Ruptura filtrada mix=1)",
      },
      motivo: "Flag Ruptura ausente (validação não encontrada)",
      alertas: [{ codigo: "FLAG_RUPTURA_AUSENTE", mensagem: "Validação Ruptura ausente para o par loja+produto", severidade: "aviso" }],
      dependenciasAusentes: input.validacao ? [] : [{ nome: "validacao_ruptura", descricao: "Join Validação Ruptura" }],
    };
  }

  return {
    regra: "base_limpa",
    status: "aplicada",
    resultado: "Base Limpa",
    entradasUtilizadas: { ...entradas, motivoBaseLimpa: "Produto elegível à Base Limpa" },
    motivo: "Produto elegível à Base Limpa",
    alertas: [],
    dependenciasAusentes: [],
  };
}
