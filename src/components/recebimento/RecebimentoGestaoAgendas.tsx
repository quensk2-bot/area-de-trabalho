import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../styles";
import type { Usuario } from "../../types";
import { RecebimentoGestaoAgendasCalendar } from "./RecebimentoGestaoAgendasCalendar";
import { RecebimentoGestaoAgendasDayPanel } from "./RecebimentoGestaoAgendasDayPanel";
import type {
  AgendaViewMode,
  GestaoAgendaDaySummary,
  GestaoAgendaDrawerFilters,
  GestaoAgendaFilters,
  GestaoAgendaHistoricoRow,
  GestaoAgendaRow,
} from "./recebimentoGestaoAgendasUtils";
import {
  GESTAO_AGENDAS_STORAGE_KEYS,
  STATUS_CONFIRMACAO_PADRAO,
  buildDaySummaries,
  buildFilterOptions,
  buildHojeGrupos,
  buildResumo,
  buildDateRange,
  filterRows,
  getDateLabel,
  formatDateTimeBR,
  getDefaultPeriodForMode,
  getFullDateLabel,
  storageReadBoolean,
  storageReadObject,
  storageReadString,
  storageWriteJson,
  todayISO,
  toNumber,
} from "./recebimentoGestaoAgendasUtils";

type Props = {
  perfil: Usuario;
};

type VinculoViewRow = {
  gestao_agenda_id: string;
  agendamento_id: string | null;
  operacional_encontrado: boolean | null;
  empresa: string | null;
  status_recebimento: string | null;
};

const db = () => (supabase as any).schema("recebimento");
const appBasePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const appHref = (path: string) => `${appBasePath}${path}` || path;

const layoutCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${theme.colors.borderSoft}`,
  background: "rgba(15,23,42,0.92)",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const buttonSecondaryStyle: React.CSSProperties = {
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 999,
  background: "transparent",
  color: theme.colors.textSoft,
  fontWeight: 700,
  padding: "8px 12px",
  cursor: "pointer",
};

const buttonPrimaryStyle: React.CSSProperties = {
  border: `1px solid ${theme.colors.neonOrange}`,
  borderRadius: 999,
  background: theme.colors.neonOrange,
  color: "#431407",
  fontWeight: 800,
  padding: "8px 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const inputStyle: React.CSSProperties = {
  minWidth: 170,
  borderRadius: 8,
  border: `1px solid ${theme.colors.borderSoft}`,
  background: theme.colors.bgElevated,
  color: theme.colors.text,
  padding: "8px 10px",
  boxSizing: "border-box",
};

const defaultDrawerFilters: GestaoAgendaDrawerFilters = {
  busca: "",
  status: "",
  somenteAlteradas: false,
  somenteVinculadas: false,
};

const getDefaultFilters = (mode: AgendaViewMode): GestaoAgendaFilters => {
  const periodo = getDefaultPeriodForMode(mode);
  return {
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
    uf: "",
    cd: "",
    modalidade: "",
    status: "",
    fornecedor: "",
    transportadora: "",
    doca: "",
    vinculo: "",
  };
};

const useViewportWidth = () => {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  return width;
};

const statusChipColor = (status: string | null | undefined) => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("confirmado") && !normalized.includes("não")) return theme.colors.neonGreen;
  if (normalized.includes("sem contato") || normalized.includes("pendente") || normalized.includes("não")) return theme.colors.warning;
  if (normalized.includes("cancelad")) return theme.colors.danger;
  if (normalized.includes("reagend")) return theme.colors.neonOrange;
  return theme.colors.textSoft;
};

type DisponibilidadeCellStatus = "ocupada" | "disponivel" | "sem_info";

type DisponibilidadeLinha = {
  dataAnalise: string;
  label: string;
  rowsByAgendaDate: Map<string, GestaoAgendaRow[]>;
};

const getDataAnalise = (row: GestaoAgendaRow) => {
  const source = row.ultima_atualizacao_importacao || row.created_at;
  return source ? source.slice(0, 10) : null;
};

const formatDateShort = (dateISO: string) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const formatMonthLabel = (dateISO: string) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  const month = dt.toLocaleDateString("pt-BR", { month: "long" });
  return `${String(dt.getMonth() + 1).padStart(2, "0")} - ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
};

