import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { adaptarCdsLegadoFlat } from "../consolidar/cds/consolidadoCdsLegadoAdapter.ts";
import {
  exportarCdsEmLayout,
  PERFIL_EXPORT_AUDITORIA_COMPLETA,
  PERFIL_EXPORT_BASE_CENTRAL,
  PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD,
  PERFIL_EXPORT_REGIONAL_8CD,
} from "../export/cds/index.ts";
import type { DmExportacaoProduto } from "./dmTypes.ts";

type CdsExportEntrada = MotorProdutoLojaConsolidado["cds"];

function cdsParaExportacao(cds: CdsExportEntrada) {
  return cds.map((cd) => ({
    posicaoLogica: cd.posicaoLogica,
    codigoFisico: cd.codigoFisico,
    estoque: cd.estoque,
    pendencia: cd.pendencia,
    statusCompra: cd.statusCompra,
    diasCompra: cd.diasCompra,
    diasRecebimento: cd.diasRecebimento,
  }));
}

/** Adaptador legado — somente exportação flat; nunca usado em regras ou mapeamento DM. */
export function exportarLegadoFlatSomenteExportacao(cds: CdsExportEntrada) {
  return adaptarCdsLegadoFlat(cds);
}

export function exportarLayout5Cds(
  consolidado: MotorProdutoLojaConsolidado,
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
) {
  return exportarCdsEmLayout({
    cds: cdsParaExportacao(consolidado.cds),
    perfil: PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD,
    catalogoPorPosicao,
  });
}

export function exportarLayout8Cds(
  consolidado: MotorProdutoLojaConsolidado,
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
) {
  return exportarCdsEmLayout({
    cds: cdsParaExportacao(consolidado.cds),
    perfil: PERFIL_EXPORT_REGIONAL_8CD,
    catalogoPorPosicao,
  });
}

export function exportarLayoutNCds(
  consolidado: MotorProdutoLojaConsolidado,
  quantidadePosicoes: number | "auto" = "auto",
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
) {
  return exportarCdsEmLayout({
    cds: cdsParaExportacao(consolidado.cds),
    quantidadePosicoes,
    catalogoPorPosicao,
  });
}

export function exportarBaseCentral(
  consolidado: MotorProdutoLojaConsolidado,
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
) {
  return exportarCdsEmLayout({
    cds: cdsParaExportacao(consolidado.cds),
    perfil: PERFIL_EXPORT_BASE_CENTRAL,
    catalogoPorPosicao,
  });
}

export function exportarAuditoria(
  consolidado: MotorProdutoLojaConsolidado,
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
) {
  return exportarCdsEmLayout({
    cds: cdsParaExportacao(consolidado.cds),
    perfil: PERFIL_EXPORT_AUDITORIA_COMPLETA,
    catalogoPorPosicao,
  });
}

export function exportarProdutoCompleto(
  consolidado: MotorProdutoLojaConsolidado,
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
): DmExportacaoProduto {
  return {
    loja: consolidado.loja,
    seqproduto: consolidado.seqproduto,
    layout5Cds: exportarLayout5Cds(consolidado, catalogoPorPosicao).colunas,
    layout8Cds: exportarLayout8Cds(consolidado, catalogoPorPosicao).colunas,
    layoutNCds: exportarLayoutNCds(consolidado, "auto", catalogoPorPosicao).colunas,
    baseCentral: exportarBaseCentral(consolidado, catalogoPorPosicao).colunas,
    auditoria: exportarAuditoria(consolidado, catalogoPorPosicao).colunas,
  };
}

export function exportarLote(
  consolidado: readonly MotorProdutoLojaConsolidado[],
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
): DmExportacaoProduto[] {
  return consolidado.map((item) => exportarProdutoCompleto(item, catalogoPorPosicao));
}
