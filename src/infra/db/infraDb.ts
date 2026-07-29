import { createClient } from "@supabase/supabase-js";

export function createInfraDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatorios para registrar metadados.");
  }
  return createClient(url, key, { db: { schema: "infra_v7" } });
}
