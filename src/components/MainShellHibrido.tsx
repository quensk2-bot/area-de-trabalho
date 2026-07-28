import type React from "react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { theme } from "../styles";
import {
  useAuthV7,
  canAdminUsuarios,
  canProcessDrive,
  canProcessRuptura,
  canViewDrive,
  canViewRuptura,
  toPermissionContext,
} from "../auth-v7";
import {
  RupturaBaseCompradorPage,
  RupturaCompradorPage,
  RupturaCurtoPrazoPage,
  RupturaDashboardPage,
  RupturaGestaoPage,
  RupturaImportacaoDrivePage,
  RupturaLojaPage,
  RupturaLongoPrazoPage,
  RupturaMedioPrazoPage,
} from "../ruptura-v7/RupturaPages";
import { MeuPerfilHibridoPage } from "./MeuPerfilHibridoPage";
import { AdminUsuariosHibridoPlaceholder } from "./AdminUsuariosHibridoPlaceholder";
import {
  menuFromPathname,
  routeFromMenu,
  type MenuKey,
} from "./mainShellHibridoRoutes.ts";

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
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.colors.neonOrange ?? "#fb923c",
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted ?? "#9ca3af",
    marginTop: 4,
  },
  userBox: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(15, 23, 42, 0.9)",
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
  },
  menuList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 8,
  },
  menuItem: {
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    border: "1px solid transparent",
    background: "transparent",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "left",
    width: "100%",
  },
  menuItemActive: {
    background: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.35)",
    color: theme.colors.neonGreen ?? "#22c55e",
    fontWeight: 600,
  },
  menuItemDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  menuGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingTop: 4,
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
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 8,
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
    width: "calc(100% - 8px)",
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
  menuSubItem: {
    padding: "8px 12px 8px 22px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    border: "1px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "left",
    width: "100%",
  },
  menuBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: theme.colors.neonOrange ?? "#fb923c",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    padding: 20,
    boxSizing: "border-box",
    overflow: "auto",
  },
  card: {
    borderRadius: 16,
    border: `1px solid ${theme.colors.borderSoft ?? "#1f2937"}`,
    background: "rgba(15,23,42,0.72)",
    padding: 20,
    minHeight: "calc(100vh - 48px)",
  },
  logoutButton: {
    marginTop: "auto",
    alignSelf: "flex-start",
    padding: "6px 12px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: theme.colors.neonGreen ?? "#22c55e",
    color: "#022c22",
    fontSize: 12,
    fontWeight: 600,
  },
  frozenNote: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    border: "1px dashed #374151",
    fontSize: 11,
    color: theme.colors.textMuted ?? "#9ca3af",
  },
};

