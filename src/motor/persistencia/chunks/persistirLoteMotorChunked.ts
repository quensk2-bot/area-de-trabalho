import type { MotorV7Db } from "../persistenciaTypes.ts";
import { validarEntradaPersistencia } from "../persistenciaValidator.ts";
import { hashPacoteLote, mapearChunkParaRpc } from "./chunkHasher.ts";
import { calcularMetricasChunks } from "./chunkMetrics.ts";
import { planejarChunks, totalizarChunks } from "./chunkPlanner.ts";
import { atualizarProgresso, criarProgressoInicial, emitirProgresso } from "./chunkProgress.ts";
import {
  listarChunksConcluidos,
  rpcFinalizarExecucaoChunk,
  rpcIniciarExecucaoChunk,
  rpcPersistirChunk,
} from "./chunkRpc.ts";
import type {
  ChunkProgressoCallback,
  ChunkPlanejado,
  PersistirLoteChunkedEntrada,
  PersistirLoteChunkedResultado,
} from "./chunkTypes.ts";

export type PersistirLoteChunkedOpcoes = {
  callbackProgresso?: ChunkProgressoCallback;
  signal?: AbortSignal;
  simularFalhaChunk?: number;
};

function assertNaoCancelado(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Operacao cancelada");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isErroRetentavel(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /timeout|timed out|ECONNRESET|fetch failed|502|503|504/i.test(msg);
}

async function persistirChunkComRetry(
  db: MotorV7Db,
  execucaoId: string,
  chunk: ChunkPlanejado,
  maxRetries = 8,
): Promise<Record<string, unknown>> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      return await rpcPersistirChunk(db, execucaoId, chunk);
    } catch (erro) {
      ultimoErro = erro;
      if (!isErroRetentavel(erro) || tentativa >= maxRetries) throw erro;
      await sleep(5000 * tentativa);
    }
  }
  throw ultimoErro;
}

