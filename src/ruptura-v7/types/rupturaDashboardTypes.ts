export type RupturaDashboardLoja = {
  regional: string;
  data_referencia: string;
  loja: number;
  total_produtos: number;
  /** Operacional CP+MP+LP+bloqueados */
  total_em_ruptura: number;
  total_ruptura_geral: number;
  total_ruptura_classificada: number;
  total_curto_prazo: number;
  total_medio_prazo: number;
  total_longo_prazo: number;
  total_sem_ruptura: number;
  total_bloqueado: number;
  total_qualidade_alerta: number;
  total_com_estoque_cd: number;
  total_sem_estoque_cd: number;
  total_com_pendencia: number;
  total_cross_docking: number;
  total_centralizado: number;
  total_nao_centralizado: number;
  compradores_distintos: number;
  fornecedores_distintos: number;
  total_base_limpa_elegivel: number;
  /** @deprecated use percentual_ruptura_geral */
  percentual_ruptura: number | null;
  percentual_ruptura_geral: number | null;
  percentual_ruptura_classificada: number | null;
};

export type RupturaDashboardSetor = {
  regional: string;
  data_referencia: string;
  loja: number;
  divisao: string | null;
  setor_n2: string | null;
  total_produtos: number;
  total_ruptura: number;
  curto_prazo: number;
  medio_prazo: number;
  longo_prazo: number;
  bloqueados: number;
  total_base_limpa_elegivel: number;
  percentual_ruptura: number | null;
};

export type RupturaDashboardFornecedor = {
  regional: string;
  data_referencia: string;
  loja: number;
  cod_fornecedor: number | null;
  razao_fornecedor: string | null;
  rede: string | null;
  comprador: string | null;
  total_produtos: number;
  total_ruptura: number;
  curto_prazo: number;
  medio_prazo: number;
  longo_prazo: number;
  total_com_pendencia: number;
  total_sem_estoque_cd: number;
  total_base_limpa_elegivel: number;
  percentual_ruptura: number | null;
};

export type RupturaCdEstoqueAgregado = {
  codigo_cd_fisico: number | null;
  posicao_logica: number;
  total_estoque: number;
  total_produtos: number;
};