export function MainShellHibrido() {
  const auth = useAuthV7();
  const ctx = useMemo(
    () =>
      auth.perfil
        ? toPermissionContext({
            perfil: auth.perfil,
            regionais: auth.regionais,
            bandeiras: auth.bandeiras,
            lojas: auth.lojas,
            permissoes: auth.permissoes,
          })
        : null,
    [auth],
  );

  const [menu, setMenu] = useState<MenuKey>(() => menuFromPathname(window.location.pathname));
  const [gruposMenuAbertos, setGruposMenuAbertos] = useState({
    loja: true,
    lojaRuptura: true,
  });

  const showRuptura = ctx ? canViewRuptura(ctx) : false;
  const showDrive = ctx ? canViewDrive(ctx) : false;
  const showGestao = showRuptura;
  const showProcessar = ctx ? canProcessRuptura(ctx) || canProcessDrive(ctx) : false;
  const showAdmin = ctx ? canAdminUsuarios(ctx) : false;
  const showLoja = showRuptura || showDrive;

  const lojaRupturaItems = useMemo(
    () =>
      [
        ["ruptura-dashboard", "Dashboard Capa", showRuptura],
        ["ruptura-loja", "Dashboard Loja", showRuptura],
        ["ruptura-comprador", "Dashboard Comprador", showRuptura],
        ["ruptura-base-comprador", "Base Comprador", showRuptura],
        ["ruptura-curto-prazo", "Curto Prazo", showRuptura],
        ["ruptura-medio-prazo", "Médio Prazo", showRuptura],
        ["ruptura-longo-prazo", "Longo Prazo", showRuptura],
        ["ruptura-gestao", "Gestão", showGestao],
        ["ruptura-importacao", "Importação Drive", showDrive],
      ] as const,
    [showRuptura, showGestao, showDrive],
  );

  useEffect(() => {
    const onPopState = () => {
      const nextMenu = menuFromPathname(window.location.pathname);
      setMenu(nextMenu);
      if (nextMenu.startsWith("ruptura-")) {
        setGruposMenuAbertos({ loja: true, lojaRuptura: true });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const toggleGrupoMenu = (grupo: "loja" | "lojaRuptura") => {
    setGruposMenuAbertos((prev) => ({ ...prev, [grupo]: !prev[grupo] }));
  };

  const navegarMenu = (key: MenuKey) => {
    const route = routeFromMenu(key);
    if (window.location.pathname !== route) window.history.pushState({}, "", route);
    setMenu(key);
    if (key.startsWith("ruptura-")) {
      setGruposMenuAbertos({ loja: true, lojaRuptura: true });
    }
  };

  const renderContent = () => {
    if (menu === "inicio") {
      return (
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f97316" }}>Área de Trabalho V7</h1>
          <p style={{ marginTop: 8, color: theme.colors.textSoft }}>
            Modo híbrido — auth, perfis e permissões no Supabase leve; dados operacionais via Drive/Worker.
          </p>
          <div style={{ marginTop: 20, display: "grid", gap: 12, maxWidth: 520 }}>
            <InfoRow label="Nível" value={auth.perfil?.nivel ?? "—"} />
            <InfoRow label="Regionais" value={auth.regionais.map((r) => r.regional).join(", ") || "—"} />
            <InfoRow label="Bandeiras" value={auth.bandeiras.map((b) => `${b.regional}/${b.bandeira}`).join(", ") || "—"} />
            <InfoRow label="Lojas" value={auth.lojas.map((l) => String(l.loja)).join(", ") || "—"} />
            <InfoRow label="Permissões" value={auth.permissoes.join(", ") || "—"} />
          </div>
          {!showProcessar && auth.perfil?.nivel === "GERENTE_LOJA" ? (
            <p style={{ marginTop: 16, fontSize: 13, color: "#fbbf24" }}>
              Perfil de loja: visualização da loja vinculada. Processamento e Worker indisponíveis.
            </p>
          ) : null}
        </div>
      );
    }

    if (menu === "ruptura-dashboard" && showRuptura) {
      return (
        <RupturaDashboardPage onAbrirGestao={() => navegarMenu("ruptura-gestao")} />
      );
    }

    if (menu === "ruptura-loja" && showRuptura) {
      return (
        <RupturaLojaPage onAbrirGestao={() => navegarMenu("ruptura-gestao")} />
      );
    }

    if (menu === "ruptura-comprador" && showRuptura) {
      return (
        <RupturaCompradorPage onAbrirGestao={() => navegarMenu("ruptura-gestao")} />
      );
    }

    if (menu === "ruptura-base-comprador" && showRuptura) {
      return (
        <RupturaBaseCompradorPage onAbrirGestao={() => navegarMenu("ruptura-gestao")} />
      );
    }

    if (menu === "ruptura-curto-prazo" && showRuptura) {
      return <RupturaCurtoPrazoPage />;
    }

    if (menu === "ruptura-medio-prazo" && showRuptura) {
      return <RupturaMedioPrazoPage />;
    }

    if (menu === "ruptura-longo-prazo" && showRuptura) {
      return <RupturaLongoPrazoPage />;
    }

    if (menu === "ruptura-gestao" && showGestao) {
      return (
        <>
          {!showProcessar ? (
            <p style={{ fontSize: 12, color: "#fbbf24", marginBottom: 12 }}>
              Modo somente leitura — processamento indisponível para este perfil.
            </p>
          ) : null}
          <RupturaGestaoPage />
        </>
      );
    }

    if (menu === "ruptura-importacao" && showDrive) {
      return (
        <>
          {!showProcessar ? (
            <p style={{ fontSize: 12, color: "#fbbf24", marginBottom: 12 }}>
              Validação/visualização permitida; processamento requer permissão adicional.
            </p>
          ) : null}
          <RupturaImportacaoDrivePage />
        </>
      );
    }

    if (menu === "admin-usuarios" && showAdmin) {
      return <AdminUsuariosHibridoPlaceholder />;
    }

    if (menu === "meu-perfil") {
      return <MeuPerfilHibridoPage />;
    }

    return (
      <div>
        <h2 style={{ fontSize: 18 }}>Módulo indisponível</h2>
        <p style={{ color: "#f97373", marginTop: 8 }}>Você não possui permissão para acessar este módulo.</p>
      </div>
    );
  };

  const menuButton = (key: MenuKey, label: string, enabled: boolean) => (
      <button
        type="button"
        key={key}
        disabled={!enabled}
        style={{
          ...shellStyles.menuItem,
          ...(menu === key ? shellStyles.menuItemActive : {}),
          ...(!enabled ? shellStyles.menuItemDisabled : {}),
        }}
        onClick={() => enabled && navegarMenu(key)}
      >
        {label}
      </button>
  );

  const menuSubButton = (key: MenuKey, label: string, enabled: boolean) => (
    <button
      type="button"
      key={key}
      disabled={!enabled}
      style={{
        ...shellStyles.menuSubItem,
        ...(menu === key ? shellStyles.menuItemActive : {}),
        ...(!enabled ? shellStyles.menuItemDisabled : {}),
      }}
      onClick={() => enabled && navegarMenu(key)}
    >
      <span style={shellStyles.menuBullet} aria-hidden />
      {label}
    </button>
  );

  return (
    <div style={shellStyles.root}>
      <aside style={shellStyles.sidebar}>
        <div>
          <div style={shellStyles.logo}>Área de Trabalho V7</div>
          <div style={shellStyles.subtitle}>Arquitetura híbrida</div>
        </div>

        <div style={shellStyles.userBox}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{auth.perfil?.nome}</div>
          <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{auth.perfil?.email}</div>
          <div style={{ fontSize: 11, color: theme.colors.neonOrange, marginTop: 4 }}>{auth.perfil?.nivel}</div>
        </div>

        <nav style={shellStyles.menuList}>
          {menuButton("inicio", "Início", true)}
          {showLoja ? (
            <div style={shellStyles.menuGroup}>
              <button
                type="button"
                onClick={() => toggleGrupoMenu("loja")}
                style={shellStyles.menuGroupTitle}
              >
                <span>Loja</span>
                <span style={shellStyles.menuGroupIcon}>{gruposMenuAbertos.loja ? "−" : "+"}</span>
              </button>
              {gruposMenuAbertos.loja ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGrupoMenu("lojaRuptura")}
                    style={shellStyles.menuSubGroupTitle}
                  >
                    <span>Ruptura</span>
                    <span style={shellStyles.menuGroupIcon}>
                      {gruposMenuAbertos.lojaRuptura ? "−" : "+"}
                    </span>
                  </button>
                  {gruposMenuAbertos.lojaRuptura
                    ? lojaRupturaItems.map(([key, label, enabled]) =>
                        menuSubButton(key, label, enabled),
                      )
                    : null}
                </>
              ) : null}
            </div>
          ) : null}
          {menuButton("admin-usuarios", "Administração de usuários", showAdmin)}
          {menuButton("meu-perfil", "Meu Perfil", true)}
        </nav>

        <div style={shellStyles.frozenNote}>
          Indisponível nesta fase: Recebimento, Ponto Extra, Rotinas/KPI, Visão 360, Central de Ações, Execuções antigas.
        </div>

        <button type="button" style={shellStyles.logoutButton} onClick={() => void auth.signOut()}>
          Sair
        </button>
      </aside>

      <main style={shellStyles.main}>
        <div style={shellStyles.card}>{renderContent()}</div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ color: theme.colors.textMuted }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default MainShellHibrido;
