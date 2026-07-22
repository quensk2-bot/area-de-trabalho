import type { ResumoLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { RupturaDashboardLoja } from "../../types/rupturaDashboardTypes.ts";

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

export function mapResumoToDashboard(resumo: ResumoLojaJson): RupturaDashboardLoja {
  const totalRupturaGeral = resumo.totalRupturaGeral ?? resumo.ruptura;
  const totalRupturaClassificada =
    resumo.totalRupturaClassificada ??
    resumo.curtoPrazo + resumo.medioPrazo + resumo.longoPrazo;
  const totalBaseLimpa = resumo.totalBaseLimpaElegivel ?? resumo.totalProdutos;
  const percentualGeral = resumo.percentualRupturaGeral ?? resumo.percentualRuptura;
  const percentualClassificada =
    resumo.percentualRupturaClassificada ??
    (totalBaseLimpa ? Math.round((totalRupturaClassificada / totalBaseLimpa) * 10000) / 100 : null);

  return {
    regional: resumo.regional,
    data_referencia: resumo.dataReferencia,
    loja: resumo.loja,
    total_produtos: resumo.totalProdutos,
    total_em_ruptura: totalRupturaGeral,
    total_ruptura_geral: totalRupturaGeral,
    total_ruptura_classificada: totalRupturaClassificada,
    total_curto_prazo: resumo.curtoPrazo,
    total_medio_prazo: resumo.medioPrazo,
    total_longo_prazo: resumo.longoPrazo,
    total_sem_ruptura: resumo.semRuptura,
    total_bloqueado: resumo.bloqueados,
    total_qualidade_alerta: 0,
    total_com_estoque_cd: resumo.comEstoqueCd ?? 0,
    total_sem_estoque_cd: resumo.semEstoqueCd ?? 0,
    total_com_pendencia: 0,
    total_cross_docking: 0,
    total_centralizado: resumo.totalCentralizados ?? 0,
    total_nao_centralizado: resumo.totalNaoCentralizados ?? 0,
    compradores_distintos: resumo.compradores?.length ?? 0,
    fornecedores_distintos: resumo.fornecedores?.length ?? 0,
    total_base_limpa_elegivel: totalBaseLimpa,
    percentual_ruptura: percentualGeral,
    percentual_ruptura_geral: percentualGeral,
    percentual_ruptura_classificada: percentualClassificada,
  };
}

function mergeMapSum<T>(
  items: T[],
  keyFn: (item: T) => string,
  mergeFn: (acc: T, item: T) => T,
): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyFn(item);
    const prev = map.get(key);
    map.set(key, prev ? mergeFn(prev, item) : item);
  }
  return [...map.values()];
}

