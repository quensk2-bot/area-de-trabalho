import type { CompareRowInput } from "../../compare/compareTypes.ts";

export const EXCEL_CONSOLIDADO_FIXTURE: CompareRowInput[] = [
  {
    loja: 103,
    produto: 2505088,
    excel: {
      Rede: "REDE ALPHA",
      Comprador: "JOAO_CORR",
      "Produto Centralizado": "CD 101",
      "1ºCD": 1,
      "Curto Prazo": 1,
      "Dias Pedido": 5,
      "Ação Curto Prazo": "Recebimento Próximo/ Pedido Dentro do Prazo",
    },
    v7: {
      Rede: "REDE ALPHA",
      Comprador: "JOAO_CORR",
      "Produto Centralizado": "CD 101",
      "1ºCD": 1,
      "Curto Prazo": 1,
      "Dias Pedido": 5,
      "Ação Curto Prazo": "Recebimento Próximo/ Pedido Dentro do Prazo",
    },
  },
];

export const EXCEL_CONSOLIDADO_DIVERGENTE: CompareRowInput[] = [
  {
    loja: 103,
    produto: 2505088,
    excel: { Comprador: "JOAO" },
    v7: { Comprador: "MARIA" },
  },
];

export function mapConsolidadoParaCompare(item: {
  rede: string | null;
  comprador: string | null;
  textoProdutoCentralizado: string | null;
  flagPrimeiroCd: number | null;
  curtoPrazo: number | null;
  diasPedido: number | null;
  acaoCurtoPrazo: string | null;
  statusOperacional: string;
  qualidadeDados: string;
}): Record<string, string | number | boolean | null> {
  return {
    Rede: item.rede,
    Comprador: item.comprador,
    "Produto Centralizado": item.textoProdutoCentralizado,
    "1ºCD": item.flagPrimeiroCd,
    "Curto Prazo": item.curtoPrazo,
    "Dias Pedido": item.diasPedido,
    "Ação Curto Prazo": item.acaoCurtoPrazo,
    statusOperacional: item.statusOperacional,
    qualidadeDados: item.qualidadeDados,
  };
}
