import type { CSSProperties } from "react";
import { theme } from "../../../styles";

export const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  color: theme.colors.text,
};

export const titleStyle: CSSProperties = {
  margin: 0,
  color: theme.colors.neonOrange,
  fontSize: 26,
  fontWeight: 800,
};

export const descStyle: CSSProperties = {
  margin: "6px 0 0",
  color: theme.colors.textMuted,
  fontSize: 13,
};

export const cardStyle: CSSProperties = {
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 12,
  padding: 16,
  background: "rgba(15,23,42,0.72)",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 8,
  padding: "9px 10px",
  background: theme.colors.bgElevated,
  color: theme.colors.text,
  boxSizing: "border-box",
};

export const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "10px 18px",
  fontWeight: 800,
  cursor: "pointer",
  background: theme.colors.neonGreen,
  color: "#022c22",
};

export const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

export const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: `1px solid ${theme.colors.borderSoft}`,
  color: theme.colors.textMuted,
  whiteSpace: "nowrap",
};

export const tdStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1px solid ${theme.colors.borderSoft}`,
  whiteSpace: "nowrap",
};

export const warningBoxStyle: CSSProperties = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #fbbf24",
  background: "rgba(120,53,15,0.35)",
  color: "#fde68a",
  fontSize: 13,
};
