import type { CSSProperties } from "react";
import { theme } from "../../styles.ts";

export const cardStyle: CSSProperties = {
  border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
  borderRadius: 14,
  padding: 16,
  background: "rgba(15, 23, 42, 0.85)",
};

export const inputStyle: CSSProperties = {
  background: "#0f172a",
  border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
  borderRadius: 8,
  color: theme.colors.text ?? "#f9fafb",
  padding: "8px 10px",
  fontSize: 13,
  minWidth: 120,
};

export const buttonStyle: CSSProperties = {
  background: theme.colors.neonOrange ?? "#fb923c",
  color: "#0f172a",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
};

export const buttonGhostStyle: CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: theme.colors.neonOrange ?? "#fb923c",
  border: `1px solid ${theme.colors.neonOrange ?? "#fb923c"}`,
};

export const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
  color: theme.colors.neonOrange ?? "#fb923c",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export const tdStyle: CSSProperties = {
  padding: "8px",
  borderBottom: `1px solid rgba(51,65,85,0.5)`,
  verticalAlign: "top",
};

export const helpTextStyle: CSSProperties = {
  fontSize: 12,
  color: theme.colors.textMuted ?? "#94a3b8",
  lineHeight: 1.5,
};

export const badgeStyle = (tone: "ok" | "warn" | "danger" | "neutral"): CSSProperties => {
  const colors = {
    ok: { bg: "rgba(34,197,94,0.15)", fg: theme.colors.neonGreen ?? "#22c55e" },
    warn: { bg: "rgba(250,204,21,0.15)", fg: theme.colors.warning ?? "#facc15" },
    danger: { bg: "rgba(248,113,113,0.15)", fg: theme.colors.danger ?? "#f87171" },
    neutral: { bg: "rgba(148,163,184,0.12)", fg: theme.colors.textMuted ?? "#94a3b8" },
  }[tone];
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: colors.bg,
    color: colors.fg,
  };
};

export const CLASSIFICACAO_LABEL: Record<string, string> = {
  curto_prazo: "CP",
  medio_prazo: "MP",
  longo_prazo: "LP",
  sem_ruptura: "Sem ruptura",
  bloqueado: "Bloqueado",
  dados_incompletos: "Dados incompletos",
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

export function formatNumero(valor: number | null | undefined, casas = 0): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas });
}

export function formatPercentual(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function hashReduzido(hash: string | null | undefined): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}
