import type { RupturaDashboardLoja } from "../types/rupturaDashboardTypes.ts";
import { theme } from "../../styles.ts";
import { cardStyle, formatNumero, formatPercentual } from "./rupturaSharedStyles.ts";

type Props = { kpi: RupturaDashboardLoja | null; loading?: boolean };

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "default" | "ok" | "warn" | "danger" }) {
  const color =
    tone === "ok"
      ? theme.colors.neonGreen
      : tone === "warn"
        ? theme.colors.warning
        : tone === "danger"
          ? theme.colors.danger
          : theme.colors.neonOrange;

  return (
    <div style={{ ...cardStyle, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export function RupturaKpiCards({ kpi, loading }: Props) {
  if (loading) {
    return <div style={{ color: theme.colors.textMuted }}>Carregando indicadores…</div>;
  }
  if (!kpi) {
    return <div style={{ color: theme.colors.textMuted }}>Nenhum KPI disponível para o contexto selecionado.</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
      <KpiCard label="Ruptura geral" value={formatNumero(kpi.total_ruptura_geral)} tone="danger" />
      <KpiCard label="Ruptura classificada" value={formatNumero(kpi.total_ruptura_classificada)} tone="danger" />
      <KpiCard label="Curto Prazo" value={formatNumero(kpi.total_curto_prazo)} />
      <KpiCard label="Médio Prazo" value={formatNumero(kpi.total_medio_prazo)} tone="warn" />
      <KpiCard label="Longo Prazo" value={formatNumero(kpi.total_longo_prazo)} />
      <KpiCard label="Bloqueados" value={formatNumero(kpi.total_bloqueado)} tone="warn" />
      <KpiCard label="Com estoque no CD" value={formatNumero(kpi.total_com_estoque_cd)} tone="ok" />
      <KpiCard label="Sem estoque no CD" value={formatNumero(kpi.total_sem_estoque_cd)} />
      <KpiCard label="% Ruptura geral (Base Limpa)" value={formatPercentual(kpi.percentual_ruptura_geral)} tone="danger" />
      <KpiCard
        label="% Ruptura classificada (Base Limpa)"
        value={formatPercentual(kpi.percentual_ruptura_classificada)}
        tone="danger"
      />
    </div>
  );
}

export function RupturaResumoTexto({ kpi }: { kpi: RupturaDashboardLoja | null }) {
  if (!kpi) return null;
  return (
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
      Na loja <strong>{kpi.loja}</strong> existem <strong>{formatNumero(kpi.total_ruptura_geral)}</strong> itens na
      ruptura geral. Destes, <strong>{formatNumero(kpi.total_ruptura_classificada)}</strong> possuem classificação
      operacional: <strong>{formatNumero(kpi.total_curto_prazo)}</strong> de curto prazo,{" "}
      <strong>{formatNumero(kpi.total_medio_prazo)}</strong> de médio prazo e{" "}
      <strong>{formatNumero(kpi.total_longo_prazo)}</strong> de longo prazo (além de{" "}
      <strong>{formatNumero(kpi.total_bloqueado)}</strong> bloqueados). Percentual sobre Base Limpa elegível:{" "}
      <strong>{formatPercentual(kpi.percentual_ruptura_geral)}</strong> ruptura geral e{" "}
      <strong>{formatPercentual(kpi.percentual_ruptura_classificada)}</strong> ruptura classificada (
      {formatNumero(kpi.total_base_limpa_elegivel)} produtos no denominador).
    </p>
  );
}
