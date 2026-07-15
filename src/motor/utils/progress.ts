export type ProgressCallback = (info: {
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
}) => void;

export function criarMetricas(inicioMs: number, linhasLidas: number, linhasValidas: number, linhasInvalidas: number) {
  const duracaoMs = Date.now() - inicioMs;
  const linhasPorSegundo = duracaoMs > 0 ? Math.round((linhasLidas / duracaoMs) * 1000) : linhasLidas;
  return { linhasLidas, linhasValidas, linhasInvalidas, duracaoMs, linhasPorSegundo };
}

export function noopProgress(): ProgressCallback {
  return () => {};
}
