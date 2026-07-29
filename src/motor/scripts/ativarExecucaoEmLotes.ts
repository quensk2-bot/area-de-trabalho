import "dotenv/config";
import { createMotorV7Db } from "../persistencia/index.ts";

const EXEC_ID = process.argv[2] ?? "e6569722-0aec-4df3-aed2-f004e5a1e9b6";
const LIMITE_PROD = Number(process.argv[3] ?? 10000);
const LIMITE_CD = Number(process.argv[4] ?? 50000);

async function rpc(db: ReturnType<typeof createMotorV7Db>, name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as Record<string, unknown>;
}

async function main() {
  const db = createMotorV7Db();
  const inicio = Date.now();
  console.log(await rpc(db, "marcar_execucao_concluida_v1", { p_execucao_motor_id: EXEC_ID }));

  let totalProd = 0;
  while (true) {
    const r = await rpc(db, "ativar_produtos_lote_v1", {
      p_execucao_motor_id: EXEC_ID,
      p_limite: LIMITE_PROD,
    });
    const n = Number(r.atualizados ?? 0);
    totalProd += n;
    console.log(`produtos lote: ${n} (total ${totalProd})`);
    if (n === 0) break;
  }

  let totalCd = 0;
  while (true) {
    const r = await rpc(db, "ativar_cds_lote_v1", {
      p_execucao_motor_id: EXEC_ID,
      p_limite: LIMITE_CD,
    });
    const n = Number(r.atualizados ?? 0);
    totalCd += n;
    console.log(`cds lote: ${n} (total ${totalCd})`);
    if (n === 0) break;
  }

  console.log(await rpc(db, "finalizar_ativacao_lote_v1", { p_execucao_motor_id: EXEC_ID }));
  console.log(`Ativacao concluida em ${Date.now() - inicio}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
