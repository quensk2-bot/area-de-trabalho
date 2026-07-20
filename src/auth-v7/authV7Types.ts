import type { Session, User } from "@supabase/supabase-js";

export type NivelV7 =
  | "ADM"
  | "N0"
  | "N1"
  | "GERENTE_LOJA"
  | "COMPRADOR"
  | "VISUALIZADOR";

export type UsuarioPerfilV7 = {
  user_id: string;
  nome: string;
  email: string;
  nivel: NivelV7;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
};

export type UsuarioRegionalV7 = {
  id: string;
  user_id: string;
  regional: string;
  ativo: boolean;
};

export type UsuarioBandeiraV7 = {
  id: string;
  user_id: string;
  regional: string;
  bandeira: string;
  ativo: boolean;
};

export type UsuarioLojaV7 = {
  id: string;
  user_id: string;
  regional: string;
  bandeira: string;
  loja: number;
  ativo: boolean;
};

export type PermissaoV7 = {
  id: string;
  codigo: string;
  descricao: string;
  modulo: string;
  ativo: boolean;
};

export type UsuarioPermissaoV7 = {
  id: string;
  user_id: string;
  permissao_id: string;
  permitido: boolean;
  permissoes?: Pick<PermissaoV7, "codigo" | "ativo" | "modulo"> | null;
};

export type AuthV7ProfileBundle = {
  perfil: UsuarioPerfilV7;
  regionais: UsuarioRegionalV7[];
  bandeiras: UsuarioBandeiraV7[];
  lojas: UsuarioLojaV7[];
  permissoes: string[];
};

export type AuthV7ContextValue = {
  session: Session | null;
  user: User | null;
  perfil: UsuarioPerfilV7 | null;
  regionais: UsuarioRegionalV7[];
  bandeiras: UsuarioBandeiraV7[];
  lojas: UsuarioLojaV7[];
  permissoes: string[];
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (codigo: string) => boolean;
  canAccessRegional: (regional: string) => boolean;
  canAccessBandeira: (regional: string, bandeira: string) => boolean;
  canAccessLoja: (regional: string, bandeira: string, loja: number) => boolean;
};

export type AuthGateReason =
  | "session_missing"
  | "profile_missing"
  | "profile_inactive"
  | "permission_denied"
  | "session_expired"
  | "hybrid_load_failed";

export const AUTH_V7_MESSAGES = {
  profileMissing: "Usuário não cadastrado no V7.",
  profileInactive: "Usuário inativo.",
  permissionDenied: "Você não possui permissão para acessar este módulo.",
  sessionExpired: "Sessão expirada. Entre novamente.",
  hybridLoadFailed: "Não foi possível carregar o perfil no ambiente híbrido.",
  invalidCredentials: "E-mail ou senha inválidos.",
} as const;
