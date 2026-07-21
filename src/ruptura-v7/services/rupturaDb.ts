import { HYBRID_CONSUMO_BLOCKED } from "../../hibrido-v7/hybridErrors.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { supabase } from "../../lib/supabaseClient.ts";

export { HYBRID_CONSUMO_BLOCKED };

export const consumoDb = () => {
  if (isModoHibrido()) {
    throw new Error(HYBRID_CONSUMO_BLOCKED);
  }
  return supabase.schema("consumo_v7");
};

export type SupabaseQueryError = {
  message: string;
  code?: string;
};

export function mapSupabaseError(error: { message: string; code?: string } | null): SupabaseQueryError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}
