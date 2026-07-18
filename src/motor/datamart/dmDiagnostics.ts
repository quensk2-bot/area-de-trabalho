import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { camposPersistiveis, DM_SCHEMA_PRODUTO_LOJA } from "./dmSchemas.ts";
import { chaveDmTexto } from "./dmMapping.ts";
import type { DmLote } from "./dmTypes.ts";

export type DmCampoNulo = {
  loja: number;
  seqproduto: number;
  campo: string;
  tabela: "dm_produto_loja" | "dm_produto_loja_cd";
};

export type DmDiagnostico = {
  camposNulos: DmCampoNulo[];
  camposSemOrigem: string[];
  qualidadePorProduto: Array<{ loja: number; seqproduto: number; qualidade: string }>;
  alertasConsolidado: Array<{ loja: number; seqproduto: number; codigo: string; mensagem: string }>;
  duplicidades: string[];
  produtosPorQuantidadeCds: Record<number, number>;
  resumo: {
    totalProdutos: number;
    totalLinhasCd: number;
    produtosComAlertas: number;
    produtosComErros: number;
    produtosSemCds: number;
  };
};

export function gerarDiagnosticoDm(
  lote: DmLote,
  consolidado: readonly MotorProdutoLojaConsolidado[],
): DmDiagnostico {
  const camposNulos: DmCampoNulo[] = [];
  const camposProduto = camposPersistiveis("dm_produto_loja");
  const camposCd = camposPersistiveis("dm_produto_loja_cd");

  for (const produto of lote.produtos) {
    for (const campo of camposProduto) {
      const valor = produto[campo as keyof typeof produto];
      if (valor == null) {
        camposNulos.push({ loja: produto.loja, seqproduto: produto.seqproduto, campo, tabela: "dm_produto_loja" });
      }
    }
  }

  for (const cd of lote.cds) {
    for (const campo of camposCd) {
      if (campo === "regional" || campo === "dataReferencia" || campo === "loja" || campo === "seqproduto" || campo === "posicaoLogica") {
        continue;
      }
      const valor = cd[campo as keyof typeof cd];
      if (valor == null) {
        camposNulos.push({ loja: cd.loja, seqproduto: cd.seqproduto, campo, tabela: "dm_produto_loja_cd" });
      }
    }
  }

  const origensEsperadas = new Set(DM_SCHEMA_PRODUTO_LOJA.map((s) => s.origem));
  const camposSemOrigem = [...origensEsperadas].filter((o) => o === "legado" || o.startsWith("consolidado.estoqueCd"));

  const qualidadePorProduto = lote.produtos.map((p) => ({
    loja: p.loja,
    seqproduto: p.seqproduto,
    qualidade: p.qualidadeDados,
  }));

  const alertasConsolidado = consolidado.flatMap((item) =>
    item.alertas.map((a) => ({
      loja: item.loja,
      seqproduto: item.seqproduto,
      codigo: a.codigo,
      mensagem: a.mensagem,
    })),
  );

  const chaves = new Map<string, number>();
  for (const p of lote.produtos) {
    const k = chaveDmTexto(p);
    chaves.set(k, (chaves.get(k) ?? 0) + 1);
  }
  const duplicidades = [...chaves.entries()].filter(([, q]) => q > 1).map(([k, q]) => `${k} (${q}x)`);

  const produtosPorQuantidadeCds: Record<number, number> = {};
  for (const p of lote.produtos) {
    produtosPorQuantidadeCds[p.quantidadeCds] = (produtosPorQuantidadeCds[p.quantidadeCds] ?? 0) + 1;
  }

  return {
    camposNulos,
    camposSemOrigem,
    qualidadePorProduto,
    alertasConsolidado,
    duplicidades,
    produtosPorQuantidadeCds,
    resumo: {
      totalProdutos: lote.produtos.length,
      totalLinhasCd: lote.cds.length,
      produtosComAlertas: consolidado.filter((c) => c.alertas.length > 0).length,
      produtosComErros: consolidado.filter((c) => c.erros.length > 0).length,
      produtosSemCds: lote.produtos.filter((p) => p.quantidadeCds === 0).length,
    },
  };
}

export function formatarDiagnosticoTexto(diagnostico: DmDiagnostico): string {
  const linhas = [
    `Produtos: ${diagnostico.resumo.totalProdutos}`,
    `Linhas CD: ${diagnostico.resumo.totalLinhasCd}`,
    `Com alertas: ${diagnostico.resumo.produtosComAlertas}`,
    `Sem CDs: ${diagnostico.resumo.produtosSemCds}`,
    `Campos nulos: ${diagnostico.camposNulos.length}`,
    `Duplicidades: ${diagnostico.duplicidades.length}`,
  ];
  return linhas.join("\n");
}
