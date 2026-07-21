import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HIBRIDO_BUCKET } from "../../../hibrido-v7/constants.ts";
import type { PublicacaoHibridaArtefato } from "./hibridoTypes.ts";

export type PublicarStorageInput = {
  supabase: SupabaseClient;
  bucket?: string;
  artefatos: PublicacaoHibridaArtefato[];
  upsert?: boolean;
};

export type PublicarStorageResultado = {
  ok: boolean;
  paths: string[];
  erros: string[];
};

/** Upload Worker — requer service_role (nunca no frontend). */
export async function publicarStoragePrivado(input: PublicarStorageInput): Promise<PublicarStorageResultado> {
  const bucket = input.bucket ?? HIBRIDO_BUCKET;
  const paths: string[] = [];
  const erros: string[] = [];

  for (const art of input.artefatos) {
    const body = JSON.stringify(art.json);
    const { error } = await input.supabase.storage.from(bucket).upload(art.path, body, {
      contentType: "application/json",
      cacheControl: "no-cache, max-age=0",
      upsert: input.upsert ?? true,
    });
    if (error) {
      erros.push(`${art.path}: ${error.message}`);
    } else {
      paths.push(art.path);
    }
  }

  return { ok: erros.length === 0, paths, erros };
}

/** Factory local Worker — lê SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do ambiente. */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários para publicação Worker");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
