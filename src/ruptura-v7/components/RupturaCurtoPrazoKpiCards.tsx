import { cardStyle, formatNumero } from "./rupturaSharedStyles.ts";
import { theme } from "../../styles.ts";
import {
  CARD_LABEL,
  CARD_TONE,
  type CardCounts,
  type GrupoCard,
} from "../utils/curtoPrazoPresentation.ts";

type Props = {
  counts: CardCounts;
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
  grupo: GrupoCard;
  value: number;
  tone: "ok" | "warn" | "danger" | "neutral" | "orange";
}) {
  const color = TONE_COLOR[tone];
  return (
    <div style={{ ...cardStyle, maxWidth: 220, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>
        {CARD_LABEL[grupo]}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>
        {formatNumero(value)}
      </div>
    </div>
  );
}

export function RupturaCurtoPrazoKpiCards({ counts, loading }: Props) {
  if (loading) {
    return (
      <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>
        Carregando indicadores…
      </div>
    );
  }

  const cards: GrupoCard[] = [
    "total_curto_prazo",
    "havia_estoque_cd",
    "rebote_proximo",
    "sem_acao_definida",
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
          tone={CARD_TONE[grupo]}
        />
      ))}
    </div>
  );
}
