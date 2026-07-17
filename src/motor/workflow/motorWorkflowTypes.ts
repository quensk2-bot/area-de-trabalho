export const MOTOR_REGIONAIS = ["MT", "MS", "DF", "GO", "SC", "RS", "SP", "MG"] as const;

export type MotorRegional = (typeof MOTOR_REGIONAIS)[number];

export type MotorWorkflowFaseStatus =
  | "nao_iniciada"
  | "disponivel"
  | "em_andamento"
  | "concluida"
  | "concluida_com_alertas"
  | "bloqueada"
  | "erro";

export type MotorWorkflowFaseId =
  | "selecionar_regional_data"
  | "enviar_arquivos_originais"
  | "validar_pacote_arquivos"
  | "padronizar_planilhas"
  | "validar_planilhas_padronizadas"
  | "executar_parser"
  | "executar_transformacoes"
  | "executar_bre"
  | "validar_excel_v7"
  | "executar_consolidacao"
  | "publicar_data_mart"
  | "gerar_indicadores"
  | "liberar_views"
  | "disponibilizar_modulos";

export type MotorWorkflowFaseDefinicao = {
  id: MotorWorkflowFaseId;
  codigo: string;
  titulo: string;
  descricao: string;
  objetivo: string;
  oQueFazer: string;
  arquivosNecessarios: string[];
  preRequisitos: string[];
  resultadoEsperado: string[];
  proximoPassoId: MotorWorkflowFaseId | null;
  acaoPrincipal: string;
  ajudaContextual: string;
  mensagemSucesso: string;
  mensagemErro: string;
  /** Fase implementada no V7 nesta etapa */
  implementada: boolean;
  /** Percentual de implementação técnica (0–100) */
  percentualImplementacao: number;
};

export type MotorWorkflowFaseEstado = {
  definicao: MotorWorkflowFaseDefinicao;
  status: MotorWorkflowFaseStatus;
  percentual: number;
  pendencias: string[];
  motivoBloqueio: string | null;
  alertas: string[];
};

export type MotorWorkflowContexto = {
  regional: MotorRegional | null;
  dataReferencia: string | null;
  arquivosOriginaisEnviados: string[];
  arquivosPadronizados: string[];
  pacoteValidado: boolean;
  parserExecutado: boolean;
  transformacoesExecutadas: boolean;
  breExecutado: boolean;
  excelV7Validado: boolean;
};

export type MotorIdempotenciaChave = {
  regional: MotorRegional;
  dataReferencia: string;
  tipoArquivo: string;
  hashSha256: string;
};
