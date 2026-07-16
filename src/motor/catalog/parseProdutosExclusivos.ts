import type { CatalogoLoadResult, CatalogoProdutoExclusivo } from "./catalogTypes.ts";
import { deduplicar, parseNumero, parseTxtSemicolon, pickColumn, readTxtWin1252 } from "./catalogUtils.ts";

const MODALIDADES_EXCLUSIVAS = new Set([
  "CD Cesta Basica (Armazenagem)",
  "CD Fort Compacto (Armazenagem)",
  "CD Lojas Compactas (Armazenagem)",
]);

export function parseProdutosExclusivos(filePath: string): CatalogoLoadResult<CatalogoProdutoExclusivo> {
  const { headers, rows } = parseTxtSemicolon(readTxtWin1252(filePath));
  const itensBrutos: CatalogoProdutoExclusivo[] = [];

  for (const row of rows) {
    const modalidade = pickColumn(row, headers, "MODALIDADECD");
    if (modalidade == null || !MODALIDADES_EXCLUSIVAS.has(modalidade)) continue;
    const codigo = parseNumero(pickColumn(row, headers, "CODIGO"));
    if (codigo == null) continue;
    itensBrutos.push({
      codigo,
      descricao: pickColumn(row, headers, "DESCRICAO"),
      modCurtoPrazo: "LJ_Exclusiva",
    });
  }

  const dedup = deduplicar(itensBrutos, (i) => String(i.codigo));
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [],
  };
}

export function isProdutoExclusivo(catalogo: CatalogoProdutoExclusivo[], codigo: number): boolean {
  return catalogo.some((p) => p.codigo === codigo);
}

export function getModCurtoPrazo(catalogo: CatalogoProdutoExclusivo[], codigo: number): "LJ_Exclusiva" | null {
  return catalogo.find((p) => p.codigo === codigo)?.modCurtoPrazo ?? null;
}
