import chavesOficiais from "../../../../architecture/hibrido-v7/chaves-oficiais-conferencia.json" with { type: "json" };

let cache: Set<string> | null = null;

/** Chaves LOJA+SEQPRODUTO congeladas do arquivo conferência (sem ler XLSX em runtime browser). */
export function carregarChavesOficiaisConferencia(): ReadonlySet<string> {
  if (!cache) {
    cache = new Set(chavesOficiais.chaves as string[]);
  }
  return cache;
}

export function totalChavesOficiaisConferencia(): number {
  return chavesOficiais.totalChaves as number;
}
