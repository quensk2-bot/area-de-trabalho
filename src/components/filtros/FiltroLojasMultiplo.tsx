import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CatalogoLoja } from "../../auth-v7/catalogoLojasTypes.ts";
import { formatLojaLabel } from "../../auth-v7/catalogoLojasService.ts";
import { formatLojasSelecionadasLabel, todasLojasSelecionadas } from "../../ruptura-v7/services/lojasFiltroUtils.ts";
import { inputStyle, buttonGhostStyle } from "../../ruptura-v7/components/rupturaSharedStyles.ts";
import { theme } from "../../styles.ts";

type Props = {
  lojasCatalogo: CatalogoLoja[];
  lojasSelecionadas: number[];
  onApply: (lojas: number[]) => void;
  readonly?: boolean;
  /** Agrupa checkboxes por bandeira (Bandeira = Todas). */
  agruparPorBandeira?: boolean;
  lojasNaoPublicadas?: number[];
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 50,
  minWidth: 280,
  maxWidth: 360,
  background: theme.colors.bgCard ?? "#0f172a",
  border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export function FiltroLojasMultiplo({
  lojasCatalogo,
  lojasSelecionadas,
  onApply,
  readonly,
  agruparPorBandeira,
  lojasNaoPublicadas = [],
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [draft, setDraft] = useState<number[]>(lojasSelecionadas);
  const [erroApply, setErroApply] = useState<string | null>(null);

  const totalEscopo = lojasCatalogo.length;
  const naoPublicadasSet = useMemo(() => new Set(lojasNaoPublicadas), [lojasNaoPublicadas]);

  const draftEfetivo = useMemo(() => {
    if (draft.length === 0 || todasLojasSelecionadas(draft, totalEscopo)) {
      return lojasCatalogo.map((l) => l.loja);
    }
    return draft;
  }, [draft, lojasCatalogo, totalEscopo]);

  const labelFechado = formatLojasSelecionadasLabel(
    lojasSelecionadas.length === 0 ? [] : lojasSelecionadas,
    totalEscopo,
  );

  const lojasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lojasCatalogo;
    return lojasCatalogo.filter(
      (l) =>
        String(l.loja).includes(termo) ||
        l.nome.toLowerCase().includes(termo) ||
        l.bandeira.toLowerCase().includes(termo),
    );
  }, [lojasCatalogo, busca]);

  const grupos = useMemo(() => {
    if (!agruparPorBandeira) return [{ bandeira: null as string | null, lojas: lojasFiltradas }];
    const map = new Map<string, CatalogoLoja[]>();
    for (const l of lojasFiltradas) {
      const arr = map.get(l.bandeira) ?? [];
      arr.push(l);
      map.set(l.bandeira, arr);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bandeira, lojas]) => ({ bandeira, lojas }));
  }, [lojasFiltradas, agruparPorBandeira]);

  const syncDraftOnOpen = useCallback(() => {
    if (lojasSelecionadas.length === 0 || todasLojasSelecionadas(lojasSelecionadas, totalEscopo)) {
      setDraft(lojasCatalogo.map((l) => l.loja));
    } else {
      setDraft([...lojasSelecionadas]);
    }
    setErroApply(null);
    setBusca("");
  }, [lojasSelecionadas, lojasCatalogo, totalEscopo]);

  useEffect(() => {
    if (!aberto) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [aberto]);

  function toggleLoja(loja: number) {
    setDraft((prev) => {
      const base =
        prev.length === 0 || todasLojasSelecionadas(prev, totalEscopo)
          ? lojasCatalogo.map((l) => l.loja)
          : prev;
      if (base.includes(loja)) return base.filter((l) => l !== loja);
      return [...base, loja].sort((a, b) => a - b);
    });
  }

  function toggleTodas(checked: boolean) {
    setDraft(checked ? lojasCatalogo.map((l) => l.loja) : []);
  }

  function handleApply() {
    if (draft.length === 0) {
      setErroApply("Selecione ao menos uma loja.");
      return;
    }
    const aplicar =
      draft.length >= totalEscopo ? [] : draft.sort((a, b) => a - b);
    onApply(aplicar);
    setAberto(false);
    setErroApply(null);
  }

  function handleClear() {
    setDraft([]);
    setErroApply(null);
  }

  const selecionadasCount = draftEfetivo.length;

  return (
    <div ref={rootRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11 }}>Loja</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listboxId}
        disabled={readonly || !lojasCatalogo.length}
        style={{
          ...inputStyle,
          minWidth: 200,
          textAlign: "left",
          cursor: readonly ? "not-allowed" : "pointer",
          opacity: readonly ? 0.72 : 1,
        }}
        onClick={() => {
          if (readonly) return;
          if (!aberto) syncDraftOnOpen();
          setAberto((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!aberto) syncDraftOnOpen();
            setAberto(true);
          }
          if (e.key === "Escape") setAberto(false);
        }}
      >
        {labelFechado}
      </button>

      {aberto && (
        <div id={listboxId} role="listbox" aria-multiselectable style={panelStyle}>
          <input
            type="search"
            placeholder="Buscar código ou nome…"
            value={busca}
            autoFocus
            style={{ ...inputStyle, width: "100%" }}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAberto(false);
              if (e.key === "Enter") handleApply();
            }}
          />

          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={selecionadasCount === totalEscopo && totalEscopo > 0}
              ref={(el) => {
                if (el) el.indeterminate = selecionadasCount > 0 && selecionadasCount < totalEscopo;
              }}
              onChange={(e) => toggleTodas(e.target.checked)}
            />
            Selecionar todas
          </label>

          <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
            {selecionadasCount} de {totalEscopo} lojas selecionadas
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {grupos.map((g) => (
              <div key={g.bandeira ?? "all"}>
                {g.bandeira && agruparPorBandeira && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.colors.neonOrange, marginBottom: 4 }}>
                    {g.bandeira}
                  </div>
                )}
                {g.lojas.map((l) => {
                  const checked = draftEfetivo.includes(l.loja);
                  const naoPub = naoPublicadasSet.has(l.loja);
                  return (
                    <label
                      key={`${l.bandeira}-${l.loja}`}
                      style={{
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: naoPub ? 0.55 : 1,
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleLoja(l.loja)} />
                      {formatLojaLabel(l)}
                      {naoPub ? (
                        <span style={{ fontSize: 10, color: theme.colors.warning }}>(não publicada)</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>

          {erroApply && (
            <span style={{ fontSize: 11, color: theme.colors.danger }}>{erroApply}</span>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={buttonGhostStyle} onClick={handleClear}>
              Limpar
            </button>
            <button type="button" style={buttonGhostStyle} onClick={handleApply}>
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
