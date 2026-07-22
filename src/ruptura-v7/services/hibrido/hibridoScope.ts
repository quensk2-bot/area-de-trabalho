import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import { canAccessBandeira, canAccessLoja, canAccessRegional } from "../../../auth-v7/permissionService.ts";
import { isModoHibrido } from "../../../lib/env.ts";
import type { RupturaFiltrosContexto } from "../../types/rupturaFiltrosTypes.ts";
import { HIBRIDO_PILOTO } from "../../../hibrido-v7/constants.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import { HYBRID_NENHUMA_LOJA_MESSAGE } from "../../../hibrido-v7/hybridErrors.ts";
import { FILTRO_LOJA_TODAS } from "../../../auth-v7/catalogoLojasTypes.ts";

export const HIBRIDO_BANDEIRA_DEFAULT = HIBRIDO_PILOTO.bandeira;

function lojasParaValidar(filtros: RupturaFiltrosContexto): number[] {
  if (filtros.lojas?.length) return filtros.lojas;
  if (filtros.loja === FILTRO_LOJA_TODAS || filtros.loja === 0) return [];
  return [filtros.loja];
}

export function assertEscopoHibrido(
  ctx: PermissionContext | null,
  filtros: RupturaFiltrosContexto & { bandeira?: string | null },
): HybridServiceError | null {
  if (!isModoHibrido()) return null;
  if (!ctx) return { code: "forbidden", message: "Sessão necessária" };

  const bandeiraEfetiva = filtros.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const lojasAlvo = lojasParaValidar(filtros);

  if (ctx.nivel === "GERENTE_LOJA") {
    const lojaFixa = ctx.lojas[0]?.loja;
    if (lojasAlvo.length === 0 || lojasAlvo.length > 1) {
      return { code: "forbidden", message: "Loja fora do seu escopo." };
    }
    if (lojaFixa != null && lojasAlvo[0] !== lojaFixa) {
      return { code: "forbidden", message: "Loja fora do seu escopo." };
    }
    if (!canAccessLoja(ctx, filtros.regional, bandeiraEfetiva, lojasAlvo[0]!)) {
      return { code: "forbidden", message: "Loja fora do seu escopo." };
    }
    return null;
  }

  if (filtros.bandeira == null) {
    if (!canAccessRegional(ctx, filtros.regional)) {
      return { code: "forbidden", message: "Regional fora do seu escopo." };
    }
  } else if (!canAccessBandeira(ctx, filtros.regional, filtros.bandeira)) {
    return { code: "forbidden", message: "Regional/bandeira fora do seu escopo." };
  }

  if (lojasAlvo.length === 0) return null;

  for (const loja of lojasAlvo) {
    if (!canAccessLoja(ctx, filtros.regional, bandeiraEfetiva, loja)) {
      return { code: "forbidden", message: "Loja fora do seu escopo." };
    }
  }
  return null;
}

export function assertLojasSelecionadas(lojasEfetivas: number[]): HybridServiceError | null {
  if (lojasEfetivas.length === 0) {
    return { code: "no_loja_selected", message: HYBRID_NENHUMA_LOJA_MESSAGE };
  }
  return null;
}

export function contextoFixoGerente(ctx: PermissionContext): Partial<RupturaFiltrosContexto & { bandeira: string }> | null {
  if (ctx.nivel !== "GERENTE_LOJA" || !ctx.lojas.length) return null;
  const loja = ctx.lojas[0];
  return {
    regional: loja.regional,
    bandeira: loja.bandeira,
    loja: loja.loja,
    lojas: [loja.loja],
  };
}

export function camposContextoReadonly(ctx: PermissionContext | null): {
  regional?: boolean;
  bandeira?: boolean;
  loja?: boolean;
} {
  if (!ctx || ctx.nivel === "ADM") return {};
  if (ctx.nivel === "GERENTE_LOJA") return { regional: true, bandeira: true, loja: true };
  if (ctx.nivel === "N0" || ctx.nivel === "N1") return {};
  return { loja: true };
}
