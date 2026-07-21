import fs from "node:fs";
import path from "node:path";
import { executarPipelineDm } from "../datamart/dmPipeline.ts";
import { createInfraV7Db } from "../drive/worker/workerPackageLoader.ts";
import type { WorkerArquivoDb } from "../drive/worker/workerTypes.ts";
import { diretorioPacoteWorker } from "../drive/worker/workerPaths.ts";
import {
  gerarBaseRupturaCsv,
  gerarBaseRupturaXlsx,
  mapearBaseRuptura,
  montarErrosValidacaoExport,
  nomeArquivoBaseRuptura,
  validarBaseRuptura,
  type ErroValidacaoExport,
} from "../export/baseRuptura/index.ts";
import { createMotorV7Db, isMotorV7DbConfigurado, persistirLoteMotorChunked } from "../persistencia/index.ts";
import {
  assertPacoteSourcesExist,
  resolvePacoteFilePaths,
} from "./pacoteFilePaths.ts";
import {
  atualizarSolicitacaoMotor,
  atualizarStatusPacoteMotor,
  buscarPacoteMotor,
} from "./motorPacoteDb.ts";
import { executarMotorRegional } from "./motorRegionalRunner.ts";
import type { MotorPacoteStatusProcessamento } from "./motorPacoteStatus.ts";
import { registrarHeartbeat } from "./motorPacoteHeartbeat.ts";

export type MotorPacoteProcessConfig = {
  pacoteId: string;
  workerId: string;
  solicitacaoId?: string;
  keepFiles?: boolean;
  tamanhoChunk?: number;
  dryRunMotor?: boolean;
};

export type MotorPacoteProcessResultado = {
  ok: boolean;
  pacoteId: string;
  statusFinal: MotorPacoteStatusProcessamento;
  execucaoMotorId?: string;
  versao?: number;
  produtos?: number;
  cds?: number;
  caminhoXlsx?: string;
  caminhoCsv?: string;
  camposAusentes?: string[];
  duracaoMs: number;
  message?: string;
  memoria?: Record<string, unknown>;
};

function inferirBandeira(consolidado: { bandeira: string | null }[]): string | null {
  for (const item of consolidado) {
    if (item.bandeira) return item.bandeira;
  }
  return null;
}

