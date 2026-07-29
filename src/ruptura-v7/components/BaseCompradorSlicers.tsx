import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { theme } from "../../styles.ts";
import { buttonGhostStyle, inputStyle } from "./rupturaSharedStyles.ts";

type Props = {
  titulo: string;
  opcoes: string[];
  selecionados: string[];
  onApply: (selecionados: string[]) => void;
  readonly?: boolean;
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 50,
  minWidth: 220,
  maxWidth: 320,
  maxHeight: 280,
  overflow: "auto",
  background: theme.colors.bgCard ?? "#0f172a",
  border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

function labelFechado(selecionados: string[], total: number, vazio: string, todos: string): string {
  if (total === 0) return vazio;
  if (selecionados.length === 0 || selecionados.length >= total) return todos;
  if (selecionados.length === 1) return selecionados[0]!;
  return `${selecionados.length} selecionados`;
}

export function BaseCompradorSlicer({
  titulo,
  opcoes,
  selecionados,
  onApply,
  readonly,
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<string[]>(selecionados);
  const total = opcoes.length;

  const fechado = labelFechado(
    selecionados.length === 0 ? [] : selecionados,
    total,
    `Sem ${titulo.toLowerCase()}`,
    `Todos — ${titulo}`,
  );

  useEffect(() => {
    if (!aberto) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [aberto]);

  function abrir() {
    if (readonly) return;
    setDraft(selecionados.length === 0 || selecionados.length >= total ? [...opcoes] : [...selecionados]);
    setAberto((v) => !v);
  }

  function toggleTodos(checked: boolean) {
    setDraft(checked ? [...opcoes] : []);
  }

  function aplicar() {
    if (draft.length === 0) return;
    onApply(draft.length >= total ? [] : [...draft].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })));
    setAberto(false);
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <span style={{ fontSize: 11, display: "block", marginBottom: 4 }}>{titulo}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listboxId}
        disabled={readonly || !opcoes.length}
        style={{
          ...inputStyle,
          minWidth: 160,
          textAlign: "left",
          cursor: readonly ? "not-allowed" : "pointer",
          opacity: readonly || !opcoes.length ? 0.72 : 1,
        }}
        onClick={abrir}
      >
        {fechado}
      </button>
      {aberto ? (
        <div style={panelStyle} id={listboxId} role="listbox">
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={draft.length >= total}
              onChange={(e) => toggleTodos(e.target.checked)}
            />
            Selecionar todos
          </label>
          {opcoes.map((op) => (
            <label key={op} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={draft.includes(op)}
                onChange={() =>
                  setDraft((prev) => (prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]))
                }
              />
              <span style={{ lineHeight: 1.3 }}>{op}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button type="button" style={buttonGhostStyle} onClick={() => setAberto(false)}>
              Cancelar
            </button>
            <button type="button" style={buttonGhostStyle} onClick={aplicar} disabled={!draft.length}>
              Aplicar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
