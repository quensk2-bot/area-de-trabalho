import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";

function num(value: number | null | undefined): number {
  return value ?? 0;
}

export function somarEstoqueCds(cds: readonly MotorProdutoCdNormalizado[]): number {
  return cds.reduce((acc, cd) => acc + num(cd.estoque), 0);
}
