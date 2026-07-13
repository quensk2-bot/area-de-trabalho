// src/components/MainShellV14.tsx
import type React from "react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Usuario } from "../types";
import { theme } from "../styles";

import N1ListarRotinas from "./N1ListarRotinas";
import { RotinasPadraoPage } from "./RotinasPadraoPage";
import { AgendaHoje } from "./AgendaHoje";
import { N1ExecucaoPorRegional } from "./N1ExecucaoPorRegional";
import { ExecucaoAoVivoBoard2 } from "./ExecucaoAoVivoBoard2";
import { N2ListarRotinas } from "./N2ListarRotinas";
import { RotinaExecucaoContainer } from "./RotinaExecucaoContainer";
import { N3CriarRotinaAvulsa } from "./N3CriarRotinaAvulsa";

import KpiPageV14 from "./KpiPageV14";
import KpiAuditoria from "./KpiAuditoria";
import RotinasAtivasAdmin from "./RotinasAtivasAdmin";
import {
  RecebimentoAgenda,
  RecebimentoConfirmacaoAgenda,
  RecebimentoDashboard,
  RecebimentoFornecedores,
  RecebimentoImportarAgendaFutura,
  RecebimentoImportacao,
  RecebimentoNoShowDashboard,
  RecebimentoNoShowImportacao,
  RecebimentoNoShowTop5,
  RecebimentoRealizado,
  RecebimentoOcorrencias,
  RecebimentoPlaceholder,
  RecebimentoTransportadoras,
} from "./recebimento/RecebimentoPages";
import { RecebimentoGestaoAgendas } from "./recebimento/RecebimentoGestaoAgendas";
import {
  PontoExtraAnalise,
  PontoExtraAcompanhamento,
  PontoExtraCapas,
  PontoExtraCubagem,
  PontoExtraDashboard,
  PontoExtraExportacao,
  PontoExtraImportacao,
  PontoExtraProcessamento,
  PontoExtraRelatorio,
} from "./loja/PontoExtraPages";
import { PontoExtraSimulador } from "./loja/ponto-extra/PontoExtraSimulador";

type Props = {
  perfil: Usuario;
  onLogout: () => void;
};

type MenuKey =
  | "overview"
  | "rotinas"
  | "agenda"
  | "kpi"
  | "kpi-setor"
  | "kpi-auditoria"
  | "rotinas-ativas"
  | "execucao"
  | "modelos"
  | "recebimento-dashboard"
  | "recebimento-agenda"
  | "recebimento-fornecedores"
  | "recebimento-transportadoras"
  | "recebimento-importacao"
  | "recebimento-importar-agenda-futura"
  | "recebimento-ocorrencias"
  | "recebimento-relatorios"
  | "recebimento-noshow-importacao"
  | "recebimento-noshow-dashboard"
  | "recebimento-noshow-top5"
  | "recebimento-noshow-realizado"
  | "recebimento-gestao-agendas"
  | "recebimento-confirmacao-agenda"
  | "loja-ponto-dashboard"
  | "loja-ponto-importacao"
  | "loja-ponto-cubagem"
  | "loja-ponto-capas"
  | "loja-ponto-processamento"
  | "loja-ponto-simulador"
  | "loja-ponto-analise"
  | "loja-ponto-exportacao"
  | "loja-ponto-acompanhamento"
  | "loja-ponto-relatorio";

type Rotina = {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  periodicidade?: string | null;
  data_inicio?: string | null;
  dia_semana?: string | null;
  horario_inicio?: string | null;
  duracao_minutos?: number | null;
  urgencia?: string | null;
  responsavel_id?: string;
  departamento_id?: number | null;
  setor_id?: number | null;
  regional_id?: number | null;
  tem_checklist?: boolean;
  tem_anexo?: boolean;
};

