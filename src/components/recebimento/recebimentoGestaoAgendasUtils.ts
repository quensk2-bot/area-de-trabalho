export type AgendaViewMode = "hoje" | "7dias" | "30dias";

export type GestaoAgendaCampoReimportacao = {
  de: unknown;
  para: unknown;
};

export type GestaoAgendaRow = {
  id: string;
  codigo_agenda: string | null;
  transportadora_nome: string | null;
  fornecedor_nome: string | null;
  notas_fiscais: string | null;
  data_agenda: string | null;
  horario: string | null;
  doca: string | null;
  deposito: string | null;
  tipo_carga: string | null;
  qtd_veiculos: number | string | null;
  tipo_veiculo: string | null;
  tipo_volume: string | null;
  volumes: number | string | null;
  sku: number | string | null;
  unidade_negocios: string | null;
  fornecedor_id: string | null;
  transportadora_id: string | null;
  possui_nota: boolean | null;
  status_confirmacao: string | null;
  observacao: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
  alterado_na_ultima_importacao: boolean | null;
  campos_alterados: Record<string, GestaoAgendaCampoReimportacao> | null;
  ultima_importacao_id: string | null;
  ultima_atualizacao_importacao: string | null;
  created_at: string | null;
  operacional_encontrado: boolean;
  agendamento_id: string | null;
  empresa_operacional: string | null;
  status_operacional: string | null;
  uf: string | null;
};

export type GestaoAgendaFilters = {
  periodoInicio: string;
  periodoFim: string;
  uf: string;
  cd: string;
  modalidade: string;
  status: string;
  fornecedor: string;
  transportadora: string;
  doca: string;
  vinculo: "" | "vinculadas" | "sem_vinculo";
};

export type GestaoAgendaDrawerFilters = {
  busca: string;
  status: string;
  somenteAlteradas: boolean;
  somenteVinculadas: boolean;
};

export type GestaoAgendaResumo = {
  agendas: number;
  veiculos: number;
  confirmadas: number;
  pendentes: number;
  semContato: number;
  reagendadas: number;
  canceladas: number;
  vinculadas: number;
  fornecedores: number;
  transportadoras: number;
};

export type GestaoAgendaDaySummary = GestaoAgendaResumo & {
  data: string;
  diaSemana: string;
  fornecedorPredominante: string | null;
  transportadoraPredominante: string | null;
  docaPredominante: string | null;
  modalidadePredominante: string | null;
  dadosIncompletos: boolean;
};

export type GestaoAgendaHistoricoRow = {
  id: string;
  gestao_agenda_id: string | null;
  agendamento_id: string | null;
  canal: string | null;
  contato_nome: string | null;
  contato_tipo: string | null;
  resultado: string | null;
  observacao: string | null;
  created_at: string | null;
};

export type GestaoAgendaHojeGrupo = {
  chave: string;
  titulo: string;
  descricao: string;
  rows: GestaoAgendaRow[];
};

export const GESTAO_AGENDAS_STORAGE_PREFIX = "scc:v7:recebimento:gestao-agendas:";

export const GESTAO_AGENDAS_STORAGE_KEYS = {
  modo: `${GESTAO_AGENDAS_STORAGE_PREFIX}modo`,
  filtros: `${GESTAO_AGENDAS_STORAGE_PREFIX}filtros`,
  drawerFiltros: `${GESTAO_AGENDAS_STORAGE_PREFIX}drawerFiltros`,
  diaSelecionado: `${GESTAO_AGENDAS_STORAGE_PREFIX}diaSelecionado`,
  drawerAberto: `${GESTAO_AGENDAS_STORAGE_PREFIX}drawerAberto`,
  scrollMain: `${GESTAO_AGENDAS_STORAGE_PREFIX}scrollMain`,
  scrollDrawer: `${GESTAO_AGENDAS_STORAGE_PREFIX}scrollDrawer`,
};

export const STATUS_CONFIRMACAO_PADRAO = [
  "Pendente",
  "Confirmado",
  "Não confirmado",
  "Sem contato",
  "Reagendar",
  "Cancelado",
];

const DAY_MS = 24 * 60 * 60 * 1000;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (dateISO: string, days: number) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

export const getDefaultPeriodForMode = (mode: AgendaViewMode) => {
  const inicio = todayISO();
  if (mode === "hoje") return { inicio, fim: inicio };
  if (mode === "7dias") return { inicio, fim: addDaysISO(inicio, 6) };
  return { inicio, fim: addDaysISO(inicio, 29) };
};

export const toNumber = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export const getDateLabel = (dateISO: string, withWeekday = true) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  return dt.toLocaleDateString("pt-BR", {
    weekday: withWeekday ? "short" : undefined,
    day: "2-digit",
    month: "2-digit",
  });
};

