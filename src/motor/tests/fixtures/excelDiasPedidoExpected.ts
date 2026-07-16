import type { CompareRowInput } from "../../compare/compareTypes.ts";
import { calcularDiasPedido } from "../../bre/rules/calcularDiasPedido.ts";
import type { MotorDiasPedidoEntrada } from "../../bre/breTypes.ts";

function linha(
  loja: number,
  produto: number,
  entrada: MotorDiasPedidoEntrada,
): CompareRowInput {
  const r = calcularDiasPedido(entrada);
  return {
    loja,
    produto,
    excel: {
      "Média dias Pedido Lj": r.mediaDiasPedidoLoja,
      "Média dias Pedido cd1": r.mediaDiasPedidoCd1,
      "Média dias Pedido cd2": r.mediaDiasPedidoCd2,
      "Média dias Pedido cd3": r.mediaDiasPedidoCd3,
      "Média dias Pedido cd4": r.mediaDiasPedidoCd4,
      "Média dias Pedido cd5": r.mediaDiasPedidoCd5,
      "Dias Pedido": r.diasPedidoFinal,
    },
    v7: {
      "Média dias Pedido Lj": r.mediaDiasPedidoLoja,
      "Média dias Pedido cd1": r.mediaDiasPedidoCd1,
      "Média dias Pedido cd2": r.mediaDiasPedidoCd2,
      "Média dias Pedido cd3": r.mediaDiasPedidoCd3,
      "Média dias Pedido cd4": r.mediaDiasPedidoCd4,
      "Média dias Pedido cd5": r.mediaDiasPedidoCd5,
      "Dias Pedido": r.diasPedidoFinal,
    },
  };
}

export const EXCEL_DIAS_PEDIDO_FIXTURE: CompareRowInput[] = [
  linha(103, 2001, {
    pendenciaLoja: 3,
    diasCompraLoja: 12,
    pendenciaCd1: 0,
    diasCompraCd1: null,
    pendenciaCd2: 0,
    diasCompraCd2: null,
    pendenciaCd3: 0,
    diasCompraCd3: null,
    pendenciaCd4: 0,
    diasCompraCd4: null,
    pendenciaCd5: 0,
    diasCompraCd5: null,
  }),
  linha(103, 2002, {
    pendenciaLoja: 0,
    diasCompraLoja: null,
    pendenciaCd1: 1,
    diasCompraCd1: 7,
    pendenciaCd2: 0,
    diasCompraCd2: null,
    pendenciaCd3: 0,
    diasCompraCd3: null,
    pendenciaCd4: 0,
    diasCompraCd4: null,
    pendenciaCd5: 0,
    diasCompraCd5: null,
  }),
  linha(103, 2003, {
    pendenciaLoja: 0,
    diasCompraLoja: null,
    pendenciaCd1: 1,
    diasCompraCd1: 10,
    pendenciaCd2: 1,
    diasCompraCd2: 22,
    pendenciaCd3: 0,
    diasCompraCd3: null,
    pendenciaCd4: 0,
    diasCompraCd4: null,
    pendenciaCd5: 0,
    diasCompraCd5: null,
  }),
  linha(103, 2004, {
    pendenciaLoja: 0,
    diasCompraLoja: null,
    pendenciaCd1: 2,
    diasCompraCd1: 30,
    pendenciaCd2: 0,
    diasCompraCd2: null,
    pendenciaCd3: 0,
    diasCompraCd3: null,
    pendenciaCd4: 0,
    diasCompraCd4: null,
    pendenciaCd5: 0,
    diasCompraCd5: null,
  }),
  linha(103, 2005, {
    pendenciaLoja: 0,
    diasCompraLoja: null,
    pendenciaCd1: 0,
    diasCompraCd1: null,
    pendenciaCd2: 0,
    diasCompraCd2: null,
    pendenciaCd3: 0,
    diasCompraCd3: null,
    pendenciaCd4: 0,
    diasCompraCd4: null,
    pendenciaCd5: 0,
    diasCompraCd5: null,
  }),
];

export const EXCEL_DIAS_PEDIDO_DIVERGENTE: CompareRowInput[] = [
  {
    loja: 103,
    produto: 2099,
    excel: {
      "Média dias Pedido Lj": null,
      "Média dias Pedido cd1": 0,
      "Média dias Pedido cd2": 0,
      "Média dias Pedido cd3": 0,
      "Média dias Pedido cd4": 0,
      "Média dias Pedido cd5": 0,
      "Dias Pedido": 0,
    },
    v7: {
      "Média dias Pedido Lj": null,
      "Média dias Pedido cd1": 0,
      "Média dias Pedido cd2": 0,
      "Média dias Pedido cd3": 0,
      "Média dias Pedido cd4": 0,
      "Média dias Pedido cd5": 0,
      "Dias Pedido": 15,
    },
  },
];