const shellStyles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    width: "100vw",
    overflowX: "hidden",
    background: theme.colors.appBackground ?? "#020617",
    color: theme.colors.text ?? "#f9fafb",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebar: {
    width: 260,
    padding: 16,
    boxSizing: "border-box",
    borderRight: `1px solid ${theme.colors.border ?? "#1f2937"}`,
    background:
      "radial-gradient(circle at top left, rgba(251, 146, 60, 0.15), transparent 60%), #020617",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.neonOrange ?? "#fb923c",
  },
  userBox: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(15, 23, 42, 0.9)",
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
  },
  userMeta: {
    fontSize: 11,
    color: theme.colors.textMuted ?? "#9ca3af",
  },
  logoutButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    padding: "4px 10px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: theme.colors.neonGreen ?? "#22c55e",
    color: "#022c22",
    fontSize: 11,
    fontWeight: 600,
  },
  menuList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 8,
  },
  menuGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingTop: 8,
  },
  menuGroupTitle: {
    marginTop: 4,
    marginBottom: 4,
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
    background: "rgba(15,23,42,0.72)",
    color: theme.colors.neonOrange ?? "#fb923c",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    boxSizing: "border-box",
  },
  menuSubGroupTitle: {
    marginTop: 8,
    marginBottom: 4,
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
    background: "rgba(2,6,23,0.72)",
    color: theme.colors.neonOrange ?? "#fb923c",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    boxSizing: "border-box",
  },
  menuGroupIcon: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.colors.neonGreen ?? "#22c55e",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1,
  },
  menuLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: theme.colors.textMuted ?? "#9ca3af",
    marginBottom: 4,
  },
  menuButton: {
    padding: "8px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    background: "transparent",
    color: theme.colors.textSoft ?? "#e5e7eb",
    fontSize: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  menuButtonActive: {
    background: "rgba(34,197,94,0.08)",
    borderColor: theme.colors.neonGreen ?? "#22c55e",
    color: theme.colors.neonGreen ?? "#22c55e",
  },
  menuButtonLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  menuDisabled: {
    opacity: 0.46,
    cursor: "default",
  },
  menuBullet: {
    width: 6,
    height: 6,
    borderRadius: "999px",
    background: theme.colors.neonOrange ?? "#fb923c",
  },
  main: {
    flex: 1,
    width: "100%",
    padding: 24,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardsGridTwo: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
    gap: 14,
  },
  cardsGridSingle: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 14,
  },
  card: {
    background: "rgba(15,23,42,0.96)",
    borderRadius: 18,
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 120,
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted ?? "#9ca3af",
    marginTop: 2,
  },
};

const STORAGE_LAST_ROUTE_KEY = "scc:v7:lastRoute";
const STORAGE_MENU_STATE_KEY = "scc:v7:menuState";
const STORAGE_EXEC_KEY = "eqf_v14_exec_rotina";

const RECEBIMENTO_ROUTES: Partial<Record<MenuKey, string>> = {
  "recebimento-dashboard": "/recebimento/dashboard",
  "recebimento-confirmacao-agenda": "/recebimento/confirmacao-agenda",
  "recebimento-importar-agenda-futura": "/recebimento/importar-agenda-futura",
  "recebimento-agenda": "/recebimento/agenda",
  "recebimento-fornecedores": "/recebimento/fornecedores",
  "recebimento-transportadoras": "/recebimento/transportadoras",
  "recebimento-importacao": "/recebimento/importacao",
  "recebimento-noshow-importacao": "/recebimento/noshow-importacao",
  "recebimento-noshow-dashboard": "/recebimento/noshow/dashboard",
  "recebimento-noshow-top5": "/recebimento/noshow/top5",
  "recebimento-noshow-realizado": "/recebimento/noshow/realizado",
  "recebimento-gestao-agendas": "/recebimento/gestao-agendas",
  "recebimento-ocorrencias": "/recebimento/ocorrencias",
  "recebimento-relatorios": "/recebimento/relatorios",
};

