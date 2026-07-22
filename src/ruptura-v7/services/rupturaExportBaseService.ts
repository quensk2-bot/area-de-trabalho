import type { PermissionContext } from "../../auth-v7/permissionService.ts";
import { isGerenteLoja } from "../../auth-v7/permissionService.ts";
import { fetchCatalogoLojas } from "../../auth-v7/catalogoLojasService.ts";
import { competenciaFromDataReferencia } from "../../hibrido-v7/manifest/manifestPaths.ts";
import type { BaseRupturaLinha, ResumoProcessamentoBase } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import { validarBaseRuptura } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import { isModoHibrido } from "../../lib/env.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_EXPORT_BROWSER_MAX_ROWS } from "../types/rupturaFiltrosTypes.ts";
import { resolverLojasEfetivas, todasLojasSelecionadas } from "../services/lojasFiltroUtils.ts";
import { lojasNoEscopoCatalogo } from "../services/lojasFiltroUtils.ts";
import {
  downloadCsvBaseRuptura,
  downloadWorkbookXlsx,
  gerarCsvBaseRuptura,
  montarWorkbookBaseRuptura,
  downloadBlob,
  type LojaSelecionadaExport,
} from "../utils/baseRupturaBrowserExport.ts";
import { carregarManifest } from "./hibrido/manifestService.ts";
import { carregarDadosExportBaseHibrido } from "./hibrido/rupturaGestaoHibridoService.ts";
import {
  filtrarLinhasUniversoOficial,
  mapearBaseRupturaHibrido,
} from "./hibrido/mapearBaseRupturaHibrido.ts";
import {
  baixarBaseRupturaDrive,
  baixarBaseRupturaStorage,
  dispararDownloadBlob,
} from "./hibrido/rupturaExportDriveService.ts";
import { assertEscopoHibrido, HIBRIDO_BANDEIRA_DEFAULT } from "./hibrido/hibridoScope.ts";
import { carregarChavesOficiaisConferencia } from "./hibrido/chavesOficiaisConferencia.ts";

import type { ModoExportBaseRuptura, ExportBaseRupturaInput, ExportBaseRupturaResultado, EstrategiaExportGrande } from "./rupturaExportBaseUtils.ts";
import {
  canExportBandeiraCompleta,
  escopoArquivoExport,
  escopoEquivaleBandeiraCompleta,
  inferirModoExport,
  LINHAS_ESTIMADAS_OFICIAL_COMPATIVEL,
  maxLojasExportBrowser,
  nomeArquivoExportRuptura,
  resumirEscopoExport,
} from "./rupturaExportBaseUtils.ts";

export type { ModoExportBaseRuptura, ExportBaseRupturaInput, ExportBaseRupturaResultado, EstrategiaExportGrande };
export {
  canExportBandeiraCompleta,
  escopoArquivoExport,
  escopoEquivaleBandeiraCompleta,
  inferirModoExport,
  LINHAS_ESTIMADAS_OFICIAL_COMPATIVEL,
  maxLojasExportBrowser,
  nomeArquivoExportRuptura,
  resumirEscopoExport,
};

function montarResumoExport(input: {
  ctx: RupturaFiltrosContexto;
  bandeira: string;
  linhas: number;
  linhasIntegral: number;
  camposAusentes: string[];
  manifestVersao?: number;
  hashConteudo?: string | null;
  modoUniverso?: "integral" | "oficial_compativel";
}): ResumoProcessamentoBase {
  const competencia = competenciaFromDataReferencia(input.ctx.dataReferencia);
  const agora = new Date().toISOString();
  return {
    regional: input.ctx.regional,
    bandeira: input.bandeira,
    competencia,
    dataReferencia: input.ctx.dataReferencia,
    pacoteId: "hibrido-export",
    execucaoMotorId: null,
    versao: input.manifestVersao ?? null,
    hashMetadados: null,
    hashConteudo: input.hashConteudo ?? null,
    arquivosEncontrados: 0,
    produtosProcessados: input.linhas,
    cdsProcessados: 0,
    quantidadeLinhasBase: input.linhas,
    inicio: agora,
    fim: agora,
    duracaoMs: 0,
    status: "exportado_hibrido",
    avisos: input.camposAusentes.length ? [`${input.camposAusentes.length} colunas ausentes ou sem fonte JSON`] : [],
    erros: [],
    camposAusentes: input.camposAusentes,
    modoUniverso: input.modoUniverso ?? "integral",
    linhasUniversoIntegral: input.linhasIntegral,
    linhasUniversoOficial: input.modoUniverso === "oficial_compativel" ? input.linhas : null,
  };
}

