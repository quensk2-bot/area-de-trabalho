import { DIVISOES_DASHBOARD, resolverDivisaoPorSetor, type DivisaoDashboard } from "../constants/dashboardDivisoes.ts";
import type { RupturaDashboardDivisao, RupturaDashboardSetor } from "../types/rupturaDashboardTypes.ts";

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

export function pctParte(parte: number, total: number): number | null {
  return pct(parte, total);
}

export function formatContagemPct(count: number, pctVal: number | null): string {
  const n = count.toLocaleString("pt-BR");
  if (pctVal == null || Number.isNaN(pctVal)) return n;
  return `${n} / ${pctVal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function percentualSetor(setor: RupturaDashboardSetor, fallbackDenominador?: number): number | null {
  if (setor.percentual_ruptura != null) return setor.percentual_ruptura;
  const fromBase = pct(setor.total_ruptura, setor.total_base_limpa_elegivel);
  if (fromBase != null) return fromBase;
  if (fallbackDenominador && fallbackDenominador > 0) {
    return pct(setor.total_ruptura, fallbackDenominador);
  }
  return null;
}

/** Ordem padrão do drill-down: maior %, depois maior ruptura. */
export function ordenarSetoresDashboard(setores: RupturaDashboardSetor[]): RupturaDashboardSetor[] {
  return [...setores].sort((a, b) => {
    const pctA = percentualSetor(a) ?? 0;
    const pctB = percentualSetor(b) ?? 0;
    const diffPct = pctB - pctA;
    if (diffPct !== 0) return diffPct;
    return b.total_ruptura - a.total_ruptura;
  });
}

type AggDiv = {
  total_ruptura: number;
  total_base_limpa: number;
  curto_prazo: number;
  medio_prazo: number;
  longo_prazo: number;
  regional: string;
  data_referencia: string;
  loja: number;
};

/** Agrega setores por divisão quando o resumo publicado ainda não traz `divisoes`. */
export function derivarDivisoesDeSetores(
  setores: RupturaDashboardSetor[],
  divisoesPublicadas: RupturaDashboardDivisao[],
): RupturaDashboardDivisao[] {
  const pub = new Map(divisoesPublicadas.map((d) => [d.divisao, d]));
  const agg = new Map<DivisaoDashboard, AggDiv>();

  for (const nome of DIVISOES_DASHBOARD) {
    const ref = divisoesPublicadas.find((d) => d.divisao === nome);
    agg.set(nome, {
      total_ruptura: 0,
      total_base_limpa: 0,
      curto_prazo: 0,
      medio_prazo: 0,
      longo_prazo: 0,
      regional: ref?.regional ?? setores[0]?.regional ?? "",
      data_referencia: ref?.data_referencia ?? setores[0]?.data_referencia ?? "",
      loja: ref?.loja ?? setores[0]?.loja ?? 0,
    });
  }

  for (const s of setores) {
    const div = resolverDivisaoPorSetor(s.setor_n2 ?? s.divisao);
    if (!div) continue;
    const prev = agg.get(div)!;
    prev.total_ruptura += s.total_ruptura ?? 0;
    prev.total_base_limpa += s.total_base_limpa_elegivel ?? 0;
    prev.curto_prazo += s.curto_prazo ?? 0;
    prev.medio_prazo += s.medio_prazo ?? 0;
    prev.longo_prazo += s.longo_prazo ?? 0;
  }

  return DIVISOES_DASHBOARD.map((nome) => {
    const publicado = pub.get(nome);
    const calc = agg.get(nome)!;
    const total_ruptura = publicado?.total_ruptura || calc.total_ruptura;
    const total_base_limpa = publicado?.total_base_limpa || calc.total_base_limpa;
    const curto_prazo = publicado?.curto_prazo ?? calc.curto_prazo;
    const medio_prazo = publicado?.medio_prazo ?? calc.medio_prazo;
    const longo_prazo = publicado?.longo_prazo ?? calc.longo_prazo;
    return {
      regional: publicado?.regional ?? calc.regional,
      data_referencia: publicado?.data_referencia ?? calc.data_referencia,
      loja: publicado?.loja ?? calc.loja,
      divisao: nome,
      total_ruptura,
      total_base_limpa,
      percentual_ruptura:
        publicado?.percentual_ruptura ?? pct(total_ruptura, total_base_limpa),
      curto_prazo,
      medio_prazo,
      longo_prazo,
    };
  });
}

export function agruparSetoresPorDivisao(setores: RupturaDashboardSetor[]): Map<DivisaoDashboard, RupturaDashboardSetor[]> {
  const map = new Map<DivisaoDashboard, RupturaDashboardSetor[]>();
  for (const d of DIVISOES_DASHBOARD) map.set(d, []);

  for (const s of setores) {
    const div = resolverDivisaoPorSetor(s.setor_n2 ?? s.divisao);
    if (!div) continue;
    map.get(div)!.push(s);
  }

  for (const [div, lista] of map) {
    map.set(div, ordenarSetoresDashboard(lista));
  }

  return map;
}

/** Preferir divisões enriquecidas (gestão/resumo novo) quando têm SKU's; senão derivar de setores. */
export function mesclarDivisoesDashboard(
  divisoesPublicadas: RupturaDashboardDivisao[],
  setores: RupturaDashboardSetor[],
): RupturaDashboardDivisao[] {
  const derivadas = derivarDivisoesDeSetores(setores, divisoesPublicadas);
  const pubMap = new Map(divisoesPublicadas.map((d) => [d.divisao, d]));

  return DIVISOES_DASHBOARD.map((nome) => {
    const pub = pubMap.get(nome);
    const der = derivadas.find((d) => d.divisao === nome)!;
    const usarPublicado = (pub?.total_base_limpa ?? 0) > 0;
    return usarPublicado ? { ...der, ...pub, divisao: nome } : der;
  });
}

export function precisaEnriquecerDivisoes(divisoes: RupturaDashboardDivisao[]): boolean {
  return DIVISOES_DASHBOARD.every((nome) => {
    const d = divisoes.find((x) => x.divisao === nome);
    return !d || d.total_base_limpa === 0;
  });
}
