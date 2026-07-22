import type { ReactNode } from "react";
import { FiltroRegionalBandeiraLoja } from "../../components/filtros/FiltroRegionalBandeiraLoja.tsx";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { buttonGhostStyle, inputStyle } from "./rupturaSharedStyles.ts";

type Props = {
  ctx: RupturaFiltrosContexto;
  onChange: (patch: Partial<RupturaFiltrosContexto>) => void;
  onAtualizar?: () => void;
  extra?: ReactNode;
  /** Importação Drive usa escopo regional — loja não filtra o pacote. */
  ocultarLoja?: boolean;
  permitirTodasBandeira?: boolean;
  permitirTodasLoja?: boolean;
  readonlyFields?: {
    regional?: boolean;
    bandeira?: boolean;
    loja?: boolean;
    dataReferencia?: boolean;
  };
};

export function RupturaContextoBar({
  ctx,
  onChange,
  onAtualizar,
  extra,
  ocultarLoja,
  permitirTodasBandeira,
  permitirTodasLoja,
  readonlyFields,
}: Props) {
  const readOnlyStyle = { opacity: 0.72, cursor: "not-allowed" as const };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
      <FiltroRegionalBandeiraLoja
        valores={{
          regional: ctx.regional,
          bandeira: ctx.bandeira,
          loja: ctx.loja,
        }}
        onChange={(patch) => onChange(patch)}
        readonlyFields={readonlyFields}
        ocultarLoja={ocultarLoja}
        permitirTodasBandeira={permitirTodasBandeira ?? !ocultarLoja}
        permitirTodasLoja={permitirTodasLoja ?? !ocultarLoja}
      />

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
        Data referência
        <input
          style={{ ...inputStyle, ...(readonlyFields?.dataReferencia ? readOnlyStyle : {}) }}
          type="date"
          value={ctx.dataReferencia}
          readOnly={readonlyFields?.dataReferencia}
          onChange={(e) => onChange({ dataReferencia: e.target.value })}
        />
      </label>

      {onAtualizar && (
        <button type="button" style={buttonGhostStyle} onClick={onAtualizar}>
          Atualizar
        </button>
      )}
      {extra}
    </div>
  );
}
