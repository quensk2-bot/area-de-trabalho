import { appV7Db } from "../lib/supabaseClient";
import type { AuthV7ProfileBundle } from "./authV7Types";

export class ProfileLoadError extends Error {
  constructor(
    message: string,
    readonly code: "missing" | "inactive" | "db" | "session",
  ) {
    super(message);
    this.name = "ProfileLoadError";
  }
}

export async function loadAuthV7Profile(userId: string): Promise<AuthV7ProfileBundle> {
  const db = appV7Db();

  const { data: perfil, error: perfilErr } = await db
    .from("usuarios_perfil")
    .select("user_id, nome, email, nivel, ativo, criado_em, atualizado_em")
    .eq("user_id", userId)
    .maybeSingle();

  if (perfilErr) {
    throw new ProfileLoadError(perfilErr.message, "db");
  }
  if (!perfil) {
    throw new ProfileLoadError("Usuário não cadastrado no V7.", "missing");
  }
  if (!perfil.ativo) {
    throw new ProfileLoadError("Usuário inativo.", "inactive");
  }

  const [regionaisRes, bandeirasRes, lojasRes, permissoesRes] = await Promise.all([
    db
      .from("usuario_regionais")
      .select("id, user_id, regional, ativo")
      .eq("user_id", userId)
      .eq("ativo", true),
    db
      .from("usuario_bandeiras")
      .select("id, user_id, regional, bandeira, ativo")
      .eq("user_id", userId)
      .eq("ativo", true),
    db
      .from("usuario_lojas")
      .select("id, user_id, regional, bandeira, loja, ativo")
      .eq("user_id", userId)
      .eq("ativo", true),
    db
      .from("usuario_permissoes")
      .select("id, user_id, permissao_id, permitido, permissoes(codigo, ativo, modulo)")
      .eq("user_id", userId)
      .eq("permitido", true),
  ]);

  if (regionaisRes.error) throw new ProfileLoadError(regionaisRes.error.message, "db");
  if (bandeirasRes.error) throw new ProfileLoadError(bandeirasRes.error.message, "db");
  if (lojasRes.error) throw new ProfileLoadError(lojasRes.error.message, "db");
  if (permissoesRes.error) throw new ProfileLoadError(permissoesRes.error.message, "db");

  const permissoes = (permissoesRes.data ?? [])
    .map((row) => {
      const joined = row.permissoes as { codigo?: string; ativo?: boolean } | null;
      if (!joined?.ativo || !joined.codigo) return null;
      return joined.codigo;
    })
    .filter((c): c is string => Boolean(c));

  return {
    perfil,
    regionais: regionaisRes.data ?? [],
    bandeiras: bandeirasRes.data ?? [],
    lojas: lojasRes.data ?? [],
    permissoes: [...new Set(permissoes)],
  };
}
