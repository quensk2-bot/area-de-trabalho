export type UniversoLeituraOficial =
  | "base_completa_v7"
  | "base_limpa_elegivel"
  | "base_oficial_elegivel"
  | "ruptura_104c";

export const UNIVERSO_LEITURA_LABEL: Record<UniversoLeituraOficial, string> = {
  base_completa_v7: "Base completa V7",
  base_limpa_elegivel: "Base Limpa elegível",
  base_oficial_elegivel: "Base oficial elegível (planilha)",
  ruptura_104c: "Somente Ruptura 104C",
};

export const UNIVERSO_LEITURA_DEFAULT: UniversoLeituraOficial = "base_oficial_elegivel";

export type ModoApresentacaoVisao360 = "oficial" | "v7";

export type RupturaOficialLoja = {
  regional: string;
  data_referencia: string;
  loja: number;
  universo_leitura: UniversoLeituraOficial;
  versao: number | null;
  total_skus: number;
  total_ruptura: number;
  pct_ruptura: number | null;
  total_curto_prazo: number;
  total_itens_cross: number;
  havia_estoque_no_cd: number | null;
  recebimento_proximo: number | null;
  media_dias_recebimento_cd: number | null;
  pct_curto_prazo: number | null;
  total_medio_prazo: number;
  pedido_maior_30_dias: number;
  pedido_maior_60_dias: number;
  media_dias_pedido: number | null;
  pct_medio_prazo: number | null;
  total_longo_prazo: number;
  ruptura_sem_pedido_periodo: number | null;
  dias_ultimo_pedido_loja: number | null;
  pct_longo_prazo: number | null;
  itens_ruptura_via_inventario: number;
  pct_impacto_inventario: number | null;
  pct_ruptura_sem_inventario: number | null;
  itens_vda_pendencia: number;
  pct_rup_sem_pendencia_vda: number | null;
};

export type RupturaOficialHierarquia = {
  regional: string;
  data_referencia: string;
  loja: number;
  setor: string | null;
  setor2?: string | null;
  categoria?: string | null;
  seqproduto?: number;
  produto?: string | null;
  versao: number | null;
  total_skus: number;
  total_ruptura: number;
  pct_ruptura: number | null;
  total_curto_prazo: number;
  total_itens_cross: number;
  havia_estoque_no_cd: number | null;
  recebimento_proximo: number | null;
  media_dias_recebimento_cd: number | null;
  pct_curto_prazo: number | null;
  total_medio_prazo: number;
  pedido_maior_30_dias: number;
  pedido_maior_60_dias: number;
  media_dias_pedido: number | null;
  pct_medio_prazo: number | null;
  total_longo_prazo: number;
  ruptura_sem_pedido_periodo: number | null;
  dias_ultimo_pedido_loja: number | null;
  pct_longo_prazo: number | null;
  itens_ruptura_via_inventario: number;
  pct_impacto_inventario: number | null;
  pct_ruptura_sem_inventario: number | null;
  itens_vda_pendencia: number;
  pct_rup_sem_pendencia_vda: number | null;
};

export type ReferenciaPlanilhaLoja73 = {
  skus: number;
  ruptura: number;
  pct: number;
  curto_prazo: number;
  itens_cross: number;
  havia_estoque_cd: number;
  rebto_proximo: number;
  medio_prazo: number;
  pedido_30: number;
  pedido_60: number;
  longo_prazo: number;
  rup_inv: number;
  vda_pend: number;
  data_referencia: string;
  observacao: string;
};

export const REFERENCIA_PLANILHA_LOJA73: ReferenciaPlanilhaLoja73 = {
  skus: 8275,
  ruptura: 799,
  pct: 9.66,
  curto_prazo: 149,
  itens_cross: 46,
  havia_estoque_cd: 62,
  rebto_proximo: 41,
  medio_prazo: 580,
  pedido_30: 50,
  pedido_60: 1,
  longo_prazo: 70,
  rup_inv: 55,
  vda_pend: 38,
  data_referencia: "2026-07-18",
  observacao:
    "Referência visual da planilha Capa e Loja (v23.3). Data e universo podem divergir da carga V7 ativa (2026-03-26).",
};

export type CampoNaoPublicado = {
  colunaOficial: string;
  origemNecessaria: string;
};

export const CAMPOS_NAO_PUBLICADOS: CampoNaoPublicado[] = [
  { colunaOficial: "Mod_CurtoPrazo", origemNecessaria: "consolidado.modCurtoPrazo (persistir: nao)" },
  { colunaOficial: "NCurtoPrazo", origemNecessaria: "consolidado.ncurtoPrazo (persistir: nao)" },
  { colunaOficial: "Cross (EST_SELECINV)", origemNecessaria: "consolidado.crossSum (persistir: nao)" },
  { colunaOficial: "Curto Prazo Rebto Próximo", origemNecessaria: "consolidado — nao mapeado no DM" },
  { colunaOficial: "Curto Prazo Não Rebto Próximo / Havia estoque CD", origemNecessaria: "consolidado — nao mapeado no DM" },
  { colunaOficial: "Rup (X) Dias Recebto Maior data", origemNecessaria: "consolidado + CDs — nao persistido" },
  { colunaOficial: "Avaliar Pedido / Pendência Indevida", origemNecessaria: "derivados de Dias Pedido — nao persistidos" },
  { colunaOficial: "Último Pedido Loja", origemNecessaria: "consolidado — nao mapeado no DM" },
  { colunaOficial: "Ativação e Ruptura > 30 Dias Sem Pedido", origemNecessaria: "consolidado — nao mapeado no DM" },
  { colunaOficial: "Dias Ativação Revisado", origemNecessaria: "consolidado — nao mapeado no DM" },
];
