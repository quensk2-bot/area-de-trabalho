import "dotenv/config";
import { createMotorV7Db } from "../persistencia/index.ts";
import { rpcCancelarExecucaoChunk } from "../persistencia/chunks/chunkRpc.ts";

const execucaoId = process.argv[2];
const motivo = process.argv[3] ?? "cancelamento aceite MT";

async function main() {
  if (!execucaoId) {
    console.error("Uso: npx tsx src/motor/scripts/cancelarExecucaoMotor.ts <execucao_id> [motivo]");
    process.exit(1);
  }
  const db = createMotorV7Db();
  const result = await rpcCancelarExecucaoChunk(db, execucaoId, motivo);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
