import { validarManifest, validarPathPublicacao } from "../../../hibrido-v7/manifest/manifestValidator.ts";
import type { PublicacaoHibridaArtefato } from "./hibridoTypes.ts";

export type ValidacaoArtefatosResultado = {
  ok: boolean;
  erros: string[];
  tamanhos: Record<string, number>;
};

export function validarArtefatosHibridos(artefatos: PublicacaoHibridaArtefato[]): ValidacaoArtefatosResultado {
  const erros: string[] = [];
  const tamanhos: Record<string, number> = {};

  const manifestArt = artefatos.find((a) => a.path.endsWith("/manifest.json"));
  if (!manifestArt) erros.push("manifest.json ausente");

  for (const art of artefatos) {
    tamanhos[art.path] = art.bytes;
    if (!validarPathPublicacao(art.path)) {
      erros.push(`path inválido: ${art.path}`);
    }
    if (art.path.includes("..")) erros.push(`path traversal: ${art.path}`);
  }

  if (manifestArt) {
    const v = validarManifest(manifestArt.json);
    if (!v.ok) erros.push(...v.erros);
  }

  return { ok: erros.length === 0, erros, tamanhos };
}
