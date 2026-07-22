import type { PermissionContext } from "./permissionService.ts";
import {
  canAccessBandeira,
  canAccessLoja,
  canAccessRegional,
} from "./permissionService.ts";
import type {
  CatalogoBandeira,
  CatalogoLoja,
  CatalogoLojaRow,
  CatalogoRegional,
  FiltroRegionalBandeiraLojaValores,
} from "./catalogoLojasTypes.ts";
import { FILTRO_BANDEIRA_TODAS, FILTRO_LOJA_TODAS } from "./catalogoLojasTypes.ts";

const norm = (s: string) => s.trim().toUpperCase();

export function formatLojaLabel(loja: Pick<CatalogoLoja, "loja" | "nome">): string {
  return `${loja.loja} - ${loja.nome}`;
}

export function mapCatalogoRow(row: CatalogoLojaRow): CatalogoLoja {
  return {
    regional: row.regional.trim().toUpperCase(),
    bandeira: row.bandeira.trim().toUpperCase(),
    loja: row.loja,
    nome: row.nome.trim(),
  };
}

export function filtrarCatalogoPorPermissoes(
  rows: CatalogoLoja[],
  ctx: PermissionContext | null,
): CatalogoLoja[] {
  if (!ctx) return rows;
  if (ctx.nivel === "ADM") return rows;
  return rows.filter((r) => {
    if (ctx.nivel === "GERENTE_LOJA") {
      return canAccessLoja(ctx, r.regional, r.bandeira, r.loja);
    }
    if (ctx.nivel === "N0" || ctx.nivel === "N1") {
      return canAccessBandeira(ctx, r.regional, r.bandeira);
    }
    return canAccessRegional(ctx, r.regional);
  });
}

export function listarRegionaisDoCatalogo(rows: CatalogoLoja[]): string[] {
  const set = new Set(rows.map((r) => norm(r.regional)));
  return [...set].sort();
}

export function listarBandeirasDoCatalogo(rows: CatalogoLoja[], regional: string): CatalogoBandeira[] {
  const reg = norm(regional);
  const map = new Map<string, CatalogoBandeira>();
  for (const r of rows) {
    if (norm(r.regional) !== reg) continue;
    const key = norm(r.bandeira);
    if (!map.has(key)) {
      map.set(key, { regional: r.regional, bandeira: r.bandeira });
    }
  }
  return [...map.values()].sort((a, b) => a.bandeira.localeCompare(b.bandeira));
}

export function listarLojasDoCatalogo(
  rows: CatalogoLoja[],
  regional: string,
  bandeira: string | null,
): CatalogoLoja[] {
  const reg = norm(regional);
  const band = bandeira ? norm(bandeira) : null;
  return rows
    .filter((r) => {
      if (norm(r.regional) !== reg) return false;
      if (band && norm(r.bandeira) !== band) return false;
      return true;
    })
    .sort((a, b) => a.loja - b.loja);
}

export function buildCatalogoTree(rows: CatalogoLoja[]): CatalogoRegional[] {
  const byRegional = new Map<string, Map<string, CatalogoBandeira>>();
  for (const r of rows) {
    const regKey = norm(r.regional);
    const bandMap = byRegional.get(regKey) ?? new Map<string, CatalogoBandeira>();
    const bandKey = norm(r.bandeira);
    if (!bandMap.has(bandKey)) {
      bandMap.set(bandKey, { regional: r.regional, bandeira: r.bandeira });
    }
    byRegional.set(regKey, bandMap);
  }
  return [...byRegional.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([regKey, bandMap]) => ({
      regional: rows.find((r) => norm(r.regional) === regKey)?.regional ?? regKey,
      bandeiras: [...bandMap.values()].sort((a, b) => a.bandeira.localeCompare(b.bandeira)),
    }));
}

function sincronizarLojaSentinela(next: FiltroRegionalBandeiraLojaValores, totalEscopo: number): void {
  if (next.lojas.length === 0 || next.lojas.length >= totalEscopo) {
    next.loja = FILTRO_LOJA_TODAS;
    return;
  }
  if (next.lojas.length === 1) {
    next.loja = next.lojas[0]!;
    return;
  }
  next.loja = FILTRO_LOJA_TODAS;
}

