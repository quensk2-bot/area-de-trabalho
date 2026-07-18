import type { SupabaseClient } from "@supabase/supabase-js";
import type { DmLote, DmProdutoLoja, DmProdutoLojaCd } from "../datamart/dmTypes.ts";

/** Fonte unica de publicacao — alias do contrato Fase 3A. */
export type MotorDataMartLote = DmLote;

export type MotorV7Db = SupabaseClient;

export type ClassificacaoPrazoDb =
  | "curto_prazo"
  | "medio_prazo"
  | "longo_prazo"
  | "sem_ruptura"
  | "bloqueado"
  | "dados_incompletos"
  | null;

export type ExecucaoMotorStatusDb =
  | "criada"
  | "processando"
  | "concluida"
  | "erro"
  | "erro_parcial"
  | "substituida"
  | "excluida";

export type ExecucaoMotorRowInsert = {
  data_referencia: string;
  regional: string;
  versao: number;
  hash_pacote: string;
  quantidade_arquivos: number;
  quantidade_registros: number;
  quantidade_erros: number;
  status: ExecucaoMotorStatusDb;
  versao_ativa: boolean;
};

export type ExecucaoMotorRow = ExecucaoMotorRowInsert & {
  id: string;
  finalizado_em: string | null;
  duracao_ms: number | null;
  substitui_execucao_id: string | null;
};

export type DmProdutoLojaRowInsert = {
  execucao_motor_id: string;
  data_referencia: string;
  regional: string;
  bandeira: string | null;
  loja: number;
  seqproduto: number;
  descricao: string | null;
  cod_fornecedor: number | null;
  fornecedor: string | null;
  status_produto: string | null;
  familia: number | null;
  divisao: string | null;
  setor_codigo: string | null;
  setor_nome: string | null;
  categoria_n1: string | null;
  setor_n2: string | null;
  grupo_n3: string | null;
  subgrupo_n4: string | null;
  tipo_n5: string | null;
  media_venda_un_dia: number | null;
  media_venda_gp: number | null;
  estoque_loja: number | null;
  par_min: number | null;
  par_max: number | null;
  pendencia_loja: number | null;
  dias_ruptura: number | null;
  ultima_entrada_loja: string | null;
  ultima_saida_loja: string | null;
  soma_estoque_cd: number | null;
  cross_docking: boolean | null;
  flag_ruptura: boolean | null;
  ruptura_104c: boolean | null;
  inventario_unid: number | null;
  status_base_limpa: string | null;
  classificacao_prazo: ClassificacaoPrazoDb;
  rede: string | null;
  comprador: string | null;
  cobertura_dias: number | null;
  status_operacional: string | null;
  qtde_emb_compra: number | null;
  embalagem_compra: string | null;
  custo_liquido: number | null;
  peso_unid: number | null;
  m3_unid: number | null;
  cd_sugerido: number | null;
  dias_pedido: number | null;
  acao_curto_prazo: string | null;
  acao_medio_prazo: string | null;
  texto_produto_centralizado: string | null;
  produto_centralizado: number | null;
  posicao_cd_selecionada: number | null;
  codigo_cd_selecionado: number | null;
  status_recebto: string | null;
  status_estoque_cds: string | null;
  status_solicitacao_ativacao_cd: string | null;
  qualidade_dados: string | null;
  quantidade_cds: number;
  curto_prazo: number | null;
  medio_prazo: number | null;
  longo_prazo: number | null;
  pendencia_cpa_cd: number | null;
  versao: number;
  versao_ativa: boolean;
};

export type DmProdutoLojaRow = DmProdutoLojaRowInsert & { id: string };

export type DmProdutoLojaCdRowInsert = {
  execucao_motor_id: string;
  produto_loja_id: string;
  regional: string;
  data_referencia: string;
  loja: number;
  seqproduto: number;
  posicao_logica: number;
  codigo_cd_fisico: number | null;
  estoque: number | null;
  pendencia: number | null;
  status_compra: string | null;
  dias_compra: number | null;
  dias_recebimento: number | null;
  flag_centralizacao: boolean;
  origem_arquivo: string | null;
  numero_bloco: number | null;
  posicao_no_arquivo: number | null;
  versao: number;
  versao_ativa: boolean;
};

export type PersistenciaEntrada = {
  regional: string;
  dataReferencia: string;
  hashPacote: string;
  versao: number;
  lote: MotorDataMartLote;
  quantidadeArquivos?: number;
  duracaoMs?: number;
};

export type PersistenciaResultado =
  | {
      status: "persistida";
      execucaoMotorId: string;
      versao: number;
      quantidadeProdutos: number;
      quantidadeCds: number;
    }
  | {
      status: "ignorada_duplicada";
      execucaoMotorId: string;
      versao: number;
      hashPacote: string;
    }
  | {
      status: "bloqueada_concorrencia";
      mensagem: string;
    };

export type PersistenciaValidacaoErro = {
  codigo: string;
  mensagem: string;
  loja?: number;
  seqproduto?: number;
  posicaoLogica?: number;
};

export type PersistenciaValidacaoResultado = {
  valido: boolean;
  erros: PersistenciaValidacaoErro[];
};

export type PersistenciaMetricas = {
  produtosInseridos: number;
  cdsInseridos: number;
  duracaoMs: number;
};

export type ChaveProdutoLojaPersistencia = Pick<DmProdutoLoja, "regional" | "dataReferencia" | "loja" | "seqproduto">;

export type ChaveCdPersistencia = ChaveProdutoLojaPersistencia & Pick<DmProdutoLojaCd, "posicaoLogica">;
