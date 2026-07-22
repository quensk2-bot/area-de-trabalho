import { useMemo, useState } from "react";
import type { PermissionContext } from "../../auth-v7/permissionService.ts";
import { fetchCatalogoLojas } from "../../auth-v7/catalogoLojasService.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { buttonGhostStyle, buttonStyle, cardStyle } from "./rupturaSharedStyles.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_EXPORT_BROWSER_MAX_ROWS } from "../types/rupturaFiltrosTypes.ts";
import { resolverLojasEfetivas, lojasNoEscopoCatalogo } from "../services/lojasFiltroUtils.ts";
import {
  canExportBandeiraCompleta,
  consultarOpcoesExportDrive,
  escopoEquivaleBandeiraCompleta,
  exportarBaseRupturaOficial,
  inferirModoExport,
  LINHAS_ESTIMADAS_OFICIAL_COMPATIVEL,
  maxLojasExportBrowser,
  resumirEscopoExport,
  type EstrategiaExportGrande,
  type ModoExportBaseRuptura,
  type OpcoesExportDrive,
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

type ConfirmacaoState = {
  modo: ModoExportBaseRuptura;
  formato: "xlsx" | "csv";
  somenteCamposAusentes?: boolean;
  exportGrande: boolean;
  opcoesDrive: OpcoesExportDrive | null;
  totalEscopo: number;
  lojas: number[];
};

export function RupturaExportMenu({ ctx, authCtx, filtrosProdutos, compact }: Props) {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState<ConfirmacaoState | null>(null);
  const [catalogo, setCatalogo] = useState<Awaited<ReturnType<typeof fetchCatalogoLojas>>>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hibrido = isModoHibrido();
  const podeBandeiraCompleta = canExportBandeiraCompleta(authCtx);

  const resumo = useMemo(() => {
    if (!confirmando) return "";
    const bandeira = ctx.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
    return resumirEscopoExport({
      ctx,
      modo: confirmando.modo,
      lojas: confirmando.lojas,
      totalEscopo: confirmando.totalEscopo,
      bandeira,
    });
  }, [catalogo, ctx, confirmando]);

  async function abrirConfirmacao(
    modo: ModoExportBaseRuptura,
    formato: "xlsx" | "csv",
    somenteCamposAusentes?: boolean,
  ) {
    const cat = catalogo.length ? catalogo : await fetchCatalogoLojas();
    if (!catalogo.length) setCatalogo(cat);
    const escopo = lojasNoEscopoCatalogo(cat, ctx.regional, ctx.bandeira);
    const lojas = resolverLojasEfetivas(cat, ctx);
    const exportGrande =
      hibrido &&
      !somenteCamposAusentes &&
      escopoEquivaleBandeiraCompleta({ modo, lojas, totalEscopo: escopo.length });
    const opcoesDrive = exportGrande ? await consultarOpcoesExportDrive({ ctx, formato }) : null;
    setConfirmando({
      modo,
      formato,
      somenteCamposAusentes,
      exportGrande,
      opcoesDrive,
      totalEscopo: escopo.length,
      lojas,
    });
    setAberto(false);
  }

  async function executarExport(estrategia: EstrategiaExportGrande = "auto") {
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
          estrategia,
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

  const maxLojasBrowser = confirmando ? maxLojasExportBrowser(confirmando.totalEscopo) : 2;

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
            style={{ ...cardStyle, maxWidth: 480, width: "100%", padding: 16 }}
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

            {confirmando.exportGrande && (
              <div
                style={{
                  fontSize: 12,
                  margin: "0 0 12px",
                  padding: 10,
                  borderRadius: 6,
                  background: "rgba(255, 140, 0, 0.08)",
                  border: `1px solid ${theme.colors.neonOrange}44`,
                  color: theme.colors.textMuted,
                }}
              >
                <strong style={{ color: theme.colors.neonOrange }}>Exportação grande</strong>
                <p style={{ margin: "6px 0 0" }}>
                  {confirmando.lojas.length} lojas — acima do limite direto do navegador (
                  {RUPTURA_EXPORT_BROWSER_MAX_ROWS.toLocaleString("pt-BR")} linhas).
                </p>
                {confirmando.opcoesDrive?.driveDisponivel ? (
                  <p style={{ margin: "6px 0 0" }}>
                    Arquivo V7 integral disponível no Drive (manifest{" "}
                    <code style={{ fontSize: 11 }}>
                      {confirmando.formato === "xlsx" ? "baseXlsxDriveFileId" : "baseCsvDriveFileId"}
                    </code>
                    ). Recomendado para ~176k linhas.
                  </p>
                ) : (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    <li>
                      Configure{" "}
                      <code style={{ fontSize: 11 }}>
                        {confirmando.formato === "xlsx" ? "baseXlsxDriveFileId" : "baseCsvDriveFileId"}
                      </code>{" "}
                      no manifest para download V7 integral
                    </li>
                    <li>
                      Modo oficial compatível (~{LINHAS_ESTIMADAS_OFICIAL_COMPATIVEL.toLocaleString("pt-BR")} linhas)
                    </li>
                    <li>Selecione até {maxLojasBrowser} lojas para exportação rápida no navegador</li>
                    <li>
                      CLI: <code style={{ fontSize: 11 }}>node scripts/gerar-ruptura-ajuste-export.mjs</code>
                    </li>
                  </ul>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" style={buttonGhostStyle} disabled={loading} onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
              {confirmando.exportGrande ? (
                <>
                  {confirmando.opcoesDrive?.driveDisponivel && (
                    <button type="button" style={buttonStyle} disabled={loading} onClick={() => void executarExport("drive")}>
                      {loading ? "Exportando…" : "Baixar do Drive"}
                    </button>
                  )}
                  <button
                    type="button"
                    style={confirmando.opcoesDrive?.driveDisponivel ? buttonGhostStyle : buttonStyle}
                    disabled={loading}
                    onClick={() => void executarExport("integral_worker")}
                  >
                    {loading ? "Exportando…" : "V7 integral (Worker)"}
                  </button>
                  <button type="button" style={buttonGhostStyle} disabled={loading} onClick={() => void executarExport("oficial_compativel")}>
                    Oficial compatível (~130k)
                  </button>
                </>
              ) : (
                <button type="button" style={buttonStyle} disabled={loading} onClick={() => void executarExport("auto")}>
                  {loading ? "Exportando…" : "Confirmar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {status && (
        <div style={{ fontSize: 11, color: theme.colors.textMuted, maxWidth: 320, whiteSpace: "pre-wrap" }}>{status}</div>
      )}
    </div>
  );
}
