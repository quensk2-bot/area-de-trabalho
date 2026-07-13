import type { CSSProperties } from "react";
import { theme } from "../../../styles";
import { formatNumber, formatPercent } from "./pontoExtraSharedUtils";
import { montarSegmentosOcupacao, type StatusSimulacao } from "./pontoExtraOcupacaoUtils";

type Props = {
  m3Alvo: number;
  m3Utilizado: number;
  percentualOcupacao: number;
  statusSimulacao: StatusSimulacao;
  itens: Record<string, unknown>[];
};

const statusColor: Record<StatusSimulacao, string> = {
  OK: theme.colors.neonGreen,
  ESTOUROU: theme.colors.danger,
};

const segmentColor = (tipo: "produto" | "livre" | "estouro", alerta?: boolean) => {
  if (tipo === "estouro") return theme.colors.danger;
  if (tipo === "livre") return "#334155";
  if (alerta) return theme.colors.neonOrange;
  return theme.colors.neonGreen;
};

export function PontoExtraOcupacaoVisual({ m3Alvo, m3Utilizado, percentualOcupacao, statusSimulacao, itens }: Props) {
  const segmentos = montarSegmentosOcupacao(itens, m3Alvo);
  const pctLabel = formatPercent(percentualOcupacao / 100, 1);
  const proximoLimite = percentualOcupacao >= 85 && statusSimulacao === "OK";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: theme.colors.textMuted }}>Ocupacao da ponta</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: statusColor[statusSimulacao] }}>
            {pctLabel} — {statusSimulacao}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
          <span>Alvo: <strong>{formatNumber(m3Alvo, 4)} m3</strong></span>
          <span>Utilizado: <strong>{formatNumber(m3Utilizado, 4)} m3</strong></span>
          <span>Restante: <strong>{formatNumber(Math.max(m3Alvo - m3Utilizado, 0), 4)} m3</strong></span>
        </div>
      </div>

      <div
        role="img"
        aria-label={`Ocupacao ${pctLabel}, status ${statusSimulacao}`}
        style={{
          display: "flex",
          width: "100%",
          minHeight: 42,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${theme.colors.borderSoft}`,
          background: "rgba(2,6,23,0.8)",
        }}
      >
        {segmentos.length === 0 && (
          <div style={{ padding: 12, color: theme.colors.textMuted, fontSize: 12 }}>Sem produtos elegiveis para exibir.</div>
        )}
        {segmentos.map((seg) => {
          const widthPct = Math.max(seg.percentualDoTotal, seg.tipo === "produto" ? 4 : 2);
          const style: CSSProperties = {
            flex: `0 0 ${widthPct}%`,
            minWidth: seg.tipo === "produto" ? 28 : 18,
            background: segmentColor(seg.tipo, seg.alerta),
            color: seg.tipo === "livre" ? theme.colors.textMuted : "#04110a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 800,
            padding: "4px 2px",
            textAlign: "center",
            overflow: "hidden",
          };
          return (
            <div key={seg.key} title={`${seg.label}: ${formatNumber(seg.m3, 4)} m3 (${formatPercent(seg.percentualDoTotal / 100, 1)})`} style={style}>
              {seg.tipo === "produto" ? seg.label : seg.label.slice(0, 8)}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: theme.colors.textMuted }}>
        <span style={{ color: theme.colors.neonGreen }}>■ Produto elegivel</span>
        <span style={{ color: theme.colors.neonOrange }}>■ Produto com alerta</span>
        <span style={{ color: "#334155" }}>■ Espaco livre</span>
        <span style={{ color: theme.colors.danger }}>■ Estouro</span>
        {proximoLimite && <span style={{ color: theme.colors.neonYellow }}>Proximo do limite fisico</span>}
      </div>
    </div>
  );
}
