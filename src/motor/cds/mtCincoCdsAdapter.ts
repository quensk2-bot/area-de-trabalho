import type { MotorProdutoCdNormalizado } from "./cdTypes.ts";

export type MtCamposEstoquePendencia = {
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  estoqueCd5: number | null;
  pendenciaCd1: number | null;
  pendenciaCd2: number | null;
  pendenciaCd3: number | null;
  pendenciaCd4: number | null;
  pendenciaCd5: number | null;
};

export type MtCamposStatusDias = {
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  statusCompraCd5: string | null;
  diasCompraCd1: number | null;
  diasCompraCd2: number | null;
  diasCompraCd3: number | null;
  diasCompraCd4: number | null;
  diasCompraCd5: number | null;
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
};

export type MtCamposCdFlat = MtCamposEstoquePendencia & MtCamposStatusDias;

const LIMITE_MT = 5;

function obterCd(cds: readonly MotorProdutoCdNormalizado[], posicao: number): MotorProdutoCdNormalizado | null {
  return cds.find((c) => c.posicaoLogica === posicao) ?? null;
}

function lerCampo<T>(
  cds: readonly MotorProdutoCdNormalizado[],
  posicao: number,
  selector: (cd: MotorProdutoCdNormalizado) => T,
): T | null {
  const cd = obterCd(cds, posicao);
  return cd ? selector(cd) : null;
}

export function extrairEstoquePendenciaDeCds(cds: readonly MotorProdutoCdNormalizado[]): MtCamposEstoquePendencia {
  return {
    estoqueCd1: lerCampo(cds, 1, (c) => c.estoque),
    estoqueCd2: lerCampo(cds, 2, (c) => c.estoque),
    estoqueCd3: lerCampo(cds, 3, (c) => c.estoque),
    estoqueCd4: lerCampo(cds, 4, (c) => c.estoque),
    estoqueCd5: lerCampo(cds, 5, (c) => c.estoque),
    pendenciaCd1: lerCampo(cds, 1, (c) => c.pendencia),
    pendenciaCd2: lerCampo(cds, 2, (c) => c.pendencia),
    pendenciaCd3: lerCampo(cds, 3, (c) => c.pendencia),
    pendenciaCd4: lerCampo(cds, 4, (c) => c.pendencia),
    pendenciaCd5: lerCampo(cds, 5, (c) => c.pendencia),
  };
}

export function extrairStatusDiasDeCds(cds: readonly MotorProdutoCdNormalizado[]): MtCamposStatusDias {
  return {
    statusCompraCd1: lerCampo(cds, 1, (c) => c.statusCompra),
    statusCompraCd2: lerCampo(cds, 2, (c) => c.statusCompra),
    statusCompraCd3: lerCampo(cds, 3, (c) => c.statusCompra),
    statusCompraCd4: lerCampo(cds, 4, (c) => c.statusCompra),
    statusCompraCd5: lerCampo(cds, 5, (c) => c.statusCompra),
    diasCompraCd1: lerCampo(cds, 1, (c) => c.diasCompra),
    diasCompraCd2: lerCampo(cds, 2, (c) => c.diasCompra),
    diasCompraCd3: lerCampo(cds, 3, (c) => c.diasCompra),
    diasCompraCd4: lerCampo(cds, 4, (c) => c.diasCompra),
    diasCompraCd5: lerCampo(cds, 5, (c) => c.diasCompra),
    diasRecebtoCd1: lerCampo(cds, 1, (c) => c.diasRecebimento),
    diasRecebtoCd2: lerCampo(cds, 2, (c) => c.diasRecebimento),
    diasRecebtoCd3: lerCampo(cds, 3, (c) => c.diasRecebimento),
    diasRecebtoCd4: lerCampo(cds, 4, (c) => c.diasRecebimento),
    diasRecebtoCd5: lerCampo(cds, 5, (c) => c.diasRecebimento),
  };
}

export function extrairCamposFlatDeCds(cds: readonly MotorProdutoCdNormalizado[]): MtCamposCdFlat {
  return {
    ...extrairEstoquePendenciaDeCds(cds),
    ...extrairStatusDiasDeCds(cds),
  };
}

export function extrairEstoqueCd(cds: readonly MotorProdutoCdNormalizado[], posicao: number): number | null {
  if (posicao < 1 || posicao > LIMITE_MT) return null;
  return lerCampo(cds, posicao, (c) => c.estoque);
}

/** Adaptador MT — lê campos fixos exclusivamente da coleção `cds[]`. Não muta a coleção. */
export const MtCincoCdsAdapter = {
  extrairEstoquePendencia: extrairEstoquePendenciaDeCds,
  extrairStatusDias: extrairStatusDiasDeCds,
  extrairCamposFlat: extrairCamposFlatDeCds,
  extrairEstoqueCd,
  obterCd,
} as const;

export function cdsTemPosicao(cds: readonly MotorProdutoCdNormalizado[], posicao: number): boolean {
  return obterCd(cds, posicao) != null;
}

export function maxPosicaoLogica(cds: readonly MotorProdutoCdNormalizado[]): number {
  if (cds.length === 0) return 0;
  return Math.max(...cds.map((c) => c.posicaoLogica));
}
