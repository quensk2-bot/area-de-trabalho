import type { MotorV7Db } from "./persistenciaTypes.ts";

/**
 * Rollback por execucao_motor_id via DELETE CASCADE.
 * Exclusivo service_role — nunca expor ao frontend.
 */
export async function rollbackExecucaoPorId(db: MotorV7Db, execucaoMotorId: string): Promise<void> {
  const { error } = await db.from("execucao_motor").delete().eq("id", execucaoMotorId);
  if (error) throw new Error(`Falha no rollback execucao ${execucaoMotorId}: ${error.message}`);
}

export async function contarResiduosRegional(
  db: MotorV7Db,
  regional: string,
  dataReferencia: string,
): Promise<{ execucoes: number; produtos: number; cds: number }> {
  const [exec, prod, cd] = await Promise.all([
    db
      .from("execucao_motor")
      .select("*", { count: "exact", head: true })
      .eq("regional", regional)
      .eq("data_referencia", dataReferencia),
    db
      .from("dm_produto_loja")
      .select("*", { count: "exact", head: true })
      .eq("regional", regional)
      .eq("data_referencia", dataReferencia),
    db
      .from("dm_produto_loja_cd")
      .select("*", { count: "exact", head: true })
      .eq("regional", regional)
      .eq("data_referencia", dataReferencia),
  ]);

  if (exec.error) throw new Error(exec.error.message);
  if (prod.error) throw new Error(prod.error.message);
  if (cd.error) throw new Error(cd.error.message);

  return {
    execucoes: exec.count ?? 0,
    produtos: prod.count ?? 0,
    cds: cd.count ?? 0,
  };
}
