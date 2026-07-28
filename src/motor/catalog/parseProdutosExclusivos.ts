import type { CatalogoLoadResult, CatalogoPlan6Produto, CatalogoProdutoExclusivo } from "./catalogTypes.ts";
import { deduplicar, parseNumero, parseTxtSemicolon, pickColumn, readTxtWin1252 } from "./catalogUtils.ts";

const MODALIDADES_EXCLUSIVAS = new Set([
  "CD Cesta Basica (Armazenagem)",
  "CD Fort Compacto (Armazenagem)",
  "CD Lojas Compactas (Armazenagem)",
]);

/**
 * Lê TODOS os produtos do Plan 6 CD.txt com suas MODALIDADECD oficiais.
 * Usado para propagar a modalidade oficial até o frontend.
 *
 * Regra oficial do V7:
 * - MODALIDADECD preenchida → usa o valor original
 * - MODALIDADECD vazia/nula → usa "ED Direto Loja"
 * - Código não encontrado → fallback "ED Direto Loja" (aplicado no consumidor)
 */
export function parsePlan6Produtos(filePath: string): CatalogoLoadResult<CatalogoPlan6Produto> {
  const { headers, rows } = parseTxtSemicolon(readTxtWin1252(filePath));
  const itensBrutos: CatalogoPlan6Produto[] = [];

  for (const row of rows) {
    const codigo = parseNumero(pickColumn(row, headers, "CODIGO"));
    if (codigo == null) continue;
    const modalidadeCd = pickColumn(row, headers, "MODALIDADECD");
    // Regra V7: MODALIDADECD vazia/nula = "ED Direto Loja"
    const modalidadeFinal = modalidadeCd ?? "ED Direto Loja";
    itensBrutos.push({ codigo, modalidadeCd: modalidadeFinal });
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