async function tentarDownloadPreGerado(input: {
  regional: string;
  bandeira: string;
  dataReferencia: string;
  formato: "xlsx" | "csv";
  filename: string;
  filenamesAlternativos?: string[];
}): Promise<ExportBaseRupturaResultado | null> {
  const { manifest } = await carregarManifest({
    regional: input.regional,
    bandeira: input.bandeira,
    dataReferencia: input.dataReferencia,
  });
  if (!manifest) return null;

  const driveId =
    input.formato === "xlsx" ? manifest.baseXlsxDriveFileId : manifest.baseCsvDriveFileId;
  if (driveId) {
    const dl = await baixarBaseRupturaDrive({ driveFileId: driveId, filename: input.filename });
    if (dl.ok) {
      dispararDownloadBlob(dl.blob, input.filename);
      return { ok: true, filename: input.filename, estrategia: "drive" };
    }
  }

  const competencia = competenciaFromDataReferencia(input.dataReferencia);
  const filenames = [input.filename, ...(input.filenamesAlternativos ?? [])];
  for (const fn of filenames) {
    const storagePath = `${input.regional}/${input.bandeira}/${competencia}/export/${fn}`;
    const st = await baixarBaseRupturaStorage({ path: storagePath, filename: fn });
    if (st.ok) {
      dispararDownloadBlob(st.blob, fn);
      return { ok: true, filename: fn, estrategia: "storage" };
    }
  }

  return null;
}

export type OpcoesExportDrive = {
  driveDisponivel: boolean;
  driveFileId: string | null;
  manifestVersao: number | null;
};

export async function consultarOpcoesExportDrive(input: {
  ctx: RupturaFiltrosContexto;
  formato: "xlsx" | "csv";
}): Promise<OpcoesExportDrive> {
  const bandeira = input.ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const { manifest } = await carregarManifest({
    regional: input.ctx.regional,
    bandeira,
    dataReferencia: input.ctx.dataReferencia,
  });
  const driveFileId =
    input.formato === "xlsx" ? manifest?.baseXlsxDriveFileId ?? null : manifest?.baseCsvDriveFileId ?? null;
  return {
    driveDisponivel: Boolean(driveFileId),
    driveFileId,
    manifestVersao: manifest?.versao ?? null,
  };
}

function mensagemExportGrandeSemDrive(input: {
  linhas: number;
  totalEscopo: number;
  formato: "xlsx" | "csv";
}): string {
  const maxLojas = maxLojasExportBrowser(input.totalEscopo);
  const campoDrive = input.formato === "xlsx" ? "baseXlsxDriveFileId" : "baseCsvDriveFileId";
  return [
    `Arquivo com ${input.linhas.toLocaleString("pt-BR")} linhas excede limite do navegador (${RUPTURA_EXPORT_BROWSER_MAX_ROWS.toLocaleString("pt-BR")}).`,
    `Opções:`,
    `• Baixar do Drive — configure ${campoDrive} no manifest`,
    `• Modo oficial compatível (~${LINHAS_ESTIMADAS_OFICIAL_COMPATIVEL.toLocaleString("pt-BR")} linhas)`,
    `• Selecione até ${maxLojas} lojas`,
    `• CLI: node scripts/gerar-ruptura-ajuste-export.mjs`,
  ].join("\n");
}

async function gerarExportBrowser(input: {
  linhas: BaseRupturaLinha[];
  resumo: ResumoProcessamentoBase;
  lojasSelecionadas: LojaSelecionadaExport[];
  cdsDinamicos: Record<string, string | number | null>[];
  formato: "xlsx" | "csv";
  filename: string;
  incluirCdsDinamicos: boolean;
  somenteCamposAusentes?: boolean;
}): Promise<ExportBaseRupturaResultado> {
  if (input.somenteCamposAusentes) {
    const wb = montarWorkbookBaseRuptura({
      linhas: [],
      resumo: input.resumo,
      lojasSelecionadas: input.lojasSelecionadas,
    });
    downloadWorkbookXlsx(wb, input.filename.replace(/\.(xlsx|csv)$/i, "_CAMPOS_AUSENTES.xlsx"));
    return { ok: true, filename: input.filename, estrategia: "browser", linhas: 0 };
  }

  const val = validarBaseRuptura(input.linhas);
  if (!val.valido && input.linhas.length === 0) {
    return { ok: false, erro: val.erros.join("; ") };
  }

  if (input.formato === "csv") {
    downloadCsvBaseRuptura(gerarCsvBaseRuptura(input.linhas), input.filename);
    return { ok: true, filename: input.filename, estrategia: "browser", linhas: input.linhas.length };
  }

  const wb = montarWorkbookBaseRuptura({
    linhas: input.linhas,
    resumo: input.resumo,
    lojasSelecionadas: input.lojasSelecionadas,
    cdsDinamicos: input.cdsDinamicos,
    incluirCdsDinamicos: input.incluirCdsDinamicos,
  });
  downloadWorkbookXlsx(wb, input.filename);
  return { ok: true, filename: input.filename, estrategia: "browser", linhas: input.linhas.length };
}

