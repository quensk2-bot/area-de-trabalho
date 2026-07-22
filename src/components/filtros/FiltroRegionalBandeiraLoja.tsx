import { useMemo } from "react";
import { useCatalogoLojas } from "../../auth-v7/hooks/useCatalogoLojas.ts";
import {
  formatLojaLabel,
  normalizarFiltroCascade,
} from "../../auth-v7/catalogoLojasService.ts";
import type { FiltroRegionalBandeiraLojaValores } from "../../auth-v7/catalogoLojasTypes.ts";
import { FILTRO_BANDEIRA_TODAS, FILTRO_LOJA_TODAS } from "../../auth-v7/catalogoLojasTypes.ts";
import { FiltroLojasMultiplo } from "./FiltroLojasMultiplo.tsx";
import { inputStyle } from "../../ruptura-v7/components/rupturaSharedStyles.ts";

type Props = {
  valores: FiltroRegionalBandeiraLojaValores;
  onChange: (patch: Partial<FiltroRegionalBandeiraLojaValores>) => void;
  readonlyFields?: { regional?: boolean; bandeira?: boolean; loja?: boolean };
  ocultarBandeira?: boolean;
  ocultarLoja?: boolean;
  permitirTodasBandeira?: boolean;
  permitirTodasLoja?: boolean;
  /** Exibe multi-select com checkboxes (N1/ADM). Gerente usa loja fixa. */
  multiSelectLoja?: boolean;
  lojasNaoPublicadas?: number[];
};

export function FiltroRegionalBandeiraLoja({
  valores,
  onChange,
  readonlyFields,
  ocultarBandeira,
  ocultarLoja,
  permitirTodasBandeira = true,
  permitirTodasLoja = true,
  multiSelectLoja = true,
  lojasNaoPublicadas,
}: Props) {
  const { lojas, regionais, bandeirasPorRegional, lojasPorEscopo, loading, erro } = useCatalogoLojas();

  const bandeiras = useMemo(
    () => bandeirasPorRegional(valores.regional),
    [bandeirasPorRegional, valores.regional],
  );

  const lojasFiltradas = useMemo(
    () => lojasPorEscopo(valores.regional, valores.bandeira),
    [lojasPorEscopo, valores.regional, valores.bandeira],
  );

  const readOnlyStyle = { opacity: 0.72, cursor: "not-allowed" as const };
  const labelStyle = { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: 11 };

  const patchCascade = (patch: Partial<FiltroRegionalBandeiraLojaValores>) => {
    const next = normalizarFiltroCascade(lojas, valores, patch);
    onChange(next);
  };

  const lojasSelecionadas = valores.lojas ?? (valores.loja === FILTRO_LOJA_TODAS ? [] : [valores.loja]);

  return (
    <>
      <label style={labelStyle}>
        Regional
        <select
          style={{ ...inputStyle, ...(readonlyFields?.regional ? readOnlyStyle : {}) }}
          value={valores.regional}
          disabled={readonlyFields?.regional || loading || !regionais.length}
          onChange={(e) => patchCascade({ regional: e.target.value.toUpperCase() })}
        >
          {regionais.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {!ocultarBandeira && (
        <label style={labelStyle}>
          Bandeira
          <select
            style={{ ...inputStyle, ...(readonlyFields?.bandeira ? readOnlyStyle : {}) }}
            value={valores.bandeira ?? ""}
            disabled={readonlyFields?.bandeira || loading}
            onChange={(e) =>
              patchCascade({
                bandeira: e.target.value === "" ? FILTRO_BANDEIRA_TODAS : e.target.value.toUpperCase(),
              })
            }
          >
            {permitirTodasBandeira && <option value="">Todas</option>}
            {bandeiras.map((b) => (
              <option key={`${b.regional}-${b.bandeira}`} value={b.bandeira}>
                {b.bandeira}
              </option>
            ))}
          </select>
        </label>
      )}

      {!ocultarLoja && multiSelectLoja && !readonlyFields?.loja ? (
        <FiltroLojasMultiplo
          lojasCatalogo={lojasFiltradas}
          lojasSelecionadas={lojasSelecionadas}
          onApply={(nextLojas) => patchCascade({ lojas: nextLojas })}
          readonly={readonlyFields?.loja || loading}
          agruparPorBandeira={valores.bandeira == null}
          lojasNaoPublicadas={lojasNaoPublicadas}
        />
      ) : null}

      {!ocultarLoja && (!multiSelectLoja || readonlyFields?.loja) && (
        <label style={labelStyle}>
          Loja
          <select
            style={{ ...inputStyle, minWidth: 200, ...(readonlyFields?.loja ? readOnlyStyle : {}) }}
            value={valores.loja === FILTRO_LOJA_TODAS ? "" : String(valores.loja)}
            disabled={readonlyFields?.loja || loading}
            onChange={(e) =>
              patchCascade({
                loja: e.target.value === "" ? FILTRO_LOJA_TODAS : Number(e.target.value),
              })
            }
          >
            {permitirTodasLoja && <option value="">Todas</option>}
            {lojasFiltradas.map((l) => (
              <option key={`${l.regional}-${l.bandeira}-${l.loja}`} value={l.loja}>
                {formatLojaLabel(l)}
              </option>
            ))}
          </select>
        </label>
      )}

      {erro && (
        <span style={{ fontSize: 11, color: "#f87171", alignSelf: "center" }}>
          Catálogo indisponível: {erro}
        </span>
      )}
    </>
  );
}
