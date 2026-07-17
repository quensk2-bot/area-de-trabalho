export function assertEquivalenciaBre<T>(
  contexto: string,
  legado: T,
  dinamico: T,
): void {
  const a = JSON.stringify(legado);
  const b = JSON.stringify(dinamico);
  if (a !== b) {
    throw new Error(`Equivalência MT falhou (${contexto}):\nlegado=${a}\ndinamico=${b}`);
  }
}

export function equivalenciaBreOk<T>(legado: T, dinamico: T): boolean {
  return JSON.stringify(legado) === JSON.stringify(dinamico);
}
