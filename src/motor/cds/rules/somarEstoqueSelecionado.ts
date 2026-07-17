import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";

function num(value: number | null | undefined): number {
  return value ?? 0;
}

export function somarEstoqueSelecionado(cds: readonly MotorProdutoCdNormalizado[]): number {
  return cds.reduce((acc, cd) => acc + num(cd.estoqueSelecionadoInventario), 0);
}

export function somarEstoqueSelecionadoFromValues(
  estSelecInvCd1: number | null,
  estSelecInvCd2: number | null,
  estSelecInvCd3: number | null,
  estSelecInvCd4: number | null,
): number {
  return [estSelecInvCd1, estSelecInvCd2, estSelecInvCd3, estSelecInvCd4]
    .map((v) => num(v))
    .reduce((a, b) => a + b, 0);
}