export const getFullDateLabel = (dateISO: string) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTimeBR = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("pt-BR") : "-");

export const isSameDate = (left: string | null | undefined, right: string | null | undefined) => !!left && !!right && left === right;

export const buildDateRange = (inicio: string, fim: string) => {
  if (!inicio || !fim) return [] as string[];
  const start = new Date(`${inicio}T00:00:00`).getTime();
  const end = new Date(`${fim}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [] as string[];
  const dates: string[] = [];
  for (let ts = start; ts <= end; ts += DAY_MS) {
    dates.push(new Date(ts).toISOString().slice(0, 10));
  }
  return dates;
};

const isConfirmada = (status: string) => status.includes("confirmado") && !status.includes("não");
const isSemContato = (status: string) => status.includes("sem contato");
const isReagendada = (status: string) => status.includes("reagendar") || status.includes("reagendada");
const isCancelada = (status: string) => status.includes("cancelado") || status.includes("cancelada");
const isPendente = (status: string) => !status || status.includes("pendente") || status.includes("não confirmado");

const valueFrequency = (values: Array<string | null | undefined>) => {
  const map = new Map<string, number>();
  values
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
  let best: string | null = null;
  let bestCount = 0;
  map.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
};

export const buildResumo = (rows: GestaoAgendaRow[]): GestaoAgendaResumo => {
  const fornecedores = new Set(rows.map((r) => (r.fornecedor_nome ?? "").trim()).filter(Boolean));
  const transportadoras = new Set(rows.map((r) => (r.transportadora_nome ?? "").trim()).filter(Boolean));
  let confirmadas = 0;
  let pendentes = 0;
  let semContato = 0;
  let reagendadas = 0;
  let canceladas = 0;

  rows.forEach((row) => {
    const status = normalizeText(row.status_confirmacao);
    if (isConfirmada(status)) confirmadas += 1;
    else if (isSemContato(status)) semContato += 1;
    else if (isReagendada(status)) reagendadas += 1;
    else if (isCancelada(status)) canceladas += 1;
    else if (isPendente(status)) pendentes += 1;
    else pendentes += 1;
  });

  return {
    agendas: rows.length,
    veiculos: rows.reduce((sum, row) => sum + toNumber(row.qtd_veiculos), 0),
    confirmadas,
    pendentes,
    semContato,
    reagendadas,
    canceladas,
    vinculadas: rows.filter((row) => row.operacional_encontrado || !!row.agendamento_id).length,
    fornecedores: fornecedores.size,
    transportadoras: transportadoras.size,
  };
};

export const buildDaySummary = (dateISO: string, rows: GestaoAgendaRow[]): GestaoAgendaDaySummary => {
  const resumo = buildResumo(rows);
  const dadosIncompletos = rows.some((row) => !row.codigo_agenda || !row.fornecedor_nome || !row.transportadora_nome);
  return {
    ...resumo,
    data: dateISO,
    diaSemana: new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }),
    fornecedorPredominante: valueFrequency(rows.map((row) => row.fornecedor_nome)),
    transportadoraPredominante: valueFrequency(rows.map((row) => row.transportadora_nome)),
    docaPredominante: valueFrequency(rows.map((row) => row.doca)),
    modalidadePredominante: valueFrequency(rows.map((row) => row.tipo_carga)),
    dadosIncompletos,
  };
};

export const buildDaySummaries = (rows: GestaoAgendaRow[], inicio: string, fim: string) => {
  const byDate = new Map<string, GestaoAgendaRow[]>();
  rows.forEach((row) => {
    if (!row.data_agenda) return;
    if (!byDate.has(row.data_agenda)) byDate.set(row.data_agenda, []);
    byDate.get(row.data_agenda)?.push(row);
  });

  return buildDateRange(inicio, fim).map((dateISO) => buildDaySummary(dateISO, byDate.get(dateISO) ?? []));
};

const getPeriodoLabel = (horario: string | null | undefined) => {
  if (!horario) {
    return {
      chave: "sem_horario",
      titulo: "Sem horário de referência",
      descricao: "Sem horário informado; priorização definida pela operação.",
    };
  }

  const hour = Number(horario.slice(0, 2));
  if (!Number.isFinite(hour)) {
    return {
      chave: "sem_horario",
      titulo: "Sem horário de referência",
      descricao: "Sem horário válido; priorização definida pela operação.",
    };
  }

  if (hour < 12) {
    return {
      chave: "manha",
      titulo: "Manhã",
      descricao: "Referência visual 00:00-11:59, sem prioridade fixa por horário.",
    };
  }
  if (hour < 18) {
    return {
      chave: "tarde",
      titulo: "Tarde",
      descricao: "Referência visual 12:00-17:59, sem prioridade fixa por horário.",
    };
  }

  return {
    chave: "noite",
    titulo: "Noite",
    descricao: "Referência visual 18:00-23:59, sem prioridade fixa por horário.",
  };
};

export const buildHojeGrupos = (rows: GestaoAgendaRow[]): GestaoAgendaHojeGrupo[] => {
  const groups = new Map<string, GestaoAgendaHojeGrupo>();
  rows.forEach((row) => {
    const periodo = getPeriodoLabel(row.horario);
    const current = groups.get(periodo.chave);
    if (current) {
      current.rows.push(row);
      return;
    }
    groups.set(periodo.chave, {
      chave: periodo.chave,
      titulo: periodo.titulo,
      descricao: periodo.descricao,
      rows: [row],
    });
  });

  const orderedKeys = ["manha", "tarde", "noite", "sem_horario"];
  return orderedKeys
    .map((key) => groups.get(key))
    .filter((group): group is GestaoAgendaHojeGrupo => !!group)
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => (a.horario ?? "99:99").localeCompare(b.horario ?? "99:99")),
    }));
};

const CAMPOS_ALTERADOS_LABELS: Record<string, string> = {
  notas_fiscais: "Notas",
  horario: "Horário",
  doca: "Doca",
  deposito: "Depósito",
  tipo_carga: "Tipo de carga",
  qtd_veiculos: "Veículos",
  tipo_veiculo: "Tipo veículo",
  tipo_volume: "Tipo volume",
  volumes: "Volumes",
  sku: "SKU",
  unidade_negocios: "CD/Unidade",
  fornecedor_nome: "Fornecedor",
  transportadora_nome: "Transportadora",
};

export const formatCampoAlterado = (campo: string, de: unknown, para: unknown) => {
  const label = CAMPOS_ALTERADOS_LABELS[campo] ?? campo;
  const left = de === null || de === undefined || de === "" ? "-" : String(de);
  const right = para === null || para === undefined || para === "" ? "-" : String(para);
  return `${label}: ${left} -> ${right}`;
};

export const filterRows = (rows: GestaoAgendaRow[], filtros: GestaoAgendaFilters) => {
  const fornecedorFiltro = normalizeText(filtros.fornecedor);
  const transportadoraFiltro = normalizeText(filtros.transportadora);

  return rows.filter((row) => {
    if (filtros.uf && normalizeText(row.uf) !== normalizeText(filtros.uf)) return false;

    const cdValue = row.unidade_negocios ?? row.deposito ?? row.empresa_operacional ?? "";
    if (filtros.cd && normalizeText(cdValue) !== normalizeText(filtros.cd)) return false;

    if (filtros.modalidade && normalizeText(row.tipo_carga) !== normalizeText(filtros.modalidade)) return false;

    const statusRow = (row.status_confirmacao ?? "Pendente").trim();
    if (filtros.status && statusRow !== filtros.status) return false;

    if (fornecedorFiltro && !normalizeText(row.fornecedor_nome).includes(fornecedorFiltro)) return false;
    if (transportadoraFiltro && !normalizeText(row.transportadora_nome).includes(transportadoraFiltro)) return false;

    if (filtros.doca && normalizeText(row.doca) !== normalizeText(filtros.doca)) return false;

    if (filtros.vinculo === "vinculadas" && !(row.operacional_encontrado || !!row.agendamento_id)) return false;
    if (filtros.vinculo === "sem_vinculo" && (row.operacional_encontrado || !!row.agendamento_id)) return false;

    return true;
  });
};

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

export const buildFilterOptions = (rows: GestaoAgendaRow[]) => ({
  ufs: uniqueSorted(rows.map((row) => row.uf)),
  cds: uniqueSorted(rows.map((row) => row.unidade_negocios ?? row.deposito ?? row.empresa_operacional)),
  modalidades: uniqueSorted(rows.map((row) => row.tipo_carga)),
  status: uniqueSorted(rows.map((row) => row.status_confirmacao ?? "Pendente")),
  docas: uniqueSorted(rows.map((row) => row.doca)),
});

export const storageReadJson = <T,>(storage: Storage, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const storageWriteJson = (storage: Storage, key: string, value: unknown) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export const storageReadObject = <T extends Record<string, unknown>>(storage: Storage, key: string, fallback: T): T => {
  const parsed = storageReadJson<unknown>(storage, key);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  return { ...fallback, ...(parsed as Partial<T>) };
};

export const storageReadString = (storage: Storage, key: string): string | null => {
  const parsed = storageReadJson<unknown>(storage, key);
  return typeof parsed === "string" ? parsed : null;
};

export const storageReadBoolean = (storage: Storage, key: string, fallback = false) => {
  const parsed = storageReadJson<unknown>(storage, key);
  return typeof parsed === "boolean" ? parsed : fallback;
};

export const safeJsonEntries = (value: Record<string, GestaoAgendaCampoReimportacao> | null) =>
  Object.entries(value ?? {});
