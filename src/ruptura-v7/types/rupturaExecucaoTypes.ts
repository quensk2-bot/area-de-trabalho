export type RupturaExecucaoAtiva = {
  execucao_id: string;
  regional: string;
  data_referencia: string;
  versao: number;
  status: string;
  versao_ativa: boolean;
  hash_pacote: string;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_ms: number | null;
  total_produtos: number;
  total_cds: number;
  total_chunks: number;
  chunks_concluidos: number;
  criado_em: string;
};

export type RupturaExecucao = RupturaExecucaoAtiva & {
  chunks_falhos: number;
  substitui_execucao_id: string | null;
};
