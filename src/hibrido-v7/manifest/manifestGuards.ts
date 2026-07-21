export function isRlsTestFixture(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) && (raw as { _rls_test?: unknown })._rls_test === true;
}
