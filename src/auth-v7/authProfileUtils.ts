import type { Usuario } from "../types";
import type { AuthV7ContextValue, AuthV7ProfileBundle, NivelV7 } from "./authV7Types";
import {
  canAccessBandeira,
  canAccessLoja,
  canAccessRegional,
  hasPermission,
  type PermissionContext,
} from "./permissionService";

export function evaluateProfileGate(bundle: AuthV7ProfileBundle | null): {
  ok: boolean;
  error: string | null;
} {
  if (!bundle?.perfil) {
    return { ok: false, error: "Usuário não cadastrado no V7." };
  }
  if (!bundle.perfil.ativo) {
    return { ok: false, error: "Usuário inativo." };
  }
  return { ok: true, error: null };
}

export function toPermissionContext(bundle: AuthV7ProfileBundle): PermissionContext {
  return {
    nivel: bundle.perfil.nivel,
    permissoes: bundle.permissoes,
    regionais: bundle.regionais.map((r) => r.regional),
    bandeiras: bundle.bandeiras.map((b) => ({ regional: b.regional, bandeira: b.bandeira })),
    lojas: bundle.lojas.map((l) => ({
      regional: l.regional,
      bandeira: l.bandeira,
      loja: l.loja,
    })),
  };
}

export function buildPermissionHelpers(bundle: AuthV7ProfileBundle | null): Pick<
  AuthV7ContextValue,
  "hasPermission" | "canAccessRegional" | "canAccessBandeira" | "canAccessLoja"
> {
  const ctx = bundle ? toPermissionContext(bundle) : null;
  const empty: PermissionContext = {
    nivel: "VISUALIZADOR",
    permissoes: [],
    regionais: [],
    bandeiras: [],
    lojas: [],
  };
  const active = ctx ?? empty;
  return {
    hasPermission: (codigo) => hasPermission(active, codigo),
    canAccessRegional: (regional) => canAccessRegional(active, regional),
    canAccessBandeira: (regional, bandeira) => canAccessBandeira(active, regional, bandeira),
    canAccessLoja: (regional, bandeira, loja) => canAccessLoja(active, regional, bandeira, loja),
  };
}

/** Compatibilidade mínima com componentes legados que esperam `Usuario`. */
export function mapNivelToLegacyMenu(nivel: NivelV7): Usuario["nivel"] {
  switch (nivel) {
    case "ADM":
      return "ADM";
    case "N0":
      return "N0";
    case "N1":
      return "N1";
    case "GERENTE_LOJA":
      return "N2";
    case "COMPRADOR":
    case "VISUALIZADOR":
      return "N99";
    default:
      return "N99";
  }
}

export function perfilV7ToLegacyUsuario(bundle: AuthV7ProfileBundle): Usuario {
  const p = bundle.perfil;
  return {
    id: p.user_id,
    nome: p.nome,
    email: p.email,
    nivel: mapNivelToLegacyMenu(p.nivel),
    departamento_id: null,
    setor_id: null,
    regional_id: null,
    ativo: p.ativo,
  };
}
