import type { NivelV7 } from "./authV7Types";

export type PermissionContext = {
  nivel: NivelV7;
  permissoes: string[];
  regionais: string[];
  bandeiras: { regional: string; bandeira: string }[];
  lojas: { regional: string; bandeira: string; loja: number }[];
};

const norm = (s: string) => s.trim().toUpperCase();

export function hasPermission(ctx: PermissionContext, codigo: string): boolean {
  if (ctx.nivel === "ADM") return true;
  return ctx.permissoes.includes(codigo);
}

export function canAccessRegional(ctx: PermissionContext, regional: string): boolean {
  if (ctx.nivel === "ADM") return true;
  return ctx.regionais.some((r) => norm(r) === norm(regional));
}

export function canAccessBandeira(ctx: PermissionContext, regional: string, bandeira: string): boolean {
  if (ctx.nivel === "ADM") return true;
  if (ctx.nivel === "N0" || ctx.nivel === "N1") {
    return canAccessRegional(ctx, regional);
  }
  return ctx.bandeiras.some(
    (b) => norm(b.regional) === norm(regional) && norm(b.bandeira) === norm(bandeira),
  );
}

export function canAccessLoja(ctx: PermissionContext, regional: string, bandeira: string, loja: number): boolean {
  if (ctx.nivel === "ADM") return true;
  if (ctx.nivel === "N0" || ctx.nivel === "N1") {
    return canAccessBandeira(ctx, regional, bandeira);
  }
  return ctx.lojas.some(
    (l) =>
      norm(l.regional) === norm(regional) &&
      norm(l.bandeira) === norm(bandeira) &&
      l.loja === loja,
  );
}

/** Menus híbridos — ruptura */
export function canViewRuptura(ctx: PermissionContext): boolean {
  return hasPermission(ctx, "ruptura.ver") || ctx.nivel === "ADM";
}

export function canProcessRuptura(ctx: PermissionContext): boolean {
  return hasPermission(ctx, "ruptura.processar") || ctx.nivel === "ADM";
}

export function canAdminUsuarios(ctx: PermissionContext): boolean {
  return hasPermission(ctx, "usuarios.admin") || ctx.nivel === "ADM";
}

export function canViewDrive(ctx: PermissionContext): boolean {
  return hasPermission(ctx, "drive.ver") || hasPermission(ctx, "ruptura.ver") || ctx.nivel === "ADM";
}

export function canValidateDrive(ctx: PermissionContext): boolean {
  return hasPermission(ctx, "drive.validar") || ctx.nivel === "ADM";
}

export function canProcessDrive(ctx: PermissionContext): boolean {
  return hasPermission(ctx, "drive.processar") || hasPermission(ctx, "ruptura.processar") || ctx.nivel === "ADM";
}

/** GERENTE_LOJA: somente gestão/dashboard da loja */
export function isGerenteLoja(ctx: PermissionContext): boolean {
  return ctx.nivel === "GERENTE_LOJA";
}

export function gerenteCanOnlyViewStore(ctx: PermissionContext): boolean {
  return isGerenteLoja(ctx) && !canProcessRuptura(ctx);
}
