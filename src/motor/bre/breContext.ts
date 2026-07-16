import type { CatalogPaths, CatalogServiceResult } from "../catalog/catalogService.ts";
import { loadCatalogos } from "../catalog/catalogService.ts";
import type { MotorBreContexto } from "./breTypes.ts";

export function criarBreContexto(
  regional: string,
  dataReferencia: string,
  catalogResult: CatalogServiceResult,
): MotorBreContexto {
  return {
    regional,
    dataReferencia,
    catalogos: catalogResult.catalogos,
    alertas: catalogResult.alertas,
  };
}

export function carregarContextoBre(
  regional: string,
  dataReferencia: string,
  paths: CatalogPaths,
  loader: typeof loadCatalogos,
): MotorBreContexto {
  const catalogResult = loader(paths);
  return criarBreContexto(regional, dataReferencia, catalogResult);
}

export function chaveLojaProduto(loja: number, produto: number): string {
  return `${loja}|${produto}`;
}
