import type { MotorConsolidacaoMetricas } from "./consolidacaoTypes.ts";
import { criarMetricasCdsVazias } from "./cds/consolidacaoCdsMetrics.ts";

export function criarMetricasVazias(linhasEntrada: number): Omit<
  MotorConsolidacaoMetricas,
  "duracaoMs" | "linhasSaida" | "totalAlertas" | "totalErros"
> {
  return {
    linhasEntrada,
    linhasInvalidas: 0,
    duplicidadesBase: 0,
    duplicidadesCatalogos: 0,
    semGrupo2: 0,
    semInventario: 0,
    semValidacao: 0,
    semRede: 0,
    semBandeira: 0,
    semOrdem: 0,
    semComprador: 0,
    semBre: 0,
    cds: criarMetricasCdsVazias(),
  };
}

export function finalizarMetricas(
  parcial: Omit<MotorConsolidacaoMetricas, "duracaoMs" | "linhasSaida" | "totalAlertas" | "totalErros">,
  linhasSaida: number,
  totalAlertas: number,
  totalErros: number,
  duracaoMs: number,
): MotorConsolidacaoMetricas {
  return {
    ...parcial,
    linhasSaida,
    totalAlertas,
    totalErros,
    duracaoMs,
  };
}

export function incrementarMetrica(
  metricas: Omit<MotorConsolidacaoMetricas, "duracaoMs" | "linhasSaida" | "totalAlertas" | "totalErros">,
  campo:
    | "linhasInvalidas"
    | "duplicidadesBase"
    | "semGrupo2"
    | "semInventario"
    | "semValidacao"
    | "semRede"
    | "semBandeira"
    | "semOrdem"
    | "semComprador"
    | "semBre",
): void {
  metricas[campo] += 1;
}
