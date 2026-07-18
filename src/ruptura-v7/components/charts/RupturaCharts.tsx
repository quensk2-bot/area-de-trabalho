import type { CSSProperties } from "react";
import { theme } from "../../../styles.ts";

type BarItem = { label: string; value: number; color: string };

type Props = {
  items: BarItem[];
  height?: number;
  emptyLabel?: string;
};

export function BarChartSvg({ items, height = 180, emptyLabel = "Sem dados" }: Props) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const barWidth = items.length ? Math.min(48, 320 / items.length) : 40;
  const gap = 8;
  const width = items.length * (barWidth + gap) + 24;
  const chartHeight = height - 40;

  if (!items.length || items.every((i) => i.value === 0)) {
    return <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{emptyLabel}</div>;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de barras">
      {items.map((item, idx) => {
        const h = (item.value / max) * chartHeight;
        const x = 12 + idx * (barWidth + gap);
        const y = chartHeight - h + 8;
        return (
          <g key={item.label}>
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={item.color} />
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fill={theme.colors.textMuted} fontSize="10">
              {item.label.length > 8 ? `${item.label.slice(0, 7)}…` : item.label}
            </text>
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill={theme.colors.text} fontSize="10">
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type DonutSlice = { label: string; value: number; color: string };

export function DonutChartSvg({ slices, size = 160 }: { slices: DonutSlice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem dados</div>;
  }

  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;

  const paths = slices.map((slice) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += slice.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return <path key={slice.label} d={d} fill={slice.color} stroke="#020617" strokeWidth={1} />;
  });

  const legendStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12 };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} role="img" aria-label="Gráfico donut">
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#020617" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={theme.colors.text} fontSize="14" fontWeight="700">
          {total}
        </text>
      </svg>
      <div style={legendStyle}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span>{s.label}: {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBarChartSvg({
  items,
  maxItems = 10,
}: {
  items: { label: string; value: number; color?: string }[];
  maxItems?: number;
}) {
  const top = items.slice(0, maxItems);
  const max = Math.max(1, ...top.map((i) => i.value));
  const barColor = theme.colors.neonOrange ?? "#fb923c";

  if (!top.length) return <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem dados</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {top.map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div style={{ background: "rgba(51,65,85,0.5)", borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div
              style={{
                width: `${(item.value / max) * 100}%`,
                height: "100%",
                background: item.color ?? barColor,
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
