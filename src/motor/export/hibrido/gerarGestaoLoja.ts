import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { GestaoJson, HibridoProdutoGestao } from "./hibridoTypes.ts";
import { HIBRIDO_GESTAO_CHUNK_MAX_BYTES } from "../../../hibrido-v7/constants.ts";

function mapProduto(item: MotorProdutoLojaConsolidado): HibridoProdutoGestao {
  return {
    loja: item.loja,
    seqproduto: item.seqproduto,
    descricao: item.descricao,
    codFornecedor: item.codFornecedor,
    razaoFornecedor: item.fornecedor,
    rede: item.rede,
    comprador: item.comprador,
    estoqueLoja: item.estoqueLoja,
    mediaVendaDia: item.mediaVendaUnDia,
    parMin: item.parMin,
    parMax: item.parMax,
    somaEstoqueCd: item.somaEstoqueCd,
    pendenciaLoja: item.pendenciaLoja,
    pendenciaCpaCd: item.pendenciaCpaCd,
    baseLimpa: item.baseLimpa ?? null,
    classificacaoPrazo: item.classificacaoPrazo,
    diasPedido: item.diasPedido,
    produtoCentralizado: item.produtoCentralizado,
    codigoCdSelecionado: item.codigoCdSelecionado,
    statusEstoqueCds: item.statusEstoqueCds,
    acaoRecomendada: item.acaoCurtoPrazo ?? item.acaoMedioPrazo,
    qualidadeDados: item.qualidadeDados,
    setorN2: item.setorN2,
    divisao: item.divisao,
    categoriaN1: item.categoriaN1,
    embalagemCompra: item.embalagemCompra,
    ruptura104c: item.ruptura104c,
    geraRuptura: item.geraRuptura,
    inventarioUnid: item.inventarioUnid,
    rupturaComInventario: item.rupturaComInventario,
    rupturaSemInventario: item.rupturaSemInventario,
    crossSum: item.crossSum,
    estSelecInvCd1: item.estSelecInvCd1,
    estSelecInvCd2: item.estSelecInvCd2,
    estSelecInvCd3: item.estSelecInvCd3,
    estSelecInvCd4: item.estSelecInvCd4,
    crossDocking: item.crossDocking,
    modCurtoPrazo: item.modCurtoPrazo,
    ncurtoPrazo: item.ncurtoPrazo,
    curtoPrazo: item.curtoPrazo,
    medioPrazo: item.medioPrazo,
    longoPrazo: item.longoPrazo,
    ultimaEntradaLoja: item.ultimaEntradaLoja,
    diasRuptura: item.diasRuptura,
    statusSolicitacaoAtivacaoCd: item.statusSolicitacaoAtivacaoCd,
    acaoCurtoPrazo: item.acaoCurtoPrazo,
    acaoMedioPrazo: item.acaoMedioPrazo,
    textoProdutoCentralizado: item.textoProdutoCentralizado,
  };
}

export type GestaoGeracaoResultado = {
  gestao: GestaoJson;
  /** Se exceder HIBRIDO_GESTAO_CHUNK_MAX_BYTES, dividir em gestao/index.json + gestao/parte-NNN.json */
  chunked: boolean;
  partes?: Array<{ pathSuffix: string; produtos: HibridoProdutoGestao[]; bytes: number }>;
};

/**
 * Estratégia de chunk (ETAPA 8):
 * - até 5 MB: gestao.json único;
 * - 5–10 MB: considerar gzip no Worker (não no frontend);
 * - acima de 10 MB: gestao/index.json + gestao/parte-001.json …
 */
export function gerarGestaoLoja(
  itens: readonly MotorProdutoLojaConsolidado[],
  input: {
    regional: string;
    bandeira: string;
    loja: number;
    dataReferencia: string;
    versao: number;
  },
): GestaoGeracaoResultado {
  const produtos = itens.map(mapProduto).sort((a, b) => a.seqproduto - b.seqproduto);
  const payload: GestaoJson = {
    meta: {
      regional: input.regional,
      bandeira: input.bandeira,
      loja: input.loja,
      dataReferencia: input.dataReferencia,
      versao: input.versao,
      total: produtos.length,
      geradoEm: new Date().toISOString(),
      chunked: false,
    },
    produtos,
  };

  const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (bytes <= HIBRIDO_GESTAO_CHUNK_MAX_BYTES) {
    return { gestao: payload, chunked: false };
  }

  const chunkSize = Math.max(500, Math.ceil(produtos.length / Math.ceil(bytes / HIBRIDO_GESTAO_CHUNK_MAX_BYTES)));
  const partes: GestaoGeracaoResultado["partes"] = [];
  for (let i = 0; i < produtos.length; i += chunkSize) {
    const slice = produtos.slice(i, i + chunkSize);
    const partBytes = Buffer.byteLength(JSON.stringify({ produtos: slice }), "utf8");
    partes.push({
      pathSuffix: `gestao/parte-${String(partes.length + 1).padStart(3, "0")}.json`,
      produtos: slice,
      bytes: partBytes,
    });
  }

  payload.meta.chunked = true;
  payload.meta.chunkIndex = {
    quantidadePartes: partes.length,
    totalProdutos: produtos.length,
    partes: partes.map((p, idx) => ({
      path: p.pathSuffix,
      hash: "pending",
      seqprodutoMin: p.produtos[0]?.seqproduto ?? 0,
      seqprodutoMax: p.produtos[p.produtos.length - 1]?.seqproduto ?? 0,
      bytes: p.bytes,
    })),
  };
  payload.produtos = [];

  return { gestao: payload, chunked: true, partes };
}
