import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import { adaptarCdsLegadoFlat } from "../../consolidar/cds/consolidadoCdsLegadoAdapter.ts";
import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";
import type { MotorPerfilComparacaoCd } from "./motorPerfilComparacaoCd.ts";
import type { MotorCdComparacaoItem, MotorProdutoComparacaoCds } from "./motorCdComparacaoTypes.ts";

function cdNormalizadoParaComparacao(
  cd: MotorProdutoCdNormalizado,
  flagCentralizacao: number | null,
): MotorCdComparacaoItem {
  return {
    posicaoLogica: cd.posicaoLogica,
    codigoFisico: cd.codigoFisico,
    estoque: cd.estoque,
    pendencia: cd.pendencia,
    statusCompra: cd.statusCompra,
    diasCompra: cd.diasCompra,
    diasRecebimento: cd.diasRecebimento,
    flagCentralizacao,
    origem: "v7",
    alertas: [...cd.alertas],
  };
}

function flagPorPosicao(item: MotorProdutoLojaConsolidado, posicao: number): number | null {
  switch (posicao) {
    case 1:
      return item.flagPrimeiroCd;
    case 2:
      return item.flagSegundoCd;
    case 3:
      return item.flagTerceiroCd;
    case 4:
      return item.flagQuartoCd;
    case 5:
      return item.flagQuintoCd;
    default:
      return null;
  }
}

function buildLegacyCdsFromFlat(item: MotorProdutoLojaConsolidado): MotorProdutoCdNormalizado[] {
  const origem = `${item.regional}-legado-adaptador`;
  const posicoes: Array<{
    pos: number;
    estoque: number | null;
    pendencia: number | null;
    status: string | null;
    diasCompra: number | null;
    diasReceb: number | null;
  }> = [
    { pos: 1, estoque: item.estoqueCd1, pendencia: item.pendenciaCd1, status: item.statusCompraCd1, diasCompra: item.diasCompraCd1, diasReceb: item.diasRecebtoCd1 },
    { pos: 2, estoque: item.estoqueCd2, pendencia: item.pendenciaCd2, status: item.statusCompraCd2, diasCompra: item.diasCompraCd2, diasReceb: item.diasRecebtoCd2 },
    { pos: 3, estoque: item.estoqueCd3, pendencia: item.pendenciaCd3, status: item.statusCompraCd3, diasCompra: item.diasCompraCd3, diasReceb: item.diasRecebtoCd3 },
    { pos: 4, estoque: item.estoqueCd4, pendencia: item.pendenciaCd4, status: item.statusCompraCd4, diasCompra: item.diasCompraCd4, diasReceb: item.diasRecebtoCd4 },
    { pos: 5, estoque: item.estoqueCd5, pendencia: item.pendenciaCd5, status: item.statusCompraCd5, diasCompra: item.diasCompraCd5, diasReceb: item.diasRecebtoCd5 },
  ];

  return posicoes
    .filter(
      (p) =>
        p.estoque != null ||
        p.pendencia != null ||
        p.status != null ||
        p.diasCompra != null ||
        p.diasReceb != null,
    )
    .map((p) => ({
      posicaoLogica: p.pos,
      codigoFisico: null,
      estoque: p.estoque,
      pendencia: p.pendencia,
      statusCompra: p.status,
      diasCompra: p.diasCompra,
      diasRecebimento: p.diasReceb,
      ultimaCompra: null,
      ultimaEntrada: null,
      estoqueSelecionadoInventario: null,
      origemArquivo: origem,
      numeroBloco: 1,
      posicaoNoArquivo: p.pos,
      alertas: [],
    }));
}

export function normalizarV7Cds(
  item: MotorProdutoLojaConsolidado,
  perfil: MotorPerfilComparacaoCd,
): MotorProdutoComparacaoCds {
  let fonte: MotorProdutoCdNormalizado[];

  if ((item.cds?.length ?? 0) > 0) {
    fonte = item.cds.map((c) => ({ ...c, alertas: [...c.alertas] }));
  } else if (perfil.usarAdaptadorLegado) {
    fonte = buildLegacyCdsFromFlat(item);
  } else {
    fonte = [];
  }

  const cds = fonte
    .map((cd) => cdNormalizadoParaComparacao(cd, flagPorPosicao(item, cd.posicaoLogica)))
    .sort((a, b) => a.posicaoLogica - b.posicaoLogica);

  return {
    regional: item.regional,
    bandeira: item.bandeira,
    loja: item.loja,
    seqproduto: item.seqproduto,
    cds,
  };
}

/** Deriva flat ESTQ_CD* a partir de cds[] para compatibilidade de compare legado. */
export function mapCdsParaColunasFlatEstoque(cds: readonly MotorCdComparacaoItem[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const cd of cds) {
    out[`ESTQ_CD${cd.posicaoLogica}`] = cd.estoque;
  }
  return out;
}

/** Enriquece cds[] com código físico do catálogo quando ausente. */
export function enriquecerCodigosFisicosV7(
  cds: MotorCdComparacaoItem[],
  porPosicao: ReadonlyMap<number, number | null>,
): MotorCdComparacaoItem[] {
  return cds.map((cd) => {
    if (cd.codigoFisico != null) return cd;
    const codigo = porPosicao.get(cd.posicaoLogica) ?? null;
    return {
      ...cd,
      codigoFisico: codigo,
      alertas: codigo == null ? [...cd.alertas, "codigo_fisico_ausente"] : cd.alertas,
    };
  });
}
