import { createClient } from "@supabase/supabase-js";
import { assertFrontendEnvSeguro, getSupabaseAnonKey, getSupabaseUrl } from "./env";

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[ENV] Variáveis do Supabase não carregadas!");
  console.error("[ENV] VITE_SUPABASE_URL:", SUPABASE_URL ? "(ok)" : "(vazio)");
  console.error("[ENV] VITE_SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "(ok)" : "(vazio)");
}

assertFrontendEnvSeguro();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});

/** Cliente schema app_v7 — modo híbrido */
export function appV7Db() {
  return supabase.schema("app_v7");
}
