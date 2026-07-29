/**
 * Filtro literal PQ — step #"Filtrar_BaseLimpa&GeraRuptura":
 * Table.SelectRows(FlagRuptura104C, each ([Status Base Limpa] = "Base Limpa"))
 *
 * Seleção de linhas apenas — sem recalcular BRE, CP/MP/LP ou remover do consolidado.
 */
export type StatusBaseLimpaOficial = "Base Limpa" | "Não considera Ruptura" | null;

export type ProdutoComBaseLimpa = {
  baseLimpa?: StatusBaseLimpaOficial;
};

export function filtrarUniversoOficialCompativel<T extends ProdutoComBaseLimpa>(
  produtos: readonly T[],
): T[] {
  return produtos.filter((p) => p.baseLimpa === "Base Limpa");
}

export function contarUniversoOficialCompativel(produtos: readonly ProdutoComBaseLimpa[]): number {
  return filtrarUniversoOficialCompativel(produtos).length;
}

/** Fórmula literal documentada (referência homologação). */
export const FORMULA_FILTRO_UNIVERSO_OFICIAL_PQ =
  'Table.SelectRows(FlagRuptura104C, each ([Status Base Limpa] = "Base Limpa"))';
