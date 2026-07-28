import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import { buildManifest, computeHashConteudo, manifestStoragePath } from "../../../hibrido-v7/manifest/manifestBuilder.ts";
import {
  dashboardLojasOficialPath,
  dashboardLojasPath,
  dashboardRegionalOficialPath,
  dashboardRegionalPath,
  dashboardTopPrazosPath,
  lojaCdsPath,
  lojaGestaoChunkPath,
  lojaGestaoPath,
  lojaResumoOficialPath,
  lojaResumoPath,
} from "../../../hibrido-v7/manifest/manifestPaths.ts";
import type { RupturaManifest } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import { gerarCdsLoja } from "./gerarCdsLoja.ts";
import { gerarGestaoLoja } from "./gerarGestaoLoja.ts";
import { gerarTopPrazos } from "./gerarTopPrazos.ts";
import { gerarResumoLoja, gerarResumoLojaOficialCompativel, gerarResumoLojas, gerarResumoRegional } from "./gerarResumoLoja.ts";
import type { PublicacaoHibridaArtefato, PublicacaoHibridaResultado } from "./hibridoTypes.ts";

export type GerarManifestHibridoInput = {
  regional: string;
  bandeira: string;
  competencia: string;
  dataReferencia: string;
  versao: number;
  lojas: number[];
  itensPorLoja: Record<number, readonly MotorProdutoLojaConsolidado[]>;
  baseXlsxDriveFileId?: string | null;
  baseCsvDriveFileId?: string | null;
};

export function gerarArtefatosHibridos(input: GerarManifestHibridoInput): PublicacaoHibridaResultado {
  const scope = {
    regional: input.regional,
    bandeira: input.bandeira,
    competencia: input.competencia,
    versao: input.versao,
  };

  const artefatos: PublicacaoHibridaArtefato[] = [];
  const resumosIntegral: import("./hibridoTypes.ts").ResumoLojaJson[] = [];
  const resumosOficial: import("./hibridoTypes.ts").ResumoLojaJson[] = [];

  let resumoPrincipal = gerarResumoLoja([], {
    regional: input.regional,
    bandeira: input.bandeira,
    loja: input.lojas[0] ?? 0,
    dataReferencia: input.dataReferencia,
  });
  let gestaoPrincipal = gerarGestaoLoja([], {
    ...scope,
    loja: input.lojas[0] ?? 0,
    dataReferencia: input.dataReferencia,
    versao: input.versao,
  }).gestao;
  let cdsPrincipal = gerarCdsLoja([], {
    ...scope,
    loja: input.lojas[0] ?? 0,
    dataReferencia: input.dataReferencia,
  });

  for (const loja of input.lojas) {
    const itens = input.itensPorLoja[loja] ?? [];
    const resumo = gerarResumoLoja(itens, {
      regional: input.regional,
      bandeira: input.bandeira,
      loja,
      dataReferencia: input.dataReferencia,
      modoUniverso: "V7_INTEGRAL",
    });
    const resumoOficial = gerarResumoLojaOficialCompativel(itens, {
      regional: input.regional,
      bandeira: input.bandeira,
      loja,
      dataReferencia: input.dataReferencia,
    });
    resumosIntegral.push(resumo);
    resumosOficial.push(resumoOficial);

    const resumoPath = lojaResumoPath({ ...scope, loja });
    artefatos.push({ path: resumoPath, json: resumo, bytes: Buffer.byteLength(JSON.stringify(resumo)) });

    const resumoOficialPath = lojaResumoOficialPath({ ...scope, loja });
    artefatos.push({
      path: resumoOficialPath,
      json: resumoOficial,
      bytes: Buffer.byteLength(JSON.stringify(resumoOficial)),
    });

    const gestaoGen = gerarGestaoLoja(itens, {
      ...scope,
      loja,
      dataReferencia: input.dataReferencia,
      versao: input.versao,
    });
    const gestaoPath = lojaGestaoPath({ ...scope, loja });
    artefatos.push({
      path: gestaoPath,
      json: gestaoGen.gestao,
      bytes: Buffer.byteLength(JSON.stringify(gestaoGen.gestao)),
    });

    if (gestaoGen.chunked && gestaoGen.partes) {
      for (let idx = 0; idx < gestaoGen.partes.length; idx++) {
        const parte = gestaoGen.partes[idx];
        const chunkPath = lojaGestaoChunkPath({ ...scope, loja, parte: idx + 1 });
        artefatos.push({
          path: chunkPath,
          json: { produtos: parte.produtos },
          bytes: parte.bytes,
        });
      }
    }

    const cds = gerarCdsLoja(itens, {
      ...scope,
      loja,
      dataReferencia: input.dataReferencia,
    });
    artefatos.push({ path: lojaCdsPath({ ...scope, loja }), json: cds, bytes: Buffer.byteLength(JSON.stringify(cds)) });

    if (loja === input.lojas[0]) {
      resumoPrincipal = resumo;
      gestaoPrincipal = gestaoGen.gestao;
      cdsPrincipal = cds;
    }
  }

  const dashboardRegional = gerarResumoRegional(resumosIntegral, {
    ...scope,
    dataReferencia: input.dataReferencia,
    versao: input.versao,
  });
  const dashboardLojas = gerarResumoLojas(resumosIntegral, scope);
  const dashboardRegionalOficial = gerarResumoRegional(resumosOficial, {
    ...scope,
    dataReferencia: input.dataReferencia,
    versao: input.versao,
  });
  const dashboardLojasOficial = gerarResumoLojas(resumosOficial, scope);
  const dashboardTopPrazos = gerarTopPrazos(input.itensPorLoja, {
    ...scope,
    dataReferencia: input.dataReferencia,
  });

  artefatos.push({
    path: dashboardRegionalPath(scope),
    json: dashboardRegional,
    bytes: Buffer.byteLength(JSON.stringify(dashboardRegional)),
  });
  artefatos.push({
    path: dashboardLojasPath(scope),
    json: dashboardLojas,
    bytes: Buffer.byteLength(JSON.stringify(dashboardLojas)),
  });
  artefatos.push({
    path: dashboardRegionalOficialPath(scope),
    json: dashboardRegionalOficial,
    bytes: Buffer.byteLength(JSON.stringify(dashboardRegionalOficial)),
  });
  artefatos.push({
    path: dashboardLojasOficialPath(scope),
    json: dashboardLojasOficial,
    bytes: Buffer.byteLength(JSON.stringify(dashboardLojasOficial)),
  });
  artefatos.push({
    path: dashboardTopPrazosPath(scope),
    json: dashboardTopPrazos,
    bytes: Buffer.byteLength(JSON.stringify(dashboardTopPrazos)),
  });

  const hashConteudo = computeHashConteudo(artefatos.map((a) => JSON.stringify(a.json)));

  const manifest = buildManifest({
    ...input,
    hashConteudo,
    lojas: input.lojas,
  });

  artefatos.unshift({
    path: manifestStoragePath(manifest),
    json: manifest,
    bytes: Buffer.byteLength(JSON.stringify(manifest)),
  });

  return {
    artefatos,
    resumo: resumoPrincipal,
    gestao: gestaoPrincipal,
    cds: cdsPrincipal,
    dashboardRegional,
    dashboardLojas,
  };
}

export function gerarManifestHibrido(input: GerarManifestHibridoInput): RupturaManifest {
  return gerarArtefatosHibridos(input).artefatos[0]?.json as RupturaManifest;
}
