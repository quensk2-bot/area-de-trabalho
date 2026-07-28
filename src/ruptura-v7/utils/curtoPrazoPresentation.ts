/**
 * Dominio visual da tela Curto Prazo.
 * Centraliza regras de apresentacao, agrupamento de acoes,
 * explicacao operacional e badges.
 *
 * Fonte oficial: acaoCurtoPrazo (Motor/BRE).
 * Nao recalcular acoes no frontend.
 *
 * Modalidade oficial: Plan 6 CD.txt (MODALIDADECD).
 * Nao deduzir modalidade por crossDocking, codigoCdSelecionado etc.
 */

// ---------------------------------------------------------------------------
// 0. Normalizacao para comparacao (preserva texto exibido)
// ---------------------------------------------------------------------------

/** Normaliza string de acao para comparacao: normaliza acentos, espacos, barras. */
export function normalizarAcao(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .trim()
    .normalize("NFC")
    .replace(/\s*\/\s*/g, "/")   // normaliza espacos ao redor de /
    .replace(/\s+/g, " ")          // normaliza espacos multiplos
    .replace(/Nâo/gi, "Não")       // normaliza â -> a em "Nao"
    .replace(/Não é Ruptura Curto Prazo/gi, "Não é Ruptura Curto Prazo") // capitalizacao
    ;
}

// ---------------------------------------------------------------------------
// 1. Cards disponiveis
// ---------------------------------------------------------------------------

export type GrupoCard =
  | "total_curto_prazo"
  | "havia_estoque_cd"
  | "rebote_proximo"
  | "sem_acao_definida";

export const CARD_LABEL: Record<GrupoCard, string> = {
  total_curto_prazo: "Total Curto Prazo",
  havia_estoque_cd: "Havia Estoque no CD",
  rebote_proximo: "Recebimento Proximo",
  sem_acao_definida: "Sem Acao Definida",
};

export const CARD_TONE: Record<GrupoCard, "ok" | "warn" | "danger" | "neutral" | "orange"> = {
  total_curto_prazo: "orange",
  havia_estoque_cd: "ok",
  rebote_proximo: "warn",
  sem_acao_definida: "neutral",
};

// ---------------------------------------------------------------------------
// 2. Badge compacto -- por REGEX, sem lookup (mais robusto contra acentos)
// ---------------------------------------------------------------------------

export function badgeCurtoPrazo(acao: string | null | undefined): string {
  if (!acao) return "\u2014";
  const a = normalizarAcao(acao);

  if (/N[ãa]o é Ruptura/i.test(a)) return "Sem acao definida";
  if (/Havia estoque/i.test(a)) {
    if (/Pedido Antigo/i.test(a)) return "Estoque / pedido antigo";
    if (/N[ãa]o Existe Pedido/i.test(a)) return "Estoque / sem pedido";
    return "Estoque / pedido no prazo";
  }
  if (/Recebimento Pr[oó]ximo/i.test(a)) {
    if (/Pedido Antigo/i.test(a)) return "Recebimento / pedido antigo";
    if (/N[ãa]o Existe Pedido/i.test(a)) return "Recebimento / sem pedido";
    return "Recebimento / pedido no prazo";
  }
  return acao.trim();
}

// ---------------------------------------------------------------------------
// 3. Prioridade visual
// ---------------------------------------------------------------------------

export type PrioridadeVisual = "critica" | "alerta" | "ok" | "neutra";

export function prioridadeVisual(acao: string | null | undefined): PrioridadeVisual {
  if (!acao) return "neutra";
  const a = normalizarAcao(acao);

  if (/Recebimento Pr[oó]ximo.*N[ãa]o Existe Pedido/i.test(a)) return "critica";
  if (/Pedido Antigo/i.test(a)) return "alerta";
  if (/N[ãa]o Existe Pedido/i.test(a)) return "alerta";
  if (/Pedido dentro do Prazo/i.test(a)) return "ok";
  return "neutra";
}

export const PRIORIDADE_TONE: Record<PrioridadeVisual, "ok" | "warn" | "danger" | "neutral"> = {
  critica: "danger",
  alerta: "warn",
  ok: "ok",
  neutra: "neutral",
};

