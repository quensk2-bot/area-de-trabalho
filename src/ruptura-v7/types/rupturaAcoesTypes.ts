import type { ClassificacaoPrazoConsumo, PrioridadeConsumo, QualidadeDadosConsumo } from "./rupturaTypes.ts";

export type RupturaCentralAcao = {
  regional: string;
  data_referencia: string;
  loja: number;
  seqproduto: number;
  descricao: string | null;
  fornecedor: string | null;
  rede: string | null;
  comprador: string | null;
  classificacao_prazo: ClassificacaoPrazoConsumo | null;
  acao_recomendada: string | null;
  prioridade: PrioridadeConsumo;
  estoque_loja: number | null;
  soma_estoque_cd: number | null;
  pendencia_cpa_cd: number | null;
  dias_pedido: number | null;
  codigo_cd_selecionado: number | null;
  status_estoque_cds: string | null;
  status_recebto: string | null;
  status_solicitacao_ativacao_cd: string | null;
  qualidade_dados: QualidadeDadosConsumo | null;
  status_operacional: string | null;
};

export type FilaCentralAcao =
  | "acao_imediata"
  | "aguardar_recebimento"
  | "pedido_necessario"
  | "ativacao_cd"
  | "cadastro_bloqueado"
  | "medio_prazo"
  | "longo_prazo";

export const FILAS_CENTRAL_ACOES: { id: FilaCentralAcao; label: string }[] = [
  { id: "acao_imediata", label: "Ação imediata" },
  { id: "aguardar_recebimento", label: "Aguardar recebimento" },
  { id: "pedido_necessario", label: "Pedido necessário" },
  { id: "ativacao_cd", label: "Ativação de CD" },
  { id: "cadastro_bloqueado", label: "Cadastro bloqueado" },
  { id: "medio_prazo", label: "Médio Prazo" },
  { id: "longo_prazo", label: "Longo Prazo" },
];

/** regra_de_consumo: mapeamento operacional para filas da UI (nao e regra BRE). */
export function classificarFilaCentralAcao(item: RupturaCentralAcao): FilaCentralAcao {
  if (item.classificacao_prazo === "bloqueado") return "cadastro_bloqueado";
  if (item.classificacao_prazo === "longo_prazo") return "longo_prazo";
  if (item.classificacao_prazo === "medio_prazo") return "medio_prazo";
  if (item.status_solicitacao_ativacao_cd) return "ativacao_cd";
  if (item.status_recebto && /receb/i.test(item.status_recebto)) return "aguardar_recebimento";
  if (item.classificacao_prazo === "curto_prazo") {
    if (item.pendencia_cpa_cd && item.pendencia_cpa_cd > 0) return "pedido_necessario";
    return "acao_imediata";
  }
  return "medio_prazo";
}
