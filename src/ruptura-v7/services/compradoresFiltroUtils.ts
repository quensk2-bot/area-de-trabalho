import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";

/** Rótulo alinhado ao pivô Excel (join Compradores sem match). */
export const SEM_COMPRADOR = "** Não Identificado";

export function chaveComprador(p: Pick<HibridoProdutoGestao, "comprador">): string {
  const nome = p.comprador?.trim();
  return nome || SEM_COMPRADOR;
}

/** Rótulo compacto do filtro fechado. */
export function formatCompradoresSelecionadosLabel(compradores: string[], totalEscopo: number): string {
  if (totalEscopo === 0) return "Nenhum comprador";
  if (compradores.length === 0 || compradores.length >= totalEscopo) {
    if (compradores.length > 0 && compradores.length === totalEscopo) {
      return `${compradores.length} de ${totalEscopo}`;
    }
    return "Todos os compradores";
  }
  if (compradores.length === 1) return compradores[0]!;
  return `${compradores.length} compradores`;
}

export function listarCompradoresDistintos(produtos: readonly HibridoProdutoGestao[]): string[] {
  const set = new Set<string>();
  for (const p of produtos) set.add(chaveComprador(p));
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function filtrarProdutosPorCompradores(
  produtos: readonly HibridoProdutoGestao[],
  compradores: string[] | undefined,
): HibridoProdutoGestao[] {
  if (!compradores?.length) return [...produtos];
  const set = new Set(compradores);
  return produtos.filter((p) => set.has(chaveComprador(p)));
}
