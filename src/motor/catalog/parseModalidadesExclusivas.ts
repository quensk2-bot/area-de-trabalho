import type {
  CatalogoBandeiraLoja,
  CatalogoLoadResult,
  CatalogoModalidadeLoja,
  CatalogoProdutoLojaExcecao,
} from "./catalogTypes.ts";
import { deduplicar, parseNumero, parseTxtSemicolon, pickColumn, readTxtWin1252 } from "./catalogUtils.ts";

const MODALIDADES_EXCLUSIVAS = new Set([
  "CD Cesta Basica (Armazenagem)",
  "CD Fort Compacto (Armazenagem)",
  "CD Lojas Compactas (Armazenagem)",
]);

export function parseModalidadesExclusivas(
  plan6Path: string,
  modalidades: CatalogoModalidadeLoja[],
  bandeiras: CatalogoBandeiraLoja[],
): CatalogoLoadResult<CatalogoProdutoLojaExcecao> {
  const modalidadePorNome = new Map(modalidades.map((m) => [m.modalidade, m.tipoLoja]));
  const lojasPorTipo = new Map<string, number[]>();
  for (const b of bandeiras) {
    if (!b.tipoLoja) continue;
    const arr = lojasPorTipo.get(b.tipoLoja) ?? [];
    arr.push(b.loja);
    lojasPorTipo.set(b.tipoLoja, arr);
  }

  const { headers, rows } = parseTxtSemicolon(readTxtWin1252(plan6Path));
  const itensBrutos: CatalogoProdutoLojaExcecao[] = [];

  for (const row of rows) {
    const modalidadeCd = pickColumn(row, headers, "MODALIDADECD");
    if (modalidadeCd == null || !MODALIDADES_EXCLUSIVAS.has(modalidadeCd)) continue;

    const codigo = parseNumero(pickColumn(row, headers, "CODIGO"));
    if (codigo == null) continue;

    const tipoLoja = modalidadePorNome.get(modalidadeCd);
    const lojas = tipoLoja ? (lojasPorTipo.get(tipoLoja) ?? []) : [];
    const ncurtoPrazo: "G" | "NG" = modalidadeCd === "CD Cesta Basica (Armazenagem)" ? "NG" : "G";

    if (lojas.length === 0) {
      itensBrutos.push({
        codigo,
        loja: 0,
        modalidadeCd,
        ncurtoPrazo,
      });
      continue;
    }

    for (const loja of lojas) {
      itensBrutos.push({ codigo, loja, modalidadeCd, ncurtoPrazo });
    }
  }

  const dedup = deduplicar(itensBrutos, (i) => `${i.codigo}|${i.loja}`);
  return {
    origem: plan6Path,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: itensBrutos.some((i) => i.loja === 0) ? ["Produtos exclusivos sem correspondência de loja via modalidade"] : [],
  };
}

export function getNCurtoPrazo(
  catalogo: CatalogoProdutoLojaExcecao[],
  codigo: number,
  loja: number,
): "G" | "NG" | null {
  const found = catalogo.find((e) => e.codigo === codigo && e.loja === loja);
  return found?.ncurtoPrazo ?? null;
}