/** Ajusta valores quando regional/bandeira mudam (cascata). */
export function normalizarFiltroCascade(
  catalogo: CatalogoLoja[],
  valores: FiltroRegionalBandeiraLojaValores,
  patch: Partial<FiltroRegionalBandeiraLojaValores>,
): FiltroRegionalBandeiraLojaValores {
  const next: FiltroRegionalBandeiraLojaValores = {
    ...valores,
    ...patch,
    lojas: patch.lojas ?? valores.lojas ?? [],
  };

  if (patch.loja !== undefined && patch.lojas === undefined) {
    next.lojas = patch.loja === FILTRO_LOJA_TODAS ? [] : [patch.loja];
  }

  const regionais = listarRegionaisDoCatalogo(catalogo);
  if (regionais.length && !regionais.includes(norm(next.regional))) {
    next.regional = regionais[0]!;
    next.bandeira = FILTRO_BANDEIRA_TODAS;
    next.lojas = [];
  }

  const bandeiras = listarBandeirasDoCatalogo(catalogo, next.regional);
  if (next.bandeira != null) {
    const ok = bandeiras.some((b) => norm(b.bandeira) === norm(next.bandeira!));
    if (!ok) next.bandeira = FILTRO_BANDEIRA_TODAS;
  }

  const lojasEscopo = listarLojasDoCatalogo(catalogo, next.regional, next.bandeira);
  const codigosEscopo = new Set(lojasEscopo.map((l) => l.loja));

  const escopoMudou =
    (patch.regional !== undefined && patch.regional !== valores.regional) ||
    (patch.bandeira !== undefined && patch.bandeira !== valores.bandeira);

  if (patch.regional !== undefined && patch.regional !== valores.regional) {
    next.bandeira = FILTRO_BANDEIRA_TODAS;
    next.lojas = [];
    next.loja = FILTRO_LOJA_TODAS;
  }
  if (patch.bandeira !== undefined && patch.bandeira !== valores.bandeira) {
    next.lojas = [];
    next.loja = FILTRO_LOJA_TODAS;
  }

  if (escopoMudou) {
    next.lojas = lojasEscopo.map((l) => l.loja);
  }

  if (next.lojas.length > 0) {
    next.lojas = next.lojas.filter((l) => codigosEscopo.has(l)).sort((a, b) => a - b);
    if (next.lojas.length === 0 && lojasEscopo.length) {
      next.lojas = lojasEscopo.map((l) => l.loja);
    }
  }

  if (
    next.loja !== FILTRO_LOJA_TODAS &&
    next.lojas.length === 0 &&
    !codigosEscopo.has(next.loja)
  ) {
    next.loja = lojasEscopo[0]?.loja ?? FILTRO_LOJA_TODAS;
    next.lojas = next.loja === FILTRO_LOJA_TODAS ? [] : [next.loja];
  }

  sincronizarLojaSentinela(next, lojasEscopo.length);
  return next;
}

/** Todas as lojas do escopo (para default ao trocar bandeira). */
export function lojasDefaultEscopo(
  catalogo: CatalogoLoja[],
  regional: string,
  bandeira: string | null,
): number[] {
  return listarLojasDoCatalogo(catalogo, regional, bandeira).map((l) => l.loja);
}

let cacheRows: CatalogoLoja[] | null = null;
let cachePromise: Promise<CatalogoLoja[]> | null = null;

export function invalidateCatalogoLojasCache(): void {
  cacheRows = null;
  cachePromise = null;
}

export async function fetchCatalogoLojas(force = false): Promise<CatalogoLoja[]> {
  if (!force && cacheRows) return cacheRows;
  if (!force && cachePromise) return cachePromise;

  cachePromise = (async () => {
    const { appV7Db } = await import("../lib/supabaseClient.ts");
    const { data, error } = await appV7Db()
      .from("lojas")
      .select("regional, bandeira, loja, nome, ativo")
      .eq("ativo", true)
      .order("regional")
      .order("bandeira")
      .order("loja");

    if (error) throw new Error(error.message);

    cacheRows = (data ?? []).map((row) => mapCatalogoRow(row as CatalogoLojaRow));
    return cacheRows;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}
