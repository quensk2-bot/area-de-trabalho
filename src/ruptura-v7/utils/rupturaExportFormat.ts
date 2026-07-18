import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import type { RupturaFiltrosProdutos } from "../types/rupturaFiltrosTypes.ts";

const COLUNAS_EXPORT: { key: keyof RupturaProdutoLoja; label: string }[] = [
  { key: "loja", label: "Loja" },
  { key: "seqproduto", label: "Produto" },
  { key: "descricao", label: "Descrição" },
  { key: "razao_fornecedor", label: "Fornecedor" },
  { key: "rede", label: "Rede" },
  { key: "comprador", label: "Comprador" },
  { key: "estoque_loja", label: "Estoque Loja" },
  { key: "media_venda_dia", label: "Média Venda/Dia" },
  { key: "par_min", label: "Mínimo" },
  { key: "par_max", label: "Máximo" },
  { key: "soma_estoque_cd", label: "Estoque CD" },
  { key: "pendencia_cpa_cd", label: "Pendência CPA/CD" },
  { key: "classificacao_prazo", label: "Classificação" },
  { key: "dias_pedido", label: "Dias Pedido" },
  { key: "produto_centralizado", label: "Produto Centralizado" },
  { key: "codigo_cd_selecionado", label: "CD Selecionado" },
  { key: "status_estoque_cds", label: "Status Estoque CDs" },
  { key: "acao_recomendada", label: "Ação Recomendada" },
  { key: "qualidade_dados", label: "Qualidade" },
];

export function montarLinhasExport(produtos: RupturaProdutoLoja[], meta: RupturaFiltrosProdutos) {
  return produtos.map((p) => {
    const row: Record<string, string | number | null> = {
      regional: meta.regional,
      data_referencia: meta.dataReferencia,
      loja_contexto: meta.loja,
      versao: p.versao,
    };
    for (const col of COLUNAS_EXPORT) {
      row[col.label] = p[col.key] as string | number | null;
    }
    return row;
  });
}
