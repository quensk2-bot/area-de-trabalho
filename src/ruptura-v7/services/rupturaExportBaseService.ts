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
import { mapearBaseRupturaHibrido } from "./hibrido/mapearBaseRupturaHibrido.ts";
import {
  baixarBaseRupturaDrive,
  baixarBaseRupturaStorage,
  dispararDownloadBlob,
} from "./hibrido/rupturaExportDriveService.ts";
import { assertEscopoHibrido, HIBRIDO_BANDEIRA_DEFAULT } from "./hibrido/hibridoScope.ts";

import type { ModoExportBaseRuptura, ExportBaseRupturaInput, ExportBaseRupturaResultado } from "./rupturaExportBaseUtils.ts";
import {
  canExportBandeiraCompleta,
  escopoArquivoExport,
  inferirModoExport,
  nomeArquivoExportRuptura,
  resumirEscopoExport,
} from "./rupturaExportBaseUtils.ts";

export type { ModoExportBaseRuptura, ExportBaseRupturaInput, ExportBaseRupturaResultado };
export {
  canExportBandeiraCompleta,
  escopoArquivoExport,
  inferirModoExport,
  nomeArquivoExportRuptura,
  resumirEscopoExport,
};

function montarResumoExport(input: {
  ctx: RupturaFiltrosContexto;
  bandeira: string;
  linhas: number;
  camposAusentes: string[];
  manifestVersao?: number;
  hashConteudo?: string | null;
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
  };
}

async function tentarDownloadPreGerado(input: {
  regional: string;
  bandeira: string;
  dataReferencia: string;
  formato: "xlsx" | "csv";
  filename: string;
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

  const storagePath = `${input.regional}/${input.bandeira}/${competenciaFromDataReferencia(input.dataReferencia)}/export/${input.filename}`;
  const st = await baixarBaseRupturaStorage({ path: storagePath, filename: input.filename });
  if (st.ok) {
    dispararDownloadBlob(st.blob, input.filename);
    return { ok: true, filename: input.filename, estrategia: "storage" };
  }

  return null;
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
  const escopoSlug = escopoArquivoExport({ modo: input.modo, lojas: lojasAlvo, totalEscopo });
  const filename = nomeArquivoExportRuptura({
    regional: input.ctx.regional,
    bandeira,
    escopo: escopoSlug,
    dataReferencia: input.ctx.dataReferencia,
    extensao: input.formato,
  });

  input.onProgress?.("Verificando arquivo pré-gerado…");
  if (input.modo === "bandeira_completa" && !input.somenteCamposAusentes) {
    const pre = await tentarDownloadPreGerado({
      regional: input.ctx.regional,
      bandeira,
      dataReferencia: input.ctx.dataReferencia,
      formato: input.formato,
      filename,
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
    });
    linhas.push(...mapped.linhas);
    cdsDinamicos.push(...mapped.cdsDinamicos);
    for (const c of mapped.camposAusentes) camposAusentesSet.add(c);
  }

  const camposAusentes = [...camposAusentesSet];
  const { manifest } = await carregarManifest({
    regional: input.ctx.regional,
    bandeira,
    dataReferencia: input.ctx.dataReferencia,
  });

  const resumo = montarResumoExport({
    ctx: input.ctx,
    bandeira,
    linhas: linhas.length,
    camposAusentes,
    manifestVersao: manifest?.versao,
    hashConteudo: manifest?.hashConteudo,
  });

  if (input.modo === "bandeira_completa" && linhas.length > RUPTURA_EXPORT_BROWSER_MAX_ROWS) {
    const pre = await tentarDownloadPreGerado({
      regional: input.ctx.regional,
      bandeira,
      dataReferencia: input.ctx.dataReferencia,
      formato: input.formato,
      filename,
    });
    if (pre?.ok) return pre;
    return {
      ok: false,
      erro: `Arquivo com ${linhas.length} linhas excede limite do navegador (${RUPTURA_EXPORT_BROWSER_MAX_ROWS}). Configure baseXlsxDriveFileId no manifest ou reduza o escopo.`,
    };
  }

  const incluirCdsDinamicos = input.modo === "bandeira_completa";

  if (linhas.length > RUPTURA_EXPORT_BROWSER_MAX_ROWS) {
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