/** Agrega resumos de múltiplas lojas — percentuais recalculados a partir dos totais. */
export function aggregateResumos(
  resumos: ResumoLojaJson[],
  ctx: { regional: string; bandeira: string | null; dataReferencia: string },
): ResumoLojaJson | null {
  if (!resumos.length) return null;

  let totalProdutos = 0;
  let totalRupturaGeral = 0;
  let totalRupturaClassificada = 0;
  let curtoPrazo = 0;
  let medioPrazo = 0;
  let longoPrazo = 0;
  let semRuptura = 0;
  let bloqueados = 0;
  let totalBaseLimpaElegivel = 0;
  let comEstoqueCd = 0;
  let semEstoqueCd = 0;
  let totalCentralizados = 0;
  let totalNaoCentralizados = 0;

  const setoresFlat: NonNullable<ResumoLojaJson["setores"]> = [];
  const fornecedoresFlat: NonNullable<ResumoLojaJson["fornecedores"]> = [];
  const compradoresFlat: NonNullable<ResumoLojaJson["compradores"]> = [];
  const estoqueFlat: NonNullable<ResumoLojaJson["estoquePorCd"]> = [];

  for (const r of resumos) {
    totalProdutos += r.totalProdutos;
    totalRupturaGeral += r.totalRupturaGeral ?? r.ruptura;
    totalRupturaClassificada +=
      r.totalRupturaClassificada ?? r.curtoPrazo + r.medioPrazo + r.longoPrazo;
    curtoPrazo += r.curtoPrazo;
    medioPrazo += r.medioPrazo;
    longoPrazo += r.longoPrazo;
    semRuptura += r.semRuptura;
    bloqueados += r.bloqueados;
    totalBaseLimpaElegivel += r.totalBaseLimpaElegivel ?? r.totalProdutos;
    comEstoqueCd += r.comEstoqueCd ?? 0;
    semEstoqueCd += r.semEstoqueCd ?? 0;
    totalCentralizados += r.totalCentralizados ?? 0;
    totalNaoCentralizados += r.totalNaoCentralizados ?? 0;

    setoresFlat.push(...(r.setores ?? []));
    fornecedoresFlat.push(...(r.fornecedores ?? []));
    compradoresFlat.push(...(r.compradores ?? []));
    estoqueFlat.push(...(r.estoquePorCd ?? []));
  }

  const setores = mergeMapSum(
    setoresFlat,
    (s) => s.setor,
    (a, b) => ({ setor: a.setor, totalRuptura: a.totalRuptura + b.totalRuptura }),
  ).sort((a, b) => b.totalRuptura - a.totalRuptura);

  const fornecedores = mergeMapSum(
    fornecedoresFlat,
    (f) => f.fornecedor,
    (a, b) => ({
      fornecedor: a.fornecedor,
      comprador: a.comprador ?? b.comprador,
      totalRuptura: a.totalRuptura + b.totalRuptura,
    }),
  ).sort((a, b) => b.totalRuptura - a.totalRuptura);

  const compradores = mergeMapSum(
    compradoresFlat,
    (c) => c.comprador,
    (a, b) => ({ comprador: a.comprador, totalRuptura: a.totalRuptura + b.totalRuptura }),
  ).sort((a, b) => b.totalRuptura - a.totalRuptura);

  const estoquePorCd = mergeMapSum(
    estoqueFlat,
    (c) => `${c.codigoFisico ?? "null"}:${c.posicaoLogica}`,
    (a, b) => ({
      codigoFisico: a.codigoFisico,
      posicaoLogica: a.posicaoLogica,
      totalEstoque: a.totalEstoque + b.totalEstoque,
    }),
  ).sort((a, b) => b.totalEstoque - a.totalEstoque);

  const percentualGeral = pct(totalRupturaGeral, totalBaseLimpaElegivel);
  const percentualClassificada = pct(totalRupturaClassificada, totalBaseLimpaElegivel);

  return {
    loja: resumos.length === 1 ? resumos[0]!.loja : 0,
    regional: ctx.regional,
    bandeira: resumos[0]?.bandeira ?? ctx.bandeira ?? "",
    dataReferencia: ctx.dataReferencia,
    totalProdutos,
    ruptura: totalRupturaGeral,
    totalRupturaGeral,
    totalRupturaClassificada,
    curtoPrazo,
    medioPrazo,
    longoPrazo,
    semRuptura,
    bloqueados,
    totalBaseLimpaElegivel,
    percentualRuptura: percentualGeral,
    percentualRupturaGeral: percentualGeral,
    percentualRupturaClassificada: percentualClassificada,
    comEstoqueCd,
    semEstoqueCd,
    totalCentralizados,
    totalNaoCentralizados,
    atualizadoEm: resumos.map((r) => r.atualizadoEm).sort().reverse()[0] ?? "",
    setores,
    fornecedores,
    compradores,
    estoquePorCd,
  };
}

export function mapResumosAgregadosToDashboard(
  resumos: ResumoLojaJson[],
  ctx: { regional: string; bandeira: string | null; dataReferencia: string },
): RupturaDashboardLoja | null {
  const agregado = aggregateResumos(resumos, ctx);
  return agregado ? mapResumoToDashboard(agregado) : null;
}
