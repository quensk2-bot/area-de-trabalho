import { theme } from "../../../styles";
import {
  PONTO_EXTRA_WORKFLOW_STEPS,
  type PontoExtraStepId,
  type PontoExtraWorkflowSnapshot,
  navigatePontoExtraStep,
} from "./pontoExtraWorkflow";

type Props = {
  snapshot: PontoExtraWorkflowSnapshot | null;
  activeStepId: PontoExtraStepId;
  loading?: boolean;
};

const statusColor = (state: string, isActive: boolean) => {
  if (state === "completed") return theme.colors.neonGreen;
  if (isActive) return theme.colors.neonOrange;
  return theme.colors.textMuted;
};

export function PontoExtraWorkflowBar({ snapshot, activeStepId, loading }: Props) {
  const progresso = snapshot?.progressoPct ?? 0;

  return (
    <div
      style={{
        border: `1px solid ${theme.colors.borderSoft}`,
        borderRadius: 12,
        padding: 16,
        background: "rgba(15,23,42,0.85)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Ciclo mensal
          </div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: theme.colors.neonGreen }}>
            {loading ? "Carregando status..." : `${progresso}% concluído`}
          </div>
        </div>
        {snapshot?.cicloCompleto && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.15)",
              color: theme.colors.neonGreen,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Ciclo completo
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          height: 6,
          borderRadius: 999,
          background: "rgba(148,163,184,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progresso}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${theme.colors.neonGreen}, ${theme.colors.neonOrange})`,
            transition: "width 0.25s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
        }}
      >
        {PONTO_EXTRA_WORKFLOW_STEPS.map((step) => {
          const state = snapshot?.steps[step.id] ?? "pending";
          const isActive = step.id === activeStepId;
          const color = statusColor(state, isActive);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => navigatePontoExtraStep(step.path)}
              style={{
                border: `1px solid ${isActive ? theme.colors.neonOrange : theme.colors.borderSoft}`,
                borderRadius: 10,
                padding: "10px 12px",
                background: isActive ? "rgba(251,146,60,0.12)" : "rgba(2,6,23,0.45)",
                color: theme.colors.text,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    background: state === "completed" ? "rgba(34,197,94,0.2)" : "rgba(148,163,184,0.15)",
                    color,
                  }}
                >
                  {state === "completed" ? "✓" : step.number}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{step.shortLabel}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: theme.colors.textMuted }}>
                {state === "completed" ? "Concluído" : state === "in_progress" ? "Em andamento" : "Pendente"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
