/**
 * Domínio visual da tela Longo Prazo.
 * Centraliza regras de apresentação, derivação visual, cards e prioridade.
 *
 * Fonte oficial: longoPrazo = 1 (Motor/BRE).
 * Não recalcular classificação de prazo no frontend.
 *
 * A ação visual é DERIVADA (não oficial) — orientação operacional V7.
 * Não altera longoPrazo nem cria campo oficial no Motor.
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

    // Card 2: Ativação >30 sem pedido
    if (ativ === 1 || ativ === true) counts.ativacao_30_sem_pedido++;

    // Card 3: Sem pedido (999 ou null)
    if (ultPed === 999 || ultPed == null) counts.sem_pedido++;

    // Card 4: Último pedido >60 (excluindo 999)
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

/**
 * Determina a ação visual exclusiva de um produto LP.
 * Ordem de prioridade (primeira condição verdadeira vence):
 * 1. Revisar ativação CD: ativacaoRuptura30SemPedido = 1
 * 2. Produto sem pedido: ultimoPedidoLojaPq = 999 ou null
 * 3. Último pedido antigo: ultimoPedidoLojaPq > 60 (e < 999)
 * 4. Ruptura antiga: diasRuptura > 30
 * 5. Sem ação definida
 */
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

/** Reexport da regra de modalidade do Medio Prazo (Plan 6 CD.txt). */
export { formatarModalidade } from "./medioPrazoPresentation.ts";

// ---------------------------------------------------------------------------
// 5. Formatação de centralização
// ---------------------------------------------------------------------------

/**
 * produtoCentralizado pode conter o código do CD (ex: 905, 464) ou null.
 * - valor numérico válido → "Centralizado no CD <código>"
 * - null → "Não centralizado"
 */
export function formatarCentralizacao(
  produtoCentralizado: number | boolean | null | undefined,
): string {
  if (produtoCentralizado == null) return "Não centralizado";
  const num = Number(produtoCentralizado);
  if (Number.isFinite(num) && num > 0) {
    return `Centralizado no CD ${num}`;
  }
  return "Não informado";
}

// ---------------------------------------------------------------------------
// 6. Extrair ações únicas para filtro
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
// 7. Contar ação visual exclusiva para cards agrupados
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
