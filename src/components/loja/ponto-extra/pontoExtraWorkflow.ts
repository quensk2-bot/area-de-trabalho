import { supabase } from "../../../lib/supabaseClient";
import { currentMonthKey, isMesVigenciaValido } from "./pontoExtraSharedUtils";

const lojaDb = supabase.schema("loja");

export const PONTO_EXTRA_MES_STORAGE_KEY = "ponto-extra-mes-vigencia";

export type PontoExtraStepId =
  | "importar"
  | "capas"
  | "processar"
  | "validar"
  | "exportar"
  | "acompanhar";

export type StepCompletionState = "pending" | "in_progress" | "completed";

export type PontoExtraWorkflowStep = {
  id: PontoExtraStepId;
  number: number;
  label: string;
  shortLabel: string;
  menuKey: string;
  path: string;
  instruction: string;
  nextAction: string;
};

export const PONTO_EXTRA_WORKFLOW_STEPS: PontoExtraWorkflowStep[] = [
  {
    id: "importar",
    number: 1,
    label: "Importar Mês",
    shortLabel: "Importar",
    menuKey: "loja-ponto-importacao",
    path: "/loja/ponto-extra/importacao",
    instruction: "Importe os 3 arquivos: base do comercial (QTDE + LOJA + CÓDIGO), média de venda e estoque CDs.",
    nextAction: "Importar os 3 arquivos do mês",
  },
  {
    id: "capas",
    number: 2,
    label: "Capas COM5",
    shortLabel: "Capas",
    menuKey: "loja-ponto-capas",
    path: "/loja/ponto-extra/capas",
    instruction: "Gere as capas por setor, copie as descrições para o COM5 e cole os códigos oficiais de volta.",
    nextAction: "Definir capas e códigos do COM5",
  },
  {
    id: "processar",
    number: 3,
    label: "Processar",
    shortLabel: "Processar",
    menuKey: "loja-ponto-processamento",
    path: "/loja/ponto-extra/processamento",
    instruction: "Execute o motor para transformar códigos em cubagem e sugestão de abastecimento.",
    nextAction: "Rodar o processamento do mês",
  },
  {
    id: "validar",
    number: 4,
    label: "Validar Ponta",
    shortLabel: "Validar",
    menuKey: "loja-ponto-validar",
    path: "/loja/ponto-extra/validar",
    instruction: "Revise volumetria, caixas e alertas de cadastro. Aprove as pontas antes de exportar.",
    nextAction: "Validar caixas, unidades e aprovar",
  },
  {
    id: "exportar",
    number: 5,
    label: "Exportar COM5",
    shortLabel: "Exportar",
    menuKey: "loja-ponto-exportacao",
    path: "/loja/ponto-extra/exportacao",
    instruction: "Gere os arquivos IMPORTAR PRODUTO e IMPORTAR QUANT para o sistema COM5.",
    nextAction: "Exportar produtos e quantidades",
  },
  {
    id: "acompanhar",
    number: 6,
    label: "Acompanhar Mês",
    shortLabel: "Acompanhar",
    menuKey: "loja-ponto-acompanhamento",
    path: "/loja/ponto-extra/acompanhamento",
    instruction: "Acompanhe o abastecimento das pontas aprovadas durante a vigência do mês.",
    nextAction: "Monitorar pontas no mês",
  },
];

export type PontoExtraWorkflowSnapshot = {
  mesVigencia: string;
  steps: Record<PontoExtraStepId, StepCompletionState>;
  details: {
    basePonta: number;
    mediaVenda: number;
    estoqueCd: number;
    cubagem: number;
    capasTotal: number;
    capasComCodigo: number;
    processados: number;
    elegiveis: number;
    aprovados: number;
    comAlerta: number;
  };
  currentStepId: PontoExtraStepId;
  nextStepId: PontoExtraStepId | null;
  cicloCompleto: boolean;
  progressoPct: number;
};

export function getMesVigenciaPersistido() {
  if (typeof window === "undefined") return currentMonthKey();
  try {
    const saved = window.localStorage.getItem(PONTO_EXTRA_MES_STORAGE_KEY);
    if (saved && isMesVigenciaValido(saved)) return saved;
  } catch {
    // ignore
  }
  return currentMonthKey();
}

export function setMesVigenciaPersistido(mes: string) {
  if (typeof window === "undefined" || !isMesVigenciaValido(mes)) return;
  try {
    window.localStorage.setItem(PONTO_EXTRA_MES_STORAGE_KEY, mes);
  } catch {
    // ignore
  }
}

const appBasePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function navigatePontoExtraStep(path: string) {
  if (typeof window === "undefined") return;
  const target = `${appBasePath}${path}` || path;
  window.history.pushState(null, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function getStepById(stepId: PontoExtraStepId) {
  return PONTO_EXTRA_WORKFLOW_STEPS.find((step) => step.id === stepId) ?? PONTO_EXTRA_WORKFLOW_STEPS[0];
}

export function getNextStep(stepId: PontoExtraStepId) {
  const index = PONTO_EXTRA_WORKFLOW_STEPS.findIndex((step) => step.id === stepId);
  if (index < 0 || index >= PONTO_EXTRA_WORKFLOW_STEPS.length - 1) return null;
  return PONTO_EXTRA_WORKFLOW_STEPS[index + 1];
}

function resolveCurrentAndNext(steps: Record<PontoExtraStepId, StepCompletionState>) {
  const firstPending = PONTO_EXTRA_WORKFLOW_STEPS.find((step) => steps[step.id] !== "completed");
  const currentStepId = firstPending?.id ?? "acompanhar";
  const nextStepId = getNextStep(currentStepId)?.id ?? null;
  return { currentStepId, nextStepId };
}

export async function fetchPontoExtraWorkflowSnapshot(mesVigencia: string): Promise<PontoExtraWorkflowSnapshot> {
  const mes = isMesVigenciaValido(mesVigencia) ? mesVigencia : currentMonthKey();

  const [
    basePonta,
    mediaVenda,
    estoqueCd,
    cubagem,
    capas,
    processados,
  ] = await Promise.all([
    lojaDb.from("ponta_base").select("id", { count: "exact", head: true }),
    lojaDb.from("ponta_media_venda").select("id", { count: "exact", head: true }),
    lojaDb.from("ponta_estoque_cd").select("id", { count: "exact", head: true }),
    lojaDb.from("ponta_cubagem").select("id", { count: "exact", head: true }),
    lojaDb.from("ponta_codigo_pontas").select("setor_codigo, cod_ponta, ativo").eq("mes_vigencia", mes),
    lojaDb.from("ponta_processada").select("fora_reparticao, aprovado, alertas").eq("mes_vigencia", mes),
  ]);

  const counts = {
    basePonta: basePonta.count ?? 0,
    mediaVenda: mediaVenda.count ?? 0,
    estoqueCd: estoqueCd.count ?? 0,
    cubagem: cubagem.count ?? 0,
  };

  const capasAtivas = (capas.data ?? []).filter((item) => item.ativo !== false);
  const capasValidas = capasAtivas.filter((item) => {
    const setor = String(item.setor_codigo ?? "").trim().toUpperCase();
    return setor && setor !== "SEM_SETOR";
  });
  const capasComCodigo = capasValidas.filter((item) => String(item.cod_ponta ?? "").trim()).length;

  const processadosRows = processados.data ?? [];
  const elegiveis = processadosRows.filter((item) => !item.fora_reparticao);
  const aprovados = elegiveis.filter((item) => Boolean(item.aprovado));
  const comAlerta = processadosRows.filter((item) => Array.isArray(item.alertas) && item.alertas.length > 0).length;

  const importarOk = counts.basePonta > 0 && counts.mediaVenda > 0 && counts.estoqueCd > 0;
  const capasOk = capasValidas.length > 0 && capasComCodigo === capasValidas.length;
  const processarOk = processadosRows.length > 0;
  const validarOk = elegiveis.length > 0 && aprovados.length === elegiveis.length;
  const exportarOk = validarOk;
  const acompanharOk = exportarOk;

  const steps: Record<PontoExtraStepId, StepCompletionState> = {
    importar: importarOk ? "completed" : "in_progress",
    capas: capasOk ? "completed" : importarOk ? "in_progress" : "pending",
    processar: processarOk ? "completed" : capasOk ? "in_progress" : "pending",
    validar: validarOk ? "completed" : processarOk ? "in_progress" : "pending",
    exportar: exportarOk ? "completed" : validarOk ? "in_progress" : "pending",
    acompanhar: acompanharOk ? "completed" : exportarOk ? "in_progress" : "pending",
  };

  const completedCount = PONTO_EXTRA_WORKFLOW_STEPS.filter((step) => steps[step.id] === "completed").length;
  const { currentStepId, nextStepId } = resolveCurrentAndNext(steps);

  return {
    mesVigencia: mes,
    steps,
    details: {
      ...counts,
      capasTotal: capasValidas.length,
      capasComCodigo,
      processados: processadosRows.length,
      elegiveis: elegiveis.length,
      aprovados: aprovados.length,
      comAlerta,
    },
    currentStepId,
    nextStepId,
    cicloCompleto: completedCount === PONTO_EXTRA_WORKFLOW_STEPS.length,
    progressoPct: Math.round((completedCount / PONTO_EXTRA_WORKFLOW_STEPS.length) * 100),
  };
}
