import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import { filtrarUniversoOficialCompativel } from "../../motor/export/hibrido/filtrarUniversoOficialCompativel.ts";
import { DIVISOES_DASHBOARD, type DivisaoDashboard } from "../constants/dashboardDivisoes.ts";
import type { RupturaDashboardDivisao, RupturaDashboardSetor } from "../types/rupturaDashboardTypes.ts";
import { resolverDivisaoPorSetor } from "../constants/dashboardDivisoes.ts";
import { ordenarSetoresDashboard } from "./derivarDivisoesDashboard.ts";

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

type AggDiv = {
  total_ruptura: number;
  total_base_limpa: number;
  curto_prazo: number;
  medio_prazo: number;
  longo_prazo: number;
  ruptura_sem_inventario: number;
  ruptura_sem_pendencia_vda: number;
};

type AggSetor = AggDiv & { setor: string };

function emptyAgg(): AggDiv {
  return {
    total_ruptura: 0,
    total_base_limpa: 0,
    curto_prazo: 0,
    medio_prazo: 0,
    longo_prazo: 0,
    ruptura_sem_inventario: 0,
    ruptura_sem_pendencia_vda: 0,
  };
}

function classificacaoEmRuptura(cls: HibridoProdutoGestao["classificacaoPrazo"]): boolean {
  return cls === "curto_prazo" || cls === "medio_prazo" || cls === "longo_prazo";
}

function isRupturaSemInventario(p: HibridoProdutoGestao): boolean {
  if (p.rupturaSemInventario === 1) return true;
  if (p.rupturaSemInventario === 0) return false;
  return p.ruptura104c === true && !(Number(p.inventarioUnid ?? 0) > 0);
}

function isRupturaSemPendenciaVda(p: HibridoProdutoGestao): boolean {
  if (!classificacaoEmRuptura(p.classificacaoPrazo)) return false;
  return Number(p.pendenciaLoja ?? 0) <= 0;
}

function mapDivisaoAgg(
  divisao: DivisaoDashboard,
  v: AggDiv,
  ctx: { regional: string; data_referencia: string; loja: number },
): RupturaDashboardDivisao {
  return {
    regional: ctx.regional,
    data_referencia: ctx.data_referencia,
    loja: ctx.loja,
    divisao,
    total_ruptura: v.total_ruptura,
    total_base_limpa: v.total_base_limpa,
    percentual_ruptura: pct(v.total_ruptura, v.total_base_limpa),
    curto_prazo: v.curto_prazo,
    medio_prazo: v.medio_prazo,
    longo_prazo: v.longo_prazo,
    percentual_ruptura_sem_inventario: pct(v.ruptura_sem_inventario, v.total_base_limpa),
    percentual_ruptura_sem_pendencia_vda: pct(v.ruptura_sem_pendencia_vda, v.total_base_limpa),
  };
}

function acumularProduto(agg: AggDiv, p: HibridoProdutoGestao): void {
  if (p.baseLimpa === "Base Limpa") agg.total_base_limpa += 1;
  if (isRupturaSemInventario(p)) agg.ruptura_sem_inventario += 1;
  if (isRupturaSemPendenciaVda(p)) agg.ruptura_sem_pendencia_vda += 1;
  if (!classificacaoEmRuptura(p.classificacaoPrazo)) return;
  agg.total_ruptura += 1;
  if (p.classificacaoPrazo === "curto_prazo") agg.curto_prazo += 1;
  else if (p.classificacaoPrazo === "medio_prazo") agg.medio_prazo += 1;
  else if (p.classificacaoPrazo === "longo_prazo") agg.longo_prazo += 1;
}

export function agregarDivisoesFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  ctx: { regional: string; data_referencia: string; loja: number },
  opts?: { universoOficial?: boolean },
): RupturaDashboardDivisao[] {
  const base =
    opts?.universoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : [...produtos];
  const map = new Map<DivisaoDashboard, AggDiv>();
  for (const d of DIVISOES_DASHBOARD) map.set(d, emptyAgg());

  for (const p of base) {
    const div = p.divisao as DivisaoDashboard | null;
    if (!div || !map.has(div)) continue;
    acumularProduto(map.get(div)!, p);
  }

  return DIVISOES_DASHBOARD.map((divisao) => mapDivisaoAgg(divisao, map.get(divisao)!, ctx));
}

