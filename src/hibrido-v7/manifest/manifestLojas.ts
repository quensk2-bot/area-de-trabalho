import type { RupturaManifest } from "./manifestTypes.ts";

export function listarLojasPublicadasManifest(manifest: RupturaManifest): number[] {
  return Object.keys(manifest.lojas)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

export function lojaPublicadaNoManifest(manifest: RupturaManifest, loja: number): boolean {
  return loja > 0 && manifest.lojas[String(loja)] != null;
}
