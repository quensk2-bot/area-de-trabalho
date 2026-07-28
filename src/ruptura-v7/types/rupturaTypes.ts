export type ClassificacaoPrazoConsumo =
  | "curto_prazo"
  | "medio_prazo"
  | "longo_prazo"
  | "sem_ruptura"
  | "bloqueado"
  | "dados_incompletos";

export type PrioridadeConsumo = "critico" | "alto" | "medio" | "baixo";

export type QualidadeDadosConsumo =
  | "completo"
  | "completo_com_alertas"
  | "incompleto"
  | "invalido";

export type RupturaProdutoLoja = {
  execucao_id: string;
  regional: string;
  data_referencia: string;
  versao: number;
  loja: number;
  seqproduto: number;
  descricao: string | null;
  cod_fornecedor: number | null;
  razao_fornecedor: string | null;
  rede: string | null;
  comprador: string | null;
  bandeira: string | null;
  divisao: string | null;
  setor_n2: string | null;
  grupo_n3: string | null;
  subgrupo_n4: string | null;
  categoria_n5: string | null;
  estoque_loja: number | null;
  par_min: number | null;
  par_max: number | null;
  media_venda_dia: number | null;
  pendencia_loja: number | null;
  inventario_unidades: number | null;
  classificacao_prazo: ClassificacaoPrazoConsumo | null;
  curto_prazo: number | null;
  medio_prazo: number | null;
  longo_prazo: number | null;
  base_limpa: string | null;
  flag_ruptura: boolean | null;
  ruptura_com_inventario: number | null;
  ruptura_sem_inventario: number | null;
  cross_docking: boolean | null;
  soma_estoque_cd: number | null;
  pendencia_cpa_cd: number | null;
  dias_pedido: number | null;
  dias_ruptura: number | null;
  embalagem_compra: string | null;
  acao_curto_prazo: string | null;
  acao_medio_prazo: string | null;
  acao_recomendada: string | null;
  produto_centralizado: number | null;
  texto_produto_centralizado: string | null;
  posicao_cd_selecionada: number | null;
  codigo_cd_selecionado: number | null;
  status_recebto: string | null;
  status_estoque_cds: string | null;
  status_solicitacao_ativacao_cd: string | null;
  quantidade_cds: number | null;
  qualidade_dados: QualidadeDadosConsumo | null;
  status_operacional: string | null;
  /** Campo de Curto Prazo: flag 0/1 se recebimento próximo. */
  curto_prazo_rebto_proximo: number | null;
  /** Campo de Curto Prazo: flag 0/1 se NÃO recebimento próximo. */
  curto_prazo_nao_rebto_proximo: number | null;
  /** Estoque selecionado CD1 (quantidade). */
  est_selec_inv_cd1: number | null;
  /** Estoque selecionado CD2 (quantidade). */
  est_selec_inv_cd2: number | null;
  /** Estoque selecionado CD3 (quantidade). */
  est_selec_inv_cd3: number | null;
  /** Estoque selecionado CD4 (quantidade). */
  est_selec_inv_cd4: number | null;
  /** Modalidade oficial do Plan 6 CD.txt (ex: CD Armazenagem, ED Direto Loja). */
  modalidade_cd: string | null;
  /** Códigos físicos dos CDs ativos (com estoque), ordenados por código. Ex: [464, 753]. */
  cd_fisicos_ativos: number[] | null;
  /** Códigos físicos dos CDs com recebimento (sem estoque), ordenados por código. Ex: [468]. */
  cd_fisicos_com_recebimento: number[] | null;
};

export const LEGENDA_CLASSIFICACAO: Record<string, string> = {
  curto_prazo:
    "Há possibilidade de solução imediata por estoque disponível ou condição operacional identificada pelo Motor.",
  medio_prazo:
    "Existe pendência de compra ou reposição, mas não há solução imediata classificada como Curto Prazo.",
  longo_prazo:
    "A ruptura não possui solução de Curto ou Médio Prazo identificada.",
  bloqueado:
    "O produto não está elegível para decisão operacional até que uma dependência ou cadastro seja corrigido.",
  sem_ruptura:
    "O produto não foi classificado como ruptura na execução ativa.",
};
