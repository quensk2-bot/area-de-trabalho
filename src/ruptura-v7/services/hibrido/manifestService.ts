import { competenciaFromDataReferencia, manifestFilePath } from "../../../hibrido-v7/manifest/manifestPaths.ts";
import { validarManifest } from "../../../hibrido-v7/manifest/manifestValidator.ts";
import type { RupturaManifest } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import { isRlsTestFixture } from "../../../hibrido-v7/manifest/manifestGuards.ts";
import { downloadStorageJson, invalidateStorageCache } from "./storageJsonService.ts";

const manifestInflight = new Map<string, Promise<{ manifest: RupturaManifest | null; erro: HybridServiceError | null }>>();

async function carregarManifestOnce(input: {
  regional: string;
  bandeira: string;
  dataReferencia: string;
}): Promise<{ manifest: RupturaManifest | null; erro: HybridServiceError | null }> {
  const competencia = competenciaFromDataReferencia(input.dataReferencia);
  const path = manifestFilePath({
    regional: input.regional,
    bandeira: input.bandeira,
    competencia,
  });

  const { data, erro } = await downloadStorageJson<unknown>(path);
  if (import.meta.env.DEV) {
    console.debug("[hibrido] carregarManifest", {
      path,
      url: import.meta.env.VITE_SUPABASE_URL,
      fixture: isRlsTestFixture(data),
      erro: erro?.code,
    });
  }
  if (erro) return { manifest: null, erro };
  if (isRlsTestFixture(data)) {
    invalidateStorageCache();
    return {
      manifest: null,
      erro: {
        code: "invalid_manifest",
        message: "Manifest substituído por fixture de teste RLS. Execute repararManifestPilotoCli ou republique o piloto.",
      },
    };
  }
  const v = validarManifest(data);
  if (!v.ok) {
    return {
      manifest: null,
      erro: { code: "invalid_manifest", message: v.erros.join("; ") },
    };
  }
  return { manifest: v.manifest, erro: null };
}

export async function carregarManifest(input: {
  regional: string;
  bandeira: string;
  dataReferencia: string;
}): Promise<{ manifest: RupturaManifest | null; erro: HybridServiceError | null }> {
  const competencia = competenciaFromDataReferencia(input.dataReferencia);
  const dedupeKey = `${input.regional}/${input.bandeira}/${competencia}`;
  const inflight = manifestInflight.get(dedupeKey);
  if (inflight) return inflight;

  const promise = carregarManifestOnce(input).finally(() => {
    manifestInflight.delete(dedupeKey);
  });
  manifestInflight.set(dedupeKey, promise);
  return promise;
}

export function lojaPathsFromManifest(manifest: RupturaManifest, loja: number) {
  if (loja === 0) return null;
  return manifest.lojas[String(loja)] ?? null;
}

/** Lojas com artefatos publicados no manifest (não usa sentinel "Todas"). */
export function listarLojasPublicadasManifest(manifest: RupturaManifest): number[] {
  return Object.keys(manifest.lojas)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

export function lojaPublicadaNoManifest(manifest: RupturaManifest, loja: number): boolean {
  return loja > 0 && manifest.lojas[String(loja)] != null;
}
