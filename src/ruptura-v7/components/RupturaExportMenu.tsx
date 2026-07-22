import { useMemo, useState } from "react";
import type { PermissionContext } from "../../auth-v7/permissionService.ts";
import { fetchCatalogoLojas } from "../../auth-v7/catalogoLojasService.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { buttonGhostStyle, buttonStyle, cardStyle } from "./rupturaSharedStyles.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { resolverLojasEfetivas, lojasNoEscopoCatalogo } from "../services/lojasFiltroUtils.ts";
import {
  canExportBandeiraCompleta,
  exportarBaseRupturaOficial,
  inferirModoExport,
  resumirEscopoExport,
  type ModoExportBaseRuptura,
} from "../services/rupturaExportBaseService.ts";
import { HIBRIDO_BANDEIRA_DEFAULT } from "../services/hibrido/hibridoScope.ts";
import { exportarProdutosCsvXlsx } from "../utils/rupturaExport.ts";
import type { RupturaFiltrosProdutos } from "../types/rupturaFiltrosTypes.ts";

type Props = {
  ctx: RupturaFiltrosContexto;
  authCtx: PermissionContext | null;
  filtrosProdutos?: Partial<RupturaFiltrosProdutos>;
  compact?: boolean;
};

export function RupturaExportMenu({ ctx, authCtx, filtrosProdutos, compact }: Props) {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState<{
    modo: ModoExportBaseRuptura;
    formato: "xlsx" | "csv";
    somenteCamposAusentes?: boolean;
  } | null>(null);
  const [catalogo, setCatalogo] = useState<Awaited<ReturnType<typeof fetchCatalogoLojas>>>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hibrido = isModoHibrido();
  const podeBandeiraCompleta = canExportBandeiraCompleta(authCtx);

  const resumo = useMemo(() => {
    const escopo = lojasNoEscopoCatalogo(catalogo, ctx.regional, ctx.bandeira);
    const lojas = resolverLojasEfetivas(catalogo, ctx);
    const bandeira = ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
    const modo = confirmando?.modo ?? inferirModoExport(ctx, escopo.length);
    return resumirEscopoExport({
      ctx,
      modo,
      lojas,
      totalEscopo: escopo.length,
      bandeira,
    });
  }, [catalogo, ctx, confirmando?.modo]);

  async function abrirConfirmacao(
    modo: ModoExportBaseRuptura,
    formato: "xlsx" | "csv",
    somenteCamposAusentes?: boolean,
  ) {
    const cat = catalogo.length ? catalogo : await fetchCatalogoLojas();
    if (!catalogo.length) setCatalogo(cat);
    setConfirmando({ modo, formato, somenteCamposAusentes });
    setAberto(false);
  }

  async function executarExport() {
    if (!confirmando) return;
    setLoading(true);
    setStatus("Preparando exportação…");

    try {
      if (hibrido) {
        const r = await exportarBaseRupturaOficial({
          ctx,
          authCtx,
          modo: confirmando.modo,
          formato: confirmando.formato,
          somenteCamposAusentes: confirmando.somenteCamposAusentes,
          onProgress: setStatus,
        });
        setStatus(r.ok ? `Arquivo ${r.filename} (${r.estrategia ?? "ok"})` : r.erro ?? "Falha");
      } else {
        const r = await exportarProdutosCsvXlsx({
          filtros: { ...ctx, ...filtrosProdutos } as RupturaFiltrosProdutos,
          formato: confirmando.formato,
          onProgress: (a, t) => setStatus(`Exportando ${a}/${t}…`),
        });
        setStatus(r.ok ? `Arquivo ${r.filename} gerado.` : r.erro ?? "Falha");
      }
    } finally {
      setLoading(false);
      setConfirmando(null);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        style={compact ? buttonGhostStyle : buttonStyle}
        onClick={() => setAberto((v) => !v)}
        disabled={loading}
      >
        Exportar ▾
      </button>

      {aberto && (
        <div
          style={{
            ...cardStyle,
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 40,
            minWidth: 260,
            marginTop: 4,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: 600 }}>Seleção atual</div>
          <button type="button" style={buttonGhostStyle} onClick={() => void abrirConfirmacao(inferirModoExport(ctx, 99), "xlsx")}>
            XLSX — seleção
          </button>
          <button type="button" style={buttonGhostStyle} onClick={() => void abrirConfirmacao(inferirModoExport(ctx, 99), "csv")}>
            CSV — seleção
          </button>
          {podeBandeiraCompleta && hibrido && (
            <>
              <div style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: 600, marginTop: 4 }}>Bandeira completa</div>
              <button type="button" style={buttonGhostStyle} onClick={() => void abrirConfirmacao("bandeira_completa", "xlsx")}>
                XLSX — bandeira completa
              </button>
              <button type="button" style={buttonGhostStyle} onClick={() => void abrirConfirmacao("bandeira_completa", "csv")}>
                CSV — bandeira completa
              </button>
            </>
          )}
          {hibrido && (
            <button
              type="button"
              style={buttonGhostStyle}
              onClick={() => void abrirConfirmacao(inferirModoExport(ctx, 99), "xlsx", true)}
            >
              Relatório campos ausentes
            </button>
          )}
        </div>
      )}

      {confirmando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !loading && setConfirmando(null)}
        >
          <div
            style={{ ...cardStyle, maxWidth: 420, width: "100%", padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", color: theme.colors.neonOrange, fontSize: 16 }}>Confirmar exportação</h3>
            <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: "0 0 12px", color: theme.colors.textMuted }}>
              {resumo}
            </pre>
            <p style={{ fontSize: 12, margin: "0 0 12px" }}>
              Formato: <strong>{confirmando.formato.toUpperCase()}</strong>
              {confirmando.somenteCamposAusentes ? " · somente CAMPOS_AUSENTES" : ""}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={buttonGhostStyle} disabled={loading} onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
              <button type="button" style={buttonStyle} disabled={loading} onClick={() => void executarExport()}>
                {loading ? "Exportando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {status && <div style={{ fontSize: 11, color: theme.colors.textMuted, maxWidth: 320 }}>{status}</div>}
    </div>
  );
}
