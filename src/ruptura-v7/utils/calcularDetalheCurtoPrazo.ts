import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import { filtrarUniversoOficialCompativel } from "../../motor/export/hibrido/filtrarUniversoOficialCompativel.ts";

export type DetalheCurtoPrazoDashboard = {
  total_curto_prazo: number;
  rebto_proximo: number;
  itens_cross: number;
  havia_estoque_cd: number;
  pct_rebto_proximo: number | null;
  pct_itens_cross: number | null;
  pct_havia_estoque_cd: number | null;
};

export type DetalheMedioPrazoDashboard = {
  total_medio_prazo: number;
  total_ruptura_classificada: number;
  pedido_maior_30: number;
  pedido_maior_60: number;
  pct_sobre_ruptura: number | null;
  pct_emitidos_posterior_30: number | null;
};

export type DetalheLongoPrazoDashboard = {
  total_longo_prazo: number;
  total_ruptura_classificada: number;
  ruptura_30_dias_sem_pedido: number;
  pct_sobre_ruptura: number | null;
  pct_ruptura_30_dias_sem_pedido: number | null;
};

export type DetalhesPrazoDashboard = {
  total_ruptura_classificada: number;
  curto: DetalheCurtoPrazoDashboard;
  medio: DetalheMedioPrazoDashboard;
  longo: DetalheLongoPrazoDashboard;
};

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

