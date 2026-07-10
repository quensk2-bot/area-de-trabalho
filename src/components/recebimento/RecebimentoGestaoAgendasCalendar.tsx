import { theme } from "../../styles";
import { RecebimentoGestaoAgendasDayCard } from "./RecebimentoGestaoAgendasDayCard";
import type { GestaoAgendaDaySummary } from "./recebimentoGestaoAgendasUtils";

type Props = {
  summaries: GestaoAgendaDaySummary[];
  selectedDay: string | null;
  mode: "7dias" | "30dias";
  onSelectDay: (day: string) => void;
};

export function RecebimentoGestaoAgendasCalendar({ summaries, selectedDay, mode, onSelectDay }: Props) {
  const minWidth = mode === "7dias" ? 260 : 220;

  if (summaries.length === 0) {
    return (
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${theme.colors.borderSoft}`,
          background: "rgba(15,23,42,0.86)",
          padding: 14,
          color: theme.colors.textMuted,
          fontSize: 13,
        }}
      >
        Sem dias disponíveis para o período selecionado.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
        gap: 10,
      }}
    >
      {summaries.map((summary) => (
        <RecebimentoGestaoAgendasDayCard
          key={summary.data}
          summary={summary}
          selected={selectedDay === summary.data}
          compact={mode === "30dias"}
          onClick={onSelectDay}
        />
      ))}
    </div>
  );
}
