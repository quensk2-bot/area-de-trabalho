import type { MotorBreItemResultado, MotorBreMetricas, MotorBreResultado, MotorRegraResultado } from "./breTypes.ts";

export function criarBreResultadoVazio(regional: string, dataReferencia: string): MotorBreResultado {
  return {
    regional,
    dataReferencia,
    itens: [],
    metricas: {
      itensProcessados: 0,
      regrasAplicadas: 0,
      regrasBloqueadas: 0,
      regrasAmbiguas: 0,
      duracaoMs: 0,
    },
    erros: [],
    alertas: [],
  };
}

export function consolidarMetricasBre(
  itens: MotorBreItemResultado[],
  inicioMs: number,
): MotorBreMetricas {
  const todasRegras = itens.flatMap((i) => i.regras);
  return {
    itensProcessados: itens.length,
    regrasAplicadas: todasRegras.filter((r) => r.status === "aplicada").length,
    regrasBloqueadas: todasRegras.filter((r) => r.status === "bloqueada_dependencia").length,
    regrasAmbiguas: todasRegras.filter((r) => r.status === "ambigua").length,
    duracaoMs: Date.now() - inicioMs,
  };
}

export function mergeRegraResults(...grupos: MotorRegraResultado[][]): MotorRegraResultado[] {
  return grupos.flat();
}
