import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { theme } from "../../styles.ts";
import { COLUNAS_BASE_COMPRADOR, type BaseCompradorLinha } from "../utils/baseCompradorTypes.ts";
import { exportBaseCompradorArquivo, type BaseCompradorExportContext } from "../utils/exportBaseComprador.ts";

const PAGE_SIZE = 200;
const GRID = "1px solid #b4b4b4";

const COL_WIDTH: Partial<Record<(typeof COLUNAS_BASE_COMPRADOR)[number]["key"], string>> = {
  comprador: "10%",
  fornecedor: "18%",
  departamento: "11%",
  secao: "14%",
  categoria: "11%",
  codigo: "8%",
  descCompleta: "28%",
};

const th: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#1e1e1e",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  padding: "7px 8px",
  textAlign: "left",
  border: GRID,
  whiteSpace: "nowrap",
  letterSpacing: 0.2,
};

function tdStyle(zebra: boolean): CSSProperties {
  return {
    fontSize: 11,
    padding: "5px 8px",
    border: GRID,
    verticalAlign: "top",
    lineHeight: 1.35,
    background: zebra ? "#f7f7f7" : "#ffffff",
    color: "#1a1a1a",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

const btnExcel: CSSProperties = {
  padding: "5px 12px",
  border: "1px solid #888",
  background: "linear-gradient(180deg, #fafafa 0%, #e8e8e8 100%)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 2,
};

type Props = {
  linhas: BaseCompradorLinha[];
  loading?: boolean;
  exportCtx: BaseCompradorExportContext;
};

export function BaseCompradorTable({ linhas, loading, exportCtx }: Props) {
  const [pagina, setPagina] = useState(0);
  const [exportAberto, setExportAberto] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setPagina(0);
  }, [linhas]);

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / PAGE_SIZE));
  const paginaSafe = Math.min(pagina, totalPaginas - 1);
  const slice = useMemo(
    () => linhas.slice(paginaSafe * PAGE_SIZE, paginaSafe * PAGE_SIZE + PAGE_SIZE),
    [linhas, paginaSafe],
  );
  const totalConflitos = useMemo(
    () => linhas.filter((linha) => (linha.conflitoAtributos?.length ?? 0) > 0).length,
    [linhas],
  );

  function exportar(formato: "xlsx" | "csv") {
    const r = exportBaseCompradorArquivo({ linhas, ctx: exportCtx, formato });
    setStatus(`${r.filename} (${r.linhas} linhas)`);
    setExportAberto(false);
  }

  return (
    <div
      style={{
        border: "2px solid #1e1e1e",
        background: "#fff",
        color: "#111",
        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          padding: "8px 12px",
          background: "#2d2d2d",
          color: "#f5f5f5",
          borderBottom: GRID,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700 }}>
          {loading ? "Carregando…" : `${linhas.length.toLocaleString("pt-BR")} produto(s)`}
          {linhas.length > PAGE_SIZE ? ` · página ${paginaSafe + 1}/${totalPaginas}` : ""}
          {totalConflitos ? ` · ${totalConflitos} conflito(s) multi-loja` : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <button
            type="button"
            style={btnExcel}
            title="Exportar linhas filtradas (BASE_COMPRADOR)"
            onClick={() => setExportAberto((v) => !v)}
          >
            Exportar tela ▾
          </button>
          {exportAberto ? (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                zIndex: 20,
                background: "#fff",
                border: "1px solid #666",
                display: "flex",
                flexDirection: "column",
                padding: 4,
                gap: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <button type="button" style={btnExcel} onClick={() => exportar("xlsx")}>
                XLSX — BASE_COMPRADOR
              </button>
              <button type="button" style={btnExcel} onClick={() => exportar("csv")}>
                CSV — BASE_COMPRADOR
              </button>
            </div>
          ) : null}
          {status ? <span style={{ fontSize: 10, color: "#d4d4d4" }}>{status}</span> : null}
        </div>
      </div>

      <div style={{ maxHeight: "min(70vh, 640px)", overflow: "auto", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            {COLUNAS_BASE_COMPRADOR.map((c) => (
              <col key={c.key} style={{ width: COL_WIDTH[c.key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUNAS_BASE_COMPRADOR.map((c) => (
                <th key={c.key} style={th}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, idx) => (
              <tr key={`${r.codigo}-${idx}`}>
                {COLUNAS_BASE_COMPRADOR.map((c) => {
                  const isDesc = c.key === "descCompleta" || c.key === "fornecedor";
                  return (
                    <td
                      key={c.key}
                      style={{
                        ...tdStyle(idx % 2 === 1),
                        ...(r.conflitoAtributos?.length ? { background: "#fff3cd" } : {}),
                        whiteSpace: isDesc ? "normal" : "nowrap",
                        wordBreak: isDesc ? "break-word" : undefined,
                      }}
                      title={
                        r.conflitoAtributos?.length
                          ? `${String(r[c.key])} | Conflito: ${r.conflitoAtributos.join(", ")}`
                          : String(r[c.key])
                      }
                    >
                      {r[c.key]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !linhas.length ? (
          <div style={{ padding: 16, color: theme.colors.textMuted, fontSize: 13 }}>Nenhum produto para os filtros.</div>
        ) : null}
      </div>

      {linhas.length > PAGE_SIZE ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 8,
            justifyContent: "flex-end",
            background: "#ececec",
            borderTop: GRID,
          }}
        >
          <button type="button" style={btnExcel} disabled={paginaSafe <= 0} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </button>
          <button
            type="button"
            style={btnExcel}
            disabled={paginaSafe >= totalPaginas - 1}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
