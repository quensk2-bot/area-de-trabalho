import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";

/** Prioridade operacional (apresentação) — não altera classificacaoPrazo. */
export const CLASSIFICACAO_PRIORIDADE_GESTAO: Record<string, number> = {
  curto_prazo: 0,
  medio_prazo: 1,
  longo_prazo: 2,
  bloqueado: 3,
  sem_ruptura: 4,
};

export function prioridadeClassificacaoGestao(classificacao: string | null | undefined): number {
  if (!classificacao) return 99;
  return CLASSIFICACAO_PRIORIDADE_GESTAO[classificacao] ?? 99;
}

/** CP > MP > LP > bloqueado > sem_ruptura; depois loja ↑, pendência ↓, estoque CD ↓, seqproduto ↑ */
export function ordenarProdutosGestaoDefault(produtos: readonly HibridoProdutoGestao[]): HibridoProdutoGestao[] {
  return [...produtos].sort((a, b) => {
    const pa = prioridadeClassificacaoGestao(a.classificacaoPrazo);
    const pb = prioridadeClassificacaoGestao(b.classificacaoPrazo);
    if (pa !== pb) return pa - pb;

    if (a.loja !== b.loja) return a.loja - b.loja;

    const pendA = a.pendenciaCpaCd ?? 0;
    const pendB = b.pendenciaCpaCd ?? 0;
    if (pendA !== pendB) return pendB - pendA;

    const estA = a.somaEstoqueCd ?? 0;
    const estB = b.somaEstoqueCd ?? 0;
    if (estA !== estB) return estB - estA;

    return a.seqproduto - b.seqproduto;
  });
}

export function isOrdenacaoGestaoDefault(ordenacao?: { coluna: string; direcao: "asc" | "desc" }): boolean {
  return !ordenacao || ordenacao.coluna === "prioridade_operacional";
}
