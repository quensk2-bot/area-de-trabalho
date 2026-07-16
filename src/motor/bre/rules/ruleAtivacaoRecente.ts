import type { MotorRegraResultado } from "../breTypes.ts";

const DIAS_LIMITE_ATIVACAO = 60;
const DIAS_NULL_FALLBACK = 999;

export function calcularDiasAtivacaoRevisado(
  dtaUltAtivacao: string | null,
  dataReferencia: string,
): number {
  if (dtaUltAtivacao == null || dtaUltAtivacao.trim() === "") return DIAS_NULL_FALLBACK;
  const primeiros10 = dtaUltAtivacao.trim().slice(0, 10);
  const ref = new Date(`${dataReferencia}T00:00:00`);
  const ativacao = new Date(`${primeiros10}T00:00:00`);
  if (Number.isNaN(ref.getTime()) || Number.isNaN(ativacao.getTime())) return DIAS_NULL_FALLBACK;
  const diffMs = ref.getTime() - ativacao.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function aplicarRuleAtivacaoRecente(
  dtaUltAtivacao: string | null,
  dataReferencia: string,
): MotorRegraResultado {
  const dias = calcularDiasAtivacaoRevisado(dtaUltAtivacao, dataReferencia);
  const ativo60 = dias < DIAS_LIMITE_ATIVACAO;

  return {
    regra: "ativacao_recente",
    status: "aplicada",
    resultado: ativo60,
    entradasUtilizadas: {
      dtaUltAtivacao: dtaUltAtivacao ?? null,
      dataReferencia,
      diasAtivacaoRevisado: dias,
    },
    motivo: ativo60 ? "Ativado nos últimos 60 dias" : "Ativação anterior a 60 dias ou ausente",
    alertas: dias === DIAS_NULL_FALLBACK ? [{ codigo: "ATIVACAO_NULL", mensagem: "DTA_ULTATIVACAO ausente — usando 999 dias", severidade: "info" }] : [],
    dependenciasAusentes: [],
  };
}
