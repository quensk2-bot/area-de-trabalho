/**
 * Planejamento multibandeira — NÃO USADO EM RUNTIME na Fase 4C.3.
 *
 * Decisão: pacotes MT separados COMPER / FORT; arquivos com mesmo nome
 * exigem identidade por regional + bandeira + competência + data_referencia + hash.
 *
 * Ver: architecture/motor-operacional-v7/FASE-MULTIBANDEIRA-PLANEJAMENTO.md
 */

/** Bandeiras operacionais de pacote (execução Motor). */
export const BANDEIRAS_PACOTE_MOTOR = ["COMPER", "FORT"] as const;

/** Pasta Drive de arquivos comuns entre bandeiras. */
export const BANDEIRA_PASTA_COMPARTILHADOS = "COMPARTILHADOS" as const;

/** Valor sentinela para origem de arquivo vinda da pasta compartilhada. */
export const BANDEIRA_ORIGEM_COMPARTILHADO = "COMPARTILHADO" as const;

export type BandeiraPacoteMotor = (typeof BANDEIRAS_PACOTE_MOTOR)[number];

export type BandeiraOrigemArquivo = BandeiraPacoteMotor | typeof BANDEIRA_ORIGEM_COMPARTILHADO;

/** Chave lógica futura — ainda não persistida em 4C.3. */
export type ChavePacoteMotorFutura = {
  regional: string;
  bandeira: BandeiraPacoteMotor;
  competencia: string;
  dataReferencia: string;
  hashPacote: string;
};

export function formatarChavePacoteMotorFutura(chave: ChavePacoteMotorFutura): string {
  return [chave.regional, chave.bandeira, chave.competencia, chave.dataReferencia, chave.hashPacote].join("|");
}

/**
 * Segmentos Drive futuros (com bandeira).
 * MT atual usa segmentosPastaMotorOriginais() sem bandeira — ver catalogoArquivosMotor.ts.
 */
export function segmentosPastaMotorOriginaisComBandeira(
  regional: string,
  ano: number,
  mes: number,
  bandeira: BandeiraPacoteMotor | typeof BANDEIRA_PASTA_COMPARTILHADOS,
): string[] {
  return [
    "V7",
    "Motor Operacional",
    regional.toUpperCase(),
    String(ano),
    String(mes).padStart(2, "0"),
    bandeira,
    "originais",
  ];
}

/** Idempotência futura (padronização / execução Motor). */
export function montarChaveIdempotenciaMotorFutura(params: {
  regional: string;
  bandeira: BandeiraPacoteMotor;
  dataReferencia: string;
  tipoArquivo: string;
  hashSha256: string;
}): string {
  return [
    params.regional.toUpperCase(),
    params.bandeira,
    params.dataReferencia,
    params.tipoArquivo,
    params.hashSha256,
  ].join("|");
}

export function isBandeiraPacoteMotor(value: string): value is BandeiraPacoteMotor {
  return (BANDEIRAS_PACOTE_MOTOR as readonly string[]).includes(value.toUpperCase());
}
