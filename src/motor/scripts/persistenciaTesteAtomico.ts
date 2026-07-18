/**
 * Testes remotos Fase 3B.2 — RPC atomica persistir_lote_motor_v1
 * regional TESTE, data 2099-01-15
 */
import "dotenv/config";
import {
  contarCdsAtivosPorExecucao,
  contarResiduosRegional,
  createMotorV7Db,
  isMotorV7DbConfigurado,
  montarPayloadRpc,
  persistirLoteMotorAtomico,
  rollbackExecucaoPorId,
} from "../persistencia/index.ts";
import {
  cloneLote,
  loteCdPosicao12,
  lotePersistenciaTesteControlado,
  lotePosicaoDuplicada,
  loteProduto1Cd,
  loteProduto8Cds,
  loteProdutoDuplicado,
  loteQualidadeInvalida,
  loteQuantidadeCdsDivergente,
  PERSISTENCIA_TESTE_DATA,
  PERSISTENCIA_TESTE_REGIONAL,
} from "../tests/fixtures/persistenciaFixtures.ts";

async function rpcRaw(
  db: ReturnType<typeof createMotorV7Db>,
  payload: ReturnType<typeof montarPayloadRpc>,
): Promise<unknown> {
  const { data, error } = await db.rpc("persistir_lote_motor_v1", {
    p_regional: payload.regional,
    p_data_referencia: payload.data_referencia,
    p_hash_pacote: payload.hash_pacote,
    p_versao: payload.versao,
    p_quantidade_arquivos: payload.quantidade_arquivos,
    p_produtos: payload.produtos,
    p_cds: payload.cds,
    p_ativar: payload.ativar,
  });
  if (error) throw error;
  return data;
}

async function assertResiduosZero(): Promise<void> {
  const db = createMotorV7Db();
  const r = await contarResiduosRegional(db, PERSISTENCIA_TESTE_REGIONAL, PERSISTENCIA_TESTE_DATA);
  if (r.execucoes + r.produtos + r.cds !== 0) {
    throw new Error(`Residuos TESTE: ${JSON.stringify(r)}`);
  }
}

