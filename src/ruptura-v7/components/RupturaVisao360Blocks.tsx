import type { CSSProperties } from "react";
import { theme } from "../../styles.ts";
import { formatNumero, formatPercentual } from "./rupturaSharedStyles.ts";
import type { RupturaOficialLoja } from "../types/rupturaOficialTypes.ts";

type Props = {
  kpi: RupturaOficialLoja;
  modo: "oficial" | "v7";
};

type Item = {
  label: string;
  valor: string;
  destaque?: boolean;
  naoPublicado?: boolean;
};

function fmt(val: number | null | undefined, pct = false): string {
  if (val == null) return "—";
  return pct ? formatPercentual(val) : formatNumero(val);
}

function bloco(titulo: string, cor: string, itens: Item[], horizontal: boolean): JSX.Element {
  return (
    <div
      style={{
        border: `1px solid ${cor}`,
        borderRadius: horizontal ? 10 : 14,
        overflow: "hidden",
        flex: horizontal ? "1 1 160px" : undefined,
        minWidth: horizontal ? 140 : undefined,
      }}
    >
      <div style={{ background: cor, color: "#0f172a", padding: "8px 12px", fontWeight: 800, fontSize: 12 }}>{titulo}</div>
      <div style={{ padding: horizontal ? "10px 12px" : 14, display: "flex", flexDirection: horizontal ? "row" : "column", flexWrap: "wrap", gap: horizontal ? 16 : 8 }}>
        {itens.map((item) => (
          <div key={item.label} style={{ minWidth: horizontal ? 80 : undefined }}>
            <div style={{ fontSize: 10, color: theme.colors.textMuted, textTransform: "uppercase" }}>{item.label}</div>
            <div
              style={{
                fontSize: item.destaque ? 20 : 15,
                fontWeight: 700,
                color: item.naoPublicado ? theme.colors.textMuted : theme.colors.text,
              }}
            >
              {item.naoPublicado ? "Não publicado" : item.valor}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RupturaVisao360Blocks({ kpi, modo }: Props) {
  const horizontal = modo === "oficial";
  const wrapStyle: CSSProperties = horizontal
    ? { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }
    : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 };

  const verde = theme.colors.neonGreen ?? "#22c55e";
  const amarelo = theme.colors.warning ?? "#facc15";
  const vermelho = theme.colors.danger ?? "#f87171";
  const laranja = theme.colors.neonOrange ?? "#fb923c";

  return (
    <div style={wrapStyle}>
      {bloco(
        "Ruptura",
        "#334155",
        [
          { label: "SKUs", valor: fmt(kpi.total_skus), destaque: true },
          { label: "Ruptura", valor: fmt(kpi.total_ruptura), destaque: true },
          { label: "%", valor: fmt(kpi.pct_ruptura, true), destaque: true },
        ],
        horizontal,
      )}
      {bloco(
        "Curto Prazo",
        verde,
        [
          { label: "Total CP", valor: fmt(kpi.total_curto_prazo) },
          { label: "Itens Cross", valor: fmt(kpi.total_itens_cross) },
          { label: "Havia estoque CD", valor: fmt(kpi.havia_estoque_no_cd), naoPublicado: kpi.havia_estoque_no_cd == null },
          { label: "Receb. próximo", valor: fmt(kpi.recebimento_proximo), naoPublicado: kpi.recebimento_proximo == null },
          { label: "Média dias receb.", valor: fmt(kpi.media_dias_recebimento_cd), naoPublicado: kpi.media_dias_recebimento_cd == null },
          { label: "% CP", valor: fmt(kpi.pct_curto_prazo, true) },
        ],
        horizontal,
      )}
      {bloco(
        "Médio Prazo",
        amarelo,
        [
          { label: "Total MP", valor: fmt(kpi.total_medio_prazo) },
          { label: "Pedido > 30", valor: fmt(kpi.pedido_maior_30_dias) },
          { label: "Pedido > 60", valor: fmt(kpi.pedido_maior_60_dias) },
          { label: "Média dias pedido", valor: fmt(kpi.media_dias_pedido) },
          { label: "% MP", valor: fmt(kpi.pct_medio_prazo, true) },
        ],
        horizontal,
      )}
      {bloco(
        "Longo Prazo",
        vermelho,
        [
          { label: "Total LP", valor: fmt(kpi.total_longo_prazo) },
          { label: "Sem pedido período", valor: fmt(kpi.ruptura_sem_pedido_periodo), naoPublicado: kpi.ruptura_sem_pedido_periodo == null },
          { label: "Dias último pedido", valor: fmt(kpi.dias_ultimo_pedido_loja), naoPublicado: kpi.dias_ultimo_pedido_loja == null },
          { label: "% LP", valor: fmt(kpi.pct_longo_prazo, true) },
        ],
        horizontal,
      )}
      {bloco(
        "Inventário",
        laranja,
        [
          { label: "Rup. via inventário", valor: fmt(kpi.itens_ruptura_via_inventario) },
          { label: "% impacto", valor: fmt(kpi.pct_impacto_inventario, true) },
          { label: "% sem inventário", valor: fmt(kpi.pct_ruptura_sem_inventario, true) },
        ],
        horizontal,
      )}
      {bloco(
        "Pendência Venda",
        "#7f1d1d",
        [
          { label: "Itens pendência", valor: fmt(kpi.itens_vda_pendencia) },
          { label: "% sem pendência", valor: fmt(kpi.pct_rup_sem_pendencia_vda, true) },
        ],
        horizontal,
      )}
    </div>
  );
}
