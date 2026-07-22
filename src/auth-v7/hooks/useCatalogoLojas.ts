import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthV7 } from "../AuthProvider.tsx";
import { toPermissionContext } from "../authProfileUtils.ts";
import type { CatalogoBandeira, CatalogoLoja } from "../catalogoLojasTypes.ts";
import {
  fetchCatalogoLojas,
  filtrarCatalogoPorPermissoes,
  listarBandeirasDoCatalogo,
  listarLojasDoCatalogo,
  listarRegionaisDoCatalogo,
} from "../catalogoLojasService.ts";

export function useCatalogoLojas() {
  const auth = useAuthV7();
  const permCtx = useMemo(
    () =>
      auth.perfil
        ? toPermissionContext({
            perfil: auth.perfil,
            regionais: auth.regionais,
            bandeiras: auth.bandeiras,
            lojas: auth.lojas,
            permissoes: auth.permissoes,
          })
        : null,
    [auth],
  );

  const [rawRows, setRawRows] = useState<CatalogoLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const rows = await fetchCatalogoLojas(true);
      setRawRows(rows);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const rows = await fetchCatalogoLojas();
        if (!cancelled) setRawRows(rows);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : String(e));
          setRawRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lojas = useMemo(
    () => filtrarCatalogoPorPermissoes(rawRows, permCtx),
    [rawRows, permCtx],
  );

  const regionais = useMemo(() => listarRegionaisDoCatalogo(lojas), [lojas]);

  const bandeirasPorRegional = useCallback(
    (regional: string): CatalogoBandeira[] => listarBandeirasDoCatalogo(lojas, regional),
    [lojas],
  );

  const lojasPorEscopo = useCallback(
    (regional: string, bandeira: string | null): CatalogoLoja[] =>
      listarLojasDoCatalogo(lojas, regional, bandeira),
    [lojas],
  );

  return {
    lojas,
    regionais,
    bandeirasPorRegional,
    lojasPorEscopo,
    loading,
    erro,
    reload,
  };
}
