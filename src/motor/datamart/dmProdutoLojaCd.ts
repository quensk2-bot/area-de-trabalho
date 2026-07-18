import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { chaveDmProdutoLoja } from "./dmMapping.ts";
import type { DmProdutoLojaCd } from "./dmTypes.ts";

function flagCentralizacaoPorPosicao(
  consolidado: MotorProdutoLojaConsolidado,
  posicaoLogica: number,
): number | null {
  const flags: Record<number, number | null> = {
    1: consolidado.flagPrimeiroCd,
    2: consolidado.flagSegundoCd,
    3: consolidado.flagTerceiroCd,
    4: consolidado.flagQuartoCd,
    5: consolidado.flagQuintoCd,
  };
  return flags[posicaoLogica] ?? null;
}

/**
 * Mapeia exclusivamente consolidado.cds[] — nunca campos flat estoqueCd1..5.
 */
export function mapearCdsParaDmProdutoLojaCd(consolidado: MotorProdutoLojaConsolidado): DmProdutoLojaCd[] {
  const chave = chaveDmProdutoLoja(consolidado);

  return consolidado.cds.map((cd) => ({
    ...chave,
    posicaoLogica: cd.posicaoLogica,
    codigoFisico: cd.codigoFisico,
    estoque: cd.estoque,
    pendencia: cd.pendencia,
    statusCompra: cd.statusCompra,
    diasCompra: cd.diasCompra,
    diasRecebimento: cd.diasRecebimento,
    flagCentralizacao: flagCentralizacaoPorPosicao(consolidado, cd.posicaoLogica),
    origemArquivo: cd.origemArquivo,
    numeroBloco: cd.numeroBloco,
    posicaoNoArquivo: cd.posicaoNoArquivo,
  }));
}

export function mapearLoteParaDmProdutoLojaCd(consolidado: readonly MotorProdutoLojaConsolidado[]): DmProdutoLojaCd[] {
  return consolidado.flatMap(mapearCdsParaDmProdutoLojaCd);
}
