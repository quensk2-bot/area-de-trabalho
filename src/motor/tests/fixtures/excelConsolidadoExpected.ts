import type { CompareRowInput } from "../../compare/compareTypes.ts";
import { mapConsolidadoParaCompare } from "../../compare/mapConsolidadoParaCompare.ts";

export { mapConsolidadoParaCompare };

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
