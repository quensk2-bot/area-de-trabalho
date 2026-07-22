import { useEffect, useState } from "react";
import { HIBRIDO_PILOTO } from "../../hibrido-v7/constants.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { migrarContextoLojas } from "../services/lojasFiltroUtils.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_CONTEXTO_DEFAULT } from "../types/rupturaFiltrosTypes.ts";

const STORAGE_PREFIX = "ruptura-v7-contexto";

export type RupturaContextoTela = "dashboard" | "gestao" | "central-acoes" | "visao360" | "importacao";

function storageKey(userId: string | undefined, tela: RupturaContextoTela): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}:${tela}`;
}

function defaultContexto(): RupturaFiltrosContexto {
  if (isModoHibrido()) {
    return {
      regional: HIBRIDO_PILOTO.regional,
      bandeira: HIBRIDO_PILOTO.bandeira,
      dataReferencia: HIBRIDO_PILOTO.dataReferencia,
      loja: HIBRIDO_PILOTO.loja,
      lojas: [],
    };
  }
  return RUPTURA_CONTEXTO_DEFAULT;
}

export function normalizeContextoHibrido(ctx: RupturaFiltrosContexto): RupturaFiltrosContexto {
  if (!isModoHibrido()) return ctx;
  return { ...ctx, dataReferencia: HIBRIDO_PILOTO.dataReferencia };
}

function readStoredContexto(userId: string | undefined, tela: RupturaContextoTela): RupturaFiltrosContexto {
  const base = defaultContexto();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(storageKey(userId, tela));
    if (!raw) {
      const legacy = window.localStorage.getItem(STORAGE_PREFIX);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Partial<RupturaFiltrosContexto>;
        return normalizeContextoHibrido(migrarContextoLojas(parsed, base));
      }
      return base;
    }
    const parsed = JSON.parse(raw) as Partial<RupturaFiltrosContexto>;
    return normalizeContextoHibrido(migrarContextoLojas(parsed, base));
  } catch {
    return base;
  }
}

export function useRupturaContexto(
  tela: RupturaContextoTela = "dashboard",
  userId?: string,
): [
  RupturaFiltrosContexto,
  (patch: Partial<RupturaFiltrosContexto>) => void,
] {
  const [ctx, setCtx] = useState<RupturaFiltrosContexto>(() => readStoredContexto(userId, tela));

  useEffect(() => {
    setCtx(readStoredContexto(userId, tela));
  }, [userId, tela]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(userId, tela), JSON.stringify(ctx));
    } catch {
      // ignore
    }
  }, [ctx, userId, tela]);

  const update = (patch: Partial<RupturaFiltrosContexto>) => {
    setCtx((prev) => normalizeContextoHibrido(migrarContextoLojas({ ...prev, ...patch }, prev)));
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
