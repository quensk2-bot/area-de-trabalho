import fs from "node:fs";
import { criarDriveClient } from "./workerDriveClient.ts";
import { workerDownloadFile } from "./workerDownloadFile.ts";
import { calcularHashConteudoPacote } from "./workerHash.ts";
import {
  buscarSolicitacaoPorPacote,
  claimSolicitacaoWorker,
  createInfraV7Db,
} from "./workerPackageLoader.ts";
import { calcularProgressoBytes, filtrarArquivosTesteParcial, isModoTesteParcial, todosArquivosValidos, validarPacoteParaProcessamento } from "./workerPackageValidator.ts";
import { validarConteudoArquivo } from "./workerContentValidator.ts";
import { padronizarArquivoWorker } from "./workerStandardize.ts";
import { atualizarStatusWorker, serializarArquivoUpdate } from "./workerStatusReporter.ts";
import { limparPacoteWorker } from "./workerCleanup.ts";
import {
  caminhoWorkerJson,
  diretorioOriginais,
  diretorioPadronizados,
  garantirDiretoriosPacote,
  resolverCaminhoSeguro,
} from "./workerPaths.ts";
import type { WorkerConfig } from "./workerConfig.ts";
import type {
  WorkerArquivoDb,
  WorkerExecucaoMetricas,
  WorkerJsonReport,
  WorkerRunResult,
} from "./workerTypes.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function montarReport(input: {
  pacoteId: string;
  solicitacaoId: string;
  workerId: string;
  regional: string;
  competencia: string;
  dataReferencia: string;
  inicio: string;
  fim: string;
  arquivos: WorkerArquivoDb[];
  hashMetadados: string | null;
  hashConteudo: string | null;
  metricas: WorkerExecucaoMetricas;
  statusFinal: string;
}): WorkerJsonReport {
  return {
    pacote_id: input.pacoteId,
    solicitacao_id: input.solicitacaoId,
    worker_id: input.workerId,
    regional: input.regional,
    competencia: input.competencia,
    data_referencia: input.dataReferencia,
    inicio: input.inicio,
    fim: input.fim,
    duracao_ms: input.metricas.duracaoMs,
    arquivos: input.arquivos.map((a) => ({
      id: a.id,
      tipo_arquivo: a.tipo_arquivo,
      nome: a.nome_original,
      sha256: a.sha256 ?? null,
      tamanho_baixado_bytes: a.tamanho_baixado_bytes ?? null,
      validacao: a.validacao_conteudo_status ?? null,
      padronizacao: a.padronizacao_status ?? null,
    })),
    hashes: { metadados: input.hashMetadados, conteudo: input.hashConteudo },
    validacoes: Object.fromEntries(
      input.arquivos.map((a) => [a.tipo_arquivo ?? a.nome_original, a.validacao_conteudo_status ?? "—"]),
    ),
    padronizacoes: Object.fromEntries(
      input.arquivos.map((a) => [a.tipo_arquivo ?? a.nome_original, a.padronizacao_status ?? "—"]),
    ),
    erros: input.metricas.erros,
    metricas: input.metricas,
    status_final: input.statusFinal,
  };
}

function sanitizarReportParaLog(report: WorkerJsonReport): WorkerJsonReport {
  return JSON.parse(JSON.stringify(report)) as WorkerJsonReport;
}

