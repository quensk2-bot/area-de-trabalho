import { useEffect, useState } from "react";
import { HIBRIDO_PILOTO } from "../../hibrido-v7/constants.ts";
import { isModoHibrido } from "../../lib/env.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_CONTEXTO_DEFAULT } from "../types/rupturaFiltrosTypes.ts";

const STORAGE_KEY = "ruptura-v7-contexto";

function defaultContexto(): RupturaFiltrosContexto {
  if (isModoHibrido()) {
    return {
      regional: HIBRIDO_PILOTO.regional,
      bandeira: HIBRIDO_PILOTO.bandeira,
      dataReferencia: HIBRIDO_PILOTO.dataReferencia,
      loja: HIBRIDO_PILOTO.loja,
    };
  }
  return RUPTURA_CONTEXTO_DEFAULT;
}

export function normalizeContextoHibrido(ctx: RupturaFiltrosContexto): RupturaFiltrosContexto {
  if (!isModoHibrido()) return ctx;
  return { ...ctx, dataReferencia: HIBRIDO_PILOTO.dataReferencia };
}

function readStoredContexto(): RupturaFiltrosContexto {
  const base = defaultContexto();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<RupturaFiltrosContexto>;
    return normalizeContextoHibrido({
      ...base,
      ...parsed,
      bandeira: parsed.bandeira ?? base.bandeira,
    });
  } catch {
    return base;
  }
}

export function useRupturaContexto(): [
  RupturaFiltrosContexto,
  (patch: Partial<RupturaFiltrosContexto>) => void,
] {
  const [ctx, setCtx] = useState<RupturaFiltrosContexto>(() => readStoredContexto());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // ignore
    }
  }, [ctx]);

  const update = (patch: Partial<RupturaFiltrosContexto>) => {
    setCtx((prev) => normalizeContextoHibrido({ ...prev, ...patch }));
  };

  return [ctx, update];
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
