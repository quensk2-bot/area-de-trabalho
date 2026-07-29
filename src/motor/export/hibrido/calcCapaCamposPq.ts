import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";

function emRupturaClassificada(cls: MotorProdutoLojaConsolidado["classificacaoPrazo"]): boolean {
  return cls === "curto_prazo" || cls === "medio_prazo" || cls === "longo_prazo";
}

/** Proxy Excel `Ativação e Ruptura > 30 Dias Sem Pedido` (380 itens oficiais MT). */
export function calcAtivacaoRuptura30SemPedido(item: MotorProdutoLojaConsolidado): 0 | 1 {
  if (item.longoPrazo !== 1) return 0;
  if ((item.diasRuptura ?? 0) < 30) return 0;
  if ((item.pendenciaLoja ?? 0) + (item.pendenciaCpaCd ?? 0) > 0) return 0;
  if (item.statusSolicitacaoAtivacaoCd === "Ativo no CD") return 0;
  return 1;
}

/** PQ literal: `if [ESTOQUE] < 0 then 1 else 0` */
export function calcItensVdaPendencia(item: Pick<MotorProdutoLojaConsolidado, "estoqueLoja">): 0 | 1 {
  return (item.estoqueLoja ?? 0) < 0 ? 1 : 0;
}

/** Flag 0/1 — MÉDIA na CAPA vira % Rup Sem Pendência Vda (~9,95% no total MT). */
export function calcRupSemPendenciaVdaFlag(
  item: MotorProdutoLojaConsolidado,
  itensVdaPendencia: 0 | 1,
): 0 | 1 {
  if (!emRupturaClassificada(item.classificacaoPrazo)) return 0;
  return itensVdaPendencia === 1 ? 0 : 1;
}

export type CapaCamposPq = {
  itensVdaPendencia: 0 | 1;
  ativacaoRuptura30SemPedido: 0 | 1;
  ultimoPedidoLoja: number;
  rupSemPendenciaVda: 0 | 1;
};

export type CapaPqOficialLookup = ReadonlyMap<string, Partial<CapaCamposPq>>;

function chaveLojaProduto(loja: number, seqproduto: number): string {
  return `${loja}\u0001${seqproduto}`;
}

export function calcCapaCamposPq(
  item: MotorProdutoLojaConsolidado,
  oficial?: Partial<CapaCamposPq>,
): CapaCamposPq {
  const itensVdaPendencia = calcItensVdaPendencia(item);
  const ativacaoRuptura30SemPedido =
    oficial?.ativacaoRuptura30SemPedido != null
      ? (oficial.ativacaoRuptura30SemPedido as 0 | 1)
      : calcAtivacaoRuptura30SemPedido(item);
  const ultimoPedidoLoja = oficial?.ultimoPedidoLoja ?? 0;
  const rupSemPendenciaVda =
    oficial?.rupSemPendenciaVda != null
      ? (oficial.rupSemPendenciaVda as 0 | 1)
      : calcRupSemPendenciaVdaFlag(item, itensVdaPendencia);

  return {
    itensVdaPendencia,
    ativacaoRuptura30SemPedido,
    ultimoPedidoLoja,
    rupSemPendenciaVda,
  };
}

export function chaveCapaPqOficial(loja: number, seqproduto: number): string {
  return chaveLojaProduto(loja, seqproduto);
}
