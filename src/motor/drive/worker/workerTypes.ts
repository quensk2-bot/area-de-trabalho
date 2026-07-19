import type { TipoArquivoMotor } from "../catalogoArquivosMotor.ts";

export type WorkerSolicitacaoStatus = "pendente" | "em_execucao" | "concluida" | "falhou" | "cancelada";

export type WorkerPacoteStatus =
  | "aguardando_worker"
  | "baixando"
  | "validando_conteudo"
  | "padronizando"
  | "pronto_motor"
  | "falhou_download"
  | "falhou_validacao"
  | "falhou_padronizacao";

export type WorkerArquivoDb = {
  id: string;
  pacote_id: string;
  drive_file_id: string;
  tipo_arquivo: TipoArquivoMotor | string | null;
  nome_original: string;
  extensao: string | null;
  tamanho_bytes: number | null;
  md5_drive: string | null;
  categoria_tamanho: string | null;
  ordem_processamento: number | null;
  precisa_padronizacao: boolean;
  status: string;
  sha256?: string | null;
  caminho_local_original?: string | null;
  caminho_local_padronizado?: string | null;
  tamanho_baixado_bytes?: number | null;
  hash_validado?: boolean;
  validacao_conteudo_status?: string | null;
  validacao_conteudo_erro?: string | null;
  padronizacao_status?: string | null;
  padronizacao_erro?: string | null;
  baixado_em?: string | null;
  padronizado_em?: string | null;
};

export type WorkerPacoteDb = {
  id: string;
  regional: string;
  /** Futuro (multibandeira): COMPER | FORT — ver bandeiraPacoteMotorPlanejamento.ts */
  competencia: string;
  data_referencia: string;
  status: string;
  hash_metadados_pacote: string | null;
  hash_conteudo_pacote: string | null;
  tamanho_total_bytes: number | null;
  worker_id: string | null;
};

export type WorkerSolicitacaoDb = {
  id: string;
  pacote_id: string;
  tipo: string;
  status: WorkerSolicitacaoStatus;
  prioridade: number;
  tentativa: number;
  max_tentativas: number;
};

export type WorkerClaimPayload = {
  ok: boolean;
  message?: string;
  solicitacao?: WorkerSolicitacaoDb;
  pacote?: WorkerPacoteDb;
  arquivos?: WorkerArquivoDb[];
  pasta?: Record<string, unknown>;
};

export type WorkerArquivoProgresso = {
  id: string;
  nome: string;
  tipoArquivo: string | null;
  bytesBaixados: number;
  tamanhoEsperado: number | null;
  sha256: string | null;
  fase: "pendente" | "baixando" | "validando" | "padronizando" | "concluido" | "erro";
  erro?: string;
};

export type WorkerExecucaoMetricas = {
  arquivosTotal: number;
  arquivosBaixados: number;
  arquivosValidados: number;
  arquivosPadronizados: number;
  bytesBaixados: number;
  bytesTotal: number;
  arquivoAtual: string | null;
  duracaoMs: number;
  erros: string[];
};

export type WorkerJsonReport = {
  pacote_id: string;
  solicitacao_id: string;
  worker_id: string;
  regional: string;
  competencia: string;
  data_referencia: string;
  inicio: string;
  fim: string | null;
  duracao_ms: number;
  arquivos: Array<{
    id: string;
    tipo_arquivo: string | null;
    nome: string;
    sha256: string | null;
    tamanho_baixado_bytes: number | null;
    validacao: string | null;
    padronizacao: string | null;
  }>;
  hashes: {
    metadados: string | null;
    conteudo: string | null;
  };
  validacoes: Record<string, string>;
  padronizacoes: Record<string, string>;
  erros: string[];
  metricas: WorkerExecucaoMetricas;
  status_final: string;
};

export type WorkerRunResult = {
  ok: boolean;
  pacoteId?: string;
  statusFinal?: string;
  message?: string;
  reportPath?: string;
};
