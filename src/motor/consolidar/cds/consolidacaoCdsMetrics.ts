import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";
import type { MotorConsolidacaoMetricasCds } from "../consolidacaoTypes.ts";

export function criarMetricasCdsVazias(): MotorConsolidacaoMetricasCds {
  return {
    totalCdsConsolidados: 0,
    produtosCom1Cd: 0,
    produtosCom4Cds: 0,
    produtosCom5Cds: 0,
    produtosComMaisDe5Cds: 0,
    produtosCom8Cds: 0,
    posicoesDuplicadas: 0,
    blocosSobrepostos: 0,
    cdsSemCodigoFisico: 0,
    totalProdutosComCds: 0,
    totalProdutosSemCds: 0,
    mediaCdsPorProduto: 0,
    maxCdsEmUmProduto: 0,
    produtosComPosicoesNaoContiguas: 0,
    produtosComCodigoFisicoAusente: 0,
  };
}

export type AcumularMetricasCdsParams = {
  cds: readonly MotorProdutoCdNormalizado[];
  posicaoDuplicada: boolean;
  blocoSobreposto: boolean;
  posicoesNaoContiguas: boolean;
  codigoFisicoAusente: boolean;
};

export function acumularMetricasCdsProduto(
  metricas: MotorConsolidacaoMetricasCds,
  params: AcumularMetricasCdsParams,
): void {
  const qtd = params.cds.length;

  if (qtd === 0) {
    metricas.totalProdutosSemCds += 1;
    return;
  }

  metricas.totalProdutosComCds += 1;
  metricas.totalCdsConsolidados += qtd;
  metricas.maxCdsEmUmProduto = Math.max(metricas.maxCdsEmUmProduto, qtd);

  if (qtd === 1) metricas.produtosCom1Cd += 1;
  if (qtd === 4) metricas.produtosCom4Cds += 1;
  if (qtd === 5) metricas.produtosCom5Cds += 1;
  if (qtd > 5) metricas.produtosComMaisDe5Cds += 1;
  if (qtd >= 8) metricas.produtosCom8Cds += 1;

  if (params.posicaoDuplicada) metricas.posicoesDuplicadas += 1;
  if (params.blocoSobreposto) metricas.blocosSobrepostos += 1;
  if (params.posicoesNaoContiguas) metricas.produtosComPosicoesNaoContiguas += 1;
  if (params.codigoFisicoAusente) metricas.produtosComCodigoFisicoAusente += 1;

  for (const cd of params.cds) {
    if (cd.codigoFisico == null) metricas.cdsSemCodigoFisico += 1;
  }
}

export function finalizarMetricasCds(metricas: MotorConsolidacaoMetricasCds): void {
  if (metricas.totalProdutosComCds > 0) {
    metricas.mediaCdsPorProduto =
      Math.round((metricas.totalCdsConsolidados / metricas.totalProdutosComCds) * 100) / 100;
  } else {
    metricas.mediaCdsPorProduto = 0;
  }
}

export function posicoesNaoContiguas(cds: readonly MotorProdutoCdNormalizado[]): boolean {
  if (cds.length <= 1) return false;
  const posicoes = [...cds].map((c) => c.posicaoLogica).sort((a, b) => a - b);
  for (let i = 1; i < posicoes.length; i++) {
    if (posicoes[i] - posicoes[i - 1] > 1) return true;
  }
  return false;
}
