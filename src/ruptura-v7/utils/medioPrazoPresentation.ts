/**
 * Domínio visual da tela Médio Prazo.
 * Centraliza regras de apresentação, agrupamento de ações,
 * explicação operacional e badges de prioridade.
 *
 * Fonte oficial: acaoMedioPrazo (Motor/BRE).
 * Não recalcular ações no frontend.
 *
 * Modalidade oficial: Plan 6 CD.txt (MODALIDADECD).
 * Não deduzir modalidade por crossDocking, codigoCdSelecionado etc.
 */

// ---------------------------------------------------------------------------
// 0. Textos oficiais do Motor (centralizados para comparação exata)
// ---------------------------------------------------------------------------

export const TEXTOS_MP = {
  DENTRO_PRAZO: "Pedido dentro do prazo" as const,
  VINTE_TRINTA: "Pedidos dentre 20 há 30 dias" as const,
  TRINTA_SESSENTA: "Pedido dentre 30 há 60 Dias" as const,
  SUPERIOR_SESSENTA: "Superior há 60 Dias" as const,
} as const;

/** Lista de todos os textos oficiais para validação. */
export const TEXTOS_MP_LIST = Object.values(TEXTOS_MP);

// ---------------------------------------------------------------------------
// 1. Normalização para comparação (preserva texto exibido)
// ---------------------------------------------------------------------------

/** Normaliza string de ação para comparação: normaliza acentos, espaços. */
export function normalizarAcao(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .trim()
    .normalize("NFC")
    .replace(/\s+/g, " ");
}

/** Compara uma ação com um texto oficial após normalização. */
export function acaoIgual(
  acao: string | null | undefined,
  textoOficial: string,
): boolean {
  if (!acao) return false;
  return normalizarAcao(acao) === normalizarAcao(textoOficial);
}

// ---------------------------------------------------------------------------
// 2. Tipos dos cards
// ---------------------------------------------------------------------------

export type GrupoCardMp =
  | "total_medio_prazo"
  | "pedido_dentro_prazo"
  | "avaliar_pedido"
  | "superior_60_dias";

export const CARD_LABEL_MP: Record<GrupoCardMp, string> = {
  total_medio_prazo: "Total Médio Prazo",
  pedido_dentro_prazo: "Pedido Dentro do Prazo",
  avaliar_pedido: "Avaliar Pedido",
  superior_60_dias: "Superior a 60 Dias",
};

export const CARD_TONE_MP: Record<GrupoCardMp, "ok" | "warn" | "danger" | "neutral" | "orange"> = {
  total_medio_prazo: "orange",
  pedido_dentro_prazo: "ok",
  avaliar_pedido: "warn",
  superior_60_dias: "danger",
};

// ---------------------------------------------------------------------------
// 3. Badge compacto
// ---------------------------------------------------------------------------

export function badgeMedioPrazo(acao: string | null | undefined): string {
  if (!acao) return "Sem ação definida";
  if (acaoIgual(acao, TEXTOS_MP.DENTRO_PRAZO)) return "Dentro do prazo";
  if (acaoIgual(acao, TEXTOS_MP.VINTE_TRINTA)) return "20–30 dias";
  if (acaoIgual(acao, TEXTOS_MP.TRINTA_SESSENTA)) return "30–60 dias";
  if (acaoIgual(acao, TEXTOS_MP.SUPERIOR_SESSENTA)) return "Superior a 60 dias";
  return acao.trim();
}

// ---------------------------------------------------------------------------
// 4. Prioridade visual
// ---------------------------------------------------------------------------

export type PrioridadeVisualMp = "critica" | "alerta_alta" | "alerta" | "ok" | "neutra";

export function prioridadeVisualMp(acao: string | null | undefined): PrioridadeVisualMp {
  if (!acao) return "neutra";
  if (acaoIgual(acao, TEXTOS_MP.SUPERIOR_SESSENTA)) return "critica";
  if (acaoIgual(acao, TEXTOS_MP.TRINTA_SESSENTA)) return "alerta_alta";
  if (acaoIgual(acao, TEXTOS_MP.VINTE_TRINTA)) return "alerta";
  if (acaoIgual(acao, TEXTOS_MP.DENTRO_PRAZO)) return "ok";
  return "neutra";
}

export const PRIORIDADE_TONE_MP: Record<PrioridadeVisualMp, "ok" | "warn" | "danger" | "neutral"> = {
  critica: "danger",
  alerta_alta: "warn",
  alerta: "warn",
  ok: "ok",
  neutra: "neutral",
};

