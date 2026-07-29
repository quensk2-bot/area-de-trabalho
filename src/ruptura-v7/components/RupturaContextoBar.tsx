import type { ReactNode } from "react";
import { FiltroRegionalBandeiraLoja } from "../../components/filtros/FiltroRegionalBandeiraLoja.tsx";
import { FiltroCompradoresMultiplo } from "../../components/filtros/FiltroCompradoresMultiplo.tsx";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { FILTRO_LOJA_TODAS } from "../../auth-v7/catalogoLojasTypes.ts";
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
  multiSelectLoja?: boolean;
  lojasNaoPublicadas?: number[];
  mostrarFiltroComprador?: boolean;
  compradoresCatalogo?: string[];
  readonlyFields?: {
    regional?: boolean;
    bandeira?: boolean;
    loja?: boolean;
    comprador?: boolean;
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
  multiSelectLoja = true,
  lojasNaoPublicadas,
  mostrarFiltroComprador,
  compradoresCatalogo = [],
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
          lojas: ctx.lojas ?? (ctx.loja === FILTRO_LOJA_TODAS ? [] : [ctx.loja]),
        }}
        onChange={(patch) => onChange(patch)}
        readonlyFields={readonlyFields}
        ocultarLoja={ocultarLoja}
        permitirTodasBandeira={permitirTodasBandeira ?? !ocultarLoja}
        permitirTodasLoja={permitirTodasLoja ?? !ocultarLoja}
        multiSelectLoja={multiSelectLoja && !ocultarLoja}
        lojasNaoPublicadas={lojasNaoPublicadas}
      />

      {mostrarFiltroComprador ? (
        <FiltroCompradoresMultiplo
          compradoresCatalogo={compradoresCatalogo}
          compradoresSelecionados={ctx.compradores ?? []}
          onApply={(compradores) => onChange({ compradores })}
          readonly={readonlyFields?.comprador}
        />
      ) : null}

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