async function main(): Promise<void> {
  if (!isMotorV7DbConfigurado()) {
    console.error("Supabase nao configurado");
    process.exit(1);
  }

  const db = createMotorV7Db();
  const ts = Date.now();

  console.log("=== 1. lote 1 produto 1 CD ===");
  const h1 = `rpc-teste-1cd-${ts}`;
  const r1 = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: h1,
    versao: 1,
    lote: loteProduto1Cd(),
  });
  console.log(r1.status, r1.produtosInseridos, r1.cdsInseridos);
  await rollbackExecucaoPorId(db, r1.execucaoId);

  console.log("=== 2. lote 3 produtos 14 CDs ===");
  const h2 = `rpc-teste-14cds-${ts}`;
  const r2 = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: h2,
    versao: 1,
    lote: lotePersistenciaTesteControlado(),
  });
  const execV1 = r2.execucaoId;
  await rollbackExecucaoPorId(db, execV1);

  console.log("=== 3. produto 8 CDs ===");
  const h3 = `rpc-teste-8cds-${ts}`;
  const r3 = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: h3,
    versao: 1,
    lote: loteProduto8Cds(),
  });
  await rollbackExecucaoPorId(db, r3.execucaoId);

  console.log("=== 4. posicao CD12 ===");
  await assertResiduosZero();
  const h4 = `rpc-teste-cd12-${ts}`;
  const r4 = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: h4,
    versao: 1,
    lote: loteCdPosicao12(),
  });
  await rollbackExecucaoPorId(db, r4.execucaoId);
  await assertResiduosZero();

  console.log("=== 5-9. erros de validacao ===");
  const casosErro: Array<{ nome: string; fn: () => ReturnType<typeof montarPayloadRpc> }> = [
    {
      nome: "quantidade_cds divergente",
      fn: () =>
        montarPayloadRpc({
          regional: PERSISTENCIA_TESTE_REGIONAL,
          dataReferencia: PERSISTENCIA_TESTE_DATA,
          hashPacote: `err-qtd-${ts}`,
          versao: 1,
          lote: loteQuantidadeCdsDivergente(),
        }),
    },
    {
      nome: "CD sem pai",
      fn: () => {
        const lote = loteProduto1Cd();
        const payload = montarPayloadRpc({
          regional: PERSISTENCIA_TESTE_REGIONAL,
          dataReferencia: PERSISTENCIA_TESTE_DATA,
          hashPacote: `err-sem-pai-${ts}`,
          versao: 1,
          lote,
        });
        payload.cds[0].chave_produto = "TESTE|9901|99999";
        return payload;
      },
    },
    {
      nome: "produto duplicado",
      fn: () =>
        montarPayloadRpc({
          regional: PERSISTENCIA_TESTE_REGIONAL,
          dataReferencia: PERSISTENCIA_TESTE_DATA,
          hashPacote: `err-dup-prod-${ts}`,
          versao: 1,
          lote: loteProdutoDuplicado(),
        }),
    },
    {
      nome: "posicao duplicada",
      fn: () =>
        montarPayloadRpc({
          regional: PERSISTENCIA_TESTE_REGIONAL,
          dataReferencia: PERSISTENCIA_TESTE_DATA,
          hashPacote: `err-dup-pos-${ts}`,
          versao: 1,
          lote: lotePosicaoDuplicada(),
        }),
    },
    {
      nome: "qualidade invalida",
      fn: () =>
        montarPayloadRpc({
          regional: PERSISTENCIA_TESTE_REGIONAL,
          dataReferencia: PERSISTENCIA_TESTE_DATA,
          hashPacote: `err-qual-${ts}`,
          versao: 1,
          lote: loteQualidadeInvalida(),
        }),
    },
  ];

  for (const caso of casosErro) {
    try {
      await rpcRaw(db, caso.fn());
      throw new Error(`Esperado erro: ${caso.nome}`);
    } catch (e) {
      console.log(`  OK erro: ${caso.nome}`);
    }
    await assertResiduosZero();
  }

  console.log("=== 10. mesmo hash duplicada ===");
  const hDup = `rpc-dup-${ts}`;
  const loteDup = loteProduto1Cd();
  const a = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: hDup,
    versao: 1,
    lote: loteDup,
  });
  const b = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: hDup,
    versao: 2,
    lote: loteDup,
  });
  if (b.status !== "ignorada_duplicada") throw new Error("Esperado ignorada_duplicada");
  await rollbackExecucaoPorId(db, a.execucaoId);

  console.log("=== 11-18. v1/v2 ativacao ===");
  const hV1 = `rpc-v1-${ts}`;
  const hV2 = `rpc-v2-${ts}`;
  const loteV = lotePersistenciaTesteControlado();
  const v1 = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: hV1,
    versao: 1,
    lote: cloneLote(loteV),
  });
  const v2 = await persistirLoteMotorAtomico(db, {
    regional: PERSISTENCIA_TESTE_REGIONAL,
    dataReferencia: PERSISTENCIA_TESTE_DATA,
    hashPacote: hV2,
    versao: 2,
    lote: cloneLote(loteV),
  });
  const cdsV1 = await contarCdsAtivosPorExecucao(db, v1.execucaoId);
  const cdsV2 = await contarCdsAtivosPorExecucao(db, v2.execucaoId);
  console.log(`  v1 CDs ativos: ${cdsV1}, v2 CDs ativos: ${cdsV2}`);
  if (cdsV1 !== 0) throw new Error("v1 filha deveria estar inativa");
  if (cdsV2 !== 14) throw new Error("v2 deveria ter 14 CDs ativos");

  console.log("=== 19. rollback ===");
  await rollbackExecucaoPorId(db, v1.execucaoId);
  await rollbackExecucaoPorId(db, v2.execucaoId);
  await assertResiduosZero();

  console.log("=== TESTE RPC ATOMICA OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
