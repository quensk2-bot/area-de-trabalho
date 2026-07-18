/**
 * @testonly INSERT direto — NAO usar em producao.
 * Mantido para scripts de teste isolados da Fase 3B.1.
 */
import type { MotorV7Db, PersistenciaEntrada, PersistenciaResultado } from "./persistenciaTypes.ts";
import { criarMetricasPersistencia, validarContagensPersistencia } from "./persistenciaMetrics.ts";
import { rollbackExecucaoPorId } from "./persistenciaRollback.ts";
import { validarEntradaPersistencia } from "./persistenciaValidator.ts";
import {
  ativarExecucao,
  buscarExecucaoEmAndamento,
  buscarExecucaoPorHash,
  contarVersoesAtivas,
  criarExecucaoMotor,
  atualizarExecucaoMotorStatus,
  obterProximaVersao,
} from "./persistirExecucaoMotor.ts";
import { contarCdsPorExecucao, inserirProdutosLojaCd } from "./persistirProdutoLojaCd.ts";
import {
  contarProdutosPorExecucao,
  indexarProdutosInseridos,
  inserirProdutosLoja,
} from "./persistirProdutoLoja.ts";

export const PERSISTENCIA_DIRECT_INSERT_TEST_ONLY = true as const;

export type PersistirLoteDirectInsertOptions = {
  ativar?: boolean;
  versao?: number;
};

/** @deprecated Use persistirLoteMotorAtomico em producao. */
export async function persistirLoteMotorDirectInsert_TEST_ONLY(
  db: MotorV7Db,
  entrada: PersistenciaEntrada,
  options: PersistirLoteDirectInsertOptions = {},
): Promise<PersistenciaResultado> {
  const inicioMs = Date.now();
  const validacao = validarEntradaPersistencia(entrada);
  if (!validacao.valido) {
    throw new Error(
      `Lote invalido antes da escrita: ${validacao.erros.map((e) => e.codigo).join(", ")}`,
    );
  }

  const { regional, dataReferencia, hashPacote, lote } = entrada;
  const quantidadeProdutos = lote.produtos.length;
  const quantidadeCds = lote.cds.length;

  const existente = await buscarExecucaoPorHash(db, regional, dataReferencia, hashPacote);
  if (existente?.status === "concluida") {
    return {
      status: "ignorada_duplicada",
      execucaoMotorId: existente.id,
      versao: existente.versao,
      hashPacote,
    };
  }

  const emAndamento = await buscarExecucaoEmAndamento(db, regional, dataReferencia);
  if (emAndamento && emAndamento.hash_pacote !== hashPacote) {
    return {
      status: "bloqueada_concorrencia",
      mensagem: `Execucao ${emAndamento.id} em status ${emAndamento.status}`,
    };
  }

  const versao = options.versao ?? entrada.versao ?? (await obterProximaVersao(db, regional, dataReferencia));

  let execucaoId: string | null = null;

  try {
    const execucao = await criarExecucaoMotor(db, {
      regional,
      dataReferencia,
      versao,
      hashPacote,
      quantidadeArquivos: entrada.quantidadeArquivos ?? 0,
      quantidadeRegistros: quantidadeProdutos,
      quantidadeErros: 0,
      status: "processando",
    });
    execucaoId = execucao.id;

    const inseridos = await inserirProdutosLoja(db, lote.produtos, execucaoId, versao);
    const produtoIds = indexarProdutosInseridos(inseridos);

    await inserirProdutosLojaCd(db, lote.cds, execucaoId, produtoIds, versao);

    const obtidoProdutos = await contarProdutosPorExecucao(db, execucaoId);
    const obtidoCds = await contarCdsPorExecucao(db, execucaoId);
    validarContagensPersistencia(quantidadeProdutos, quantidadeCds, obtidoProdutos, obtidoCds);

    await atualizarExecucaoMotorStatus(db, execucaoId, "concluida", {
      finalizado_em: new Date().toISOString(),
      duracao_ms: entrada.duracaoMs ?? Date.now() - inicioMs,
    });

    if (options.ativar !== false) {
      await ativarExecucao(db, execucaoId);
      const ativas = await contarVersoesAtivas(db, regional, dataReferencia);
      if (ativas !== 1) {
        throw new Error(`Esperada 1 versao ativa, encontradas ${ativas}`);
      }
    }

    criarMetricasPersistencia(quantidadeProdutos, quantidadeCds, inicioMs);

    return {
      status: "persistida",
      execucaoMotorId: execucaoId,
      versao,
      quantidadeProdutos,
      quantidadeCds,
    };
  } catch (erro) {
    if (execucaoId) {
      await rollbackExecucaoPorId(db, execucaoId);
    }
    throw erro;
  }
}
