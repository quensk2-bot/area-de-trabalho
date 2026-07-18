/**
 * Teste controlado Fase 3B.1 — regional TESTE, data 2099-01-15.
 * Requer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no ambiente.
 *
 * Uso: npx tsx src/motor/scripts/persistenciaTesteControlado.ts
 */
import "dotenv/config";
import {
  contarCdsAtivosPorExecucao,
  contarResiduosRegional,
  contarVersoesAtivas,
  createMotorV7Db,
  isMotorV7DbConfigurado,
  persistirLoteMotor,
  rollbackExecucaoPorId,
} from "../persistencia/index.ts";
import {
  lotePersistenciaTesteControlado,
  PERSISTENCIA_TESTE_DATA,
  PERSISTENCIA_TESTE_REGIONAL,
} from "../tests/fixtures/persistenciaFixtures.ts";

async function main(): Promise<void> {
  if (!isMotorV7DbConfigurado()) {
    console.error("Ambiente Supabase nao configurado — abortando teste remoto.");
    process.exit(1);
  }

  const db = createMotorV7Db();
  const lote = lotePersistenciaTesteControlado();
  const hashV1 = "teste-controlado-v1-" + Date.now();
  const hashV2 = "teste-controlado-v2-" + Date.now();

  console.log("=== Persistencia TESTE v1 ===");
  const r1 = await persistirLoteMotor(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: hashV1,
    versao: 1,
    lote,
  });
  console.log(JSON.stringify(r1, null, 2));
  assertPersistida(r1, 1);

  const execV1 = r1.execucaoMotorId;
  const ativosV1 = await contarCdsAtivosPorExecucao(db, execV1);
  console.log(`CDs ativos v1: ${ativosV1}`);
  if (ativosV1 !== 14) throw new Error(`Esperado 14 CDs ativos v1, obtido ${ativosV1}`);

  console.log("=== Persistencia TESTE v2 ===");
  const r2 = await persistirLoteMotor(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: hashV2,
    versao: 2,
    lote,
  });
  console.log(JSON.stringify(r2, null, 2));
  assertPersistida(r2, 2);

  const ativosV2 = await contarCdsAtivosPorExecucao(db, r2.execucaoMotorId);
  const ativosV1Pos = await contarCdsAtivosPorExecucao(db, execV1);
  console.log(`CDs ativos v2: ${ativosV2}, v1 inativa: ${ativosV1Pos}`);
  if (ativosV2 !== 14) throw new Error("v2 deve ter 14 CDs ativos");
  if (ativosV1Pos !== 0) throw new Error("v1 CDs devem estar inativos");

  const versoesAtivas = await contarVersoesAtivas(db, PERSISTENCIA_TESTE_REGIONAL, PERSISTENCIA_TESTE_DATA);
  if (versoesAtivas !== 1) throw new Error(`Esperada 1 execucao ativa, obtido ${versoesAtivas}`);

  console.log("=== Rollback v1 e v2 ===");
  await rollbackExecucaoPorId(db, execV1);
  await rollbackExecucaoPorId(db, r2.execucaoMotorId);

  const residuos = await contarResiduosRegional(db, PERSISTENCIA_TESTE_REGIONAL, PERSISTENCIA_TESTE_DATA);
  console.log(JSON.stringify(residuos, null, 2));
  if (residuos.execucoes + residuos.produtos + residuos.cds !== 0) {
    throw new Error("Residuos TESTE apos rollback");
  }

  console.log("=== TESTE CONTROLADO OK ===");
}

function assertPersistida(
  r: Awaited<ReturnType<typeof persistirLoteMotor>>,
  versao: number,
): asserts r is { status: "persistida"; execucaoMotorId: string; versao: number; quantidadeProdutos: number; quantidadeCds: number } {
  if (r.status !== "persistida") throw new Error(`Esperado persistida, obtido ${r.status}`);
  if (r.versao !== versao) throw new Error(`Versao esperada ${versao}, obtida ${r.versao}`);
  if (r.quantidadeProdutos !== 3 || r.quantidadeCds !== 14) {
    throw new Error(`Contagens incorretas: ${r.quantidadeProdutos}/${r.quantidadeCds}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
