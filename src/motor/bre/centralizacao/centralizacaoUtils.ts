import type { PosicaoLogicaCd } from "./centralizacaoTypes.ts";

export const MENOR_RECEBTO_NULL_NORMALIZADO = 999;
export const LIMITE_MOVIMENTACAO_120_DIAS = 120;

export const TEXTO_STATUS_RECEBTO_SEM_MOV = "Sem movimentação nos últimos 120 Dias";
export const TEXTO_STATUS_RECEBTO_COM_MOV = "Com movimentação nos úiltimos 120 Dias";
export const TEXTO_NAO_CENTRALIZADO = "Não Centralizado";

export function normalizarDiasRecebto(valor: number | string | null | undefined): number | null {
  if (valor == null) return null;
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return Number.isFinite(valor) ? valor : null;
}

export function listMinIgnorandoNull(valores: Array<number | null>): number | null {
  const nums = valores.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

export function diasIguais(a: number | null, b: number): boolean {
  if (a == null) return false;
  return a === b;
}

export function statusCompraEhInativo(statusCompra: string | null): boolean {
  return statusCompra !== "A";
}

export function statusCompraEhAtivo(statusCompra: string | null): boolean {
  return statusCompra === "A";
}

export function obterCodigoFisicoPorPosicao(
  ordem: {
    primeiroCd: number | null;
    segundoCd: number | null;
    terceiroCd: number | null;
    quartoCd: number | null;
    quintoCd: number | null;
  },
  posicao: PosicaoLogicaCd,
): number | null {
  switch (posicao) {
    case 1:
      return ordem.primeiroCd;
    case 2:
      return ordem.segundoCd;
    case 3:
      return ordem.terceiroCd;
    case 4:
      return ordem.quartoCd;
    case 5:
      return ordem.quintoCd;
    default:
      return null;
  }
}

export function obterDiasRecebtoPorPosicao(
  entrada: {
    diasRecebtoCd1: number | null;
    diasRecebtoCd2: number | null;
    diasRecebtoCd3: number | null;
    diasRecebtoCd4: number | null;
    diasRecebtoCd5: number | null;
  },
  posicao: PosicaoLogicaCd,
): number | null {
  switch (posicao) {
    case 1:
      return entrada.diasRecebtoCd1;
    case 2:
      return entrada.diasRecebtoCd2;
    case 3:
      return entrada.diasRecebtoCd3;
    case 4:
      return entrada.diasRecebtoCd4;
    case 5:
      return entrada.diasRecebtoCd5;
    default:
      return null;
  }
}

export function obterEstoquePorPosicao(
  entrada: {
    estoqueCd1: number | null;
    estoqueCd2: number | null;
    estoqueCd3: number | null;
    estoqueCd4: number | null;
    estoqueCd5: number | null;
  },
  posicao: PosicaoLogicaCd,
): number | null {
  switch (posicao) {
    case 1:
      return entrada.estoqueCd1;
    case 2:
      return entrada.estoqueCd2;
    case 3:
      return entrada.estoqueCd3;
    case 4:
      return entrada.estoqueCd4;
    case 5:
      return entrada.estoqueCd5;
    default:
      return null;
  }
}

export function obterStatusCompraPorPosicao(
  entrada: {
    statusCompraCd1: string | null;
    statusCompraCd2: string | null;
    statusCompraCd3: string | null;
    statusCompraCd4: string | null;
    statusCompraCd5: string | null;
  },
  posicao: PosicaoLogicaCd,
): string | null {
  switch (posicao) {
    case 1:
      return entrada.statusCompraCd1;
    case 2:
      return entrada.statusCompraCd2;
    case 3:
      return entrada.statusCompraCd3;
    case 4:
      return entrada.statusCompraCd4;
    case 5:
      return entrada.statusCompraCd5;
    default:
      return null;
  }
}

export const POSICOES_LOGICAS: PosicaoLogicaCd[] = [1, 2, 3, 4, 5];
