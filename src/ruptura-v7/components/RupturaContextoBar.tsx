import type { ReactNode } from "react";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { buttonGhostStyle, inputStyle } from "./rupturaSharedStyles.ts";

type Props = {
  ctx: RupturaFiltrosContexto;
  onChange: (patch: Partial<RupturaFiltrosContexto>) => void;
  onAtualizar?: () => void;
  extra?: ReactNode;
  /** Importação Drive usa escopo regional — loja não filtra o pacote. */
  ocultarLoja?: boolean;
};

export function RupturaContextoBar({ ctx, onChange, onAtualizar, extra, ocultarLoja }: Props) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
        Regional
        <input style={inputStyle} value={ctx.regional} onChange={(e) => onChange({ regional: e.target.value.toUpperCase() })} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
        Data referência
        <input
          style={inputStyle}
          type="date"
          value={ctx.dataReferencia}
          onChange={(e) => onChange({ dataReferencia: e.target.value })}
        />
      </label>
      {!ocultarLoja && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
          Loja
          <input
            style={inputStyle}
            type="number"
            value={ctx.loja}
            onChange={(e) => onChange({ loja: Number(e.target.value) || 0 })}
          />
        </label>
      )}
      {onAtualizar && (
        <button type="button" style={buttonGhostStyle} onClick={onAtualizar}>
          Atualizar
        </button>
      )}
      {extra}
    </div>
  );
}
