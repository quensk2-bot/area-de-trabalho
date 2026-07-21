import { supabase } from "../../../lib/supabaseClient.ts";
import { HIBRIDO_BUCKET } from "../../../hibrido-v7/constants.ts";
import { isRlsTestFixture } from "../../../hibrido-v7/manifest/manifestGuards.ts";
import { mapStorageError, type HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";

type CacheEntry = { json: unknown; expires: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

/** Manifest muda após reparo/publicação — nunca cachear (evita fixture stale via HMR). */
function isCacheablePath(path: string): boolean {
  return !path.endsWith("/manifest.json");
}

export async function downloadStorageJson<T>(
  path: string,
  bucket = HIBRIDO_BUCKET,
): Promise<{ data: T | null; erro: HybridServiceError | null }> {
  const key = cacheKey(bucket, path);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    if (isRlsTestFixture(hit.json)) {
      cache.delete(key);
    } else {
      return { data: hit.json as T, erro: null };
    }
  }

  const { data: blob, error } = await supabase.storage.from(bucket).download(path);
  if (error) {
    const status = "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
    return { data: null, erro: mapStorageError(status || 500, error.message) };
  }

  try {
    const text = await blob.text();
    const json = JSON.parse(text) as T;
    if (isRlsTestFixture(json)) {
      invalidateStorageCache();
      return { data: json, erro: null };
    }
    if (isCacheablePath(path)) {
      cache.set(key, { json, expires: Date.now() + CACHE_TTL_MS });
    }
    return { data: json, erro: null };
  } catch {
    return { data: null, erro: { code: "network", message: "JSON inválido no Storage" } };
  }
}

export function invalidateStorageCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.includes(prefix)) cache.delete(k);
  }
}
