/** Grupos de divisão exibidos no dashboard operacional. */
export const DIVISOES_DASHBOARD = ["60-MERCEARIA", "62-PERECIVEIS", "63-BAZAR"] as const;

export type DivisaoDashboard = (typeof DIVISOES_DASHBOARD)[number];

/** Prefixo do setor N2 (ex.: 32-ALIMENT…) → divisão pai. */
const PREFIXO_SETOR_PARA_DIVISAO: Record<string, DivisaoDashboard> = {
  "31": "60-MERCEARIA",
  "32": "60-MERCEARIA",
  "33": "60-MERCEARIA",
  "34": "60-MERCEARIA",
  "35": "60-MERCEARIA",
  "36": "60-MERCEARIA",
  "40": "62-PERECIVEIS",
  "41": "62-PERECIVEIS",
  "42": "62-PERECIVEIS",
  "46": "62-PERECIVEIS",
  "47": "63-BAZAR",
  "48": "63-BAZAR",
  "49": "63-BAZAR",
  "51": "63-BAZAR",
};

export function resolverDivisaoPorSetor(setor: string | null | undefined): DivisaoDashboard | null {
  if (!setor) return null;
  const prefixo = setor.match(/^(\d+)-/)?.[1];
  if (!prefixo) return null;
  return PREFIXO_SETOR_PARA_DIVISAO[prefixo] ?? null;
}

/** Resolve divisão 60/62/63 a partir de campos do produto (gestão/consolidado). */
export function resolverDivisaoProduto(prod: {
  divisao?: string | null;
  setorN2?: string | null;
}): DivisaoDashboard | null {
  const div = prod.divisao?.trim();
  if (div && (DIVISOES_DASHBOARD as readonly string[]).includes(div)) return div as DivisaoDashboard;
  return resolverDivisaoPorSetor(prod.setorN2) ?? resolverDivisaoPorSetor(prod.divisao);
}
