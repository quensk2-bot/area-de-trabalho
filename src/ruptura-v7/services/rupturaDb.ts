import { supabase } from "../../lib/supabaseClient.ts";

export const consumoDb = () => supabase.schema("consumo_v7");

export type SupabaseQueryError = {
  message: string;
  code?: string;
};

export function mapSupabaseError(error: { message: string; code?: string } | null): SupabaseQueryError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}
