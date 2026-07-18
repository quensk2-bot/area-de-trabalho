import { chaveDmTexto } from "../datamart/dmMapping.ts";
import type { DmProdutoLojaCd } from "../datamart/dmTypes.ts";
import { mapearDmProdutoLojaCdParaRow } from "./persistenciaMapper.ts";
import type { MotorV7Db } from "./persistenciaTypes.ts";

export async function inserirProdutosLojaCd(
  db: MotorV7Db,
  cds: readonly DmProdutoLojaCd[],
  execucaoMotorId: string,
  produtoIds: Map<string, string>,
  versao: number,
): Promise<number> {
  const rows = cds.map((cd) => {
    const chave = chaveDmTexto(cd);
    const produtoLojaId = produtoIds.get(chave);
    if (!produtoLojaId) {
      throw new Error(`produto_loja_id ausente para CD: ${chave}|${cd.posicaoLogica}`);
    }
    return mapearDmProdutoLojaCdParaRow(cd, execucaoMotorId, produtoLojaId, versao, false);
  });

  const { error } = await db.from("dm_produto_loja_cd").insert(rows);
  if (error) throw new Error(`Falha ao inserir dm_produto_loja_cd: ${error.message}`);
  return rows.length;
}

export async function contarCdsPorExecucao(db: MotorV7Db, execucaoMotorId: string): Promise<number> {
  const { count, error } = await db
    .from("dm_produto_loja_cd")
    .select("*", { count: "exact", head: true })
    .eq("execucao_motor_id", execucaoMotorId);

  if (error) throw new Error(`Falha ao contar CDs: ${error.message}`);
  return count ?? 0;
}

export async function contarCdsAtivosPorExecucao(db: MotorV7Db, execucaoMotorId: string): Promise<number> {
  const { count, error } = await db
    .from("dm_produto_loja_cd")
    .select("*", { count: "exact", head: true })
    .eq("execucao_motor_id", execucaoMotorId)
    .eq("versao_ativa", true);

  if (error) throw new Error(`Falha ao contar CDs ativos: ${error.message}`);
  return count ?? 0;
}