export async function executarWorkerPacote(config: WorkerConfig, signal?: AbortSignal): Promise<WorkerRunResult> {
  const db = createInfraV7Db(config);
  const drive = criarDriveClient(config.drive);
  const inicioMs = Date.now();
  const inicioIso = nowIso();

  let claim = await claimSolicitacaoWorker(db, config.workerId, config.packageId);

  // Pacote identificado por UUID (pacote_id), nunca por nome de arquivo —
  // compatível com futuros pacotes COMPER/FORT com arquivos homônimos.

  if (!claim?.ok && config.packageId) {
    claim = await buscarSolicitacaoPorPacote(db, config.packageId);
  }

  if (!claim?.ok || !claim.solicitacao || !claim.pacote || !claim.arquivos?.length) {
    return { ok: false, message: claim?.message ?? "Nenhuma solicitação disponível" };
  }

  const pacoteId = claim.pacote.id;
  const solicitacaoId = claim.solicitacao.id;
  const erros: string[] = [];
  const dirs = garantirDiretoriosPacote(pacoteId);

  const errosPrep = validarPacoteParaProcessamento(claim.pacote, claim.arquivos);
  if (errosPrep.length) {
    await atualizarStatusWorker(db, {
      solicitacaoId,
      workerId: config.workerId,
      pacoteStatus: "falhou_download",
      solicitacaoStatus: "falhou",
      erroResumo: errosPrep.join("; "),
    }, claim.pacote.status);
    return { ok: false, pacoteId, message: errosPrep.join("; ") };
  }

  let arquivos = filtrarArquivosTesteParcial(claim.arquivos, {
    onlyFileType: config.onlyFileType,
    maxFiles: config.maxFiles,
  });
  const modoTesteParcial = isModoTesteParcial(config);
  if (modoTesteParcial && !arquivos.length) {
    return { ok: false, pacoteId, message: "Nenhum arquivo corresponde ao filtro de teste parcial" };
  }
  let arquivoAtual: string | null = null;
  let pacoteStatus = claim.pacote.status;

  const metricasBase = (): WorkerExecucaoMetricas => {
    const prog = calcularProgressoBytes(arquivos);
    return {
      arquivosTotal: arquivos.length,
      arquivosBaixados: arquivos.filter((a) => a.tamanho_baixado_bytes != null).length,
      arquivosValidados: arquivos.filter((a) => a.validacao_conteudo_status === "valido").length,
      arquivosPadronizados: arquivos.filter((a) => a.padronizacao_status === "sucesso" || !a.precisa_padronizacao).length,
      bytesBaixados: prog.baixados,
      bytesTotal: prog.total,
      arquivoAtual,
      duracaoMs: Date.now() - inicioMs,
      erros: [...erros],
    };
  };

  try {
    if (config.dryRun) {
      return { ok: true, pacoteId, statusFinal: pacoteStatus, message: "Dry-run: nenhuma ação executada" };
    }

    // Fase download
    await atualizarStatusWorker(db, {
      solicitacaoId,
      workerId: config.workerId,
      pacoteStatus: "baixando",
      metricas: metricasBase(),
    }, pacoteStatus);
    pacoteStatus = "baixando";

    for (const arq of arquivos) {
      if (signal?.aborted) throw new Error("Worker cancelado");
      arquivoAtual = arq.nome_original;
      const caminhoFinal = resolverCaminhoSeguro(diretorioOriginais(pacoteId), arq.nome_original);

      if (fs.existsSync(caminhoFinal) && arq.sha256 && arq.hash_validado && arq.tamanho_baixado_bytes != null) {
        arq.caminho_local_original = caminhoFinal;
        continue;
      }

      const dl = await workerDownloadFile({
        driveFileId: arq.drive_file_id,
        caminhoFinal,
        tamanhoEsperado: arq.tamanho_bytes,
        drive,
        signal,
        maxRetries: config.maxRetries,
        onProgress: () => {
          /* progresso reportado via metricas periódicas se necessário */
        },
      });

      if (!dl.ok) {
        erros.push(`${arq.nome_original}: ${dl.erro}`);
        await atualizarStatusWorker(db, {
          solicitacaoId,
          workerId: config.workerId,
          pacoteStatus: "falhou_download",
          solicitacaoStatus: "falhou",
          erroResumo: dl.erro ?? "Falha no download",
          metricas: metricasBase(),
          arquivos: [serializarArquivoUpdate(arq, {
            validacaoConteudoStatus: "invalido",
            validacaoConteudoErro: dl.erro,
          })],
        }, pacoteStatus);
        limparPacoteWorker(pacoteId, config.keepFiles);
        return { ok: false, pacoteId, statusFinal: "falhou_download", message: dl.erro };
      }

      arq.sha256 = dl.sha256;
      arq.tamanho_baixado_bytes = dl.bytes;
      arq.caminho_local_original = caminhoFinal;
      arq.baixado_em = nowIso();

      await atualizarStatusWorker(db, {
        solicitacaoId,
        workerId: config.workerId,
        pacoteStatus: "baixando",
        metricas: metricasBase(),
        arquivos: [serializarArquivoUpdate(arq, {
          sha256: dl.sha256,
          tamanhoBaixadoBytes: dl.bytes,
          caminhoLocalOriginal: caminhoFinal,
          baixadoEm: arq.baixado_em,
        })],
      }, pacoteStatus);
    }

    // Fase validação
    await atualizarStatusWorker(db, {
      solicitacaoId,
      workerId: config.workerId,
      pacoteStatus: "validando_conteudo",
      metricas: metricasBase(),
    }, pacoteStatus);
    pacoteStatus = "validando_conteudo";

    for (const arq of arquivos) {
      if (!arq.caminho_local_original && !fs.existsSync(resolverCaminhoSeguro(diretorioOriginais(pacoteId), arq.nome_original))) {
        continue;
      }
      arquivoAtual = arq.nome_original;
      const caminho = arq.caminho_local_original ?? resolverCaminhoSeguro(diretorioOriginais(pacoteId), arq.nome_original);
      const val = await validarConteudoArquivo(arq, caminho);
      arq.validacao_conteudo_status = val.status;
      arq.validacao_conteudo_erro = val.erro;
      arq.hash_validado = val.status === "valido";

      if (val.status === "invalido") {
        erros.push(`${arq.nome_original}: ${val.erro}`);
        await atualizarStatusWorker(db, {
          solicitacaoId,
          workerId: config.workerId,
          pacoteStatus: "falhou_validacao",
          solicitacaoStatus: "falhou",
          erroResumo: val.erro,
          metricas: metricasBase(),
          arquivos: [serializarArquivoUpdate(arq, {
            hashValidado: false,
            validacaoConteudoStatus: val.status,
            validacaoConteudoErro: val.erro,
          })],
        }, pacoteStatus);
        limparPacoteWorker(pacoteId, config.keepFiles);
        return { ok: false, pacoteId, statusFinal: "falhou_validacao", message: val.erro ?? undefined };
      }

      await atualizarStatusWorker(db, {
        solicitacaoId,
        workerId: config.workerId,
        pacoteStatus: "validando_conteudo",
        metricas: metricasBase(),
        arquivos: [serializarArquivoUpdate(arq, {
          hashValidado: true,
          validacaoConteudoStatus: val.status,
          validacaoConteudoErro: null,
        })],
      }, pacoteStatus);
    }

    // Fase padronização
    const precisaPad = arquivos.some((a) => a.precisa_padronizacao);
    if (precisaPad) {
      await atualizarStatusWorker(db, {
        solicitacaoId,
        workerId: config.workerId,
        pacoteStatus: "padronizando",
        metricas: metricasBase(),
      }, pacoteStatus);
      pacoteStatus = "padronizando";
    }

    const outPad = diretorioPadronizados(pacoteId);
    for (const arq of arquivos) {
      if (!arq.precisa_padronizacao) {
        arq.padronizacao_status = "ignorado";
        continue;
      }
      arquivoAtual = arq.nome_original;
      const pad = padronizarArquivoWorker({
        arquivo: arq,
        caminhoOriginal: arq.caminho_local_original!,
        outputDir: outPad,
        regional: claim.pacote!.regional,
        dataReferencia: claim.pacote!.data_referencia,
      });

      arq.padronizacao_status = pad.status;
      arq.padronizacao_erro = pad.erro;
      arq.caminho_local_padronizado = pad.caminhoPadronizado;
      if (pad.status === "sucesso") arq.padronizado_em = nowIso();

      if (pad.status === "erro") {
        erros.push(`${arq.nome_original}: ${pad.erro}`);
        await atualizarStatusWorker(db, {
          solicitacaoId,
          workerId: config.workerId,
          pacoteStatus: "falhou_padronizacao",
          solicitacaoStatus: "falhou",
          erroResumo: pad.erro,
          metricas: metricasBase(),
          arquivos: [serializarArquivoUpdate(arq, {
            padronizacaoStatus: pad.status,
            padronizacaoErro: pad.erro,
          })],
        }, pacoteStatus);
        limparPacoteWorker(pacoteId, config.keepFiles);
        return { ok: false, pacoteId, statusFinal: "falhou_padronizacao", message: pad.erro ?? undefined };
      }

      await atualizarStatusWorker(db, {
        solicitacaoId,
        workerId: config.workerId,
        pacoteStatus: "padronizando",
        metricas: metricasBase(),
        arquivos: [serializarArquivoUpdate(arq, {
          padronizacaoStatus: pad.status,
          padronizacaoErro: pad.erro,
          caminhoLocalPadronizado: pad.caminhoPadronizado,
          padronizadoEm: arq.padronizado_em,
        })],
      }, pacoteStatus);
    }

    if (modoTesteParcial) {
      const fimIso = nowIso();
      const metricas = metricasBase();
      metricas.duracaoMs = Date.now() - inicioMs;

      const report = montarReport({
        pacoteId,
        solicitacaoId,
        workerId: config.workerId,
        regional: claim.pacote.regional,
        competencia: claim.pacote.competencia,
        dataReferencia: claim.pacote.data_referencia,
        inicio: inicioIso,
        fim: fimIso,
        arquivos,
        hashMetadados: claim.pacote.hash_metadados_pacote,
        hashConteudo: null,
        metricas,
        statusFinal: "teste_parcial",
      });

      const reportPath = caminhoWorkerJson(pacoteId);
      fs.writeFileSync(reportPath, JSON.stringify(sanitizarReportParaLog(report), null, 2), "utf8");

      await atualizarStatusWorker(db, {
        solicitacaoId,
        workerId: config.workerId,
        pacoteStatus: pacoteStatus,
        metricas: {
          ...metricas,
          modoTesteParcial: true,
          onlyFileType: config.onlyFileType,
          maxFiles: config.maxFiles,
          tiposProcessados: arquivos.map((a) => a.tipo_arquivo),
        },
        arquivos: arquivos.map((a) => serializarArquivoUpdate(a)),
      }, pacoteStatus);

      await db
        .from("worker_solicitacao")
        .update({ status: "pendente", worker_id: null, erro_resumo: null })
        .eq("id", solicitacaoId);

      await db.from("pacote_motor_drive").update({ status: "aguardando_worker", worker_id: null }).eq("id", pacoteId);

      return {
        ok: true,
        pacoteId,
        statusFinal: "teste_parcial",
        message: `Teste parcial concluído (${arquivos.length} arquivo(s)). Pacote permanece aguardando_worker.`,
        reportPath,
      };
    }

    if (!todosArquivosValidos(arquivos)) {
      const msg = "Arquivos inválidos ou incompletos após processamento";
      await atualizarStatusWorker(db, {
        solicitacaoId,
        workerId: config.workerId,
        pacoteStatus: "falhou_validacao",
        solicitacaoStatus: "falhou",
        erroResumo: msg,
        metricas: metricasBase(),
      }, pacoteStatus);
      return { ok: false, pacoteId, statusFinal: "falhou_validacao", message: msg };
    }

    const hashConteudo = calcularHashConteudoPacote(arquivos);
    const fimIso = nowIso();
    const metricas = metricasBase();
    metricas.duracaoMs = Date.now() - inicioMs;

    const report = montarReport({
      pacoteId,
      solicitacaoId,
      workerId: config.workerId,
      regional: claim.pacote.regional,
      competencia: claim.pacote.competencia,
      dataReferencia: claim.pacote.data_referencia,
      inicio: inicioIso,
      fim: fimIso,
      arquivos,
      hashMetadados: claim.pacote.hash_metadados_pacote,
      hashConteudo,
      metricas,
      statusFinal: "pronto_motor",
    });

    const reportPath = caminhoWorkerJson(pacoteId);
    fs.writeFileSync(reportPath, JSON.stringify(sanitizarReportParaLog(report), null, 2), "utf8");

    const upd = await atualizarStatusWorker(db, {
      solicitacaoId,
      workerId: config.workerId,
      pacoteStatus: "pronto_motor",
      solicitacaoStatus: "concluida",
      hashConteudoPacote: hashConteudo,
      metricas,
    }, pacoteStatus);

    if (!config.keepFiles) {
      /* mantém arquivos locais até Fase 4C.4 — keepFiles default false remove só se explicit cleanup */
    }

    return {
      ok: true,
      pacoteId,
      statusFinal: "pronto_motor",
      message: upd.message ?? "Arquivos baixados, validados e padronizados. O Motor ainda não foi executado.",
      reportPath,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    erros.push(msg);
    await atualizarStatusWorker(db, {
      solicitacaoId,
      workerId: config.workerId,
      pacoteStatus: "falhou_download",
      solicitacaoStatus: "falhou",
      erroResumo: msg,
      metricas: metricasBase(),
    }, pacoteStatus).catch(() => undefined);
    limparPacoteWorker(pacoteId, config.keepFiles);
    return { ok: false, pacoteId, message: msg };
  }
}

export async function executarWorkerLoop(config: WorkerConfig, signal?: AbortSignal): Promise<void> {
  while (!signal?.aborted) {
    const result = await executarWorkerPacote(config, signal);
    if (result.message?.includes("Nenhuma solicitação")) {
      await new Promise((r) => setTimeout(r, config.pollIntervalMs));
      continue;
    }
    if (config.packageId) break;
    await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
}