export async function persistirLoteMotorChunked(
  db: MotorV7Db,
  entrada: PersistirLoteChunkedEntrada,
  opcoes: PersistirLoteChunkedOpcoes = {},
): Promise<PersistirLoteChunkedResultado> {
  const inicioMs = Date.now();
  const validacao = validarEntradaPersistencia({
    regional: entrada.regional,
    dataReferencia: entrada.dataReferencia,
    hashPacote: entrada.hashPacote,
    versao: 1,
    lote: entrada.lote,
    quantidadeArquivos: entrada.quantidadeArquivos,
  });
  if (!validacao.valido) {
    throw new Error(`Lote invalido: ${validacao.erros.map((e) => e.codigo).join(", ")}`);
  }

  let progresso = criarProgressoInicial(entrada.lote.produtos.length, entrada.lote.cds.length);
  emitirProgresso(opcoes.callbackProgresso, progresso);

  progresso = atualizarProgresso(progresso, {
    etapa: "validando_datamart",
    mensagem: "Validando Data Mart",
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  progresso = atualizarProgresso(progresso, {
    etapa: "planejando_chunks",
    mensagem: "Planejando chunks",
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  const chunks = planejarChunks(entrada.lote, {
    tamanhoChunk: entrada.tamanhoChunk,
    limiteBytes: entrada.limiteBytesPayload,
  });
  const totais = totalizarChunks(chunks);
  let hashPacote = entrada.hashPacote;
  if (!hashPacote) {
    const rpcFull = mapearChunkParaRpc(entrada.lote.produtos, entrada.lote.cds);
    hashPacote = hashPacoteLote(rpcFull.produtos, rpcFull.cds);
  }

  progresso = atualizarProgresso(progresso, {
    etapa: "planejando_chunks",
    mensagem: `Planejando ${chunks.length} chunks`,
    totalChunks: chunks.length,
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  progresso = atualizarProgresso(progresso, {
    etapa: "iniciando_execucao",
    mensagem: "Iniciando execucao",
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  const iniciar = await rpcIniciarExecucaoChunk(db, {
    regional: entrada.regional,
    dataReferencia: entrada.dataReferencia,
    hashPacote,
    quantidadeProdutosEsperada: totais.produtos,
    quantidadeCdsEsperada: totais.cds,
    totalChunks: chunks.length,
    quantidadeArquivos: entrada.quantidadeArquivos,
  });

  const statusInicio = String(iniciar.status);
  if (statusInicio === "ignorada_duplicada") {
    return {
      status: "ignorada_duplicada",
      execucaoId: String(iniciar.execucao_id),
      versao: Number(iniciar.versao),
      totalChunks: 0,
      chunksConcluidos: 0,
      produtosInseridos: 0,
      cdsInseridos: 0,
      ativada: false,
      duplicada: true,
      cancelada: false,
      duracaoMs: Date.now() - inicioMs,
    };
  }
  if (statusInicio === "bloqueada_concorrencia") {
    return {
      status: "bloqueada_concorrencia",
      execucaoId: iniciar.execucao_id ? String(iniciar.execucao_id) : null,
      mensagem: String(iniciar.mensagem ?? "Concorrencia"),
      duplicada: false,
      cancelada: false,
      duracaoMs: Date.now() - inicioMs,
    };
  }

  const execucaoId = String(iniciar.execucao_id);
  const versao = Number(iniciar.versao);
  const concluidos = new Set(await listarChunksConcluidos(db, execucaoId));
  let produtosProcessados = 0;
  let cdsProcessados = 0;
  let retries = 0;

  for (const chunk of chunks) {
    assertNaoCancelado(opcoes.signal);

    if (concluidos.has(chunk.numeroChunk)) {
      produtosProcessados += chunk.produtos.length;
      cdsProcessados += chunk.cds.length;
      continue;
    }

    progresso = atualizarProgresso(progresso, {
      etapa: "enviando_chunk",
      mensagem: `Enviando chunk ${chunk.numeroChunk} de ${chunks.length}`,
      chunkAtual: chunk.numeroChunk,
      totalChunks: chunks.length,
      produtosProcessados,
      cdsProcessados,
      duracaoMs: Date.now() - inicioMs,
    });
    emitirProgresso(opcoes.callbackProgresso, progresso);

    if (opcoes.simularFalhaChunk === chunk.numeroChunk) {
      throw new Error(`Falha simulada no chunk ${chunk.numeroChunk}`);
    }

    try {
      await persistirChunkComRetry(db, execucaoId, chunk);
    } catch (erro) {
      retries += 1;
      throw erro;
    }

    produtosProcessados += chunk.produtos.length;
    cdsProcessados += chunk.cds.length;
    concluidos.add(chunk.numeroChunk);
  }

  progresso = atualizarProgresso(progresso, {
    etapa: "validando_contagens",
    mensagem: "Validando contagens",
    produtosProcessados,
    cdsProcessados,
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  progresso = atualizarProgresso(progresso, {
    etapa: "finalizando",
    mensagem: "Finalizando execucao",
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  const final = await rpcFinalizarExecucaoChunk(db, execucaoId);

  progresso = atualizarProgresso(progresso, {
    etapa: "ativando_versao",
    mensagem: "Ativando versao",
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  calcularMetricasChunks(chunks, Date.now() - inicioMs, retries);

  progresso = atualizarProgresso(progresso, {
    etapa: "concluido",
    mensagem: "Concluido",
    produtosProcessados: totais.produtos,
    cdsProcessados: totais.cds,
    percentual: 100,
    duracaoMs: Date.now() - inicioMs,
  });
  emitirProgresso(opcoes.callbackProgresso, progresso);

  return {
    status: "persistida",
    execucaoId,
    versao,
    totalChunks: chunks.length,
    chunksConcluidos: chunks.length,
    produtosInseridos: Number(final.produtos_inseridos ?? totais.produtos),
    cdsInseridos: Number(final.cds_inseridos ?? totais.cds),
    ativada: true,
    duplicada: false,
    cancelada: false,
    duracaoMs: Date.now() - inicioMs,
  };
}
