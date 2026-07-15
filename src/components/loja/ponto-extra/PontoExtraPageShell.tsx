import { useEffect, useState, type ReactNode } from "react";
import { theme } from "../../../styles";
import { PontoExtraWorkflowBar } from "./PontoExtraWorkflowBar";
import { buttonStyle, cardStyle, descStyle, inputStyle } from "./pontoExtraSharedStyles";
import { isMesVigenciaValido, monthLabel } from "./pontoExtraSharedUtils";
import {
  fetchPontoExtraWorkflowSnapshot,
  getNextStep,
  getStepById,
  navigatePontoExtraStep,
  setMesVigenciaPersistido,
  type PontoExtraStepId,
  type PontoExtraWorkflowSnapshot,
} from "./pontoExtraWorkflow";

type Props = {
  stepId: PontoExtraStepId;
  mesVigencia: string;
  onMesVigenciaChange?: (mes: string) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  hideMesSelector?: boolean;
};

export function PontoExtraPageShell({
  stepId,
  mesVigencia,
  onMesVigenciaChange,
  title,
  subtitle,
  children,
  hideMesSelector,
}: Props) {
  const [snapshot, setSnapshot] = useState<PontoExtraWorkflowSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const step = getStepById(stepId);
  const nextStep = getNextStep(stepId);

  useEffect(() => {
    if (!isMesVigenciaValido(mesVigencia)) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    void fetchPontoExtraWorkflowSnapshot(mesVigencia)
      .then(setSnapshot)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mesVigencia, stepId]);

  function handleMesChange(value: string) {
    if (!isMesVigenciaValido(value)) return;
    setMesVigenciaPersistido(value);
    onMesVigenciaChange?.(value);
  }

  const stepState = snapshot?.steps[stepId] ?? "pending";
  const proximoPasso = nextStep;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18, color: theme.colors.text }}>
      <PontoExtraWorkflowBar snapshot={snapshot} activeStepId={stepId} loading={loading} />

      <div
        style={{
          ...cardStyle,
          borderColor: theme.colors.neonOrange,
          background: "rgba(120,53,15,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: theme.colors.neonOrange, fontWeight: 800 }}>
              Passo {step.number} de 6
            </div>
            <h1 style={{ margin: "6px 0 0", color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
              {title || step.label}
            </h1>
            <p style={{ ...descStyle, marginTop: 8, maxWidth: 760 }}>
              {subtitle || step.instruction}
            </p>
          </div>
          {!hideMesSelector && (
            <label style={{ minWidth: 180 }}>
              <span style={descStyle}>Mês vigência</span>
              <input
                type="month"
                value={mesVigencia}
                onChange={(e) => handleMesChange(e.target.value)}
                style={inputStyle}
              />
            </label>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background:
                stepState === "completed"
                  ? "rgba(34,197,94,0.2)"
                  : stepState === "in_progress"
                    ? "rgba(251,146,60,0.2)"
                    : "rgba(148,163,184,0.15)",
              color:
                stepState === "completed"
                  ? theme.colors.neonGreen
                  : stepState === "in_progress"
                    ? theme.colors.neonOrange
                    : theme.colors.textMuted,
            }}
          >
            {stepState === "completed" ? "Passo concluído" : stepState === "in_progress" ? "Passo em andamento" : "Passo pendente"}
          </span>
          <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
            {monthLabel(mesVigencia)} · {step.nextAction}
          </span>
          {proximoPasso && (
            <button
              type="button"
              onClick={() => navigatePontoExtraStep(proximoPasso.path)}
              style={{ ...buttonStyle, marginLeft: "auto" }}
            >
              Próximo: {proximoPasso.number}. {proximoPasso.shortLabel} →
            </button>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}