export const PRIORIDADE_LABEL: Record<PrioridadeVisual, string> = {
  critica: "Critica",
  alerta: "Alerta",
  ok: "OK",
  neutra: "\u2014",
};

// ---------------------------------------------------------------------------
// 4. Contagem para os cards
// ---------------------------------------------------------------------------

export type CardCounts = Record<GrupoCard, number>;

/**
 * Conta itens por card.
 * Cada item conta em UM card APENAS.
 */
export function contarCardsPorAcao(
  acoes: (string | null | undefined)[],
): CardCounts {
  const counts: CardCounts = {
    total_curto_prazo: acoes.length,
    havia_estoque_cd: 0,
    rebote_proximo: 0,
    sem_acao_definida: 0,
  };

  for (const acao of acoes) {
    const a = normalizarAcao(acao);
    if (!a) continue;

    if (/^N[ãa]o é Ruptura Curto Prazo/i.test(a)) {
      counts.sem_acao_definida++;
    } else if (/^Havia estoque no CD/i.test(a)) {
      counts.havia_estoque_cd++;
    } else if (/^Recebimento Pr[oó]ximo/i.test(a)) {
      counts.rebote_proximo++;
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// 5. Explicacao operacional
// ---------------------------------------------------------------------------

export function explicarCurtoPrazo(
  acao: string | null | undefined,
  crossDocking?: boolean | null,
): string {
  if (!acao) return "Classificado como Curto Prazo pelo Motor.";

  const a = normalizarAcao(acao);

  // Cross Docking: adaptar explicacao independente da acao oficial
  if (crossDocking) {
    if (/Pedido Antigo/i.test(a)) {
      return "Cross Docking: pedido vinculado ao fornecedor. Acompanhar entrega ao CD antes de avaliar cancelamento.";
    }
    if (/N[ãa]o Existe Pedido/i.test(a)) {
      return "Cross Docking: pedido vinculado ao fornecedor. Verificar programacao de entrega ao CD.";
    }
    return "Cross Docking: pedido vinculado ao fornecedor. Acompanhar recebimento no CD.";
  }

  if (/N[ãa]o é Ruptura Curto Prazo/i.test(a)) {
    return "Sem acao especifica identificada.";
  }
  if (/^Havia estoque no CD/i.test(a)) {
    if (/Pedido Antigo/i.test(a)) return "Havia estoque no CD, mas pedido esta antigo.";
    if (/N[ãa]o Existe Pedido/i.test(a)) return "Havia estoque no CD, sem pedido.";
    return "Havia estoque no CD, pedido dentro do prazo.";
  }
  if (/^Recebimento Pr[oó]ximo/i.test(a)) {
    if (/Pedido Antigo/i.test(a)) return "Recebimento proximo, pedido antigo.";
    if (/N[ãa]o Existe Pedido/i.test(a)) return "Recebimento proximo, sem pedido.";
    return "Recebimento proximo, pedido dentro do prazo.";
  }
  return "Classificado como Curto Prazo pelo Motor.";
}

// ---------------------------------------------------------------------------
// 6. Modalidade oficial -- NAO deduzida por crossDocking ou codigoCdSelecionado
// ---------------------------------------------------------------------------

/**
 * Retorna a modalidade visual com base no campo OFICIAL modalidadeCd (Plan 6 CD.txt).
 *
 * Se o codigo nao foi encontrado no Plan 6, significa que o produto
 * nao e centralizado em CD -- vai direto para a loja.
 * Nesse caso, exibe "ED Direto Loja".
 * Cross Docking e exibido como badge SEPARADO, nao como modalidade.
 */
export function formatarModalidade(modalidadeCd: string | null | undefined): string {
  return modalidadeCd ?? "ED Direto Loja";
}

// ---------------------------------------------------------------------------
// 7. Formatacao do CD para exibicao
// ---------------------------------------------------------------------------

/**
 * Extrai codigos de CD dos parenteses em statusEstoqueCds.
 * Ex: "Estoque no CD: (464) (753)" -> ["464", "753"]
 * Ex: "Estoque no CD:" ou "Ruptura CD" -> []
 */
function extrairCdsDoStatus(status: string | null | undefined): string[] {
  if (!status) return [];
  const matches = status.matchAll(/\((\d+)\)/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Determina o(s) CD(s) a exibir.
 * 1. Usa cdFisicosAtivos (array de codigos fisicos do Motor) se disponivel.
 * 2. Tenta extrair da string statusEstoqueCds (parenteses com codigos).
 * 3. Fallback: codigoCdSelecionado.
 */
export function formatarCdTexto(d: {
  codigoCdSelecionado: number | null | undefined;
  statusEstoqueCds: string | null | undefined;
  cdFisicosAtivos?: number[] | null | undefined;
  est_selec_inv_cd1: number | null | undefined;
  est_selec_inv_cd2: number | null | undefined;
  est_selec_inv_cd3: number | null | undefined;
  est_selec_inv_cd4: number | null | undefined;
}): string {
  // 1. cdFisicosAtivos do Motor (fonte oficial propagada)
  if (d.cdFisicosAtivos && d.cdFisicosAtivos.length > 0) {
    return d.cdFisicosAtivos.join(" / ");
  }

  // 2. Tentar extrair CDs do statusEstoqueCds (ex: "Estoque no CD: (464) (753)")
  const cdsDoStatus = extrairCdsDoStatus(d.statusEstoqueCds);
  if (cdsDoStatus.length > 0) {
    return cdsDoStatus.join(" / ");
  }

  // 3. Fallback: codigoCdSelecionado
  if (d.codigoCdSelecionado == null) return "\u2014";
  return String(d.codigoCdSelecionado);
}

// ---------------------------------------------------------------------------
// 8. Cross Docking -- badge separado da modalidade
// ---------------------------------------------------------------------------

/** Retorna badge "Cross Docking" se crossDocking=true E modalidade NAO contem "Cross Docking". */
export function badgeCrossDocking(
  crossDocking: boolean | null | undefined,
  modalidadeCd?: string | null | undefined,
): string | null {
  if (!crossDocking) return null;
  // Se a modalidade ja contem "Cross Docking", nao mostrar badge separado
  if (modalidadeCd && /Cross Docking/i.test(modalidadeCd)) return null;
  return "Cross Docking";
}

// ---------------------------------------------------------------------------
// 9. Extrair acoes unicas dos dados (para filtro dinamico)
// ---------------------------------------------------------------------------

/**
 * Extrai valores unicos de acao_curto_prazo dos dados carregados.
 * Usado pelo filtro dinamico -- substitui a lista hardcoded ACOES_CURTO_PRAZO.
 * Ordena: "Havia estoque..." primeiro, depois "Recebimento...", depois "Nao e...".
 */
export function extrairAcoesUnicas(
  produtos: { acao_curto_prazo: string | null | undefined }[],
): string[] {
  const set = new Set<string>();
  for (const p of produtos) {
    const acao = p.acao_curto_prazo?.trim();
    if (acao) set.add(acao);
  }
  return [...set].sort((a, b) => {
    // Havia estoque -> primeiro grupo
    const aHavia = /^Havia estoque/i.test(a);
    const bHavia = /^Havia estoque/i.test(b);
    if (aHavia && !bHavia) return -1;
    if (!aHavia && bHavia) return 1;
    // Recebimento Proximo -> segundo grupo
    const aRebote = /^Recebimento Pr[oó]ximo/i.test(a);
    const bRebote = /^Recebimento Pr[oó]ximo/i.test(b);
    if (aRebote && !bRebote) return -1;
    if (!aRebote && bRebote) return 1;
    // Nao e Ruptura -> por ultimo
    const aNao = /N[ãa]o é Ruptura/i.test(a);
    const bNao = /N[ãa]o é Ruptura/i.test(b);
    if (aNao && !bNao) return 1;
    if (!aNao && bNao) return -1;
    return a.localeCompare(b, "pt-BR");
  });
}
