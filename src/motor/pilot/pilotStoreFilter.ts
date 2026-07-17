import {
  INVENTARIO_COL_EMPRESA,
} from "../constants/headers.ts";

export function filtroLojaGrupo1(loja: number) {
  const alvo = String(loja);
  return (payload: Record<string, string>) => (payload.LOJA ?? "").trim() === alvo;
}

export function filtroProdutosGrupo2(produtos: ReadonlySet<string>) {
  return (payload: Record<string, string>) => produtos.has((payload.SEQPRODUTO ?? "").trim());
}

export function filtroLojaInventario(loja: number) {
  const alvo = String(loja);
  return (payload: Record<string, string>) =>
    (payload[INVENTARIO_COL_EMPRESA] ?? "").trim() === alvo;
}

export function extrairSeqprodutosGrupo1(linhas: { seqproduto: string | null }[]): Set<string> {
  const set = new Set<string>();
  for (const linha of linhas) {
    const seq = linha.seqproduto?.trim();
    if (seq) set.add(seq);
  }
  return set;
}
