/**
 * Teste remoto Fase 3C — chunks TESTE/2099-01-16 (1201 produtos)
 */
import "dotenv/config";
import {
  contarResiduosRegional,
  createMotorV7Db,
  isMotorV7DbConfigurado,
  persistirLoteMotorChunked,
  planejarChunks,
  rollbackExecucaoPorId,
  rpcCancelarExecucaoChunk,
  rpcPersistirChunk,
  rpcIniciarExecucaoChunk,
  rpcFinalizarExecucaoChunk,
  listarChunksConcluidos,
} from "../persistencia/index.ts";
import {
  CHUNK_TESTE_DATA,
  CHUNK_TESTE_REGIONAL,
  loteChunkTeste1201,
  totalCdsLote,
} from "../tests/fixtures/persistenciaChunksFixtures.ts";
import { hashPacoteLote, mapearChunkParaRpc } from "../persistencia/chunks/chunkHasher.ts";

async function limparRegionalTeste(): Promise<void> {
  const db = createMotorV7Db();
  const { data, error } = await db
    .from("execucao_motor")
    .select("id")
    .eq("regional", CHUNK_TESTE_REGIONAL)
    .eq("data_referencia", CHUNK_TESTE_DATA);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    await rollbackExecucaoPorId(db, String(row.id));
  }
}

async function assertZero(): Promise<void> {
  const db = createMotorV7Db();
  const r = await contarResiduosRegional(db, CHUNK_TESTE_REGIONAL, CHUNK_TESTE_DATA);
  if (r.execucoes + r.produtos + r.cds !== 0) throw new Error(`Residuos: ${JSON.stringify(r)}`);
}

async function main(): Promise<void> {
  if (!isMotorV7DbConfigurado()) {
    console.error("Supabase nao configurado");
    process.exit(1);
  }

  const db = createMotorV7Db();
  const lote = loteChunkTeste1201();
  const chunks = planejarChunks(lote, { tamanhoChunk: 500 });
  const rpcFull = mapearChunkParaRpc(lote.produtos, lote.cds);
  const hash = hashPacoteLote(rpcFull.produtos, rpcFull.cds);
  const ts = Date.now();

  console.log(`Produtos=${lote.produtos.length} CDs=${totalCdsLote(lote)} Chunks=${chunks.length}`);

  await limparRegionalTeste();
  await assertZero();

  const iniciar = await rpcIniciarExecucaoChunk(db, {
    regional: CHUNK_TESTE_REGIONAL,
    dataReferencia: CHUNK_TESTE_DATA,
    hashPacote: `${hash}-${ts}`,
    quantidadeProdutosEsperada: lote.produtos.length,
    quantidadeCdsEsperada: lote.cds.length,
    totalChunks: chunks.length,
  });
  const execId = String(iniciar.execucao_id);
  console.log("Iniciada", execId);

  await rpcPersistirChunk(db, execId, chunks[0]);
  await rpcPersistirChunk(db, execId, chunks[1]);
  console.log("Chunks 1-2 OK");

  try {
    const bad = { ...chunks[2], produtos: [...chunks[2].produtos, chunks[2].produtos[0]] };
    await rpcPersistirChunk(db, execId, bad);
    throw new Error("Esperado erro chunk 3");
  } catch {
    console.log("Falha chunk 3 OK — versao anterior permanece ativa");
  }

  const concluidos = await listarChunksConcluidos(db, execId);
  console.log("Concluidos apos falha:", concluidos);

  await rpcPersistirChunk(db, execId, chunks[2]);
  console.log("Chunk 3 retomado OK");

  const fin = await rpcFinalizarExecucaoChunk(db, execId);
  console.log("Finalizada", fin);
  if (!fin.ativada) throw new Error("Esperado versao ativa apos finalizar");

  const cancelarIncompleta = await rpcIniciarExecucaoChunk(db, {
    regional: CHUNK_TESTE_REGIONAL,
    dataReferencia: CHUNK_TESTE_DATA,
    hashPacote: `${hash}-cancel-${ts}`,
    quantidadeProdutosEsperada: chunks[0].produtos.length,
    quantidadeCdsEsperada: chunks[0].cds.length,
    totalChunks: 1,
  });
  const execCancelId = String(cancelarIncompleta.execucao_id);
  await rpcPersistirChunk(db, execCancelId, chunks[0]);
  const cancel = await rpcCancelarExecucaoChunk(db, execCancelId, "limpeza teste chunks incompleta");
  console.log("Cancelamento RPC OK", cancel);

  await rollbackExecucaoPorId(db, execId);
  await assertZero();
  console.log("=== TESTE CHUNKS OK ===");
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
