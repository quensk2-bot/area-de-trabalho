import { chaveDmTexto } from "../datamart/dmMapping.ts";
import type { DmProdutoLoja } from "../datamart/dmTypes.ts";
import { mapearLoteProdutosParaRows } from "./persistenciaMapper.ts";
import type { DmProdutoLojaRow, MotorV7Db } from "./persistenciaTypes.ts";

export type ProdutoLojaInserido = {
  id: string;
  loja: number;
  seqproduto: number;
  chave: string;
};

export async function inserirProdutosLoja(
  db: MotorV7Db,
  produtos: readonly DmProdutoLoja[],
  execucaoMotorId: string,
  versao: number,
): Promise<ProdutoLojaInserido[]> {
  const rows = mapearLoteProdutosParaRows(produtos, execucaoMotorId, versao, false);

  const { data, error } = await db
    .from("dm_produto_loja")
    .insert(rows)
    .select("id, loja, seqproduto");

  if (error) throw new Error(`Falha ao inserir dm_produto_loja: ${error.message}`);

  const porChave = new Map(produtos.map((p) => [chaveDmTexto(p), p]));

  return (data as Pick<DmProdutoLojaRow, "id" | "loja" | "seqproduto">[]).map((row) => {
    const produto = [...porChave.values()].find((p) => p.loja === row.loja && p.seqproduto === row.seqproduto);
    if (!produto) {
      throw new Error(`Produto inserido sem correspondencia no lote: loja=${row.loja} seq=${row.seqproduto}`);
    }
    return {
      id: row.id,
      loja: row.loja,
      seqproduto: row.seqproduto,
      chave: chaveDmTexto(produto),
    };
  });
}

export function indexarProdutosInseridos(inseridos: ProdutoLojaInserido[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of inseridos) {
    map.set(item.chave, item.id);
  }
  return map;
}

export async function contarProdutosPorExecucao(db: MotorV7Db, execucaoMotorId: string): Promise<number> {
  const { count, error } = await db
    .from("dm_produto_loja")
    .select("*", { count: "exact", head: true })
    .eq("execucao_motor_id", execucaoMotorId);

  if (error) throw new Error(`Falha ao contar produtos: ${error.message}`);
  return count ?? 0;
}
