import { useEffect, useState } from "react";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_CONTEXTO_DEFAULT } from "../types/rupturaFiltrosTypes.ts";

const STORAGE_KEY = "ruptura-v7-contexto";

export function useRupturaContexto(): [
  RupturaFiltrosContexto,
  (patch: Partial<RupturaFiltrosContexto>) => void,
] {
  const [ctx, setCtx] = useState<RupturaFiltrosContexto>(() => {
    if (typeof window === "undefined") return RUPTURA_CONTEXTO_DEFAULT;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return RUPTURA_CONTEXTO_DEFAULT;
      const parsed = JSON.parse(raw) as Partial<RupturaFiltrosContexto>;
      return { ...RUPTURA_CONTEXTO_DEFAULT, ...parsed };
    } catch {
      return RUPTURA_CONTEXTO_DEFAULT;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // ignore
    }
  }, [ctx]);

  const update = (patch: Partial<RupturaFiltrosContexto>) => {
    setCtx((prev) => ({ ...prev, ...patch }));
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
