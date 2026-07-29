/**
 * Domínio visual da tela Longo Prazo.
 * Centraliza regras de apresentação, derivação visual, cards e prioridade.
 *
 * Fonte oficial: longoPrazo = 1 (Motor/BRE).
 * Não recalcular classificação de prazo no frontend.
 *
 * A ação visual é DERIVADA (não oficial) — orientação operacional V7.
 * Não altera longoPrazo nem cria campo oficial no Motor.
 *
 * Campos de CD de abastecimento e Situação da ativação são campos
 * adicionais do V7, não reproduzidos do Power Query/planilha de validação.
 */

// ---------------------------------------------------------------------------
// 1. Tipos dos cards (podem se sobrepor — indicadores operacionais)
// ---------------------------------------------------------------------------

export type GrupoCardLp =
  | "total_longo_prazo"
  | "ativacao_30_sem_pedido"
  | "sem_pedido"
  | "ultimo_pedido_acima_60";

export const CARD_LABEL_LP: Record<GrupoCardLp, string> = {
  total_longo_prazo: "Total Longo Prazo",
  ativacao_30_sem_pedido: "Ativação >30 sem pedido",
  sem_pedido: "Sem pedido",
  ultimo_pedido_acima_60: "Último pedido >60 dias",
};

export const CARD_TONE_LP: Record<GrupoCardLp, "ok" | "warn" | "danger" | "neutral" | "orange"> = {
  total_longo_prazo: "orange",
  ativacao_30_sem_pedido: "danger",
  sem_pedido: "danger",
  ultimo_pedido_acima_60: "warn",
};

export type CardCountsLp = Record<GrupoCardLp, number>;

/**
 * Contagem dos cards operacionais.
 * ATENÇÃO: os cards podem se sobrepor (um produto pode estar em múltiplos cards).
 * Não afirmar que a soma dos cards 2+3+4 = card 1.
 */