const LOJA_ROUTES: Partial<Record<MenuKey, string>> = {
  "loja-ponto-dashboard": "/loja/ponto-extra",
  "loja-ponto-importacao": "/loja/ponto-extra/importacao",
  "loja-ponto-cubagem": "/loja/ponto-extra/cubagem",
  "loja-ponto-capas": "/loja/ponto-extra/capas",
  "loja-ponto-processamento": "/loja/ponto-extra/processamento",
  "loja-ponto-simulador": "/loja/ponto-extra/simulador",
  "loja-ponto-analise": "/loja/ponto-extra/analise",
  "loja-ponto-exportacao": "/loja/ponto-extra/exportacao",
  "loja-ponto-acompanhamento": "/loja/ponto-extra/acompanhamento",
  "loja-ponto-relatorio": "/loja/ponto-extra/relatorio",
};

const appBasePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const toAppPath = (path: string) => `${appBasePath}${path}` || path;
const stripAppBase = (path: string) => {
  if (appBasePath && path.startsWith(`${appBasePath}/`)) {
    return path.slice(appBasePath.length);
  }
  return path;
};

const menuFromPath = (path: string): MenuKey | null => {
  const normalizedPath = stripAppBase(path);
  const found = [...Object.entries(RECEBIMENTO_ROUTES), ...Object.entries(LOJA_ROUTES)].find(([, route]) => route === normalizedPath);
  return (found?.[0] as MenuKey | undefined) ?? null;
};

type ShellMenuState = {
  menu: MenuKey;
  gruposMenuAbertos: {
    supply: boolean;
    kpiSetor: boolean;
    recebimento: boolean;
    recebimentoConfirmacao: boolean;
    recebimentoPlanejamento: boolean;
    recebimentoNoShow: boolean;
    recebimentoGestaoAgendas: boolean;
    loja: boolean;
    lojaPontoExtra: boolean;
  };
};

const defaultGruposMenuAbertos = () => ({
  supply: false,
  kpiSetor: false,
  recebimento: false,
  recebimentoConfirmacao: false,
  recebimentoPlanejamento: false,
  recebimentoNoShow: false,
  recebimentoGestaoAgendas: false,
  loja: false,
  lojaPontoExtra: false,
});

const readShellMenuState = (): ShellMenuState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_MENU_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShellMenuState> | null;
    if (!parsed?.menu) return null;
    return {
      menu: parsed.menu,
      gruposMenuAbertos: {
        ...defaultGruposMenuAbertos(),
        ...(parsed.gruposMenuAbertos ?? {}),
      },
    };
  } catch {
    return null;
  }
};

