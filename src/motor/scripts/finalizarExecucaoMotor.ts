import "dotenv/config";
import { createMotorV7Db } from "../persistencia/index.ts";
import { rpcFinalizarExecucaoChunk } from "../persistencia/chunks/chunkRpc.ts";

const execucaoId = process.argv[2] ?? "e6569722-0aec-4df3-aed2-f004e5a1e9b6";

async function main() {
  const db = createMotorV7Db();
  const inicio = Date.now();
  console.log(`Finalizando execucao ${execucaoId}...`);
  const result = await rpcFinalizarExecucaoChunk(db, execucaoId);
  console.log(JSON.stringify(result, null, 2));
  console.log(`Duracao: ${Date.now() - inicio}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
