export function normalizeHeader(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toUpperCase();
}

export function normalizeKey(value: unknown) {
  return String(value ?? "").trim();
}
