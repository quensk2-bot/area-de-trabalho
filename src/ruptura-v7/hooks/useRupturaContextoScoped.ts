import { useEffect } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { isModoHibrido } from "../../lib/env.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { contextoFixoGerente } from "../services/hibrido/hibridoScope.ts";
import { useRupturaContexto } from "./useRupturaContexto.ts";

/** Contexto ruptura com escopo GERENTE_LOJA fixado no modo híbrido. */
export function useRupturaContextoScoped(): [
  RupturaFiltrosContexto,
  (patch: Partial<RupturaFiltrosContexto>) => void,
  { readonly: { regional?: boolean; bandeira?: boolean; loja?: boolean } },
] {
  const auth = useAuthV7();
  const permCtx = auth.perfil
    ? toPermissionContext({
        perfil: auth.perfil,
        regionais: auth.regionais,
        bandeiras: auth.bandeiras,
        lojas: auth.lojas,
        permissoes: auth.permissoes,
      })
    : null;

  const [ctx, setCtx] = useRupturaContexto();

  useEffect(() => {
    if (!isModoHibrido() || !permCtx) return;
    const fixo = contextoFixoGerente(permCtx);
    if (fixo) {
      setCtx({
        regional: fixo.regional ?? ctx.regional,
        loja: fixo.loja ?? ctx.loja,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aplicar escopo gerente uma vez
  }, [permCtx?.nivel, permCtx?.lojas.length]);

  const readonly =
    isModoHibrido() && permCtx
      ? {
          regional: permCtx.nivel === "GERENTE_LOJA",
          bandeira: permCtx.nivel === "GERENTE_LOJA",
          loja: permCtx.nivel === "GERENTE_LOJA",
          dataReferencia: true,
        }
      : isModoHibrido()
        ? { dataReferencia: true }
        : {};

  const update = (patch: Partial<RupturaFiltrosContexto>) => {
    if (readonly.regional && patch.regional !== undefined) return;
    if (readonly.loja && patch.loja !== undefined) return;
    if (readonly.dataReferencia && patch.dataReferencia !== undefined) return;
    setCtx(patch);
  };

  return [ctx, update, { readonly }];
}
