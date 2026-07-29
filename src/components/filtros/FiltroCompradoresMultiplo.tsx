import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  formatCompradoresSelecionadosLabel,
} from "../../ruptura-v7/services/compradoresFiltroUtils.ts";
import { inputStyle, buttonGhostStyle } from "../../ruptura-v7/components/rupturaSharedStyles.ts";
import { theme } from "../../styles.ts";

type Props = {
  compradoresCatalogo: string[];
  compradoresSelecionados: string[];
  onApply: (compradores: string[]) => void;
  readonly?: boolean;
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

export function FiltroCompradoresMultiplo({
  compradoresCatalogo,
  compradoresSelecionados,
  onApply,
  readonly,
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [draft, setDraft] = useState<string[]>(compradoresSelecionados);
  const [erroApply, setErroApply] = useState<string | null>(null);

  const totalEscopo = compradoresCatalogo.length;

  const labelFechado = formatCompradoresSelecionadosLabel(
    compradoresSelecionados.length === 0 ? [] : compradoresSelecionados,
    totalEscopo,
  );

  const compradoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return compradoresCatalogo;
    return compradoresCatalogo.filter((c) => c.toLowerCase().includes(termo));
  }, [compradoresCatalogo, busca]);

  const syncDraftOnOpen = useCallback(() => {
    if (
      compradoresSelecionados.length === 0 ||
      compradoresSelecionados.length >= totalEscopo
    ) {
      setDraft([...compradoresCatalogo]);
    } else {
      setDraft([...compradoresSelecionados]);
    }
    setErroApply(null);
    setBusca("");
  }, [compradoresSelecionados, compradoresCatalogo, totalEscopo]);

  useEffect(() => {
    if (!aberto) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [aberto]);

  function toggleComprador(nome: string) {
    setDraft((prev) => {
      if (prev.includes(nome)) return prev.filter((c) => c !== nome);
      return [...prev, nome].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    });
  }

  function toggleTodos(checked: boolean) {
    setDraft(checked ? [...compradoresCatalogo] : []);
    setErroApply(null);
  }

  function handleApply() {
    if (draft.length === 0) {
      setErroApply("Selecione ao menos um comprador.");
      return;
    }
    const aplicar =
      draft.length >= totalEscopo ? [] : [...draft].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    onApply(aplicar);
    setAberto(false);
    setErroApply(null);
  }

  const selecionadasCount = draft.length;

  return (
    <div ref={rootRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11 }}>Comprador</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listboxId}
        disabled={readonly || !compradoresCatalogo.length}
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
            placeholder="Buscar por nome…"
            value={busca}
            autoFocus
            style={{ ...inputStyle, width: "100%" }}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAberto(false);
              if (e.key === "Enter") handleApply();
            }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...buttonGhostStyle, fontSize: 11, padding: "4px 10px" }}
              onClick={() => toggleTodos(true)}
            >
              Marcar todos
            </button>
            <button
              type="button"
              style={{ ...buttonGhostStyle, fontSize: 11, padding: "4px 10px" }}
              onClick={() => toggleTodos(false)}
            >
              Desmarcar todos
            </button>
          </div>

          <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
            {selecionadasCount} de {totalEscopo} compradores selecionados
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {compradoresFiltrados.map((nome) => {
              const checked = draft.includes(nome);
              return (
                <label
                  key={nome}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleComprador(nome)} />
                  {nome}
                </label>
              );
            })}
          </div>

          {erroApply && (
            <span style={{ fontSize: 11, color: theme.colors.danger }}>{erroApply}</span>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={buttonGhostStyle} onClick={handleApply}>
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
