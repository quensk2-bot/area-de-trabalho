import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";
import type { RupturaFiltrosProdutos } from "../../types/rupturaFiltrosTypes.ts";

export function filtrarProdutos(produtos: HibridoProdutoGestao[], filtros: RupturaFiltrosProdutos): HibridoProdutoGestao[] {
  let list = produtos;
  if (filtros.classificacao) {
    const vals = Array.isArray(filtros.classificacao) ? filtros.classificacao : [filtros.classificacao];
    list = list.filter((p) => p.classificacaoPrazo && vals.includes(p.classificacaoPrazo));
  }
  if (filtros.possuiEstoqueCd === true) list = list.filter((p) => (p.somaEstoqueCd ?? 0) > 0);
  if (filtros.possuiEstoqueCd === false) list = list.filter((p) => (p.somaEstoqueCd ?? 0) <= 0);
  if (filtros.centralizado === true) list = list.filter((p) => (p.produtoCentralizado ?? 0) > 0);
  if (filtros.centralizado === false) {
    list = list.filter((p) => p.produtoCentralizado == null || p.produtoCentralizado <= 0);
  }
  if (filtros.busca && filtros.busca.length >= 2) {
    const term = filtros.busca.toLowerCase();
    const asNum = Number(term);
    list = list.filter(
      (p) =>
        p.descricao?.toLowerCase().includes(term) ||
        (Number.isFinite(asNum) && p.seqproduto === asNum),
    );
  }
  return list;
}