const formatAgendaDateChip = (dateISO: string) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  const month = dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${String(dt.getMonth() + 1).padStart(2, "0")}-${month} - dia ${dateISO.slice(8, 10)}`;
};

const getSemanaLabel = (dateISO: string) => {
  const start = new Date(`${new Date(dateISO).getFullYear()}-01-01T00:00:00`);
  const current = new Date(`${dateISO}T00:00:00`);
  const days = Math.floor((current.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return `${Math.floor(days / 7) + 1} Semana`;
};

const buildDisponibilidadeLinhas = (rows: GestaoAgendaRow[]) => {
  const byAnalise = new Map<string, DisponibilidadeLinha>();
  rows.forEach((row) => {
    const dataAnalise = getDataAnalise(row);
    if (!dataAnalise || !row.data_agenda) return;
    if (!byAnalise.has(dataAnalise)) {
      byAnalise.set(dataAnalise, {
        dataAnalise,
        label: getFullDateLabel(dataAnalise),
        rowsByAgendaDate: new Map<string, GestaoAgendaRow[]>(),
      });
    }
    const linha = byAnalise.get(dataAnalise)!;
    if (!linha.rowsByAgendaDate.has(row.data_agenda)) linha.rowsByAgendaDate.set(row.data_agenda, []);
    linha.rowsByAgendaDate.get(row.data_agenda)?.push(row);
  });

  return Array.from(byAnalise.values()).sort((a, b) => a.dataAnalise.localeCompare(b.dataAnalise));
};

const getDisponibilidadeStatus = (linha: DisponibilidadeLinha, dataAgenda: string): DisponibilidadeCellStatus => {
  const rows = linha.rowsByAgendaDate.get(dataAgenda) ?? [];
  if (rows.length > 0) return "ocupada";
  if (dataAgenda >= linha.dataAnalise) return "disponivel";
  return "sem_info";
};

const statusDisponibilidadeStyle = (status: DisponibilidadeCellStatus): React.CSSProperties => {
  if (status === "ocupada") {
    return {
      background: "rgba(248,113,113,0.16)",
      color: theme.colors.danger,
      borderColor: "rgba(248,113,113,0.45)",
    };
  }
  if (status === "disponivel") {
    return {
      background: "rgba(34,197,94,0.13)",
      color: theme.colors.neonGreen,
      borderColor: "rgba(34,197,94,0.42)",
    };
  }
  return {
    background: "rgba(148,163,184,0.08)",
    color: theme.colors.textMuted,
    borderColor: "rgba(148,163,184,0.24)",
  };
};

const statusDisponibilidadeLabel = (status: DisponibilidadeCellStatus) => {
  if (status === "ocupada") return "X";
  if (status === "disponivel") return "OK";
  return "-";
};

function RecebimentoGestaoAgendasDisponibilidade({
  agendaDates,
  linhas,
  selectedDay,
  onSelectDay,
  narrow,
}: {
  agendaDates: string[];
  linhas: DisponibilidadeLinha[];
  selectedDay: string | null;
  onSelectDay: (dateISO: string) => void;
  narrow: boolean;
}) {
  const semanas = Array.from(new Set(agendaDates.map(getSemanaLabel)));
  const meses = Array.from(new Set(agendaDates.map(formatMonthLabel)));

  if (agendaDates.length === 0 || linhas.length === 0) {
    return (
      <div style={{ borderRadius: 12, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(2,6,23,0.52)", padding: 14, color: theme.colors.textMuted, fontSize: 13 }}>
        Sem base importada para montar a disponibilidade no periodo filtrado.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) 320px", gap: 12 }}>
      <section style={{ border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 12, background: "rgba(2,6,23,0.38)", overflow: "hidden" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 12, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>
          <div>
            <h2 style={{ margin: 0, color: theme.colors.text, fontSize: 15 }}>Disponibilidade de Agenda Regional</h2>
            <div style={{ marginTop: 4, color: theme.colors.textMuted, fontSize: 12 }}>Base oficial: Listagem de Agenda no Portal</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, fontWeight: 800 }}>
            <span style={{ color: theme.colors.danger }}>X Todas agendas ocupadas</span>
            <span style={{ color: theme.colors.neonGreen }}>OK Agenda disponivel</span>
            <span style={{ color: theme.colors.textMuted }}>- Sem informacao</span>
          </div>
        </header>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: Math.max(760, 160 + agendaDates.length * 46), borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: "sticky", left: 0, zIndex: 3, background: theme.colors.bg, color: theme.colors.text, borderRight: `1px solid ${theme.colors.borderSoft}`, borderBottom: `1px solid ${theme.colors.borderSoft}`, padding: 8, textAlign: "left", minWidth: 156 }}>
                  Data analise
                </th>
                <th colSpan={agendaDates.length} style={{ background: theme.colors.bg, color: theme.colors.text, borderBottom: `1px solid ${theme.colors.borderSoft}`, padding: 8 }}>
                  Data da agenda
                </th>
              </tr>
              <tr>
                {agendaDates.map((dateISO) => (
                  <th key={dateISO} style={{ background: "rgba(15,23,42,0.96)", borderBottom: `1px solid ${theme.colors.borderSoft}`, padding: 4, minWidth: 42 }}>
                    <button
                      type="button"
                      onClick={() => onSelectDay(dateISO)}
                      style={{
                        border: "none",
                        background: selectedDay === dateISO ? "rgba(34,197,94,0.18)" : "transparent",
                        color: selectedDay === dateISO ? theme.colors.neonGreen : theme.colors.textSoft,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        width: "100%",
                        padding: "4px 2px",
                      }}
                      title={getFullDateLabel(dateISO)}
                    >
                      {formatDateShort(dateISO)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.dataAnalise}>
                  <th style={{ position: "sticky", left: 0, zIndex: 2, background: theme.colors.bg, color: theme.colors.text, borderRight: `1px solid ${theme.colors.borderSoft}`, borderTop: `1px solid ${theme.colors.borderSoft}`, padding: 8, textAlign: "left" }}>
                    <div>{getDateLabel(linha.dataAnalise, false)}</div>
                    <div style={{ color: theme.colors.textMuted, fontSize: 11, textTransform: "capitalize" }}>{getDateLabel(linha.dataAnalise)}</div>
                  </th>
                  {agendaDates.map((dateISO) => {
                    const status = getDisponibilidadeStatus(linha, dateISO);
                    const rowsDia = linha.rowsByAgendaDate.get(dateISO) ?? [];
                    return (
                      <td key={`${linha.dataAnalise}-${dateISO}`} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, padding: 4, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => onSelectDay(dateISO)}
                          style={{
                            ...statusDisponibilidadeStyle(status),
                            width: 34,
                            minHeight: 30,
                            borderRadius: 8,
                            border: "1px solid",
                            fontSize: 11,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                          title={`${getFullDateLabel(dateISO)} | ${rowsDia.length} agenda(s) na base de ${getDateLabel(linha.dataAnalise, false)}`}
                        >
                          {statusDisponibilidadeLabel(status)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside style={{ display: "grid", gap: 10, alignContent: "start" }}>
        {[
          ["Semana Agenda", semanas],
          ["Mes da Agenda", meses],
          ["Data Agenda", agendaDates.map(formatAgendaDateChip)],
        ].map(([title, values]) => (
          <section key={title as string} style={{ border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 10, background: "rgba(2,6,23,0.38)", padding: 10 }}>
            <h3 style={{ margin: "0 0 8px", color: theme.colors.text, fontSize: 12 }}>{title as string}</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(values as string[]).map((value, index) => {
                const dateISO = title === "Data Agenda" ? agendaDates[index] : null;
                return (
                  <button
                    key={`${value}-${index}`}
                    type="button"
                    onClick={() => {
                      if (dateISO) onSelectDay(dateISO);
                    }}
                    style={{
                      border: `1px solid ${theme.colors.borderSoft}`,
                      borderRadius: 6,
                      background: dateISO && selectedDay === dateISO ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.12)",
                      color: dateISO && selectedDay === dateISO ? theme.colors.neonGreen : theme.colors.textSoft,
                      padding: "6px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: dateISO ? "pointer" : "default",
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>
    </div>
  );
}

const mapToGestaoRows = (data: unknown[], vinculos: VinculoViewRow[]) => {
  const vinculoByGestaoId = new Map<string, VinculoViewRow>();
  vinculos.forEach((item) => {
    if (!vinculoByGestaoId.has(item.gestao_agenda_id)) {
      vinculoByGestaoId.set(item.gestao_agenda_id, item);
    }
  });

  return (data as Record<string, unknown>[]).map((raw) => {
    const id = String(raw.id ?? "");
    const vinculo = vinculoByGestaoId.get(id);
    const ufRaw = raw.uf;
    const uf = typeof ufRaw === "string" && ufRaw.trim() ? ufRaw.trim() : null;

    return {
      id,
      codigo_agenda: raw.codigo_agenda as string | null,
      transportadora_nome: raw.transportadora_nome as string | null,
      fornecedor_nome: raw.fornecedor_nome as string | null,
      notas_fiscais: raw.notas_fiscais as string | null,
      data_agenda: raw.data_agenda as string | null,
      horario: raw.horario as string | null,
      doca: raw.doca as string | null,
      deposito: raw.deposito as string | null,
      tipo_carga: raw.tipo_carga as string | null,
      qtd_veiculos: raw.qtd_veiculos as number | string | null,
      tipo_veiculo: raw.tipo_veiculo as string | null,
      tipo_volume: raw.tipo_volume as string | null,
      volumes: raw.volumes as number | string | null,
      sku: raw.sku as number | string | null,
      unidade_negocios: raw.unidade_negocios as string | null,
      fornecedor_id: raw.fornecedor_id as string | null,
      transportadora_id: raw.transportadora_id as string | null,
      possui_nota: raw.possui_nota as boolean | null,
      status_confirmacao: raw.status_confirmacao as string | null,
      observacao: raw.observacao as string | null,
      confirmado_em: raw.confirmado_em as string | null,
      confirmado_por: raw.confirmado_por as string | null,
      alterado_na_ultima_importacao: raw.alterado_na_ultima_importacao as boolean | null,
      campos_alterados: raw.campos_alterados as GestaoAgendaRow["campos_alterados"],
      ultima_importacao_id: raw.ultima_importacao_id as string | null,
      ultima_atualizacao_importacao: raw.ultima_atualizacao_importacao as string | null,
      created_at: raw.created_at as string | null,
      operacional_encontrado: !!(vinculo?.operacional_encontrado || vinculo?.agendamento_id),
      agendamento_id: vinculo?.agendamento_id ?? null,
      empresa_operacional: vinculo?.empresa ?? null,
      status_operacional: vinculo?.status_recebimento ?? null,
      uf,
    } satisfies GestaoAgendaRow;
  });
};

const computeEmptyState = (loading: boolean, rowsPeriodo: GestaoAgendaRow[], rowsFiltradas: GestaoAgendaRow[], mode: AgendaViewMode) => {
  if (loading) return "";
  if (rowsPeriodo.length === 0) return "Nenhum dado no período selecionado.";
  if (rowsFiltradas.length === 0) return "Os filtros atuais não retornaram resultados.";
  if (mode === "hoje" && rowsFiltradas.filter((row) => row.data_agenda === todayISO()).length === 0) return "Hoje está sem agendas para os filtros selecionados.";
  return "";
};

export function RecebimentoGestaoAgendas({ perfil: _perfil }: Props) {
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isNotebook = viewportWidth >= 1024 && viewportWidth < 1440;

  const [modo, setModo] = useState<AgendaViewMode>(() => {
    if (typeof window === "undefined") return "hoje";
    const restored = storageReadString(window.localStorage, GESTAO_AGENDAS_STORAGE_KEYS.modo);
    if (restored === "hoje" || restored === "7dias" || restored === "30dias" || restored === "disponibilidade") return restored;
    return "hoje";
  });

  const [filtros, setFiltros] = useState<GestaoAgendaFilters>(() => {
    const fallback = getDefaultFilters("hoje");
    if (typeof window === "undefined") return fallback;
    return storageReadObject(window.localStorage, GESTAO_AGENDAS_STORAGE_KEYS.filtros, fallback);
  });

  const [drawerFiltros, setDrawerFiltros] = useState<GestaoAgendaDrawerFilters>(() => {
    if (typeof window === "undefined") return defaultDrawerFilters;
    return storageReadObject(window.localStorage, GESTAO_AGENDAS_STORAGE_KEYS.drawerFiltros, defaultDrawerFilters);
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return storageReadString(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.diaSelecionado);
  });

  const [drawerOpen, setDrawerOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return storageReadBoolean(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.drawerAberto, false);
  });

  const [rows, setRows] = useState<GestaoAgendaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erroAgenda, setErroAgenda] = useState<string | null>(null);
  const [erroVinculo, setErroVinculo] = useState<string | null>(null);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [avisoSuave, setAvisoSuave] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);

  const [historicoByGestaoId, setHistoricoByGestaoId] = useState<Record<string, GestaoAgendaHistoricoRow[]>>({});

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const drawerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, GESTAO_AGENDAS_STORAGE_KEYS.modo, modo);
  }, [modo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, GESTAO_AGENDAS_STORAGE_KEYS.filtros, filtros);
  }, [filtros]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, GESTAO_AGENDAS_STORAGE_KEYS.drawerFiltros, drawerFiltros);
  }, [drawerFiltros]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedDay) storageWriteJson(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.diaSelecionado, selectedDay);
    else window.sessionStorage.removeItem(GESTAO_AGENDAS_STORAGE_KEYS.diaSelecionado);
  }, [selectedDay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.drawerAberto, drawerOpen);
  }, [drawerOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMain = storageReadObject(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.scrollMain, { top: 0 });
    const savedDrawer = storageReadObject(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.scrollDrawer, { top: 0 });

    requestAnimationFrame(() => {
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = Number(savedMain.top ?? 0);
      if (drawerScrollRef.current) drawerScrollRef.current.scrollTop = Number(savedDrawer.top ?? 0);
    });
  }, []);

  const carregar = async () => {
    setLoading(true);
    setErroAgenda(null);
    setErroVinculo(null);
    setAvisoSuave(null);

    const gestaoResult = await db()
      .from("gestao_agenda")
      .select("id,codigo_agenda,transportadora_nome,fornecedor_nome,notas_fiscais,data_agenda,horario,doca,deposito,tipo_carga,qtd_veiculos,tipo_veiculo,tipo_volume,volumes,sku,unidade_negocios,fornecedor_id,transportadora_id,possui_nota,status_confirmacao,observacao,confirmado_em,confirmado_por,alterado_na_ultima_importacao,campos_alterados,ultima_importacao_id,ultima_atualizacao_importacao,created_at")
      .gte("data_agenda", filtros.periodoInicio)
      .lte("data_agenda", filtros.periodoFim)
      .order("data_agenda", { ascending: true })
      .order("horario", { ascending: true });

    if (gestaoResult.error) {
      console.error("Erro ao carregar gestão de agendas:", gestaoResult.error);
      setRows([]);
      setErroAgenda("Falha ao carregar agenda futura. Tente atualizar novamente.");
      setLoading(false);
      return;
    }

    const vinculoResult = await db()
      .from("vw_agenda_futura_vs_operacional")
      .select("gestao_agenda_id,agendamento_id,operacional_encontrado,empresa,status_recebimento")
      .gte("gestao_data_agenda", filtros.periodoInicio)
      .lte("gestao_data_agenda", filtros.periodoFim);

    if (vinculoResult.error) {
      console.error("Erro ao carregar vínculos operacionais:", vinculoResult.error);
      setErroVinculo("Falha ao carregar vínculo operacional. A tela segue disponível com os dados de agenda.");
    }

    const mapped = mapToGestaoRows(gestaoResult.data ?? [], (vinculoResult.data ?? []) as VinculoViewRow[]);
    setRows(mapped);
    setUltimaAtualizacao(new Date().toLocaleString("pt-BR"));
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, [filtros.periodoInicio, filtros.periodoFim]);

  const rowsFiltradas = useMemo(() => filterRows(rows, filtros), [rows, filtros]);

  const rowsHoje = useMemo(() => rowsFiltradas.filter((row) => row.data_agenda === todayISO()), [rowsFiltradas]);

  const daySummaries = useMemo(() => buildDaySummaries(rowsFiltradas, filtros.periodoInicio, filtros.periodoFim), [rowsFiltradas, filtros.periodoInicio, filtros.periodoFim]);
  const agendaDates = useMemo(() => buildDateRange(filtros.periodoInicio, filtros.periodoFim), [filtros.periodoInicio, filtros.periodoFim]);
  const disponibilidadeLinhas = useMemo(() => buildDisponibilidadeLinhas(rowsFiltradas), [rowsFiltradas]);

  const summaryByDay = useMemo(() => {
    const map = new Map<string, GestaoAgendaDaySummary>();
    daySummaries.forEach((day) => map.set(day.data, day));
    return map;
  }, [daySummaries]);

  const resumoPeriodo = useMemo(() => buildResumo(rowsFiltradas), [rowsFiltradas]);

  const filterOptions = useMemo(() => buildFilterOptions(rows), [rows]);

  const rowsDiaSelecionado = useMemo(() => {
    if (!selectedDay) return [] as GestaoAgendaRow[];
    return rowsFiltradas.filter((row) => row.data_agenda === selectedDay);
  }, [rowsFiltradas, selectedDay]);

  useEffect(() => {
    if (!selectedDay) return;
    const exists = daySummaries.some((item) => item.data === selectedDay);
    if (exists) return;
    setDrawerOpen(false);
    setSelectedDay(null);
    setAvisoSuave("A seleção anterior não está mais disponível no período/filtro atual.");
  }, [daySummaries, selectedDay]);

  useEffect(() => {
    if (!drawerOpen || !selectedDay) return;
    const ids = rowsDiaSelecionado.map((row) => row.id);
    if (ids.length === 0) {
      setHistoricoByGestaoId({});
      return;
    }

    const carregarHistorico = async () => {
      setErroHistorico(null);
      const { data, error } = await db()
        .from("confirmacao_agenda_historico")
        .select("id,gestao_agenda_id,agendamento_id,canal,contato_nome,contato_tipo,resultado,observacao,created_at")
        .in("gestao_agenda_id", ids)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar histórico da agenda:", error);
        setHistoricoByGestaoId({});
        setErroHistorico("Falha ao carregar histórico de confirmação/reimportação.");
        return;
      }

      const grouped: Record<string, GestaoAgendaHistoricoRow[]> = {};
      (data ?? []).forEach((item) => {
        const key = item.gestao_agenda_id ?? "";
        if (!key) return;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item as GestaoAgendaHistoricoRow);
      });
      setHistoricoByGestaoId(grouped);
    };

    void carregarHistorico();
  }, [drawerOpen, selectedDay, rowsDiaSelecionado]);

  const emptyStateMessage = computeEmptyState(loading, rows, rowsFiltradas, modo);

  const hojeGrupos = useMemo(() => buildHojeGrupos(rowsHoje), [rowsHoje]);

  const handleModeChange = (nextMode: AgendaViewMode) => {
    setModo(nextMode);
    const periodo = getDefaultPeriodForMode(nextMode);
    setFiltros((prev) => ({ ...prev, periodoInicio: periodo.inicio, periodoFim: periodo.fim }));
  };

  const openDay = (dateISO: string) => {
    setSelectedDay(dateISO);
    setDrawerOpen(true);
    setDrawerFiltros((prev) => ({ ...defaultDrawerFilters, ...prev }));
  };

  const limparFiltros = () => {
    const base = getDefaultFilters(modo);
    setFiltros(base);
    setDrawerFiltros(defaultDrawerFilters);
  };

  const withUf = filterOptions.ufs.length > 0;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={layoutCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24 }}>04 Gestão das Agendas</h1>
            <p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>
              Centro de Planejamento Operacional do Recebimento.
            </p>
            <div style={{ marginTop: 4, color: theme.colors.textMuted, fontSize: 12 }}>
              Última atualização: {ultimaAtualizacao ?? "-"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", borderRadius: 999, border: `1px solid ${theme.colors.borderSoft}`, overflow: "hidden" }}>
              {[
                ["hoje", "Hoje"],
                ["7dias", "Próximos 7 dias"],
                ["30dias", "Próximos 30 dias"],
                ["disponibilidade", "Disponibilidade"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleModeChange(value as AgendaViewMode)}
                  style={{
                    border: "none",
                    borderRight: `1px solid ${theme.colors.borderSoft}`,
                    background: modo === value ? "rgba(34,197,94,0.14)" : "transparent",
                    color: modo === value ? theme.colors.neonGreen : theme.colors.textSoft,
                    padding: "8px 10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <a href={appHref("/recebimento/importar-agenda-futura")} style={buttonPrimaryStyle}>
              <span>Importar Agenda Futura</span>
            </a>
            <button type="button" style={buttonSecondaryStyle} onClick={() => void carregar()}>
              Atualizar
            </button>
            <button type="button" style={buttonSecondaryStyle} onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>
        </div>
      </header>

      <div style={{ ...layoutCardStyle, gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          {[
            ["Agendas", resumoPeriodo.agendas, theme.colors.text],
            ["Veículos", resumoPeriodo.veiculos, theme.colors.text],
            ["Confirmadas", resumoPeriodo.confirmadas, theme.colors.neonGreen],
            ["Pendentes", resumoPeriodo.pendentes, theme.colors.warning],
            ["Sem contato", resumoPeriodo.semContato, theme.colors.warning],
          ].map(([label, value, color]) => (
            <div key={label} style={{ border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 10, background: "rgba(2,6,23,0.5)", padding: 10 }}>
              <div style={{ color: theme.colors.textMuted, fontSize: 11 }}>{label as string}</div>
              <div style={{ color: color as string, fontWeight: 800, fontSize: 22 }}>{Number(value).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          {[
            ["Reagendadas", resumoPeriodo.reagendadas, theme.colors.neonOrange],
            ["Canceladas", resumoPeriodo.canceladas, theme.colors.danger],
            ["Vinculadas", resumoPeriodo.vinculadas, theme.colors.neonGreen],
            ["Fornecedores", resumoPeriodo.fornecedores, theme.colors.text],
            ["Transportadoras", resumoPeriodo.transportadoras, theme.colors.text],
          ].map(([label, value, color]) => (
            <div key={label} style={{ border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 10, background: "rgba(2,6,23,0.5)", padding: 10 }}>
              <div style={{ color: theme.colors.textMuted, fontSize: 11 }}>{label as string}</div>
              <div style={{ color: color as string, fontWeight: 800, fontSize: 22 }}>{Number(value).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...layoutCardStyle, overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, minWidth: isMobile ? 980 : 0 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Período inicial</span>
            <input type="date" style={inputStyle} value={filtros.periodoInicio} onChange={(event) => setFiltros((prev) => ({ ...prev, periodoInicio: event.target.value }))} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Período final</span>
            <input type="date" style={inputStyle} value={filtros.periodoFim} onChange={(event) => setFiltros((prev) => ({ ...prev, periodoFim: event.target.value }))} />
          </label>

          {withUf && (
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>UF</span>
              <select style={inputStyle} value={filtros.uf} onChange={(event) => setFiltros((prev) => ({ ...prev, uf: event.target.value }))}>
                <option value="">Todas</option>
                {filterOptions.ufs.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>CD/Unidade</span>
            <select style={inputStyle} value={filtros.cd} onChange={(event) => setFiltros((prev) => ({ ...prev, cd: event.target.value }))}>
              <option value="">Todos</option>
              {filterOptions.cds.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Modalidade</span>
            <select style={inputStyle} value={filtros.modalidade} onChange={(event) => setFiltros((prev) => ({ ...prev, modalidade: event.target.value }))}>
              <option value="">Todas</option>
              {filterOptions.modalidades.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Status</span>
            <select style={inputStyle} value={filtros.status} onChange={(event) => setFiltros((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">Todos</option>
              {Array.from(new Set([...STATUS_CONFIRMACAO_PADRAO, ...filterOptions.status])).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Fornecedor</span>
            <input style={inputStyle} value={filtros.fornecedor} onChange={(event) => setFiltros((prev) => ({ ...prev, fornecedor: event.target.value }))} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Transportadora</span>
            <input style={inputStyle} value={filtros.transportadora} onChange={(event) => setFiltros((prev) => ({ ...prev, transportadora: event.target.value }))} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Doca</span>
            <select style={inputStyle} value={filtros.doca} onChange={(event) => setFiltros((prev) => ({ ...prev, doca: event.target.value }))}>
              <option value="">Todas</option>
              {filterOptions.docas.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}>Vínculo operacional</span>
            <select style={inputStyle} value={filtros.vinculo} onChange={(event) => setFiltros((prev) => ({ ...prev, vinculo: event.target.value as GestaoAgendaFilters["vinculo"] }))}>
              <option value="">Todos</option>
              <option value="vinculadas">Vinculadas</option>
              <option value="sem_vinculo">Sem vínculo</option>
            </select>
          </label>
        </div>
      </div>

      {erroAgenda && (
        <div style={{ ...layoutCardStyle, borderColor: theme.colors.danger }}>
          <strong style={{ color: theme.colors.danger }}>{erroAgenda}</strong>
          <div>
            <button type="button" style={buttonSecondaryStyle} onClick={() => void carregar()}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {erroVinculo && (
        <div style={{ ...layoutCardStyle, borderColor: theme.colors.warning, color: theme.colors.warning }}>{erroVinculo}</div>
      )}

      {avisoSuave && (
        <div style={{ ...layoutCardStyle, borderColor: theme.colors.warning, color: theme.colors.textSoft }}>{avisoSuave}</div>
      )}

      <div
        ref={mainScrollRef}
        onScroll={() => {
          if (typeof window === "undefined" || !mainScrollRef.current) return;
          storageWriteJson(window.sessionStorage, GESTAO_AGENDAS_STORAGE_KEYS.scrollMain, { top: mainScrollRef.current.scrollTop });
        }}
        style={{ ...layoutCardStyle, maxHeight: isMobile ? "calc(100vh - 320px)" : "calc(100vh - 300px)", overflowY: "auto" }}
      >
        {loading && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Carregando agendas...</div>}

        {!loading && emptyStateMessage && (
          <div style={{ borderRadius: 12, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(2,6,23,0.52)", padding: 14, color: theme.colors.textMuted, fontSize: 13, display: "grid", gap: 8 }}>
            <div>{emptyStateMessage}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={buttonSecondaryStyle} onClick={limparFiltros}>
                Limpar filtros
              </button>
              <button type="button" style={buttonSecondaryStyle} onClick={() => void carregar()}>
                Atualizar
              </button>
            </div>
          </div>
        )}

        {!loading && !emptyStateMessage && modo === "disponibilidade" && (
          <RecebimentoGestaoAgendasDisponibilidade
            agendaDates={agendaDates}
            linhas={disponibilidadeLinhas}
            selectedDay={selectedDay}
            onSelectDay={openDay}
            narrow={isMobile || isTablet}
          />
        )}

        {!loading && !emptyStateMessage && modo === "hoje" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ borderRadius: 10, border: `1px dashed ${theme.colors.borderSoft}`, padding: 10, color: theme.colors.textMuted, fontSize: 12 }}>
              A referência de horário é usada apenas para organização visual. A prioridade de atendimento continua operacional.
            </div>

            {hojeGrupos.map((grupo) => (
              <section key={grupo.chave} style={{ borderRadius: 12, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(2,6,23,0.44)", padding: 10, display: "grid", gap: 8 }}>
                <header>
                  <strong style={{ color: theme.colors.neonOrange }}>{grupo.titulo}</strong>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{grupo.descricao}</div>
                </header>

                <div style={{ display: "grid", gap: 8 }}>
                  {grupo.rows.map((row) => (
                    <article
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDay(row.data_agenda ?? todayISO())}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDay(row.data_agenda ?? todayISO());
                        }
                      }}
                      style={{ borderRadius: 10, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(15,23,42,0.9)", padding: 10, cursor: "pointer", display: "grid", gap: 8 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ color: theme.colors.text }}>{row.codigo_agenda ?? "Sem código"}</strong>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, background: "rgba(251,146,60,0.14)", color: statusChipColor(row.status_confirmacao) }}>
                            {row.status_confirmacao ?? "Pendente"}
                          </span>
                          <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.14)", color: row.operacional_encontrado ? theme.colors.neonGreen : theme.colors.textMuted }}>
                            {row.operacional_encontrado || row.agendamento_id ? "Vinculada" : "Sem vínculo"}
                          </span>
                          {row.alterado_na_ultima_importacao && (
                            <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#fecaca" }}>
                              Alteração recente
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 6, fontSize: 12 }}>
                        <div><strong>Fornecedor:</strong> {row.fornecedor_nome ?? "-"}</div>
                        <div><strong>Transportadora:</strong> {row.transportadora_nome ?? "-"}</div>
                        <div><strong>Modalidade:</strong> {row.tipo_carga ?? "-"}</div>
                        <div><strong>Referência:</strong> {row.horario ? row.horario.slice(0, 5) : "Sem horário"}</div>
                        <div><strong>Doca:</strong> {row.doca ?? "-"}</div>
                        <div><strong>Notas:</strong> {row.notas_fiscais ?? "-"}</div>
                        <div><strong>Volumes:</strong> {toNumber(row.volumes).toLocaleString("pt-BR")}</div>
                        <div><strong>SKU:</strong> {toNumber(row.sku).toLocaleString("pt-BR")}</div>
                        <div><strong>Veículos:</strong> {toNumber(row.qtd_veiculos).toLocaleString("pt-BR")}</div>
                        <div><strong>Situação operacional:</strong> {row.status_operacional ?? "-"}</div>
                      </div>

                      <div style={{ borderRadius: 8, padding: 8, background: "rgba(2,6,23,0.5)", fontSize: 12 }}>
                        <strong>Observação:</strong> {row.observacao ?? "Sem observação"}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!loading && !emptyStateMessage && (modo === "7dias" || modo === "30dias") && (
          <RecebimentoGestaoAgendasCalendar
            summaries={daySummaries}
            selectedDay={selectedDay}
            mode={modo}
            onSelectDay={openDay}
          />
        )}
      </div>

      {erroHistorico && <div style={{ ...layoutCardStyle, borderColor: theme.colors.warning, color: theme.colors.warning }}>{erroHistorico}</div>}

      <RecebimentoGestaoAgendasDayPanel
        open={drawerOpen}
        fullScreen={isMobile}
        day={selectedDay}
        summary={selectedDay ? summaryByDay.get(selectedDay) ?? null : null}
        rows={rowsDiaSelecionado}
        historicoByGestaoId={historicoByGestaoId}
        filtros={drawerFiltros}
        onChangeFiltros={setDrawerFiltros}
        onClose={() => setDrawerOpen(false)}
        scrollRef={drawerScrollRef}
      />

      {drawerOpen && !isMobile && (
        <button
          type="button"
          aria-label="Fechar painel"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.45)",
            border: "none",
            cursor: "pointer",
            zIndex: 40,
          }}
        />
      )}

      <footer style={{ color: theme.colors.textMuted, fontSize: 11 }}>
        {isNotebook && "Layout notebook ativo: cards compactos em 3 ou 4 colunas e drawer de largura intermediária."}
        {isTablet && "Layout tablet ativo: cards em duas colunas, painel sobreposto e foco em toque."}
        {isMobile && "Layout celular ativo: seletor compacto, filtros recolhíveis e drawer em tela cheia."}
      </footer>
    </section>
  );
}
