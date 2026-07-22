import type { CatalogoLoja } from "../../auth-v7/catalogoLojasTypes.ts";
import { FILTRO_LOJA_TODAS } from "../../auth-v7/catalogoLojasTypes.ts";
import { listarLojasDoCatalogo } from "../../auth-v7/catalogoLojasService.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";

/** Lojas disponíveis no catálogo para regional/bandeira atuais. */
export function lojasNoEscopoCatalogo(
  catalogo: CatalogoLoja[],
  regional: string,
  bandeira: string | null,
): CatalogoLoja[] {
  return listarLojasDoCatalogo(catalogo, regional, bandeira);
}

/** Todas as lojas do escopo quando `lojas` está vazio ou cobre 100% do catálogo. */
export function todasLojasSelecionadas(lojas: number[], totalEscopo: number): boolean {
  if (totalEscopo === 0) return true;
  if (lojas.length === 0) return true;
  return lojas.length >= totalEscopo;
}

/** Resolve códigos efetivos para consulta (interseção escopo × seleção). */
export function resolverLojasEfetivas(
  catalogo: CatalogoLoja[],
  ctx: Pick<RupturaFiltrosContexto, "regional" | "bandeira" | "loja" | "lojas">,
): number[] {
  const escopo = lojasNoEscopoCatalogo(catalogo, ctx.regional, ctx.bandeira);
  const codigosEscopo = escopo.map((l) => l.loja);

  if (ctx.lojas.length === 0 || ctx.loja === FILTRO_LOJA_TODAS) {
    return codigosEscopo;
  }

  const set = new Set(codigosEscopo);
  return ctx.lojas.filter((l) => set.has(l)).sort((a, b) => a - b);
}

/** Sincroniza sentinela legada `loja` a partir de `lojas`. */
export function sincronizarSentinelaLoja(
  lojas: number[],
  totalEscopo: number,
): number {
  if (lojas.length === 0 || todasLojasSelecionadas(lojas, totalEscopo)) return FILTRO_LOJA_TODAS;
  if (lojas.length === 1) return lojas[0]!;
  return FILTRO_LOJA_TODAS;
}

/** Rótulo compacto do filtro fechado. */
export function formatLojasSelecionadasLabel(lojas: number[], totalEscopo: number): string {
  if (totalEscopo === 0) return "Nenhuma loja";
  if (todasLojasSelecionadas(lojas, totalEscopo)) {
    if (lojas.length > 0 && lojas.length === totalEscopo) return `${lojas.length} de ${totalEscopo}`;
    return "Todas as lojas";
  }
  if (lojas.length === 1) return "1 loja";
  return `${lojas.length} lojas`;
}

/** Migra contexto legado (somente `loja`) para incluir `lojas`. */
export function migrarContextoLojas(
  parsed: Partial<RupturaFiltrosContexto>,
  base: RupturaFiltrosContexto,
): RupturaFiltrosContexto {
  const merged = { ...base, ...parsed, bandeira: parsed.bandeira ?? base.bandeira };

  if (Array.isArray(parsed.lojas)) {
    merged.lojas = parsed.lojas;
  } else if (parsed.loja === FILTRO_LOJA_TODAS || parsed.loja === 0) {
    merged.lojas = [];
  } else if (typeof parsed.loja === "number" && parsed.loja > 0) {
    merged.lojas = [parsed.loja];
  } else {
    merged.lojas = base.lojas;
  }

  merged.loja = sincronizarSentinelaLoja(merged.lojas, merged.lojas.length || 1);
  return merged;
}

/** Remove lojas fora do escopo após troca de regional/bandeira. */
export function filtrarLojasValidasNoEscopo(
  lojas: number[],
  catalogo: CatalogoLoja[],
  regional: string,
  bandeira: string | null,
): number[] {
  const set = new Set(lojasNoEscopoCatalogo(catalogo, regional, bandeira).map((l) => l.loja));
  const filtradas = lojas.filter((l) => set.has(l)).sort((a, b) => a - b);
  if (filtradas.length === 0) return [];
  return filtradas;
}