export const PRIORIDADE_LABEL_MP: Record<PrioridadeVisualMp, string> = {
  critica: "Crítico",
  alerta_alta: "Atenção Alta",
  alerta: "Alerta",
  ok: "OK",
  neutra: "—",
};

// ---------------------------------------------------------------------------
// 5. Contagem para os cards (cada item conta em UM card apenas)
// ---------------------------------------------------------------------------

export type CardCountsMp = Record<GrupoCardMp, number>;

export function contarCardsPorAcaoMp(
  acoes: (string | null | undefined)[],
): CardCountsMp {
  const counts: CardCountsMp = {
    total_medio_prazo: acoes.length,
    pedido_dentro_prazo: 0,
    avaliar_pedido: 0,
    superior_60_dias: 0,
  };

  for (const acao of acoes) {
    if (!acao) continue;

    if (acaoIgual(acao, TEXTOS_MP.SUPERIOR_SESSENTA)) {
      counts.superior_60_dias++;
    } else if (
      acaoIgual(acao, TEXTOS_MP.TRINTA_SESSENTA) ||
      acaoIgual(acao, TEXTOS_MP.VINTE_TRINTA)
    ) {
      counts.avaliar_pedido++;
    } else if (acaoIgual(acao, TEXTOS_MP.DENTRO_PRAZO)) {
      counts.pedido_dentro_prazo++;
    }
    // Ações não reconhecidas não entram em nenhum card específico
  }

  return counts;
}

// ---------------------------------------------------------------------------
// 6. Explicação operacional
// ---------------------------------------------------------------------------

export function explicarMedioPrazo(acao: string | null | undefined): string {
  if (!acao) return "Classificado como Médio Prazo pelo Motor.";

  if (acaoIgual(acao, TEXTOS_MP.DENTRO_PRAZO)) {
    return "Pedido emitido dentro do prazo esperado. Manter acompanhamento.";
  }
  if (acaoIgual(acao, TEXTOS_MP.VINTE_TRINTA)) {
    return "Pedido próximo de 30 dias. Avaliar entrega e necessidade de nova ação.";
  }
  if (acaoIgual(acao, TEXTOS_MP.TRINTA_SESSENTA)) {
    return "Pedido acima de 30 dias. Avaliar cancelamento, reemissão ou cobrança.";
  }
  if (acaoIgual(acao, TEXTOS_MP.SUPERIOR_SESSENTA)) {
    return "Pedido muito antigo. Priorizar cancelamento, novo pedido ou regularização.";
  }
  return "Classificado como Médio Prazo pelo Motor.";
}

// ---------------------------------------------------------------------------
// 7. Modalidade oficial — reutiliza regra do Plan 6
// ---------------------------------------------------------------------------

export function formatarModalidade(modalidadeCd: string | null | undefined): string {
  return modalidadeCd ?? "ED Direto Loja";
}

// ---------------------------------------------------------------------------
// 8. Extrair ações únicas (para filtro dinâmico)
// ---------------------------------------------------------------------------

/**
 * Ordena ações na ordem oficial: dentro prazo > 20-30 > 30-60 > superior 60 > outras.
 */
function ordenarAcoesMp(acoes: string[]): string[] {
  return [...acoes].sort((a, b) => {
    const getOrder = (txt: string): number => {
      if (acaoIgual(txt, TEXTOS_MP.DENTRO_PRAZO)) return 0;
      if (acaoIgual(txt, TEXTOS_MP.VINTE_TRINTA)) return 1;
      if (acaoIgual(txt, TEXTOS_MP.TRINTA_SESSENTA)) return 2;
      if (acaoIgual(txt, TEXTOS_MP.SUPERIOR_SESSENTA)) return 3;
      return 4;
    };
    const oa = getOrder(a);
    const ob = getOrder(b);
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "pt-BR");
  });
}

export function extrairAcoesUnicasMp(
  produtos: { acao_medio_prazo: string | null | undefined }[],
): string[] {
  const set = new Set<string>();
  for (const p of produtos) {
    const acao = p.acao_medio_prazo?.trim();
    if (acao) set.add(acao);
  }
  return ordenarAcoesMp([...set]);
}

// ---------------------------------------------------------------------------
// 9. Helper: "Sem ação definida" para null
// ---------------------------------------------------------------------------

export function textoAcaoMp(acao: string | null | undefined): string {
  if (!acao) return "Sem ação definida";
  return acao;
}
