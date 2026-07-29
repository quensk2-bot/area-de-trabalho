import type { RupturaDashboardLoja } from "../types/rupturaDashboardTypes.ts";
import { theme } from "../../styles.ts";
import { cardStyle, formatNumero, formatPercentual } from "./rupturaSharedStyles.ts";

type Props = { kpi: RupturaDashboardLoja | null; loading?: boolean };

function KpiCard({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent?: string | null;
  tone?: "default" | "ok" | "warn" | "danger" | "orange";
}) {
  const color =
    tone === "ok"
      ? theme.colors.neonGreen ?? "#22c55e"
      : tone === "warn"
        ? theme.colors.warning ?? "#facc15"
        : tone === "danger"
          ? theme.colors.danger ?? "#f87171"
          : tone === "orange"
            ? theme.colors.neonOrange ?? "#fb923c"
            : theme.colors.textMain ?? "#ffffff";

  const isWithPercent = percent != null && percent !== "";

  return (
    <div style={{ ...cardStyle, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: isWithPercent ? (theme.colors.textMain ?? "#ffffff") : color }}>
        {value}
        {isWithPercent ? <span style={{ color, marginLeft: 4 }}>/ {percent}</span> : null}
      </div>
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

  const totalClassificada = kpi.total_ruptura_classificada;
  const pctClassificada = formatPercentual(kpi.percentual_ruptura_classificada);
  const pctCp = totalClassificada > 0 ? formatPercentual((kpi.total_curto_prazo / totalClassificada) * 100) : "0%";
  const pctMp = totalClassificada > 0 ? formatPercentual((kpi.total_medio_prazo / totalClassificada) * 100) : "0%";
  const pctLp = totalClassificada > 0 ? formatPercentual((kpi.total_longo_prazo / totalClassificada) * 100) : "0%";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
      <KpiCard label="SKU Liberado" value={formatNumero(kpi.total_base_limpa_elegivel)} />
      <KpiCard label="Ruptura geral" value={formatNumero(kpi.total_ruptura_geral)} tone="danger" />
      <KpiCard label="Ruptura classificada" value={formatNumero(kpi.total_ruptura_classificada)} percent={pctClassificada} tone="danger" />
      <KpiCard label="Curto Prazo" value={formatNumero(kpi.total_curto_prazo)} percent={pctCp} tone="orange" />
      <KpiCard label="Médio Prazo" value={formatNumero(kpi.total_medio_prazo)} percent={pctMp} tone="warn" />
      <KpiCard label="Longo Prazo" value={formatNumero(kpi.total_longo_prazo)} percent={pctLp} tone="danger" />
      <KpiCard label="Com estoque no CD" value={formatNumero(kpi.total_com_estoque_cd)} tone="ok" />
      <KpiCard label="Sem estoque no CD" value={formatNumero(kpi.total_sem_estoque_cd)} />
    </div>
  );
}

export function RupturaResumoTexto({ kpi, multiLoja }: { kpi: RupturaDashboardLoja | null; multiLoja?: boolean }) {
  if (!kpi) return null;
  const escopoLoja =
    kpi.loja === 0 || multiLoja ? "nas lojas selecionadas" : `na loja ${kpi.loja}`;
  const totalClassificada = kpi.total_ruptura_classificada;
  const pctClassificada = formatPercentual(kpi.percentual_ruptura_classificada);
  const pctCp = totalClassificada > 0 ? formatPercentual((kpi.total_curto_prazo / totalClassificada) * 100) : "0%";
  const pctMp = totalClassificada > 0 ? formatPercentual((kpi.total_medio_prazo / totalClassificada) * 100) : "0%";
  const pctLp = totalClassificada > 0 ? formatPercentual((kpi.total_longo_prazo / totalClassificada) * 100) : "0%";

  return (
    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: theme.colors.textMuted }}>
      {escopoLoja.charAt(0).toUpperCase() + escopoLoja.slice(1)} possuem{" "}
      <strong style={{ color: theme.colors.textMain }}>{formatNumero(kpi.total_base_limpa_elegivel)}</strong> SKUs liberados na base limpa. Destes,{" "}
      <strong style={{ color: theme.colors.textMain }}>{formatNumero(kpi.total_ruptura_geral)}</strong> estão na ruptura geral e{" "}
      <strong style={{ color: theme.colors.danger }}>{formatNumero(kpi.total_ruptura_classificada)} / {pctClassificada}</strong> na ruptura classificada:{" "}
      <strong style={{ color: theme.colors.neonOrange }}>{formatNumero(kpi.total_curto_prazo)} / {pctCp}</strong> curto prazo,{" "}
      <strong style={{ color: theme.colors.warning }}>{formatNumero(kpi.total_medio_prazo)} / {pctMp}</strong> médio prazo e{" "}
      <strong style={{ color: theme.colors.danger }}>{formatNumero(kpi.total_longo_prazo)} / {pctLp}</strong> longo prazo (percentuais sobre a ruptura classificada).
    </p>
  );
}