export function agregarSetoresFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  ctx: { regional: string; data_referencia: string; loja: number },
  opts?: { universoOficial?: boolean },
): RupturaDashboardSetor[] {
  const base =
    opts?.universoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : [...produtos];
  const map = new Map<string, AggSetor>();

  for (const p of base) {
    const setor = p.setorN2 ?? p.divisao ?? "—";
    const agg = map.get(setor) ?? { setor, ...emptyAgg() };
    acumularProduto(agg, p);
    map.set(setor, agg);
  }

  return ordenarSetoresDashboard(
    [...map.values()].map((v) => ({
      regional: ctx.regional,
      data_referencia: ctx.data_referencia,
      loja: ctx.loja,
      divisao: resolverDivisaoPorSetor(v.setor),
      setor_n2: v.setor,
      total_produtos: v.total_base_limpa,
      total_ruptura: v.total_ruptura,
      curto_prazo: v.curto_prazo,
      medio_prazo: v.medio_prazo,
      longo_prazo: v.longo_prazo,
      bloqueados: 0,
      total_base_limpa_elegivel: v.total_base_limpa,
      percentual_ruptura: pct(v.total_ruptura, v.total_base_limpa),
      percentual_ruptura_sem_inventario: pct(v.ruptura_sem_inventario, v.total_base_limpa),
      percentual_ruptura_sem_pendencia_vda: pct(v.ruptura_sem_pendencia_vda, v.total_base_limpa),
    })),
  );
}

export function mesclarSetoresComGestao(
  publicados: RupturaDashboardSetor[],
  gestao: RupturaDashboardSetor[],
): RupturaDashboardSetor[] {
  const gestMap = new Map(gestao.map((s) => [s.setor_n2 ?? "", s]));
  if (publicados.every((s) => (s.total_base_limpa_elegivel ?? 0) === 0)) return gestao;

  return publicados.map((p) => {
    const g = gestMap.get(p.setor_n2 ?? "");
    return {
      ...p,
      percentual_ruptura_sem_inventario:
        g?.percentual_ruptura_sem_inventario ?? p.percentual_ruptura_sem_inventario,
      percentual_ruptura_sem_pendencia_vda:
        g?.percentual_ruptura_sem_pendencia_vda ?? p.percentual_ruptura_sem_pendencia_vda,
    };
  });
}

export function mesclarDivisoesComGestao(
  publicadas: RupturaDashboardDivisao[],
  gestao: RupturaDashboardDivisao[],
): RupturaDashboardDivisao[] {
  const pubMap = new Map(publicadas.map((d) => [d.divisao, d]));
  const gestMap = new Map(gestao.map((d) => [d.divisao, d]));

  return DIVISOES_DASHBOARD.map((nome) => {
    const p = pubMap.get(nome);
    const g = gestMap.get(nome)!;
    const usarPublicadoSkus = (p?.total_base_limpa ?? 0) > 0;
    return {
      ...g,
      ...p,
      divisao: nome,
      total_base_limpa: usarPublicadoSkus ? p!.total_base_limpa : g.total_base_limpa,
      total_ruptura: (p?.total_ruptura ?? 0) > 0 ? p!.total_ruptura : g.total_ruptura,
      percentual_ruptura:
        usarPublicadoSkus && p?.percentual_ruptura != null ? p.percentual_ruptura : g.percentual_ruptura,
      curto_prazo: (p?.curto_prazo ?? 0) > 0 ? p!.curto_prazo! : g.curto_prazo,
      medio_prazo: (p?.medio_prazo ?? 0) > 0 ? p!.medio_prazo! : g.medio_prazo,
      longo_prazo: (p?.longo_prazo ?? 0) > 0 ? p!.longo_prazo! : g.longo_prazo,
      percentual_ruptura_sem_inventario: g.percentual_ruptura_sem_inventario,
      percentual_ruptura_sem_pendencia_vda: g.percentual_ruptura_sem_pendencia_vda,
    };
  });
}

export function calcularTotaisIndicadoresImpacto(
  divisoes: RupturaDashboardDivisao[],
  kpiSkus?: number,
): {
  percentual_ruptura_sem_inventario: number | null;
  percentual_ruptura_sem_pendencia_vda: number | null;
} {
  let semInv = 0;
  let semPend = 0;
  let skusDiv = 0;
  for (const d of divisoes) {
    const base = d.total_base_limpa ?? 0;
    skusDiv += base;
    if (d.percentual_ruptura_sem_inventario != null && base > 0) {
      semInv += Math.round((d.percentual_ruptura_sem_inventario / 100) * base);
    }
    if (d.percentual_ruptura_sem_pendencia_vda != null && base > 0) {
      semPend += Math.round((d.percentual_ruptura_sem_pendencia_vda / 100) * base);
    }
  }
  const skus = kpiSkus ?? skusDiv;
  return {
    percentual_ruptura_sem_inventario: pct(semInv, skus),
    percentual_ruptura_sem_pendencia_vda: pct(semPend, skus),
  };
}