async function gerarViaWorker(input: {
  linhas: BaseRupturaLinha[];
  resumo: ResumoProcessamentoBase;
  lojasSelecionadas: LojaSelecionadaExport[];
  cdsDinamicos: Record<string, string | number | null>[];
  formato: "xlsx" | "csv";
  filename: string;
  incluirCdsDinamicos: boolean;
}): Promise<ExportBaseRupturaResultado> {
  if (typeof Worker === "undefined") {
    return { ok: false, erro: "Arquivo grande demais para o navegador. Use exportação completa via Drive." };
  }

  return new Promise((resolve) => {
    const worker = new Worker(new URL("../workers/baseRupturaExport.worker.ts", import.meta.url), { type: "module" });
    worker.postMessage({
      linhas: input.linhas,
      resumo: input.resumo,
      lojasSelecionadas: input.lojasSelecionadas,
      cdsDinamicos: input.cdsDinamicos,
      formato: input.formato,
      incluirCdsDinamicos: input.incluirCdsDinamicos,
    });
    worker.onmessage = (ev: MessageEvent<{ ok: boolean; erro?: string; csv?: string; buffer?: ArrayBuffer; linhas?: number }>) => {
      worker.terminate();
      const msg = ev.data;
      if (!msg.ok) {
        resolve({ ok: false, erro: msg.erro ?? "Worker falhou" });
        return;
      }
      if (input.formato === "csv" && msg.csv) {
        downloadCsvBaseRuptura(msg.csv, input.filename);
      } else if (msg.buffer) {
        downloadBlob(
          new Blob([msg.buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          input.filename,
        );
      }
      resolve({ ok: true, filename: input.filename, estrategia: "worker", linhas: msg.linhas ?? input.linhas.length });
    };
    worker.onerror = () => {
      worker.terminate();
      resolve({ ok: false, erro: "Falha no Worker de exportação." });
    };
  });
}

export async function exportarBaseRupturaOficial(input: ExportBaseRupturaInput): Promise<ExportBaseRupturaResultado> {
  if (!isModoHibrido()) {
    return { ok: false, erro: "Exportação oficial disponível apenas no modo híbrido (Storage JSON)." };
  }

  const scopeErr = assertEscopoHibrido(input.authCtx, input.ctx);
  if (scopeErr) return { ok: false, erro: scopeErr.message };

  if (input.modo === "bandeira_completa" && !canExportBandeiraCompleta(input.authCtx)) {
    return { ok: false, erro: "Exportação completa da bandeira disponível apenas para ADM/N1." };
  }

  if (isGerenteLoja(input.authCtx!) && input.modo === "bandeira_completa") {
    return { ok: false, erro: "Gerente pode exportar somente sua loja." };
  }

  const catalogo = await fetchCatalogoLojas();
  const escopoLojas = lojasNoEscopoCatalogo(catalogo, input.ctx.regional, input.ctx.bandeira);
  const totalEscopo = escopoLojas.length;

  let lojasAlvo = resolverLojasEfetivas(catalogo, input.ctx);
  if (input.modo === "bandeira_completa") {
    lojasAlvo = escopoLojas.map((l) => l.loja);
  }

  const bandeira = input.ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const estrategia = input.estrategia ?? "auto";
  const universo =
    input.universo ?? (estrategia === "oficial_compativel" ? "oficial_compativel" : "integral");
  const escopoSlug = escopoArquivoExport({ modo: input.modo, lojas: lojasAlvo, totalEscopo });
  const filename = nomeArquivoExportRuptura({
    regional: input.ctx.regional,
    bandeira,
    escopo: escopoSlug,
    dataReferencia: input.ctx.dataReferencia,
    extensao: input.formato,
    universo,
  });
  const filenameBandeira = nomeArquivoExportRuptura({
    regional: input.ctx.regional,
    bandeira,
    escopo: "BANDEIRA_COMPLETA",
    dataReferencia: input.ctx.dataReferencia,
    extensao: input.formato,
    universo,
  });
  const equivaleBandeiraCompleta = escopoEquivaleBandeiraCompleta({
    modo: input.modo,
    lojas: lojasAlvo,
    totalEscopo,
  });
  const filenamesAlternativos =
    equivaleBandeiraCompleta && filename !== filenameBandeira ? [filenameBandeira] : undefined;

  if (estrategia === "drive") {
    input.onProgress?.("Baixando do Drive…");
    const pre = await tentarDownloadPreGerado({
      regional: input.ctx.regional,
      bandeira,
      dataReferencia: input.ctx.dataReferencia,
      formato: input.formato,
      filename,
      filenamesAlternativos,
    });
    if (pre?.ok) return pre;
    const opcoes = await consultarOpcoesExportDrive({ ctx: input.ctx, formato: input.formato });
    const campoDrive = input.formato === "xlsx" ? "baseXlsxDriveFileId" : "baseCsvDriveFileId";
    if (!opcoes.driveDisponivel) {
      return {
        ok: false,
        erro: mensagemExportGrandeSemDrive({ linhas: 0, totalEscopo, formato: input.formato }).replace(
          /^Arquivo com 0 linhas.*?\n/,
          `Drive indisponível — ${campoDrive} ausente no manifest.\n`,
        ),
      };
    }
    return { ok: false, erro: "Falha ao baixar arquivo do Drive. Tente novamente ou use exportação via Worker." };
  }

  input.onProgress?.("Verificando arquivo pré-gerado…");
  if (
    equivaleBandeiraCompleta &&
    !input.somenteCamposAusentes &&
    estrategia !== "integral_worker" &&
    estrategia !== "oficial_compativel"
  ) {
    const pre = await tentarDownloadPreGerado({
      regional: input.ctx.regional,
      bandeira,
      dataReferencia: input.ctx.dataReferencia,
      formato: input.formato,
      filename,
      filenamesAlternativos,
    });
    if (pre?.ok) return pre;
  }

  input.onProgress?.("Carregando JSONs publicados…");
  const { lojas, erro } = await carregarDadosExportBaseHibrido({
    ctx: { ...input.ctx, bandeira },
    authCtx: input.authCtx,
    lojasAlvo,
    onProgress: (p) => input.onProgress?.(`Loja ${p.loja} (${p.atual}/${p.total})…`),
  });
  if (erro) return { ok: false, erro: erro.message };

  const linhas: BaseRupturaLinha[] = [];
  const cdsDinamicos: Record<string, string | number | null>[] = [];
  const camposAusentesSet = new Set<string>();
  const lojasSelecionadas: LojaSelecionadaExport[] = lojas.map((l) => ({
    loja: l.loja,
    bandeira: l.bandeira,
    publicada: l.publicada,
  }));

  for (const bloco of lojas) {
    if (!bloco.publicada || !bloco.produtos.length) continue;
    const mapped = mapearBaseRupturaHibrido({
      produtos: bloco.produtos,
      cdsPorProduto: bloco.cdsPorProduto,
      bandeira: bloco.bandeira,
      regional: input.ctx.regional,
      modoUniverso: universo,
    });
    linhas.push(...mapped.linhas);
    cdsDinamicos.push(...mapped.cdsDinamicos);
    for (const c of mapped.camposAusentes) camposAusentesSet.add(c);
  }

  const camposAusentes = [...camposAusentesSet];
  const linhasIntegral = linhas.length;

  if (universo === "oficial_compativel") {
    const chavesOficiais = carregarChavesOficiaisConferencia();
    if (chavesOficiais.size > 0) {
      const filtradas = filtrarLinhasUniversoOficial(linhas, chavesOficiais);
      linhas.length = 0;
      linhas.push(...filtradas);
    }
  }

  const { manifest } = await carregarManifest({
    regional: input.ctx.regional,
    bandeira,
    dataReferencia: input.ctx.dataReferencia,
  });

  const resumo = montarResumoExport({
    ctx: input.ctx,
    bandeira,
    linhas: linhas.length,
    linhasIntegral,
    camposAusentes,
    manifestVersao: manifest?.versao,
    hashConteudo: manifest?.hashConteudo,
    modoUniverso: universo,
  });

  if (equivaleBandeiraCompleta && linhas.length > RUPTURA_EXPORT_BROWSER_MAX_ROWS && estrategia !== "integral_worker") {
    const pre = await tentarDownloadPreGerado({
      regional: input.ctx.regional,
      bandeira,
      dataReferencia: input.ctx.dataReferencia,
      formato: input.formato,
      filename,
      filenamesAlternativos,
    });
    if (pre?.ok) return pre;
  }

  const incluirCdsDinamicos = equivaleBandeiraCompleta;

  if (linhas.length > RUPTURA_EXPORT_BROWSER_MAX_ROWS) {
    if (typeof Worker === "undefined") {
      return {
        ok: false,
        erro: mensagemExportGrandeSemDrive({ linhas: linhas.length, totalEscopo, formato: input.formato }),
      };
    }
    input.onProgress?.("Gerando via Worker…");
    return gerarViaWorker({
      linhas,
      resumo,
      lojasSelecionadas,
      cdsDinamicos,
      formato: input.formato,
      filename,
      incluirCdsDinamicos,
    });
  }

  input.onProgress?.("Gerando planilha…");
  return gerarExportBrowser({
    linhas,
    resumo,
    lojasSelecionadas,
    cdsDinamicos,
    formato: input.formato,
    filename,
    incluirCdsDinamicos,
    somenteCamposAusentes: input.somenteCamposAusentes,
  });
}