export function rupturaFolderSegments(regional: string, dataReferencia: string): string[] {
  const [ano, mes] = dataReferencia.split("-");
  if (!ano || !mes) {
    throw new Error(`data_referencia invalida: ${dataReferencia}. Use YYYY-MM-DD.`);
  }
  return ["Ruptura", ano, mes.padStart(2, "0"), regional];
}

export function buildFolderPath(segments: string[]): string {
  return segments.join("/");
}
