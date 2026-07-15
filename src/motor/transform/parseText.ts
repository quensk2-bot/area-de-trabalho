export function trimText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeCodigo(value: string | null | undefined): string | null {
  const text = emptyToNull(value);
  if (text == null) return null;
  return text.replace(/\s+/g, "");
}

export function normalizeCodigoNumerico(value: string | null | undefined): number | null {
  const codigo = normalizeCodigo(value);
  if (codigo == null) return null;
  const parsed = Number(codigo.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
