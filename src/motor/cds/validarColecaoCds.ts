import type { MotorProdutoCdNormalizado } from "./cdTypes.ts";

export type ValidacaoColecaoCdsResultado = {
  ok: boolean;
  cdsOrdenados: MotorProdutoCdNormalizado[];
  posicoesDuplicadas: number[];
  alertas: string[];
};

export function ordenarCdsPorPosicao(cds: readonly MotorProdutoCdNormalizado[]): MotorProdutoCdNormalizado[] {
  return [...cds].sort((a, b) => a.posicaoLogica - b.posicaoLogica);
}

export function validarColecaoCds(cds: readonly MotorProdutoCdNormalizado[]): ValidacaoColecaoCdsResultado {
  const alertas: string[] = [];
  const posicoesDuplicadas: number[] = [];
  const vistos = new Map<number, number>();

  for (const cd of cds) {
    if (cd.posicaoLogica < 1) {
      alertas.push(`Posição lógica inválida (${cd.posicaoLogica}) — mínimo é 1`);
    }
    const count = (vistos.get(cd.posicaoLogica) ?? 0) + 1;
    vistos.set(cd.posicaoLogica, count);
  }

  for (const [pos, count] of vistos) {
    if (count > 1) {
      posicoesDuplicadas.push(pos);
      alertas.push(`Posição lógica duplicada: ${pos} (${count} ocorrências)`);
    }
  }

  const cdsOrdenados = ordenarCdsPorPosicao(cds);

  return {
    ok: posicoesDuplicadas.length === 0 && alertas.length === 0,
    cdsOrdenados,
    posicoesDuplicadas,
    alertas,
  };
}
