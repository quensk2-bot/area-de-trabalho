import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";
import { SETORES_EXCLUIDOS_SETOR, SETORES_EXCLUIDOS_SETOR2 } from "../breTypes.ts";

export function aplicarRuleBaseLimpa(input: MotorBreItemInput): MotorRegraResultado {
  const setor2 = input.produto.hierarquia.setorN2;
  const setor = input.produto.hierarquia.divisao;
  const flagRuptura = input.validacao?.geraRuptura === true ? "Gera Ruptura" : input.validacao ? "Não Gera Ruptura" : null;

  const entradas = {
    setor2: setor2 ?? null,
    setor: setor ?? null,
    flagRuptura,
  };

  if (setor2 && SETORES_EXCLUIDOS_SETOR2.has(setor2)) {
    return {
      regra: "base_limpa",
      status: "aplicada",
      resultado: "Não considera Ruptura",
      entradasUtilizadas: entradas,
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
      entradasUtilizadas: entradas,
      motivo: `SETOR ${setor} excluído por lista oficial`,
      alertas: [],
      dependenciasAusentes: [],
    };
  }

  if (flagRuptura == null) {
    return {
      regra: "base_limpa",
      status: "aplicada",
      resultado: "Não considera Ruptura",
      entradasUtilizadas: entradas,
      motivo: "Flag Ruptura ausente (validação não encontrada)",
      alertas: [{ codigo: "FLAG_RUPTURA_AUSENTE", mensagem: "Validação Ruptura ausente para o par loja+produto", severidade: "aviso" }],
      dependenciasAusentes: input.validacao ? [] : [{ nome: "validacao_ruptura", descricao: "Join Validação Ruptura" }],
    };
  }

  return {
    regra: "base_limpa",
    status: "aplicada",
    resultado: "Base Limpa",
    entradasUtilizadas: entradas,
    motivo: "Produto elegível à Base Limpa",
    alertas: [],
    dependenciasAusentes: [],
  };
}
