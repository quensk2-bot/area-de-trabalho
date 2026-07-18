/**
 * Carga piloto MT loja 73 — persistencia em chunks
 * Fonte: Motor congelado (executarPiloto) → Data Mart → chunks
 */
import "dotenv/config";
import { executarPipelineDm } from "../datamart/dmPipeline.ts";
import { executarPiloto } from "../pilot/index.ts";
import {
  createMotorV7Db,
  isMotorV7DbConfigurado,
  persistirLoteMotorChunked,
  planejarChunks,
  rpcCancelarExecucaoChunk,
} from "../persistencia/index.ts";
import { hashPacoteLote, mapearChunkParaRpc } from "../persistencia/chunks/chunkHasher.ts";
import { assertPilotSourcesExist, resolvePilotFilePaths } from "../pilot/pilotFilePaths.ts";

const REGIONAL = "MT";
const LOJA = 73;
const DATA = "2026-03-26";

async function main(): Promise<void> {
  if (!isMotorV7DbConfigurado()) {
    console.error("Supabase nao configurado");
    process.exit(1);
  }

  const paths = resolvePilotFilePaths(REGIONAL, DATA);
  assertPilotSourcesExist(paths);

  console.log("=== Gates pre-carga ===");
  console.log(`Regional=${REGIONAL} Loja=${LOJA} Data=${DATA}`);

  const piloto = await executarPiloto({
    regional: REGIONAL,
    loja: LOJA,
    dataReferencia: DATA,
    modoCompleto: true,
  });

  const consolidado = piloto.consolidado.itens;
  console.log(`Produtos consolidados: ${consolidado.length}`);

  const dm = executarPipelineDm({ consolidado });
  if (!dm.validacao.valido) {
    console.error("Data Mart invalido:", dm.validacao.itens.slice(0, 5));
    process.exit(1);
  }

  const invalidos = dm.lote.produtos.filter((p) => p.qualidadeDados === "invalido").length;
  if (invalidos > 0) {
    console.error(`Qualidade invalida: ${invalidos} produtos`);
    process.exit(1);
  }

  const chunks = planejarChunks(dm.lote, { tamanhoChunk: 500 });
  const rpcFull = mapearChunkParaRpc(dm.lote.produtos, dm.lote.cds);
  const hashPacote = hashPacoteLote(rpcFull.produtos, rpcFull.cds);

  console.log(`CDs filhos: ${dm.lote.cds.length}`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(`Hash pacote: ${hashPacote.slice(0, 16)}...`);
  console.log("Rollback: cancelar_execucao_motor_v1 disponivel");

  const db = createMotorV7Db();
  const resultado = await persistirLoteMotorChunked(db, {
    lote: dm.lote,
    regional: REGIONAL,
    dataReferencia: DATA,
    hashPacote,
    tamanhoChunk: 500,
    quantidadeArquivos: 6,
  }, {
    callbackProgresso: (p) => {
      if (p.chunkAtual) {
        console.log(`[${p.percentual}%] chunk ${p.chunkAtual}/${p.totalChunks} — ${p.mensagem}`);
      }
    },
  });

  console.log(JSON.stringify(resultado, null, 2));

  if (resultado.status !== "persistida") {
    if (resultado.status === "ignorada_duplicada") {
      console.log("Carga ja existente — ignorada");
      process.exit(0);
    }
    process.exit(1);
  }

  console.log("=== CARGA PILOTO MT LOJA 73 CONCLUIDA ===");
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
