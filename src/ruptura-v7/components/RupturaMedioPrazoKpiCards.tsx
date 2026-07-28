import { cardStyle, formatNumero } from "./rupturaSharedStyles.ts";
import { theme } from "../../styles.ts";
import {
  CARD_LABEL_MP,
  CARD_TONE_MP,
  type CardCountsMp,
  type GrupoCardMp,
} from "../utils/medioPrazoPresentation.ts";

type Props = {
  counts: CardCountsMp;
  loading?: boolean;
};

const TONE_COLOR: Record<string, string> = {
  ok: theme.colors.neonGreen ?? "#22c55e",
  warn: theme.colors.warning ?? "#facc15",
  danger: theme.colors.danger ?? "#f87171",
  neutral: theme.colors.textMuted ?? "#94a3b8",
  orange: theme.colors.neonOrange ?? "#fb923c",
};

function KpiCard({
  grupo,
  value,
  tone,
}: {
  grupo: GrupoCardMp;
  value: number;
  tone: "ok" | "warn" | "danger" | "neutral" | "orange";
}) {
  const color = TONE_COLOR[tone];
  return (
    <div style={{ ...cardStyle, maxWidth: 220, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>
        {CARD_LABEL_MP[grupo]}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>
        {formatNumero(value)}
      </div>
    </div>
  );
}

export function RupturaMedioPrazoKpiCards({ counts, loading }: Props) {
  if (loading) {
    return (
      <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>
        Carregando indicadores…
      </div>
    );
  }

  const cards: GrupoCardMp[] = [
    "total_medio_prazo",
    "pedido_dentro_prazo",
    "avaliar_pedido",
    "superior_60_dias",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {cards.map((grupo) => (
        <KpiCard
          key={grupo}
          grupo={grupo}
          value={counts[grupo]}
          tone={CARD_TONE_MP[grupo]}
        />
      ))}
    </div>
  );
}
