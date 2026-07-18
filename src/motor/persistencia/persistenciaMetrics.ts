import type { PersistenciaMetricas } from "./persistenciaTypes.ts";

export function criarMetricasPersistencia(
  produtosInseridos: number,
  cdsInseridos: number,
  inicioMs: number,
): PersistenciaMetricas {
  return {
    produtosInseridos,
    cdsInseridos,
    duracaoMs: Date.now() - inicioMs,
  };
}

export function validarContagensPersistencia(
  esperadoProdutos: number,
  esperadoCds: number,
  obtidoProdutos: number,
  obtidoCds: number,
): void {
  if (esperadoProdutos !== obtidoProdutos) {
    throw new Error(
      `Contagem produtos divergente: esperado=${esperadoProdutos}, obtido=${obtidoProdutos}`,
    );
  }
  if (esperadoCds !== obtidoCds) {
    throw new Error(`Contagem CDs divergente: esperado=${esperadoCds}, obtido=${obtidoCds}`);
  }
}
