import type { MotorCdConfiguracaoVigente, MotorCdPosicaoLogica, MotorCdTextoNormalizado } from "./cdNormalizationTypes.ts";
import { codigoParaPosicao } from "./buildCdMapping.ts";

const NAO_CENTRALIZADO = /n[aã]o centralizado/i;
const RUPTURA_CD = /ruptura\s*cd/i;
const ATIVO_NO_CD = /ativo no cd/i;
const INATIVO_CD = /inativo cd/i;

export function extrairCodigosFisicos(texto: string | null | undefined): number[] {
  if (!texto) return [];
  const codigos = new Set<number>();
  for (const m of texto.matchAll(/\((\d+)\)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) codigos.add(n);
  }
  for (const m of texto.matchAll(/\bCD\s*(\d{2,4})\b/gi)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) codigos.add(n);
  }
  return [...codigos];
}

export function normalizarTextoCdBasico(
  texto: string | null | undefined,
  config?: MotorCdConfiguracaoVigente,
): MotorCdTextoNormalizado {
  const raw = texto?.trim() ?? "";
  const codigosFisicos = extrairCodigosFisicos(raw);
  const posicoesLogicas: MotorCdPosicaoLogica[] = [];

  if (config) {
    for (const codigo of codigosFisicos) {
      const pos = codigoParaPosicao(config, codigo);
      if (pos && !posicoesLogicas.includes(pos)) posicoesLogicas.push(pos);
    }
  }

  const inativos = posicoesLogicas
    .filter(() => INATIVO_CD.test(raw))
    .map((pos, idx) => ({ posicao: pos, codigo: codigosFisicos[idx] ?? 0 }))
    .filter((x) => x.codigo > 0);

  return {
    posicaoLogica: posicoesLogicas[0] ?? null,
    codigoFisico: codigosFisicos[0] ?? null,
    codigosFisicos,
    posicoesLogicas,
    textoBase: raw || null,
    naoCentralizado: NAO_CENTRALIZADO.test(raw),
    rupturaCd: RUPTURA_CD.test(raw),
    ativoNoCd: ATIVO_NO_CD.test(raw),
    inativos,
  };
}

export function conjuntosCodigosEquivalentes(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}
