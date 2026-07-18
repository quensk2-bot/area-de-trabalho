import type { MotorBreItemResultado } from "../../bre/breTypes.ts";
import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";

/** Campos flat CD1..CD5 derivados exclusivamente de cds[] (posições 1–5). CD6+ não aparece no layout legado. */
export type ConsolidadoCdsLegadoCampos = {
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  estoqueCd5: number | null;
  pendenciaCd1: number | null;
  pendenciaCd2: number | null;
  pendenciaCd3: number | null;
  pendenciaCd4: number | null;
  pendenciaCd5: number | null;
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  statusCompraCd5: string | null;
  diasCompraCd1: number | null;
  diasCompraCd2: number | null;
  diasCompraCd3: number | null;
  diasCompraCd4: number | null;
  diasCompraCd5: number | null;
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
};

export type ConsolidadoCdsLegadoCentralizacao = {
  primeiroCd: number | null;
  segundoCd: number | null;
  terceiroCd: number | null;
  quartoCd: number | null;
  quintoCd: number | null;
  flagPrimeiroCd: number | null;
  flagSegundoCd: number | null;
  flagTerceiroCd: number | null;
  flagQuartoCd: number | null;
  flagQuintoCd: number | null;
};

export type ConsolidadoCdsLegadoAdapterEntrada = {
  cds: readonly MotorProdutoCdNormalizado[];
  bre: MotorBreItemResultado | null;
  ordemCds: { cd1: number; cd2: number; cd3: number; cd4: number; cd5: number } | null;
};

function obterPorPosicao(
  cds: readonly MotorProdutoCdNormalizado[],
  posicao: number,
): MotorProdutoCdNormalizado | null {
  return cds.find((c) => c.posicaoLogica === posicao) ?? null;
}

function campoPosicao(
  cds: readonly MotorProdutoCdNormalizado[],
  posicao: 1 | 2 | 3 | 4 | 5,
): {
  estoque: number | null;
  pendencia: number | null;
  statusCompra: string | null;
  diasCompra: number | null;
  diasRecebimento: number | null;
} {
  const cd = obterPorPosicao(cds, posicao);
  if (!cd) {
    return {
      estoque: null,
      pendencia: null,
      statusCompra: null,
      diasCompra: null,
      diasRecebimento: null,
    };
  }
  return {
    estoque: cd.estoque,
    pendencia: cd.pendencia,
    statusCompra: cd.statusCompra,
    diasCompra: cd.diasCompra,
    diasRecebimento: cd.diasRecebimento,
  };
}

/** Função pura — não muta cds[]. Retorna null por posição inexistente; nunca cria posição artificial. */
export function adaptarCdsLegadoFlat(cds: readonly MotorProdutoCdNormalizado[]): ConsolidadoCdsLegadoCampos {
  const p1 = campoPosicao(cds, 1);
  const p2 = campoPosicao(cds, 2);
  const p3 = campoPosicao(cds, 3);
  const p4 = campoPosicao(cds, 4);
  const p5 = campoPosicao(cds, 5);

  return {
    estoqueCd1: p1.estoque,
    estoqueCd2: p2.estoque,
    estoqueCd3: p3.estoque,
    estoqueCd4: p4.estoque,
    estoqueCd5: p5.estoque,
    pendenciaCd1: p1.pendencia,
    pendenciaCd2: p2.pendencia,
    pendenciaCd3: p3.pendencia,
    pendenciaCd4: p4.pendencia,
    pendenciaCd5: p5.pendencia,
    statusCompraCd1: p1.statusCompra,
    statusCompraCd2: p2.statusCompra,
    statusCompraCd3: p3.statusCompra,
    statusCompraCd4: p4.statusCompra,
    statusCompraCd5: p5.statusCompra,
    diasCompraCd1: p1.diasCompra,
    diasCompraCd2: p2.diasCompra,
    diasCompraCd3: p3.diasCompra,
    diasCompraCd4: p4.diasCompra,
    diasCompraCd5: p5.diasCompra,
    diasRecebtoCd1: p1.diasRecebimento,
    diasRecebtoCd2: p2.diasRecebimento,
    diasRecebtoCd3: p3.diasRecebimento,
    diasRecebtoCd4: p4.diasRecebimento,
    diasRecebtoCd5: p5.diasRecebimento,
  };
}

/** Códigos físicos e flags vêm do BRE; ordem de CDs é fallback quando BRE não informa. */
export function adaptarCdsLegadoCentralizacao(
  entrada: ConsolidadoCdsLegadoAdapterEntrada,
): ConsolidadoCdsLegadoCentralizacao {
  const { bre, ordemCds } = entrada;
  return {
    primeiroCd: bre?.primeiroCd ?? ordemCds?.cd1 ?? null,
    segundoCd: bre?.segundoCd ?? ordemCds?.cd2 ?? null,
    terceiroCd: bre?.terceiroCd ?? ordemCds?.cd3 ?? null,
    quartoCd: bre?.quartoCd ?? ordemCds?.cd4 ?? null,
    quintoCd: bre?.quintoCd ?? ordemCds?.cd5 ?? null,
    flagPrimeiroCd: bre?.flagPrimeiroCd ?? null,
    flagSegundoCd: bre?.flagSegundoCd ?? null,
    flagTerceiroCd: bre?.flagTerceiroCd ?? null,
    flagQuartoCd: bre?.flagQuartoCd ?? null,
    flagQuintoCd: bre?.flagQuintoCd ?? null,
  };
}
