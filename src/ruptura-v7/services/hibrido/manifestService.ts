import { ativoPath, competenciaFromDataReferencia, manifestFilePath, type AtivoJson } from "../../../hibrido-v7/manifest/manifestPaths.ts";
import { validarManifest } from "../../../hibrido-v7/manifest/manifestValidator.ts";
import type { RupturaManifest } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import { isRlsTestFixture } from "../../../hibrido-v7/manifest/manifestGuards.ts";
import { listarLojasPublicadasManifest, lojaPublicadaNoManifest } from "../../../hibrido-v7/manifest/manifestLojas.ts";
import { downloadStorageJson, invalidateStorageCache } from "./storageJsonService.ts";

export { listarLojasPublicadasManifest, lojaPublicadaNoManifest } from "../../../hibrido-v7/manifest/manifestLojas.ts";

const manifestInflight = new Map<string, Promise<{ manifest: RupturaManifest | null; erro: HybridServiceError | null }>>();

/**
 * Resolve o path do manifesto ativo:
 * 1. Tenta carregar ativo.json do Storage.
 * 2. Se existir e apontar para um manifesto versionado, usa esse path.
 * 3. Se der 404 (não existe), usa o manifesto legado da raiz (V3).
 * 4. Qualquer outro erro (403, timeout, rede, 500) retorna erro — sem fallback silencioso.
 * 5. Se o manifesto versionado não existir, retorna erro.
 */
async function resolverManifestPath(input: {
  regional: string;
  bandeira: string;
  competencia: string;
}): Promise<{ path: string; versao: number | null; erro: HybridServiceError | null }> {
  const legadoPath = manifestFilePath({
    regional: input.regional,
    bandeira: input.bandeira,
    competencia: input.competencia,
  });

  const ativoStoragePath = ativoPath(input);
  const { data: ativo, erro: downloadErro } =
    await downloadStorageJson<AtivoJson>(ativoStoragePath);

  // Se houve erro no download do ativo.json
  if (downloadErro) {
    // Único caso de fallback: 404 (ativo.json não foi criado ainda)
    if (downloadErro.code === "not_found") {
      return { path: legadoPath, versao: null, erro: null };
    }
    // 403, timeout, erro de rede, 500 → retorna erro, sem fallback
    return { path: legadoPath, versao: null, erro: downloadErro };
  }

  // ativo.json baixado mas é inválido/malformado
  if (!ativo || typeof ativo.versao !== "number" || typeof ativo.manifestEm !== "string") {
    return {
      path: legadoPath,
      versao: null,
      erro: { code: "invalid_manifest", message: "ativo.json malformado ou incompleto" },
    };
  }

  if (import.meta.env?.DEV) {
    console.debug("[hibrido] ativo.json → versão", ativo.versao, "manifestEm:", ativo.manifestEm);
  }

  return { path: ativo.manifestEm, versao: ativo.versao, erro: null };
}

async function carregarManifestOnce(input: {
  regional: string;
  bandeira: string;
  dataReferencia: string;
}): Promise<{ manifest: RupturaManifest | null; erro: HybridServiceError | null }> {
  const competencia = competenciaFromDataReferencia(input.dataReferencia);

  // 1. Resolve o path do manifesto via ativo.json ou legado
  const { path, versao: versaoAtiva, erro: pathErr } = await resolverManifestPath({
    regional: input.regional,
    bandeira: input.bandeira,
    competencia,
  });
  if (pathErr) return { manifest: null, erro: pathErr };

  const { data, erro } = await downloadStorageJson<unknown>(path);
  if (import.meta.env?.DEV) {
    console.debug("[hibrido] carregarManifest", {
      path,
      url: import.meta.env?.VITE_SUPABASE_URL,
      fixture: isRlsTestFixture(data),
      erro: erro?.code,
    });
  }
  if (erro) {
    // Manifesto versionado não encontrado ou erro de acesso
    return { manifest: null, erro };
  }
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

  // Verifica consistência: ativo.json apontou para uma versão, mas o manifesto carregado tem versão diferente
  if (versaoAtiva != null && v.manifest.versao !== versaoAtiva) {
    return {
      manifest: null,
      erro: {
        code: "invalid_manifest",
        message: `Conflito de versão: ativo.json aponta versão ${versaoAtiva}, mas manifesto carregado é versão ${v.manifest.versao}.`,
      },
    };
  }

  // Verifica consistência: regional/bandeira do manifesto deve corresponder ao contexto solicitado
  if (v.manifest.regional !== input.regional) {
    return {
      manifest: null,
      erro: {
        code: "invalid_manifest",
        message: `Regional divergente: manifesto aponta ${v.manifest.regional}, mas o contexto solicitou ${input.regional}.`,
      },
    };
  }
  if (v.manifest.bandeira !== input.bandeira) {
    return {
      manifest: null,
      erro: {
        code: "invalid_manifest",
        message: `Bandeira divergente: manifesto aponta ${v.manifest.bandeira}, mas o contexto solicitou ${input.bandeira}.`,
      },
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
