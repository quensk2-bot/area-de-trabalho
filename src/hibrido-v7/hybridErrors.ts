import { isModoHibrido } from "../lib/env.ts";

export const HYBRID_DATA_PENDING_MESSAGE =
  "Dados operacionais em migração para o modelo híbrido. Esta tela será alimentada pelos arquivos publicados no Drive/Storage.";

export const HYBRID_NOT_PUBLISHED_MESSAGE =
  "Versão ainda não publicada no Storage privado para este escopo. Aguarde a publicação do Worker.";

export const HYBRID_FORBIDDEN_MESSAGE = "Você não possui permissão para acessar estes dados.";

export const HYBRID_CONSUMO_BLOCKED = "HYBRID_MODE: consumo_v7 indisponível no modo híbrido";

export type HybridServiceErrorCode =
  | "hybrid_pending"
  | "not_published"
  | "forbidden"
  | "invalid_manifest"
  | "network";

export type HybridServiceError = {
  code: HybridServiceErrorCode;
  message: string;
};

const SCHEMA_ERROR_PATTERNS = [
  /invalid schema:\s*consumo_v7/i,
  /schema\s*["']consumo_v7["']\s*not found/i,
  /could not find the schema\s*["']consumo_v7["']/i,
  /consumo_v7.*does not exist/i,
  /HYBRID_MODE.*consumo_v7/i,
];

export function isConsumoV7SchemaError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
  return SCHEMA_ERROR_PATTERNS.some((re) => re.test(msg));
}

export function toHybridPendingError(error: unknown): HybridServiceError | null {
  if (!isModoHibrido()) return null;
  if (isConsumoV7SchemaError(error)) {
    return { code: "hybrid_pending", message: HYBRID_DATA_PENDING_MESSAGE };
  }
  return null;
}

export function mapStorageError(status: number, fallback?: string): HybridServiceError {
  if (status === 403) return { code: "forbidden", message: HYBRID_FORBIDDEN_MESSAGE };
  if (status === 404) return { code: "not_published", message: HYBRID_NOT_PUBLISHED_MESSAGE };
  return { code: "network", message: fallback ?? `Erro ao baixar artefato (${status})` };
}