export async function executarProcessamentoPacoteMotor(
  config: MotorPacoteProcessConfig,
): Promise<MotorPacoteProcessResultado> {
  const inicioMs = Date.now();
  const infraDb = createInfraV7Db({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });

  if (!isMotorV7DbConfigurado()) {
    throw new Error("Supabase motor_v7 não configurado");
  }

  const pacote = await buscarPacoteMotor(infraDb, config.pacoteId);
  const statusAtual = String(pacote.status ?? "");
  if (statusAtual !== "pronto_motor" && statusAtual !== "falhou") {
    return {
      ok: false,
      pacoteId: config.pacoteId,
      statusFinal: "falhou",
      duracaoMs: Date.now() - inicioMs,
      message: `Pacote deve estar em pronto_motor ou falhou para reprocessar (atual: ${statusAtual})`,
    };
  }

  const regional = String(pacote.regional);
  const dataReferencia = String(pacote.data_referencia).slice(0, 10);
  const hashConteudoPacote = (pacote.hash_conteudo_pacote as string | null) ?? null;
  const hashMetadados = (pacote.hash_metadados_pacote as string | null) ?? null;
  const competencia = String(pacote.competencia ?? "").slice(0, 10);
  const inicioIso = new Date().toISOString();

  const { data: arquivosDb, error: arqErr } = await infraDb
    .from("pacote_motor_drive_arquivo")
    .select("*")
    .eq("pacote_id", config.pacoteId)
    .eq("status", "reconhecido")
    .order("ordem_processamento", { ascending: true });
  if (arqErr) throw new Error(arqErr.message);

  const arquivos = (arquivosDb ?? []) as WorkerArquivoDb[];
  const paths = resolvePacoteFilePaths(config.pacoteId, arquivos);
  assertPacoteSourcesExist(paths);

  let statusCorrente = statusAtual;
  const errosExport: ErroValidacaoExport[] = [];

  const transitar = async (proximo: MotorPacoteStatusProcessamento) => {
    console.log(`[motor:pacote] ${config.pacoteId.slice(0, 8)}… → ${proximo}`);
    registrarHeartbeat({
      pacoteId: config.pacoteId,
      fase: proximo,
      decorridoMs: Date.now() - inicioMs,
    });
    await atualizarStatusPacoteMotor(infraDb, {
      pacoteId: config.pacoteId,
      status: proximo,
      statusAtual: statusCorrente,
    });
    statusCorrente = proximo;
  };

  try {
    if (config.solicitacaoId) {
      await atualizarSolicitacaoMotor(infraDb, config.solicitacaoId, {
        status: "em_execucao",
        workerId: config.workerId,
      });
    }

    await transitar("processando_parser");

    const motor = await executarMotorRegional({
      regional,
      dataReferencia,
      paths,
      callbacks: {
        onEtapa: async (etapa) => {
          if (etapa === "processando_transformacao") await transitar("processando_transformacao");
          if (etapa === "processando_bre") await transitar("processando_bre");
          if (etapa === "processando_consolidacao") await transitar("processando_consolidacao");
        },
      },
    });

    if (!motor.aprovado) {
      throw new Error(motor.bloqueioMotivo ?? "Motor regional reprovado");
    }

    console.log(
      `[motor:pacote] Motor OK — ${motor.consolidado.itens.length} linhas, ${motor.metricas.lojasUnicas} lojas (${motor.metricas.duracaoTotalMs}ms)`,
    );
    registrarHeartbeat({
      pacoteId: config.pacoteId,
      fase: "motor_regional_concluido",
      decorridoMs: Date.now() - inicioMs,
      produtosProcessados: motor.consolidado.itens.length,
      mensagem: `lojas=${motor.metricas.lojasUnicas}`,
    });

    await transitar("gerando_datamart");
    const dm = executarPipelineDm({
      consolidado: motor.consolidado.itens,
      incluirExportacao: false,
      incluirDiagnostico: false,
      incluirValidacaoCompleta: false,
      onProgresso: (fase, extra) => {
        registrarHeartbeat({
          pacoteId: config.pacoteId,
          fase: `gerando_datamart:${fase}`,
          decorridoMs: Date.now() - inicioMs,
          produtosProcessados: typeof extra?.produtos === "number" ? extra.produtos : undefined,
          cdsProcessados: typeof extra?.cds === "number" ? extra.cds : undefined,
          mensagem: extra ? JSON.stringify(extra) : fase,
        });
      },
    });
    if (!dm.validacao.valido) {
      for (const item of dm.validacao.itens.slice(0, 50)) {
        errosExport.push(
          ...montarErrosValidacaoExport([
            {
              etapa: "datamart",
              codigo: item.codigo,
              severidade: item.severidade,
              mensagem: item.mensagem,
              produto: item.seqproduto,
              acao: "Corrigir fonte ou catálogo",
            },
          ]),
        );
      }
      throw new Error(`Data Mart inválido: ${dm.validacao.itens[0]?.mensagem ?? "erro"}`);
    }

    console.log(`[motor:pacote] DM OK — ${dm.lote.produtos.length} produtos, ${dm.lote.cds.length} CDs (${dm.duracaoMs}ms)`);
    if (dm.timingMs) {
      console.log(`[motor:pacote] DM timing: ${JSON.stringify(dm.timingMs)}`);
    }
    registrarHeartbeat({
      pacoteId: config.pacoteId,
      fase: "datamart_concluido",
      decorridoMs: Date.now() - inicioMs,
      produtosProcessados: dm.lote.produtos.length,
      cdsProcessados: dm.lote.cds.length,
      mensagem: dm.timingMs ? JSON.stringify(dm.timingMs) : undefined,
    });

    if (config.dryRunMotor) {
      return {
        ok: true,
        pacoteId: config.pacoteId,
        statusFinal: statusCorrente,
        produtos: dm.lote.produtos.length,
        cds: dm.lote.cds.length,
        duracaoMs: Date.now() - inicioMs,
        message: "Dry-run: Motor + DM OK, persistência não executada",
        memoria: motor.metricas.memoria as unknown as Record<string, unknown>,
      };
    }

    await transitar("persistindo");

    const hashPacote = hashConteudoPacote ?? (() => {
      throw new Error("hash_conteudo_pacote obrigatório para persistência em volume");
    })();

    const motorDb = createMotorV7Db();
    const persist = await persistirLoteMotorChunked(
      motorDb,
      {
        lote: dm.lote,
        regional,
        dataReferencia,
        hashPacote,
        tamanhoChunk: config.tamanhoChunk ?? 250,
        quantidadeArquivos: arquivos.length,
      },
      {
        callbackProgresso: (p) => {
          registrarHeartbeat({
            pacoteId: config.pacoteId,
            fase: p.etapa ?? "persistindo",
            decorridoMs: Date.now() - inicioMs,
            produtosProcessados: p.produtosProcessados,
            cdsProcessados: p.cdsProcessados,
            chunkAtual: p.chunkAtual,
            totalChunks: p.totalChunks,
            percentual: p.percentual,
            mensagem: p.mensagem,
          });
          if (p.etapa === "ativando_versao") void transitar("ativando");
        },
      },
    );

    if (persist.status === "bloqueada_concorrencia") {
      throw new Error(persist.mensagem ?? "Persistência bloqueada por concorrência");
    }
    if (persist.status !== "persistida" && persist.status !== "ignorada_duplicada") {
      throw new Error(`Persistência falhou: ${persist.status}`);
    }

    const execucaoMotorId = persist.execucaoId ?? null;
    const versao = persist.versao;

    await atualizarStatusPacoteMotor(infraDb, {
      pacoteId: config.pacoteId,
      status: "gerando_planilha",
      statusAtual: statusCorrente,
      execucaoMotorId,
    });
    statusCorrente = "gerando_planilha";

    const bandeira = inferirBandeira(motor.consolidado.itens);
    const { linhas, camposAusentes } = mapearBaseRuptura(motor.consolidado.itens);
    const valBase = validarBaseRuptura(linhas);
    if (!valBase.valido) throw new Error(valBase.erros.join("; "));

    const outputDir = path.join(diretorioPacoteWorker(config.pacoteId), "exportados");
    const nomeXlsx = nomeArquivoBaseRuptura({ regional, bandeira, dataReferencia, extensao: "xlsx" });
    const nomeCsv = nomeArquivoBaseRuptura({ regional, bandeira, dataReferencia, extensao: "csv" });
    const fimIso = new Date().toISOString();

    const xlsx = gerarBaseRupturaXlsx({
      outputDir,
      filename: nomeXlsx,
      linhas,
      resumo: {
        regional,
        bandeira: bandeira ?? "—",
        competencia,
        dataReferencia,
        pacoteId: config.pacoteId,
        execucaoMotorId,
        versao: versao ?? null,
        hashMetadados,
        hashConteudo: hashConteudoPacote,
        arquivosEncontrados: arquivos.length,
        produtosProcessados: dm.lote.produtos.length,
        cdsProcessados: dm.lote.cds.length,
        quantidadeLinhasBase: linhas.length,
        inicio: inicioIso,
        fim: fimIso,
        duracaoMs: Date.now() - inicioMs,
        status: "concluido",
        avisos: camposAusentes.length ? [`${camposAusentes.length} colunas ausentes no V7`] : [],
        erros: [],
        camposAusentes,
      },
      errosValidacao: errosExport.length ? errosExport : undefined,
    });

    const csv = gerarBaseRupturaCsv({ outputDir, filename: nomeCsv, linhas });

    const reportJson = path.join(outputDir, `relatorio_processamento_${config.pacoteId}.json`);
    fs.writeFileSync(
      reportJson,
      JSON.stringify(
        {
          pacoteId: config.pacoteId,
          execucaoMotorId,
          versao,
          xlsx: xlsx.caminho,
          csv,
          camposAusentes,
          metricas: motor.metricas,
          persist,
        },
        null,
        2,
      ),
      "utf8",
    );

    await atualizarStatusPacoteMotor(infraDb, {
      pacoteId: config.pacoteId,
      status: "concluido",
      statusAtual: statusCorrente,
      execucaoMotorId,
      metricas: {
        produtos: dm.lote.produtos.length,
        cds: dm.lote.cds.length,
        versao,
        caminhoXlsx: xlsx.caminho,
        caminhoCsv: csv,
        camposAusentes,
        duracaoMs: Date.now() - inicioMs,
        memoria: motor.metricas.memoria,
      },
    });

    if (config.solicitacaoId) {
      await atualizarSolicitacaoMotor(infraDb, config.solicitacaoId, {
        status: "concluida",
        metricas: {
          execucaoMotorId,
          versao,
          produtos: dm.lote.produtos.length,
          cds: dm.lote.cds.length,
        },
      });
    }

    return {
      ok: true,
      pacoteId: config.pacoteId,
      statusFinal: "concluido",
      execucaoMotorId: execucaoMotorId ?? undefined,
      versao,
      produtos: dm.lote.produtos.length,
      cds: dm.lote.cds.length,
      caminhoXlsx: xlsx.caminho,
      caminhoCsv: csv,
      camposAusentes,
      duracaoMs: Date.now() - inicioMs,
      memoria: motor.metricas.memoria as unknown as Record<string, unknown>,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await atualizarStatusPacoteMotor(infraDb, {
      pacoteId: config.pacoteId,
      status: "falhou",
      statusAtual: statusCorrente,
      erroResumo: msg.slice(0, 500),
    }).catch(() => undefined);

    if (config.solicitacaoId) {
      await atualizarSolicitacaoMotor(infraDb, config.solicitacaoId, {
        status: "falhou",
        erroResumo: msg.slice(0, 500),
      }).catch(() => undefined);
    }

    return {
      ok: false,
      pacoteId: config.pacoteId,
      statusFinal: "falhou",
      duracaoMs: Date.now() - inicioMs,
      message: msg,
    };
  }
}
