import { createClient } from "@supabase/supabase-js";
export function createRupturaDb() {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatorios");
  return createClient(url, key, { db: { schema: "ruptura_v7" } });
}
