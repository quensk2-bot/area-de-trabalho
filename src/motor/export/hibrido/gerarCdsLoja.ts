import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { CdsLojaJson } from "./hibridoTypes.ts";

/** CDs dinâmicos — usa cds[] do consolidado, sem flat CD1..5. */
export function gerarCdsLoja(
  itens: readonly MotorProdutoLojaConsolidado[],
  input: { regional: string; bandeira: string; loja: number; dataReferencia: string },
): CdsLojaJson {
  return {
    loja: input.loja,
    regional: input.regional,
    bandeira: input.bandeira,
    dataReferencia: input.dataReferencia,
    produtos: itens.map((item) => ({
      seqproduto: item.seqproduto,
      cds: (item.cds ?? []).map((cd) => ({
        posicaoLogica: cd.posicaoLogica,
        codigoFisico: cd.codigoFisico,
        estoque: cd.estoque,
        pendencia: cd.pendencia,
        statusCompra: cd.statusCompra,
        diasCompra: cd.diasCompra,
        diasRecebimento: cd.diasRecebimento,
        flagCentralizacao: item.produtoCentralizado,
      })),
    })),
  };
}
