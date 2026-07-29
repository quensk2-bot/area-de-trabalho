import { createHash } from "node:crypto";
import type { ManifestLojaPaths, RupturaManifest } from "./manifestTypes.ts";
import {
  dashboardLojasOficialPath,
  dashboardLojasPath,
  dashboardRegionalOficialPath,
  dashboardRegionalPath,
  lojaCdsPath,
  lojaGestaoPath,
  lojaResumoOficialPath,
  lojaResumoPath,
  manifestFilePath,
} from "./manifestPaths.ts";
import { validarManifest } from "./manifestValidator.ts";

export type ManifestBuilderInput = {
  regional: string;
  bandeira: string;
  competencia: string;
  dataReferencia: string;
  versao: number;
  status?: RupturaManifest["status"];
  lojas: number[];
  baseXlsxDriveFileId?: string | null;
  baseCsvDriveFileId?: string | null;
  geradoEm?: string;
  hashConteudo?: string;
};

export function computeHashConteudo(payloads: string[]): string {
  const h = createHash("sha256");
  for (const p of payloads) h.update(p);
  return h.digest("hex");
}

export function buildManifest(input: ManifestBuilderInput): RupturaManifest {
  const scope = {
    regional: input.regional,
    bandeira: input.bandeira,
    competencia: input.competencia,
    versao: input.versao,
  };

  const lojas: Record<string, ManifestLojaPaths> = {};
  for (const loja of input.lojas) {
    const withLoja = { ...scope, loja };
    lojas[String(loja)] = {
      resumo: lojaResumoPath(withLoja),
      resumoOficial: lojaResumoOficialPath(withLoja),
      gestao: lojaGestaoPath(withLoja),
      cds: lojaCdsPath(withLoja),
    };
  }

  const manifest: RupturaManifest = {
    modulo: "ruptura",
    regional: input.regional,
    bandeira: input.bandeira,
    competencia: input.competencia,
    dataReferencia: input.dataReferencia,
    versao: input.versao,
    status: input.status ?? "concluido",
    geradoEm: input.geradoEm ?? new Date().toISOString(),
    hashConteudo: input.hashConteudo ?? "pending",
    baseXlsxDriveFileId: input.baseXlsxDriveFileId ?? null,
    baseCsvDriveFileId: input.baseCsvDriveFileId ?? null,
    dashboardRegional: dashboardRegionalPath(scope),
    dashboardLojas: dashboardLojasPath(scope),
    dashboardRegionalOficial: dashboardRegionalOficialPath(scope),
    dashboardLojasOficial: dashboardLojasOficialPath(scope),
    lojas,
  };

  const validated = validarManifest(manifest);
  if (!validated.ok) throw new Error(`Manifest inválido: ${validated.erros.join("; ")}`);
  return manifest;
}

export function manifestStoragePath(manifest: RupturaManifest): string {
  return manifestFilePath({
    regional: manifest.regional,
    bandeira: manifest.bandeira,
    competencia: manifest.competencia,
    versao: manifest.versao,
  });
}
