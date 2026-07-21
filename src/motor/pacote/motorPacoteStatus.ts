/** Status granulares do pacote durante processamento Motor (Fase 4C.4). */
export type MotorPacoteStatusProcessamento =
  | "pronto_motor"
  | "processando_parser"
  | "processando_transformacao"
  | "processando_bre"
  | "processando_consolidacao"
  | "gerando_datamart"
  | "persistindo"
  | "ativando"
  | "gerando_planilha"
  | "concluido"
  | "falhou";

export const TRANSICOES_MOTOR_PACOTE: Readonly<Record<string, ReadonlySet<string>>> = {
  pronto_motor: new Set(["processando_parser", "falhou"]),
  processando_parser: new Set(["processando_transformacao", "processando_bre", "falhou"]),
  processando_transformacao: new Set(["processando_bre", "falhou"]),
  processando_bre: new Set(["processando_consolidacao", "falhou"]),
  processando_consolidacao: new Set(["gerando_datamart", "falhou"]),
  gerando_datamart: new Set(["persistindo", "falhou"]),
  persistindo: new Set(["ativando", "falhou"]),
  ativando: new Set(["gerando_planilha", "falhou"]),
  gerando_planilha: new Set(["concluido", "falhou"]),
  concluido: new Set(["concluido"]),
  falhou: new Set(["pronto_motor", "processando_parser", "falhou"]),
};

export function validarTransicaoMotorPacote(atual: string, proximo: string): boolean {
  const permitidos = TRANSICOES_MOTOR_PACOTE[atual];
  if (!permitidos) return true;
  return permitidos.has(proximo);
}

export function rotuloEtapaMotor(status: string): string {
  const mapa: Record<string, string> = {
    pronto_motor: "Pronto para Motor",
    processando_parser: "Parser",
    processando_transformacao: "Transformação",
    processando_bre: "BRE",
    processando_consolidacao: "Consolidador",
    gerando_datamart: "Data Mart",
    persistindo: "Persistência",
    ativando: "Ativação",
    gerando_planilha: "Planilha padrão",
    concluido: "Concluído",
    falhou: "Falhou",
  };
  return mapa[status] ?? status;
}
