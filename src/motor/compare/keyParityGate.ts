import type { MotorParidadeChavesResultado } from "./cdNormalization/cdNormalizationTypes.ts";

export function montarChaveComparacao(loja: number, seqproduto: number): string {
  return `${loja}|${seqproduto}`;
}

export function calcularParidadeChaves(input: {
  regional: string;
  loja: number;
  dataReferencia: string;
  excelDataExport?: string | null;
  v7Produtos: { loja: number; seqproduto: number }[];
  excelProdutos: { loja: number; seqproduto: number }[];
}): MotorParidadeChavesResultado {
  const v7Set = new Set(input.v7Produtos.map((p) => montarChaveComparacao(p.loja, p.seqproduto)));
  const excelSet = new Set(input.excelProdutos.map((p) => montarChaveComparacao(p.loja, p.seqproduto)));

  const chavesIntersecao: string[] = [];
  const chavesSomenteV7: string[] = [];
  const chavesSomenteExcel: string[] = [];

  for (const chave of v7Set) {
    if (excelSet.has(chave)) chavesIntersecao.push(chave);
    else chavesSomenteV7.push(chave);
  }
  for (const chave of excelSet) {
    if (!v7Set.has(chave)) chavesSomenteExcel.push(chave);
  }

  chavesIntersecao.sort();
  chavesSomenteV7.sort();
  chavesSomenteExcel.sort();

  const alertas: string[] = [];
  if (chavesSomenteV7.length > 0) {
    alertas.push(`universo_divergente:somente_v7=${chavesSomenteV7.length}`);
  }
  if (chavesSomenteExcel.length > 0) {
    alertas.push(`universo_divergente:somente_excel=${chavesSomenteExcel.length}`);
  }

  return {
    regional: input.regional,
    loja: input.loja,
    dataReferencia: input.dataReferencia,
    excelDataExport: input.excelDataExport ?? null,
    v7Total: v7Set.size,
    excelTotal: excelSet.size,
    intersecao: chavesIntersecao.length,
    somenteV7: chavesSomenteV7.length,
    somenteExcel: chavesSomenteExcel.length,
    chavesIntersecao,
    chavesSomenteV7,
    chavesSomenteExcel,
    alertas,
  };
}
