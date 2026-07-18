import { createClient } from "@supabase/supabase-js";
import type { MotorV7Db } from "./persistenciaTypes.ts";

/** Cliente exclusivo service_role — schema motor_v7. Nunca expor ao frontend. */
export function createMotorV7Db(): MotorV7Db {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatorios para persistencia motor_v7.");
  }
  return createClient(url, key, { db: { schema: "motor_v7" } });
}

export function isMotorV7DbConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
