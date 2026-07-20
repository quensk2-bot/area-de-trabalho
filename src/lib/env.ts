const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

const metaEnv =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as ImportMetaEnv);

function envString(key: keyof ImportMetaEnv): string {
  const fromMeta = (metaEnv[key] as string | undefined)?.trim();
  if (fromMeta) return fromMeta;
  const fromProcess = process.env[key as string]?.trim();
  return fromProcess ?? "";
}

export function isModoHibrido(): boolean {
  const raw = envString("VITE_MODO_HIBRIDO").toLowerCase();
  return TRUE_VALUES.has(raw);
}

export function getSupabaseUrl(): string {
  return envString("VITE_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return envString("VITE_SUPABASE_ANON_KEY");
}

export const PROJETO_HIBRIDO_REF = "kdlhztpzedanwirifzsb";
export const PROJETO_ANTIGO_REF = "lghcztadxobrotyoqpbq";

export function isProjetoHibridoUrl(url: string): boolean {
  return url.includes(PROJETO_HIBRIDO_REF);
}

export function assertFrontendEnvSeguro(): void {
  const err = getHybridEnvError();
  if (err) console.warn(`[auth-v7] ${err}`);
}

/** Bloqueia app híbrido se URL/anon inválidos (ex.: GitHub Secrets desatualizados). */
export function getHybridEnvError(): string | null {
  if (!isModoHibrido()) return null;
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) {
    return "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no build. Atualize os GitHub Secrets e rode o deploy novamente.";
  }
  if (!isProjetoHibridoUrl(url)) {
    return `VITE_SUPABASE_URL não aponta para o projeto híbrido (${PROJETO_HIBRIDO_REF}). Atualize o secret no GitHub e redeploy.`;
  }
  try {
    new URL(url);
  } catch {
    return "VITE_SUPABASE_URL inválida no build. Verifique o GitHub Secret (sem espaços ou quebras de linha).";
  }
  return null;
}

export function getPasswordResetRedirectUrl(): string {
  const base = envString("VITE_APP_BASE_URL");
  if (base) return base.endsWith("/") ? base : `${base}/`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/`;
  }
  return "https://quensk2-bot.github.io/area-de-trabalho/";
}
