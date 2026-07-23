import type { MotorBreItemInput, MotorEstSelecInv } from "../breTypes.ts";
import { calcularCrossSumFromValues } from "./ruleCrossDocking.ts";

export type MotorValoresCrossPorCd = {
  estSelecInvCd1: number | null;
  estSelecInvCd2: number | null;
  estSelecInvCd3: number | null;
  estSelecInvCd4: number | null;
};

export type MotorCrossProdutoResultado = {
  crossSum: number;
  origemCross: "EST_SELECINV_CD1..4";
  valoresCrossPorCd: MotorValoresCrossPorCd;
};

/** Soma literal Cross = EST_SELECINV_CD1 + … + EST_SELECINV_CD4 (Power Query `#"Soma Inserida"`). */
export const calcularCrossSum = calcularCrossSumFromValues;

export function montarEstSelecInvDoProduto(produto: MotorBreItemInput["produto"]): MotorEstSelecInv {
  return {
    estSelecInvCd1: produto.estSelecInvCd1 ?? null,
    estSelecInvCd2: produto.estSelecInvCd2 ?? null,
    estSelecInvCd3: produto.estSelecInvCd3 ?? null,
    estSelecInvCd4: produto.estSelecInvCd4 ?? null,
  };
}

export function resolverValoresCrossPorCd(item: MotorBreItemInput): MotorValoresCrossPorCd {
  const inv = item.estSelecInv ?? montarEstSelecInvDoProduto(item.produto);
  return {
    estSelecInvCd1: inv.estSelecInvCd1 ?? null,
    estSelecInvCd2: inv.estSelecInvCd2 ?? null,
    estSelecInvCd3: inv.estSelecInvCd3 ?? null,
    estSelecInvCd4: inv.estSelecInvCd4 ?? null,
  };
}

export function resolverCrossProduto(item: MotorBreItemInput): MotorCrossProdutoResultado {
  const valoresCrossPorCd = resolverValoresCrossPorCd(item);
  return {
    crossSum: calcularCrossSum(
      valoresCrossPorCd.estSelecInvCd1,
      valoresCrossPorCd.estSelecInvCd2,
      valoresCrossPorCd.estSelecInvCd3,
      valoresCrossPorCd.estSelecInvCd4,
    ),
    origemCross: "EST_SELECINV_CD1..4",
    valoresCrossPorCd,
  };
}