const writeShellMenuState = (state: ShellMenuState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_MENU_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

export const MainShellV14: React.FC<Props> = ({ perfil, onLogout }) => {
  const isN3 = perfil.nivel === "N3";
  const cardStyleN3: CSSProperties = isN3
    ? {
        ...shellStyles.card,
        borderRadius: 12,
        border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
        minHeight: "calc(100vh - 120px)",
        padding: 16,
        width: "100%",
        maxWidth: 1160,
        margin: "0 auto",
      }
    : shellStyles.card;
  const gridSingleN3: CSSProperties = isN3
    ? { ...shellStyles.cardsGridSingle, width: "100%", marginTop: 0, justifyItems: "center" }
    : shellStyles.cardsGridSingle;

  const [menu, setMenu] = useState<MenuKey>(() => {
    if (typeof window === "undefined") return "agenda";
    const byPath = menuFromPath(window.location.pathname);
    if (byPath) return byPath;
    const stored = readShellMenuState();
    if (stored?.menu && stored.menu !== "overview") return stored.menu;
    return "agenda";
  });
  const [gruposMenuAbertos, setGruposMenuAbertos] = useState(() => readShellMenuState()?.gruposMenuAbertos ?? defaultGruposMenuAbertos());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const route = RECEBIMENTO_ROUTES[menu] || LOJA_ROUTES[menu] || window.location.pathname;
    window.localStorage.setItem(STORAGE_LAST_ROUTE_KEY, route);
    writeShellMenuState({ menu, gruposMenuAbertos });
  }, [menu, gruposMenuAbertos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const byPath = menuFromPath(window.location.pathname);
      if (byPath) setMenu(byPath);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const toggleGrupoMenu = (
    grupo:
      | "supply"
      | "kpiSetor"
      | "recebimento"
      | "recebimentoConfirmacao"
      | "recebimentoPlanejamento"
      | "recebimentoNoShow"
      | "recebimentoGestaoAgendas"
      | "loja"
      | "lojaPontoExtra"
  ) => {
    setGruposMenuAbertos((prev) => ({
      ...prev,
      [grupo]: !prev[grupo],
    }));
  };

  const navegarMenu = (key: MenuKey) => {
    setMenu(key);
    const route = RECEBIMENTO_ROUTES[key];
    const lojaRoute = LOJA_ROUTES[key];
    if ((route || lojaRoute) && typeof window !== "undefined") {
      window.history.pushState(null, "", toAppPath(route || lojaRoute || "/"));
    }
  };

  const [execOpen, setExecOpen] = useState(false);
  const [rotinaSelecionada, setRotinaSelecionada] = useState<Rotina | null>(null);

  const abrirExecucao = (rotina: Rotina) => {
    setRotinaSelecionada(rotina);
    setExecOpen(true);
    try {
      window.localStorage.setItem(
        STORAGE_EXEC_KEY,
        JSON.stringify({ rotinaId: rotina.id, executorId: perfil.id })
      );
    } catch {
      // ignore
    }
  };

  const minimizarExecucao = () => {
    setExecOpen(false);
  };

  const reabrirExecucao = () => {
    if (rotinaSelecionada) setExecOpen(true);
  };

  const fecharExecucao = () => {
    setExecOpen(false);
    setRotinaSelecionada(null);
    try {
      window.localStorage.removeItem(STORAGE_EXEC_KEY);
    } catch {
      // ignore
    }
  };

  const finalizarExecucao = () => {
    fecharExecucao();
  };

  const menuItems = useMemo(() => {
    if (perfil.nivel === "N1") {
      return [
        ["rotinas", "Rotinas & Execucao"],
        ["agenda", "Agenda do dia"],
        ["kpi", "KPI"],
        ["kpi-auditoria", "KPI Auditoria"],
        ["rotinas-ativas", "Rotinas ativas"],
        ["execucao", "Execucao ao vivo"],
        ["modelos", "Modelos de rotina"],
      ] as [MenuKey, string][];
    }

    if (perfil.nivel === "N2") {
      return [
        ["rotinas", "Rotinas & Execucao"],
        ["agenda", "Agenda do dia"],
        ["kpi", "KPI"],
        ["kpi-auditoria", "KPI Auditoria"],
        ["rotinas-ativas", "Rotinas ativas"],
        ["execucao", "Execucao ao vivo"],
      ] as [MenuKey, string][];
    }

    return [
      ["rotinas", "Rotinas & Execucao"],
      ["agenda", "Agenda do dia"],
      ["kpi", "KPI"],
      ["kpi-auditoria", "KPI Auditoria"],
      ["rotinas-ativas", "Rotinas ativas"],
      ["execucao", "Execucao ao vivo"],
    ] as [MenuKey, string][];
  }, [perfil.nivel]);

  const kpiSetorItems = useMemo(
    () => [["kpi-setor", "KPI Setor"]] as [MenuKey, string][],
    []
  );

  const recebimentoConfirmacaoItems = useMemo(
    () =>
      [
        ["recebimento-confirmacao-agenda", "Confirmação de Agenda"],
        ["recebimento-importar-agenda-futura", "Importar Agenda Futura"],
        ["recebimento-fornecedores", "Fornecedores"],
        ["recebimento-transportadoras", "Transportadoras"],
      ] as [MenuKey, string][],
    []
  );

  const recebimentoItems = useMemo(
    () =>
      [
        ["recebimento-dashboard", "Dashboard Recebimento"],
        ["recebimento-agenda", "Agenda de Recebimento"],
        ["recebimento-importacao", "Importação Recebimento"],
        ["recebimento-ocorrencias", "Ocorrencias"],
        ["recebimento-relatorios", "Relatorios"],
      ] as [MenuKey, string][],
    []
  );

  const recebimentoNoShowItems = useMemo(
    () =>
      [
        ["recebimento-noshow-importacao", "Importação No Show"],
        ["recebimento-noshow-dashboard", "Dashboard No Show"],
        ["recebimento-noshow-top5", "Top 5 No Show"],
        ["recebimento-noshow-realizado", "Recebimento Realizado"],
      ] as [MenuKey, string][],
    []
  );

  const recebimentoGestaoAgendasItems = useMemo(
    () => [["recebimento-gestao-agendas", "Painel de Gestão das Agendas"]] as [MenuKey, string][],
    []
  );

  const lojaPontoExtraItems = useMemo(
    () =>
      [
        ["loja-ponto-dashboard", "Dashboard Ponto Extra"],
        ["loja-ponto-importacao", "Importar Bases"],
        ["loja-ponto-cubagem", "Cubagem"],
        ["loja-ponto-capas", "Capas de Ponta"],
        ["loja-ponto-processamento", "Processar Ponto Extra"],
        ["loja-ponto-simulador", "Simulador de Ponta"],
        ["loja-ponto-analise", "Analise da Sugestao"],
        ["loja-ponto-exportacao", "Exportacao"],
        ["loja-ponto-acompanhamento", "Acompanhamento"],
        ["loja-ponto-relatorio", "Relatorio Comercial"],
      ] as [MenuKey, string][],
    []
  );

  const renderRotinas = () => {
    if (perfil.nivel === "N1") {
      return (
        <div style={shellStyles.cardsGridSingle}>
          <div style={shellStyles.card}>
            <N1ListarRotinas perfil={perfil} />
          </div>
        </div>
      );
    }

    if (perfil.nivel === "N2") {
      return (
        <div style={shellStyles.cardsGridSingle}>
          <div style={shellStyles.card}>
            <N2ListarRotinas perfil={perfil} onAbrirExecucao={abrirExecucao} />
          </div>
        </div>
      );
    }

    return (
      <div style={gridSingleN3}>
        <div style={cardStyleN3}>
          <N3CriarRotinaAvulsa perfil={perfil} />
        </div>

        <div style={cardStyleN3}>
          <AgendaHoje perfil={perfil} autoScrollToHour={false} onAbrirExecucao={abrirExecucao} />
        </div>
      </div>
    );
  };

  const renderAgenda = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <AgendaHoje perfil={perfil} autoScrollToHour onAbrirExecucao={abrirExecucao} />
      </div>
    </div>
  );

  const renderKpi = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <KpiPageV14 perfil={perfil} />
      </div>
    </div>
  );

  const renderKpiSetor = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h1
              style={{
                margin: 0,
                color: theme.colors.neonOrange ?? "#fb923c",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              KPI Setor
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                color: theme.colors.textMuted ?? "#9ca3af",
                fontSize: 13,
              }}
            >
              Indicadores operacionais por setor para acompanhamento de rotina, execucao, aderencia e pendencias.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {[
              ["Rotinas do setor", "0"],
              ["Finalizadas", "0"],
              ["Pendentes", "0"],
              ["Aderencia", "0%"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
                  borderRadius: 12,
                  padding: 14,
                  background: "rgba(2, 6, 23, 0.45)",
                }}
              >
                <div style={{ color: theme.colors.textMuted ?? "#9ca3af", fontSize: 12 }}>{label}</div>
                <div style={{ color: theme.colors.text ?? "#fff", fontSize: 26, fontWeight: 800, marginTop: 8 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
              borderRadius: 12,
              padding: 16,
              background: "rgba(15, 23, 42, 0.72)",
              color: theme.colors.textSoft ?? "#e5e7eb",
              fontSize: 13,
            }}
          >
            Base criada para a proxima etapa: aqui vamos encaixar os filtros por setor, regional, usuario e periodo.
          </div>
        </div>
      </div>
    </div>
  );

  const renderKpiAuditoria = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <KpiAuditoria perfil={perfil} />
      </div>
    </div>
  );

  const renderRotinasAtivas = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <RotinasAtivasAdmin perfil={perfil} />
      </div>
    </div>
  );

  const renderExecucaoAoVivo = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <ExecucaoAoVivoBoard2 perfil={perfil} />
      </div>
    </div>
  );

  const renderModelos = () => (
    <div style={gridSingleN3}>
      <div style={cardStyleN3}>
        <RotinasPadraoPage usuarioLogado={perfil} />
      </div>
    </div>
  );

  const renderRecebimento = () => {
    let content: React.ReactNode;
    if (menu === "recebimento-dashboard") {
      content = <RecebimentoDashboard perfil={perfil} />;
    } else if (menu === "recebimento-confirmacao-agenda") {
      content = <RecebimentoConfirmacaoAgenda perfil={perfil} />;
    } else if (menu === "recebimento-importar-agenda-futura") {
      content = <RecebimentoImportarAgendaFutura perfil={perfil} />;
    } else if (menu === "recebimento-fornecedores") {
      content = <RecebimentoFornecedores perfil={perfil} />;
    } else if (menu === "recebimento-transportadoras") {
      content = <RecebimentoTransportadoras perfil={perfil} />;
    } else if (menu === "recebimento-importacao") {
      content = <RecebimentoImportacao perfil={perfil} />;
    } else if (menu === "recebimento-noshow-importacao") {
      content = <RecebimentoNoShowImportacao perfil={perfil} />;
    } else if (menu === "recebimento-noshow-dashboard") {
      content = <RecebimentoNoShowDashboard perfil={perfil} />;
    } else if (menu === "recebimento-noshow-top5") {
      content = <RecebimentoNoShowTop5 perfil={perfil} />;
    } else if (menu === "recebimento-noshow-realizado") {
      content = <RecebimentoRealizado perfil={perfil} />;
    } else if (menu === "recebimento-gestao-agendas") {
      content = <RecebimentoGestaoAgendas perfil={perfil} />;
    } else if (menu === "recebimento-agenda") {
      content = <RecebimentoAgenda perfil={perfil} />;
    } else if (menu === "recebimento-ocorrencias") {
      content = <RecebimentoOcorrencias perfil={perfil} />;
    } else {
      content = (
        <RecebimentoPlaceholder
          titulo="Relatorios"
          descricao="Relatorios gerenciais do recebimento por periodo, fornecedor, status, valores, caixas e paletes."
        />
      );
    }

    return (
      <div style={gridSingleN3}>
        <div style={cardStyleN3}>{content}</div>
      </div>
    );
  };

  const renderLoja = () => {
    let content: React.ReactNode;
    if (menu === "loja-ponto-importacao") {
      content = <PontoExtraImportacao perfil={perfil} />;
    } else if (menu === "loja-ponto-cubagem") {
      content = <PontoExtraCubagem />;
    } else if (menu === "loja-ponto-capas") {
      content = <PontoExtraCapas />;
    } else if (menu === "loja-ponto-processamento") {
      content = <PontoExtraProcessamento />;
    } else if (menu === "loja-ponto-simulador") {
      content = <PontoExtraSimulador perfil={perfil} />;
    } else if (menu === "loja-ponto-analise") {
      content = <PontoExtraAnalise perfil={perfil} />;
    } else if (menu === "loja-ponto-exportacao") {
      content = <PontoExtraExportacao />;
    } else if (menu === "loja-ponto-acompanhamento") {
      content = <PontoExtraAcompanhamento />;
    } else if (menu === "loja-ponto-relatorio") {
      content = <PontoExtraRelatorio />;
    } else {
      content = <PontoExtraDashboard />;
    }

    return (
      <div style={gridSingleN3}>
        <div style={cardStyleN3}>{content}</div>
      </div>
    );
  };

  return (
    <div style={shellStyles.root}>
      <aside style={shellStyles.sidebar}>
        <div style={shellStyles.logo}>
          SUPPLY CHAIN
          <br />
          CONTROL CENTER
        </div>

        <div style={shellStyles.userBox}>
          <div style={shellStyles.userName}>{perfil.nome}</div>
          <div style={shellStyles.userMeta}>
            Nivel: {perfil.nivel}
            {perfil.setor_id ? `  Setor ${perfil.setor_id}` : ""}
            {perfil.regional_id ? `  Regional ${perfil.regional_id}` : ""}
          </div>
          <button style={shellStyles.logoutButton} onClick={onLogout}>
            Sair
          </button>
        </div>

        <div>
          <div style={shellStyles.menuLabel}>Navegacao</div>
          <div style={shellStyles.menuList}>
            <div style={shellStyles.menuGroup}>
              <button
                type="button"
                onClick={() => toggleGrupoMenu("supply")}
                style={shellStyles.menuGroupTitle}
              >
                <span>Supply</span>
                <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.supply ? "-" : "+"}</span>
              </button>
              {gruposMenuAbertos.supply &&
                menuItems.map(([key, label]) => {
                  const active = menu === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => navegarMenu(key)}
                      style={{
                        ...shellStyles.menuButton,
                        ...(active ? shellStyles.menuButtonActive : {}),
                      }}
                    >
                      <span style={shellStyles.menuButtonLeft}>
                        <span style={shellStyles.menuBullet} />
                        {label}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div style={shellStyles.menuGroup}>
              <button
                type="button"
                onClick={() => toggleGrupoMenu("kpiSetor")}
                style={shellStyles.menuGroupTitle}
              >
                <span>KPI Setor</span>
                <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.kpiSetor ? "-" : "+"}</span>
              </button>
              {gruposMenuAbertos.kpiSetor &&
                kpiSetorItems.map(([key, label]) => {
                  const active = menu === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => navegarMenu(key)}
                      style={{
                        ...shellStyles.menuButton,
                        ...(active ? shellStyles.menuButtonActive : {}),
                      }}
                    >
                      <span style={shellStyles.menuButtonLeft}>
                        <span style={shellStyles.menuBullet} />
                        {label}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div style={shellStyles.menuGroup}>
              <button
                type="button"
                onClick={() => toggleGrupoMenu("recebimento")}
                style={shellStyles.menuGroupTitle}
              >
                <span>Recebimento</span>
                <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.recebimento ? "-" : "+"}</span>
              </button>
              {gruposMenuAbertos.recebimento && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGrupoMenu("recebimentoConfirmacao")}
                    style={shellStyles.menuSubGroupTitle}
                  >
                    <span>01 Gestão de Confirmação de Agenda</span>
                    <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.recebimentoConfirmacao ? "-" : "+"}</span>
                  </button>
                  {gruposMenuAbertos.recebimentoConfirmacao &&
                    recebimentoConfirmacaoItems.map(([key, label]) => {
                      const active = menu === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => navegarMenu(key)}
                          style={{
                            ...shellStyles.menuButton,
                            ...(active ? shellStyles.menuButtonActive : {}),
                          }}
                        >
                          <span style={shellStyles.menuButtonLeft}>
                            <span style={shellStyles.menuBullet} />
                            {label}
                          </span>
                        </button>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => toggleGrupoMenu("recebimentoPlanejamento")}
                    style={shellStyles.menuSubGroupTitle}
                  >
                    <span>02 Planejamento de Recebimento</span>
                    <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.recebimentoPlanejamento ? "-" : "+"}</span>
                  </button>
                  {gruposMenuAbertos.recebimentoPlanejamento &&
                    recebimentoItems.map(([key, label]) => {
                      const active = menu === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => navegarMenu(key)}
                          style={{
                            ...shellStyles.menuButton,
                            ...(active ? shellStyles.menuButtonActive : {}),
                          }}
                        >
                          <span style={shellStyles.menuButtonLeft}>
                            <span style={shellStyles.menuBullet} />
                            {label}
                          </span>
                        </button>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => toggleGrupoMenu("recebimentoNoShow")}
                    style={shellStyles.menuSubGroupTitle}
                  >
                    <span>03 Gestão Recebimento NO SHOW CD</span>
                    <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.recebimentoNoShow ? "-" : "+"}</span>
                  </button>
                  {gruposMenuAbertos.recebimentoNoShow &&
                    recebimentoNoShowItems.map(([key, label]) => {
                      const active = menu === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => navegarMenu(key)}
                          style={{
                            ...shellStyles.menuButton,
                            ...(active ? shellStyles.menuButtonActive : {}),
                          }}
                        >
                          <span style={shellStyles.menuButtonLeft}>
                            <span style={shellStyles.menuBullet} />
                            {label}
                          </span>
                        </button>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => toggleGrupoMenu("recebimentoGestaoAgendas")}
                    style={shellStyles.menuSubGroupTitle}
                  >
                    <span>04 Gestão das Agendas</span>
                    <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.recebimentoGestaoAgendas ? "-" : "+"}</span>
                  </button>
                  {gruposMenuAbertos.recebimentoGestaoAgendas &&
                    recebimentoGestaoAgendasItems.map(([key, label]) => {
                      const active = menu === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => navegarMenu(key)}
                          style={{
                            ...shellStyles.menuButton,
                            ...(active ? shellStyles.menuButtonActive : {}),
                          }}
                        >
                          <span style={shellStyles.menuButtonLeft}>
                            <span style={shellStyles.menuBullet} />
                            {label}
                          </span>
                        </button>
                      );
                    })}
                </>
              )}
            </div>

            <div style={shellStyles.menuGroup}>
              <button
                type="button"
                onClick={() => toggleGrupoMenu("loja")}
                style={shellStyles.menuGroupTitle}
              >
                <span>Loja</span>
                <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.loja ? "-" : "+"}</span>
              </button>
              {gruposMenuAbertos.loja && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGrupoMenu("lojaPontoExtra")}
                    style={shellStyles.menuSubGroupTitle}
                  >
                    <span>01 Ponto Extra</span>
                    <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.lojaPontoExtra ? "-" : "+"}</span>
                  </button>
                  {gruposMenuAbertos.lojaPontoExtra &&
                    lojaPontoExtraItems.map(([key, label]) => {
                      const active = menu === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => navegarMenu(key)}
                          style={{
                            ...shellStyles.menuButton,
                            ...(active ? shellStyles.menuButtonActive : {}),
                          }}
                        >
                          <span style={shellStyles.menuButtonLeft}>
                            <span style={shellStyles.menuBullet} />
                            {label}
                          </span>
                        </button>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main style={{ ...shellStyles.main, ...(isN3 ? { padding: 0, gap: 0 } : {}) }}>
        {menu === "rotinas" && renderRotinas()}
        {menu === "agenda" && renderAgenda()}
        {menu === "kpi" && renderKpi()}
        {menu === "kpi-setor" && renderKpiSetor()}
        {menu === "kpi-auditoria" && renderKpiAuditoria()}
        {menu === "rotinas-ativas" && renderRotinasAtivas()}
        {menu === "execucao" && renderExecucaoAoVivo()}
        {menu === "modelos" && perfil.nivel === "N1" && renderModelos()}
        {menu.startsWith("recebimento-") && renderRecebimento()}
        {menu.startsWith("loja-") && renderLoja()}

        <RotinaExecucaoContainer
          open={execOpen}
          rotina={rotinaSelecionada}
          perfil={perfil}
          onClose={minimizarExecucao}
          onRestore={reabrirExecucao}
          onDismiss={fecharExecucao}
          onFinalizada={finalizarExecucao}
        />
      </main>
    </div>
  );
};

export default MainShellV14;
