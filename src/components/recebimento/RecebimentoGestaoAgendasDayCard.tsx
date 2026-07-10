import { theme } from "../../styles";
import type { GestaoAgendaDaySummary } from "./recebimentoGestaoAgendasUtils";
import { getDateLabel, todayISO } from "./recebimentoGestaoAgendasUtils";

type Props = {
  summary: GestaoAgendaDaySummary;
  selected: boolean;
  compact?: boolean;
  onClick: (date: string) => void;
};

const cardBase: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${theme.colors.borderSoft}`,
  background: "rgba(15,23,42,0.92)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  cursor: "pointer",
  minHeight: 126,
};

const metricStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 6,
  fontSize: 11,
};

const metricLine = (label: string, value: number) => (
  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }} title={`${label}: ${value}`}>
    <span style={{ color: theme.colors.textMuted }}>{label}</span>
    <strong style={{ color: theme.colors.text }}>{value.toLocaleString("pt-BR")}</strong>
  </div>
);

export function RecebimentoGestaoAgendasDayCard({ summary, selected, compact = false, onClick }: Props) {
  const isToday = summary.data === todayISO();
  const hasRows = summary.agendas > 0;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalhes do dia ${getDateLabel(summary.data, false)}`}
      onClick={() => onClick(summary.data)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(summary.data);
        }
      }}
      style={{
        ...cardBase,
        ...(compact ? { minHeight: 116, padding: 10 } : {}),
        ...(isToday ? { boxShadow: `0 0 0 1px ${theme.colors.neonOrange} inset` } : {}),
        ...(selected ? { borderColor: theme.colors.neonGreen, background: "rgba(34,197,94,0.08)" } : {}),
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ color: theme.colors.text, fontWeight: 700, fontSize: compact ? 12 : 13, textTransform: "capitalize" }}>
            {summary.diaSemana}
          </div>
          <div style={{ color: theme.colors.textSoft, fontSize: compact ? 12 : 13 }}>{getDateLabel(summary.data, false)}</div>
        </div>
        {isToday && (
          <span
            style={{
              borderRadius: 999,
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 800,
              background: "rgba(251,146,60,0.18)",
              color: theme.colors.neonOrange,
            }}
          >
            Hoje
          </span>
        )}
      </header>

      {!hasRows ? (
        <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Sem agendas para esta data.
        </div>
      ) : (
        <>
          <div style={metricStyle}>
            {[
              metricLine("Agendas", summary.agendas),
              metricLine("Veículos", summary.veiculos),
              metricLine("Confirmadas", summary.confirmadas),
              metricLine("Pendentes", summary.pendentes),
              metricLine("Sem contato", summary.semContato),
              metricLine("Reagendadas", summary.reagendadas),
              metricLine("Canceladas", summary.canceladas),
              metricLine("Vinculadas", summary.vinculadas),
            ]}
          </div>

          {!compact && (summary.fornecedorPredominante || summary.transportadoraPredominante || summary.docaPredominante || summary.modalidadePredominante) && (
            <div style={{ borderTop: `1px dashed ${theme.colors.borderSoft}`, paddingTop: 8, fontSize: 11, color: theme.colors.textMuted }}>
              {summary.fornecedorPredominante && <div title="Fornecedor predominante">Fornecedor: {summary.fornecedorPredominante}</div>}
              {summary.transportadoraPredominante && <div title="Transportadora predominante">Transportadora: {summary.transportadoraPredominante}</div>}
              {summary.docaPredominante && <div title="Doca predominante">Doca: {summary.docaPredominante}</div>}
              {summary.modalidadePredominante && <div title="Modalidade predominante">Modalidade: {summary.modalidadePredominante}</div>}
            </div>
          )}

          {summary.dadosIncompletos && (
            <div
              style={{
                borderRadius: 8,
                padding: "5px 8px",
                fontSize: 11,
                background: "rgba(250,204,21,0.14)",
                color: theme.colors.warning,
              }}
              title="Há agendas com campos incompletos para este dia."
            >
              Dados parciais
            </div>
          )}
        </>
      )}
    </article>
  );
}