function fmtPctExcel(v: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}%`;
}

function isCurtoPrazo(p: HibridoProdutoGestao): boolean {
  return p.classificacaoPrazo === "curto_prazo" || p.curtoPrazo === 1;
}

function isMedioPrazo(p: HibridoProdutoGestao): boolean {
  return p.classificacaoPrazo === "medio_prazo" || p.medioPrazo === 1;
}

function isLongoPrazo(p: HibridoProdutoGestao): boolean {
  return p.classificacaoPrazo === "longo_prazo" || p.longoPrazo === 1;
}

function isRebtoProximo(p: HibridoProdutoGestao): boolean {
  return /^Recebimento Pr[oó]ximo/i.test(p.acaoCurtoPrazo ?? "");
}

function isHaviaEstoqueCd(p: HibridoProdutoGestao): boolean {
  return /^Havia estoque no CD/i.test(p.acaoCurtoPrazo ?? "");
}

function isItemCross(p: HibridoProdutoGestao): boolean {
  return p.crossDocking === 1;
}

/** Pedidos > 30 Dias — faixa 30–59 (equivalente a `Avaliar Pedido`). */
function isPedidoMaior30(p: HibridoProdutoGestao): boolean {
  if (!isMedioPrazo(p)) return false;
  const dias = p.diasPedido;
  if (dias != null && dias >= 30 && dias < 60) return true;
  return /Pedido dentre 30/i.test(p.acaoMedioPrazo ?? "");
}

/** Pedidos > 60 Dias — equivalente a `Pendência Indevida`. */
function isPedidoMaior60(p: HibridoProdutoGestao): boolean {
  if (!isMedioPrazo(p)) return false;
  const dias = p.diasPedido;
  if (dias != null && dias > 59) return true;
  return /Superior há 60/i.test(p.acaoMedioPrazo ?? "");
}

/** 30 dias em ruptura sem pedido no período — coluna oficial do Excel. */
function isRuptura30DiasSemPedido(p: HibridoProdutoGestao): boolean {
  if (!isLongoPrazo(p)) return false;
  if ((p.diasRuptura ?? 0) < 30) return false;
  return (p.pendenciaLoja ?? 0) + (p.pendenciaCpaCd ?? 0) <= 0;
}

export function agregarDetalhesPrazoFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  opts?: { universoOficial?: boolean },
): DetalhesPrazoDashboard {
  const base =
    opts?.universoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : [...produtos];

  let totalRupturaClassificada = 0;
  let totalCp = 0;
  let rebtoProximo = 0;
  let itensCross = 0;
  let haviaEstoqueCd = 0;
  let totalMp = 0;
  let pedidoMaior30 = 0;
  let pedidoMaior60 = 0;
  let totalLp = 0;
  let ruptura30DiasSemPedido = 0;

  for (const p of base) {
    if (isCurtoPrazo(p)) {
      totalRupturaClassificada += 1;
      totalCp += 1;
      if (isRebtoProximo(p)) rebtoProximo += 1;
      if (isItemCross(p)) itensCross += 1;
      if (isHaviaEstoqueCd(p)) haviaEstoqueCd += 1;
      continue;
    }
    if (isMedioPrazo(p)) {
      totalRupturaClassificada += 1;
      totalMp += 1;
      if (isPedidoMaior30(p)) pedidoMaior30 += 1;
      if (isPedidoMaior60(p)) pedidoMaior60 += 1;
      continue;
    }
    if (isLongoPrazo(p)) {
      totalRupturaClassificada += 1;
      totalLp += 1;
      if (isRuptura30DiasSemPedido(p)) ruptura30DiasSemPedido += 1;
    }
  }

  const curto: DetalheCurtoPrazoDashboard = {
    total_curto_prazo: totalCp,
    rebto_proximo: rebtoProximo,
    itens_cross: itensCross,
    havia_estoque_cd: haviaEstoqueCd,
    pct_rebto_proximo: pct(rebtoProximo, totalCp),
    pct_itens_cross: pct(itensCross, totalCp),
    pct_havia_estoque_cd: pct(haviaEstoqueCd, totalCp),
  };

  const medio: DetalheMedioPrazoDashboard = {
    total_medio_prazo: totalMp,
    total_ruptura_classificada: totalRupturaClassificada,
    pedido_maior_30: pedidoMaior30,
    pedido_maior_60: pedidoMaior60,
    pct_sobre_ruptura: pct(totalMp, totalRupturaClassificada),
    pct_emitidos_posterior_30: pct(pedidoMaior30 + pedidoMaior60, totalMp),
  };

  const longo: DetalheLongoPrazoDashboard = {
    total_longo_prazo: totalLp,
    total_ruptura_classificada: totalRupturaClassificada,
    ruptura_30_dias_sem_pedido: ruptura30DiasSemPedido,
    pct_sobre_ruptura: pct(totalLp, totalRupturaClassificada),
    pct_ruptura_30_dias_sem_pedido: pct(ruptura30DiasSemPedido, totalLp),
  };

  return { total_ruptura_classificada: totalRupturaClassificada, curto, medio, longo };
}

/** @deprecated Preferir `agregarDetalhesPrazoFromGestao`. */
export function agregarDetalheCurtoPrazoFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  opts?: { universoOficial?: boolean },
): DetalheCurtoPrazoDashboard {
  return agregarDetalhesPrazoFromGestao(produtos, opts).curto;
}

export function formatTooltipCurtoPrazo(d: DetalheCurtoPrazoDashboard | null | undefined): string | null {
  if (!d || d.total_curto_prazo <= 0) return null;
  return `${fmtPctExcel(d.pct_rebto_proximo)} Foram recebidos nos últimos dias - ${fmtPctExcel(d.pct_itens_cross)} Cross, ${fmtPctExcel(d.pct_havia_estoque_cd)} Gerou Ruptura possuindo Estoque no CD`;
}

export function formatTooltipMedioPrazo(d: DetalheMedioPrazoDashboard | null | undefined): string | null {
  if (!d || d.total_medio_prazo <= 0) return null;
  return `MÉDIO PRAZO (${fmtPctExcel(d.pct_sobre_ruptura)} Ruptura) ${fmtPctExcel(d.pct_emitidos_posterior_30)} foram emitidos posterior há 30 dias`;
}

export function formatTooltipLongoPrazo(d: DetalheLongoPrazoDashboard | null | undefined): string | null {
  if (!d || d.total_longo_prazo <= 0) return null;
  return `LONGO PRAZO (${fmtPctExcel(d.pct_sobre_ruptura)} Ruptura) ${fmtPctExcel(d.pct_ruptura_30_dias_sem_pedido)} é Ruptura há 30 DIAS sem pedido no período`;
}

export function formatTooltipsPrazoFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  opts?: { universoOficial?: boolean },
): {
  tooltip_curto_prazo: string | null;
  tooltip_medio_prazo: string | null;
  tooltip_longo_prazo: string | null;
} {
  const detalhes = agregarDetalhesPrazoFromGestao(produtos, opts);
  return {
    tooltip_curto_prazo: formatTooltipCurtoPrazo(detalhes.curto),
    tooltip_medio_prazo: formatTooltipMedioPrazo(detalhes.medio),
    tooltip_longo_prazo: formatTooltipLongoPrazo(detalhes.longo),
  };
}
