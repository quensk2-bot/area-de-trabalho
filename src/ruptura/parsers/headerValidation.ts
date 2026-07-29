import type { HeaderValidation } from "../types/rupturaTypes";
import { normalizeHeader } from "../utils/normalize";
export function validateHeaders(expected: readonly string[], actual: string[]): HeaderValidation {
  const normExpected = expected.map(normalizeHeader);
  const normActual = actual.map(normalizeHeader);
  const missing = normExpected.filter((h) => !normActual.includes(h));
  const extra = normActual.filter((h) => !normExpected.includes(h));
  return { ok: missing.length === 0, missing, extra, headers: actual };
}
