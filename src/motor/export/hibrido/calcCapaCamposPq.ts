import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";

function emRupturaClassificada(cls: MotorProdutoLojaConsolidado["classificacaoPrazo"]): boolean {
  return cls === "curto_prazo" || cls === "medio_prazo" || cls === "longo_prazo";
}

// ---------------------------------------------------------------------------
// Utilitário de data — aceita ISO (YYYY-MM-DD) ou DD/MM/YYYY
// ---------------------------------------------------------------------------

function parseDataReferencia(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const t = value.trim();
  if (t === "") return null;
  // ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // BR DD/MM/YYYY
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // ISO com T (ex: 2026-07-13T03:00:00)
  const ts = Date.parse(t);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
}

/** Converte Date ou string ISO/BR para Date. */
function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return parseDataReferencia(typeof value === "string" ? value : null);
}

/** Dias entre dataRef e value (ceil, >= 0). */
function daysBetween(dataRef: Date, value: Date | string | null): number | null {
  if (value == null) return null;
  const d = toDate(value);
  if (!d) return null;
  const diff = dataRef.getTime() - d.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Rup (X) Dias Recebto CD / Rebote — campos PQ 1 a 8
// ---------------------------------------------------------------------------

/**
 * PQ: `if [ESTQ_CDx] = 1 then (if [DIAS_RECEBTO_CDx] = 0 then 1 else [DIAS_RECEBTO_CDx]) else 0`
 * Retorna o valor do CD individual (0 se sem estoque).
 */
export function calcRupDiasRecebtoCd(
  estoqueCd: number | null | undefined,
  diasRecebtoCd: number | null | undefined,
): number {
  if (estoqueCd !== 1) return 0;
  if (diasRecebtoCd == null) return 0;
  if (diasRecebtoCd === 0) return 1;
  return diasRecebtoCd;
}

/** Busca o CD na posição lógica do array de CDs e aplica calcRupDiasRecebtoCd. */
export function calcRupDiasRecebtoCdPorPosicao(
  cds: MotorProdutoLojaConsolidado["cds"],
  posicaoLogica: number,
): number {
  const cd = (cds ?? []).find((c) => c.posicaoLogica === posicaoLogica);
  return calcRupDiasRecebtoCd(cd?.estoque, cd?.diasRecebimento);
}

/**
 * PQ: `List.Max({Rup (X) Dias Recebto CD 01..05})`
 * Maior valor entre os 5 CDs; retorna 0 se todos forem 0.
 */
export function calcRupDiasRecebtoMaiorData(valores: readonly number[]): number {
  return Math.max(...valores, 0);
}

/**
 * PQ: `Curto Prazo Rebto Próximo = if [Rup (X) Dias Recebto Maior data] > 0 and [Rup (X) Dias Recebto Maior data] < 5 and [Menor que três Unidades] = 1 then 1 else 0`
 */
export function calcCurtoPrazoRebtoProximo(
  maiorData: number,
  item: Pick<MotorProdutoLojaConsolidado, "ruptura104c">,
): 0 | 1 {
  if (maiorData <= 0) return 0;
  if (maiorData >= 5) return 0;
  if (!item.ruptura104c) return 0;
  return 1;
}

/**
 * PQ: `Curto Prazo Não Rebto Próximo = if [Rup (X) Dias Recebto Maior data] > 4 and [Menor que três Unidades] = 1 then 1 else 0`
 */
export function calcCurtoPrazoNaoRebtoProximo(
  maiorData: number,
  item: Pick<MotorProdutoLojaConsolidado, "ruptura104c">,
): 0 | 1 {
  if (maiorData <= 4) return 0;
  if (!item.ruptura104c) return 0;
  return 1;
}

/** Calcula os 5 valores individuais + maiorData + flags de rebote. */
export function calcCamposRecebimentoRebote(
  item: MotorProdutoLojaConsolidado,
): {
  rupDiasRecebtoCd1: number;
  rupDiasRecebtoCd2: number;
  rupDiasRecebtoCd3: number;
  rupDiasRecebtoCd4: number;
  rupDiasRecebtoCd5: number;
  rupDiasRecebtoMaiorData: number;
  curtoPrazoRebtoProximo: 0 | 1;
  curtoPrazoNaoRebtoProximo: 0 | 1;
} {
  // Prioriza campos flat (compatibilidade), fallback para array cds[]
  const v1 = item.diasRecebtoCd1 != null
    ? calcRupDiasRecebtoCd(item.estoqueCd1, item.diasRecebtoCd1)
    : calcRupDiasRecebtoCdPorPosicao(item.cds, 1);
  const v2 = item.diasRecebtoCd2 != null
    ? calcRupDiasRecebtoCd(item.estoqueCd2, item.diasRecebtoCd2)
    : calcRupDiasRecebtoCdPorPosicao(item.cds, 2);
  const v3 = item.diasRecebtoCd3 != null
    ? calcRupDiasRecebtoCd(item.estoqueCd3, item.diasRecebtoCd3)
    : calcRupDiasRecebtoCdPorPosicao(item.cds, 3);
  const v4 = item.diasRecebtoCd4 != null
    ? calcRupDiasRecebtoCd(item.estoqueCd4, item.diasRecebtoCd4)
    : calcRupDiasRecebtoCdPorPosicao(item.cds, 4);
  const v5 = item.diasRecebtoCd5 != null
    ? calcRupDiasRecebtoCd(item.estoqueCd5, item.diasRecebtoCd5)
    : calcRupDiasRecebtoCdPorPosicao(item.cds, 5);

  const maiorData = calcRupDiasRecebtoMaiorData([v1, v2, v3, v4, v5]);

  return {
    rupDiasRecebtoCd1: v1,
    rupDiasRecebtoCd2: v2,
    rupDiasRecebtoCd3: v3,
    rupDiasRecebtoCd4: v4,
    rupDiasRecebtoCd5: v5,
    rupDiasRecebtoMaiorData: maiorData,
    curtoPrazoRebtoProximo: calcCurtoPrazoRebtoProximo(maiorData, item),
    curtoPrazoNaoRebtoProximo: calcCurtoPrazoNaoRebtoProximo(maiorData, item),
  };
}

// ---------------------------------------------------------------------------
// Último Pedido Loja — fórmula oficial Power Query
// ---------------------------------------------------------------------------

/**
 * PQ: `Último Pedido Loja`
 *
 * REGRA EXATA:
 * 1. Se Longo Prazo = 0 → 0
 * 2. Se ULTIMACPALOJA e ULTIMACPACD1..5 forem todos null → 999
 * 3. Menor valor válido entre ULTIMACPALOJA e ULTIMACPACD1..5
 * 4. Se esse menor valor > Dias Ativação Revisado → 999
 * 5. Senão → menor valor
 *
 * ULTIMACPALOJA e ULTIMACPACD1..5 são NUMÉRICOS (dias) no TXT.
 *
 * ATENÇÃO: usado nas regras operacionais de LP e Ativação >30.
 * Para o Dashboard visual, usar calcDiasUltimoPedidoLojaDashboard().
 */
export function calcUltimoPedidoLojaPq(
  item: Pick<MotorProdutoLojaConsolidado, "longoPrazo" | "ultimaCpaLoja" | "ultimaCpaCd1" | "ultimaCpaCd2" | "ultimaCpaCd3" | "ultimaCpaCd4" | "ultimaCpaCd5" | "cds" | "diasAtivacaoRevisado">,
  _dataReferencia: string,
): number {
  // Regra 1: Longo Prazo = 0 → 0
  if (item.longoPrazo !== 1) return 0;

  // Valores numéricos (dias) de ULTIMACPALOJA e ULTIMACPACD1..5
  const valores: number[] = [
    item.ultimaCpaLoja,
    item.ultimaCpaCd1,
    item.ultimaCpaCd2,
    item.ultimaCpaCd3,
    item.ultimaCpaCd4,
    item.ultimaCpaCd5,
  ].filter((v): v is number => v != null && v >= 0);

  // Regra 2: Todos null → 999
  if (valores.length === 0) return 999;

  // Regra 3: Menor valor válido
  const menor = Math.min(...valores);

  // Regra 4: Menor > Dias Ativação Revisado → 999
  if (item.diasAtivacaoRevisado != null && menor > item.diasAtivacaoRevisado) return 999;

  // Regra 5: Retornar o menor valor
  return menor;
}

// ---------------------------------------------------------------------------
// Ativação e Ruptura > 30 Dias Sem Pedido
// ---------------------------------------------------------------------------

/**
 * PQ: `Ativação e Ruptura > 30 Dias Sem Pedido =
 *   Longo Prazo = 1
 *   AND Dias Ativação Revisado > 30
 *   AND Último Pedido Loja > 30
 *   AND Dias Ruptura > 30`
 *
 * Usa calcUltimoPedidoLojaPq() como fonte de ultimoPedidoLoja.
 * Não usar raw ultimaCpaLoja nesta regra.
 */
export function calcAtivacaoRuptura30SemPedido(
  item: MotorProdutoLojaConsolidado,
  ultimoPedidoLoja: number,
): 0 | 1 {
  if (item.longoPrazo !== 1) return 0;
  if ((item.diasAtivacaoRevisado ?? 0) <= 30) return 0;
  if (ultimoPedidoLoja <= 30) return 0;
  if ((item.diasRuptura ?? 0) <= 30) return 0;
  return 1;
}

// ---------------------------------------------------------------------------
// Dias Último Pedido Loja — Dashboard (raw ULTIMACPALOJA)
// ---------------------------------------------------------------------------

/**
 * Raw ULTIMACPALOJA para exibição no Dashboard Loja.
 * DIFERENTE de calcUltimoPedidoLojaPq() — não usa min com CDs.
 *
 * Regras:
 * - Se null ou 999 ou 0 → null (não entra na média do Dashboard)
 * - Senão → raw ultimaCpaLoja
 *
 * A média no Dashboard é: soma / count (excluindo null, 0, 999).
 */
export function calcDiasUltimoPedidoLojaDashboard(
  item: Pick<MotorProdutoLojaConsolidado, "longoPrazo" | "ultimaCpaLoja">,
): number | null {
  // Só produtos de Longo Prazo têm este campo preenchido
  if (item.longoPrazo !== 1) return null;
  const raw = item.ultimaCpaLoja;
  if (raw == null || raw === 0 || raw === 999) return null;
  return raw;
}

// ---------------------------------------------------------------------------
// Campos PQ já existentes
// ---------------------------------------------------------------------------

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
  dataReferencia?: string,
): CapaCamposPq {
  const itensVdaPendencia = calcItensVdaPendencia(item);
  // Calcula ultimoPedidoLoja com a fórmula PQ oficial
  const ultimoPedidoLoja = calcUltimoPedidoLojaPq(item, dataReferencia ?? item.dataReferencia);
  // Calcula ativacao com a nova fórmula que usa ultimoPedidoLoja
  const ativacaoRuptura30SemPedido =
    oficial?.ativacaoRuptura30SemPedido != null
      ? (oficial.ativacaoRuptura30SemPedido as 0 | 1)
      : calcAtivacaoRuptura30SemPedido(item, ultimoPedidoLoja);
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
