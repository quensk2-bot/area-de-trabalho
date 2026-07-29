import type { DmLote } from "./dmTypes.ts";

export type DmMetricasQualidade = {
  completo: number;
  completoComAlertas: number;
  incompleto: number;
  invalido: number;
};

export type DmMetricasProdutos = {
  total: number;
  comCds: number;
  semCds: number;
  mediaCdsPorProduto: number;
  maxCdsEmProduto: number;
};

export type DmMetricasCds = {
  totalLinhas: number;
  produtosPorQuantidade: Record<number, number>;
  posicoesDistintas: number;
  semCodigoFisico: number;
};

export type DmMetricasCampos = {
  produtoLojaPreenchidos: number;
  produtoLojaTotal: number;
  taxaPreenchimentoProduto: number;
  cdPreenchidos: number;
  cdTotal: number;
  taxaPreenchimentoCd: number;
};

export type DmMetricas = {
  produtos: DmMetricasProdutos;
  cds: DmMetricasCds;
  qualidade: DmMetricasQualidade;
  campos: DmMetricasCampos;
  volumeBytesEstimado: number;
  duracaoMs: number;
};

function contarNaoNulos(obj: Record<string, unknown>): number {
  return Object.values(obj).filter((v) => v != null && v !== "").length;
}

function estimarVolumeBytesLote(lote: DmLote): number {
  const amostraProd = lote.produtos.length > 0 ? JSON.stringify(lote.produtos[0]).length : 0;
  const amostraCd = lote.cds.length > 0 ? JSON.stringify(lote.cds[0]).length : 0;
  return amostraProd * lote.produtos.length + amostraCd * lote.cds.length;
}

export function calcularMetricasDm(lote: DmLote, duracaoMs: number): DmMetricas {
  const produtos = lote.produtos;
  const cds = lote.cds;

  const produtosPorQuantidade: Record<number, number> = {};
  let maxCds = 0;
  let comCds = 0;

  for (const p of produtos) {
    const q = p.quantidadeCds;
    produtosPorQuantidade[q] = (produtosPorQuantidade[q] ?? 0) + 1;
    maxCds = Math.max(maxCds, q);
    if (q > 0) comCds++;
  }

  const posicoes = new Set<number>();
  let semCodigoFisico = 0;
  for (const c of cds) {
    posicoes.add(c.posicaoLogica);
    if (c.codigoFisico == null) semCodigoFisico++;
  }

  const qualidade: DmMetricasQualidade = {
    completo: 0,
    completoComAlertas: 0,
    incompleto: 0,
    invalido: 0,
  };
  for (const p of produtos) {
    if (p.qualidadeDados === "completo") qualidade.completo++;
    else if (p.qualidadeDados === "completo_com_alertas") qualidade.completoComAlertas++;
    else if (p.qualidadeDados === "incompleto") qualidade.incompleto++;
    else if (p.qualidadeDados === "invalido") qualidade.invalido++;
  }

  let produtoPreenchidos = 0;
  let produtoTotal = 0;
  for (const p of produtos) {
    const { quantidadeCds: _q, ...rest } = p;
    const campos = Object.keys(rest).length;
    produtoTotal += campos;
    produtoPreenchidos += contarNaoNulos(rest as Record<string, unknown>);
  }

  let cdPreenchidos = 0;
  let cdTotal = 0;
  for (const c of cds) {
    const campos = Object.keys(c).length;
    cdTotal += campos;
    cdPreenchidos += contarNaoNulos(c as unknown as Record<string, unknown>);
  }

  const volumeBytesEstimado = estimarVolumeBytesLote(lote);

  return {
    produtos: {
      total: produtos.length,
      comCds,
      semCds: produtos.length - comCds,
      mediaCdsPorProduto: produtos.length ? cds.length / produtos.length : 0,
      maxCdsEmProduto: maxCds,
    },
    cds: {
      totalLinhas: cds.length,
      produtosPorQuantidade,
      posicoesDistintas: posicoes.size,
      semCodigoFisico,
    },
    qualidade,
    campos: {
      produtoLojaPreenchidos: produtoPreenchidos,
      produtoLojaTotal: produtoTotal,
      taxaPreenchimentoProduto: produtoTotal ? produtoPreenchidos / produtoTotal : 0,
      cdPreenchidos,
      cdTotal,
      taxaPreenchimentoCd: cdTotal ? cdPreenchidos / cdTotal : 0,
    },
    volumeBytesEstimado,
    duracaoMs,
  };
}