export function contarCardsLp(
  produtos: {
    ativacaoRuptura30SemPedido?: number | boolean | null;
    ultimoPedidoLojaPq?: number | null;
  }[],
): CardCountsLp {
  const counts: CardCountsLp = {
    total_longo_prazo: produtos.length,
    ativacao_30_sem_pedido: 0,
    sem_pedido: 0,
    ultimo_pedido_acima_60: 0,
  };

  for (const p of produtos) {
    const ativ = p.ativacaoRuptura30SemPedido;
    const ultPed = p.ultimoPedidoLojaPq;

    if (ativ === 1 || ativ === true) counts.ativacao_30_sem_pedido++;
    if (ultPed === 999 || ultPed == null) counts.sem_pedido++;
    if (ultPed != null && ultPed !== 999 && ultPed > 60) counts.ultimo_pedido_acima_60++;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// 2. Ação visual EXCLUSIVA (cada produto em UMA ação apenas)
// ---------------------------------------------------------------------------

export type AcaoVisualLp =
  | "revisar_ativacao_cd"
  | "produto_sem_pedido"
  | "ultimo_pedido_antigo"
  | "ruptura_antiga"
  | "sem_acao_definida";

export type PrioridadeVisualLp = "critica" | "alerta_alta" | "alerta" | "neutra";

export function acaoVisualLp(p: {
  ativacaoRuptura30SemPedido?: number | boolean | null;
  ultimoPedidoLojaPq?: number | null;
  diasRuptura?: number | null;
}): AcaoVisualLp {
  const ativ = p.ativacaoRuptura30SemPedido;
  const ultPed = p.ultimoPedidoLojaPq;
  const diasRup = p.diasRuptura ?? 0;

  if (ativ === 1 || ativ === true) return "revisar_ativacao_cd";
  if (ultPed === 999 || ultPed == null) return "produto_sem_pedido";
  if (ultPed > 60) return "ultimo_pedido_antigo";
  if (diasRup > 30) return "ruptura_antiga";
  return "sem_acao_definida";
}

export const ACAO_VISUAL_LABEL: Record<AcaoVisualLp, string> = {
  revisar_ativacao_cd: "Revisar ativação CD",
  produto_sem_pedido: "Produto sem pedido",
  ultimo_pedido_antigo: "Último pedido antigo",
  ruptura_antiga: "Ruptura antiga",
  sem_acao_definida: "Sem ação definida",
};

export const ACAO_VISUAL_BADGE: Record<AcaoVisualLp, string> = {
  revisar_ativacao_cd: "Revisar ativ.",
  produto_sem_pedido: "Sem pedido",
  ultimo_pedido_antigo: "Pedido antigo",
  ruptura_antiga: "Ruptura antiga",
  sem_acao_definida: "Sem ação",
};

export const ACAO_VISUAL_PRIORIDADE: Record<AcaoVisualLp, PrioridadeVisualLp> = {
  revisar_ativacao_cd: "critica",
  produto_sem_pedido: "critica",
  ultimo_pedido_antigo: "alerta_alta",
  ruptura_antiga: "alerta",
  sem_acao_definida: "neutra",
};

export const PRIORIDADE_LABEL_LP: Record<PrioridadeVisualLp, string> = {
  critica: "Crítico",
  alerta_alta: "Atenção Alta",
  alerta: "Alerta",
  neutra: "—",
};

export const PRIORIDADE_TONE_LP: Record<PrioridadeVisualLp, "danger" | "warn" | "neutral"> = {
  critica: "danger",
  alerta_alta: "warn",
  alerta: "warn",
  neutra: "neutral",
};

// ---------------------------------------------------------------------------
// 3. Explicação operacional
// ---------------------------------------------------------------------------

export function explicarAcaoVisualLp(acao: AcaoVisualLp): string {
  switch (acao) {
    case "revisar_ativacao_cd":
      return "Produto com ativação antiga (>30 dias) e sem pedido. Priorizar revisão da ativação no CD.";
    case "produto_sem_pedido":
      return "Produto sem pedido registrado (último pedido = 999 ou ausente). Avaliar necessidade de novo pedido.";
    case "ultimo_pedido_antigo":
      return "Último pedido realizado há mais de 60 dias. Avaliar cancelamento ou reemissão.";
    case "ruptura_antiga":
      return "Produto em ruptura há mais de 30 dias sem solução de curto ou médio prazo. Revisar estratégia.";
    case "sem_acao_definida":
      return "Produto classificado como Longo Prazo pelo Motor. Nenhuma ação visual específica identificada.";
  }
}

// ---------------------------------------------------------------------------
// 4. Modalidade oficial — reexport da regra do Plan 6
// ---------------------------------------------------------------------------

export { formatarModalidade } from "./medioPrazoPresentation.ts";

// ---------------------------------------------------------------------------
// 5. CD de abastecimento (coluna Centralização renomeada)
// ---------------------------------------------------------------------------

/**
 * Apresenta o CD de abastecimento do produto.
 *
 * produtoCentralizado contém o código FÍSICO do CD (ex: 464, 468, 905)
 * que tem o menor recebimento para o produto — ou null quando não há
 * CD definido para abastecimento direto.
 *
 * Regra visual (campo adicional V7, não reproduzido do Power Query):
 *
 * produtoCentralizado > 0   → "CD 464", "CD 468"
 * null/0  + ED Direto Loja → "Direto Loja"
 * null/0  + outra modalidade → "CD não definido"
 *
 * Tooltip: "Código do CD associado ao abastecimento do produto."
 */
export function formatarCdAbastecimento(
  produtoCentralizado: number | boolean | null | undefined,
  modalidadeCd: string | null | undefined,
): string {
  const cdNum = produtoCentralizado != null ? Number(produtoCentralizado) : 0;
  if (Number.isFinite(cdNum) && cdNum > 0) {
    return `CD ${cdNum}`;
  }
  // Sem CD definido — null não é "ED Direto Loja", cai em "CD não definido"
  if (modalidadeCd === "ED Direto Loja") {
    return "Direto Loja";
  }
  return "CD não definido";
}

// ---------------------------------------------------------------------------
// 6. Situação da ativação no CD (coluna Status Ativação CD renomeada)
// ---------------------------------------------------------------------------

/**
 * Apresenta a situação da ativação no CD para o produto.
 *
 * statusSolicitacaoAtivacaoCd indica se existe ativação ou solicitação
 * de ativação do produto no CD.
 *
 * Regra visual (campo adicional V7, não reproduzido do Power Query):
 *
 * "Ativo no CD"          → "Ativo"
 * "Não Centralizado" + CD (produtoCentralizado > 0) → "Sem solicitação de ativação"
 * "Não Centralizado" + ED Direto Loja                 → "Não se aplica"
 * null                  → "Não informado"
 *
 * Tooltip: "Indica se existe ativação ou solicitação de ativação do produto no CD."
 */
export function formatarSituacaoAtivacao(
  statusSolicitacaoAtivacaoCd: string | null | undefined,
  produtoCentralizado: number | boolean | null | undefined,
  modalidadeCd: string | null | undefined,
): string {
  if (!statusSolicitacaoAtivacaoCd) return "Não informado";
  if (statusSolicitacaoAtivacaoCd === "Ativo no CD") return "Ativo";

  if (statusSolicitacaoAtivacaoCd === "Não Centralizado") {
    const cdNum = produtoCentralizado != null ? Number(produtoCentralizado) : 0;
    const temCd = Number.isFinite(cdNum) && cdNum > 0;
    if (temCd) return "Sem solicitação de ativação";
    if (modalidadeCd === "ED Direto Loja") return "Não se aplica";
    return "Não informado";
  }

  // Valor oficial não mapeado → preserva original
  return statusSolicitacaoAtivacaoCd;
}

// ---------------------------------------------------------------------------
// 7. Extrair ações únicas para filtro
// ---------------------------------------------------------------------------

export function extrairAcoesVisuaisUnicasLp(
  produtos: {
    ativacaoRuptura30SemPedido?: number | boolean | null;
    ultimoPedidoLojaPq?: number | null;
    diasRuptura?: number | null;
  }[],
): { key: AcaoVisualLp; label: string }[] {
  const set = new Set<AcaoVisualLp>();
  for (const p of produtos) {
    set.add(acaoVisualLp(p));
  }
  const order: AcaoVisualLp[] = [
    "revisar_ativacao_cd",
    "produto_sem_pedido",
    "ultimo_pedido_antigo",
    "ruptura_antiga",
    "sem_acao_definida",
  ];
  return order.filter((k) => set.has(k)).map((k) => ({ key: k, label: ACAO_VISUAL_LABEL[k] }));
}

// ---------------------------------------------------------------------------
// 8. Contar ação visual exclusiva para cards agrupados
// ---------------------------------------------------------------------------

export type CardCountsAcaoExclusiva = Record<AcaoVisualLp, number>;

export function contarAcaoExclusiva(
  produtos: {
    ativacaoRuptura30SemPedido?: number | boolean | null;
    ultimoPedidoLojaPq?: number | null;
    diasRuptura?: number | null;
  }[],
): CardCountsAcaoExclusiva {
  const counts: CardCountsAcaoExclusiva = {
    revisar_ativacao_cd: 0,
    produto_sem_pedido: 0,
    ultimo_pedido_antigo: 0,
    ruptura_antiga: 0,
    sem_acao_definida: 0,
  };
  for (const p of produtos) {
    counts[acaoVisualLp(p)]++;
  }
  return counts;
}
