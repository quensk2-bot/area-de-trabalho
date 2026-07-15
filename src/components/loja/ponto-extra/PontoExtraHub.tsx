import { useEffect, useState } from "react";
import { theme } from "../../../styles";
import { PontoExtraWorkflowBar } from "./PontoExtraWorkflowBar";
import { buttonStyle, cardStyle, descStyle, gridStyle, inputStyle, titleStyle } from "./pontoExtraSharedStyles";
import { currentMonthKey, isMesVigenciaValido, monthLabel } from "./pontoExtraSharedUtils";
import {
  fetchPontoExtraWorkflowSnapshot,
  getMesVigenciaPersistido,
  navigatePontoExtraStep,
  PONTO_EXTRA_WORKFLOW_STEPS,
  setMesVigenciaPersistido,
  type PontoExtraWorkflowSnapshot,
} from "./pontoExtraWorkflow";

export function PontoExtraHub() {
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [snapshot, setSnapshot] = useState<PontoExtraWorkflowSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isMesVigenciaValido(mesVigencia)) return;
    setLoading(true);
    void fetchPontoExtraWorkflowSnapshot(mesVigencia)
      .then(setSnapshot)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mesVigencia]);

  const proximo = snapshot
    ? PONTO_EXTRA_WORKFLOW_STEPS.find((step) => snapshot.steps[step.id] !== "completed")
    : PONTO_EXTRA_WORKFLOW_STEPS[0];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18, color: theme.colors.text }}>
      <div>
        <h1 style={titleStyle}>Ponto Extra — Ciclo Mensal</h1>
        <p style={descStyle}>
          Siga os 6 passos numerados. A barra de status mostra o que já foi feito e qual é o próximo passo.
        </p>
      </div>

      <div style={cardStyle}>
        <label>
          <span style={descStyle}>Mês vigência do ciclo</span>
          <input
            type="month"
            value={mesVigencia}
            onChange={(e) => {
              const value = e.target.value || currentMonthKey();
              setMesVigencia(value);
              setMesVigenciaPersistido(value);
            }}
            style={{ ...inputStyle, maxWidth: 220 }}
          />
        </label>
      </div>

      <PontoExtraWorkflowBar snapshot={snapshot} activeStepId={snapshot?.currentStepId ?? "importar"} loading={loading} />

      {proximo && (
        <div style={{ ...cardStyle, borderColor: theme.colors.neonGreen }}>
          <div style={{ fontSize: 12, color: theme.colors.neonGreen, fontWeight: 800 }}>Próximo passo</div>
          <h2 style={{ margin: "8px 0", color: theme.colors.text, fontSize: 20 }}>
            {proximo.number}. {proximo.label}
          </h2>
          <p style={descStyle}>{proximo.instruction}</p>
          <button type="button" onClick={() => navigatePontoExtraStep(proximo.path)} style={{ ...buttonStyle, marginTop: 12 }}>
            Ir para o passo {proximo.number}
          </button>
        </div>
      )}

      <div style={gridStyle}>
        {PONTO_EXTRA_WORKFLOW_STEPS.map((step) => {
          const state = snapshot?.steps[step.id] ?? "pending";
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => navigatePontoExtraStep(step.path)}
              style={{
                ...cardStyle,
                textAlign: "left",
                cursor: "pointer",
                borderColor: state === "completed" ? theme.colors.neonGreen : theme.colors.borderSoft,
              }}
            >
              <div style={{ fontSize: 12, color: theme.colors.textMuted }}>Passo {step.number}</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>{step.label}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: theme.colors.textMuted }}>{step.instruction}</div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  color: state === "completed" ? theme.colors.neonGreen : theme.colors.neonOrange,
                }}
              >
                {state === "completed" ? "Concluído" : state === "in_progress" ? "Em andamento — clique para continuar" : "Pendente"}
              </div>
            </button>
          );
        })}
      </div>

      {snapshot && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Resumo do mês — {monthLabel(mesVigencia)}</h2>
          <div style={gridStyle}>
            <Metric label="Base ponta" value={snapshot.details.basePonta} />
            <Metric label="Média de venda" value={snapshot.details.mediaVenda} />
            <Metric label="Estoque CDs" value={snapshot.details.estoqueCd} />
            <Metric label="Capas com código" value={`${snapshot.details.capasComCodigo}/${snapshot.details.capasTotal}`} />
            <Metric label="Processados" value={snapshot.details.processados} />
            <Metric label="Aprovados" value={`${snapshot.details.aprovados}/${snapshot.details.elegiveis}`} />
            <Metric label="Com alerta" value={snapshot.details.comAlerta} />
            <Metric label="Cubagem cadastrada" value={snapshot.details.cubagem} />
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ ...cardStyle, margin: 0, padding: 14 }}>
      <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
