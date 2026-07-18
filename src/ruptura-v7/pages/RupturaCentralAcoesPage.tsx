import { useCallback, useEffect, useMemo, useState } from "react";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaContextHelp } from "../components/RupturaHelp.tsx";
import { badgeStyle, formatNumero, PRIORIDADE_LABEL, tableStyle, tdStyle, thStyle } from "../components/rupturaSharedStyles.ts";
import { useRupturaContexto } from "../hooks/useRupturaContexto.ts";
import { consultarCentralAcoes } from "../services/rupturaAcoesService.ts";
import { classificarFilaCentralAcao, FILAS_CENTRAL_ACOES, type RupturaCentralAcao } from "../types/rupturaAcoesTypes.ts";

export function RupturaCentralAcoesPage() {
  const [ctx, setCtx] = useRupturaContexto();
  const [dados, setDados] = useState<RupturaCentralAcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filaAtiva, setFilaAtiva] = useState<string>("todas");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await consultarCentralAcoes(ctx);
    if (r.erro) setErro(r.erro.message);
    setDados(r.dados);
    setLoading(false);
  }, [ctx]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const porFila = useMemo(() => {
    const map = new Map<string, RupturaCentralAcao[]>();
    for (const f of FILAS_CENTRAL_ACOES) map.set(f.id, []);
    for (const item of dados) {
      const id = classificarFilaCentralAcao(item);
      map.get(id)?.push(item);
    }
    return map;
  }, [dados]);

  const visiveis =
    filaAtiva === "todas"
      ? dados
      : porFila.get(filaAtiva) ?? [];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Central de Ações</h1>
      </header>

      <RupturaContextHelp
        titulo="Central de Ações"
        texto="Esta tela organiza as ações sugeridas pelo Motor por prioridade operacional. Somente leitura nesta fase."
      />

      <RupturaContextoBar ctx={ctx} onChange={setCtx} onAtualizar={() => void carregar()} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setFilaAtiva("todas")} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #334155", background: filaAtiva === "todas" ? "#fb923c" : "transparent", color: filaAtiva === "todas" ? "#0f172a" : "#f9fafb", cursor: "pointer" }}>
          Todas ({dados.length})
        </button>
        {FILAS_CENTRAL_ACOES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilaAtiva(f.id)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #334155", background: filaAtiva === f.id ? "#fb923c" : "transparent", color: filaAtiva === f.id ? "#0f172a" : "#f9fafb", cursor: "pointer" }}
          >
            {f.label} ({porFila.get(f.id)?.length ?? 0})
          </button>
        ))}
      </div>

      {erro && <div style={{ color: theme.colors.danger }}>{erro}</div>}
      {loading ? (
        <div style={{ color: theme.colors.textMuted }}>Carregando fila…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Produto", "Descrição", "Fornecedor", "Comprador", "Prioridade", "Ação", "Dias ped.", "CD", "Estoque CD", "Status"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((row) => (
                <tr key={row.seqproduto}>
                  <td style={tdStyle}>{row.seqproduto}</td>
                  <td style={tdStyle}>{row.descricao ?? "—"}</td>
                  <td style={tdStyle}>{row.fornecedor ?? "—"}</td>
                  <td style={tdStyle}>{row.comprador ?? "—"}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(row.prioridade === "critico" ? "danger" : row.prioridade === "alto" ? "warn" : "neutral")}>
                      {PRIORIDADE_LABEL[row.prioridade] ?? row.prioridade}
                    </span>
                  </td>
                  <td style={tdStyle}>{row.acao_recomendada ?? "—"}</td>
                  <td style={tdStyle}>{formatNumero(row.dias_pedido)}</td>
                  <td style={tdStyle}>{row.codigo_cd_selecionado ?? "—"}</td>
                  <td style={tdStyle}>{formatNumero(row.soma_estoque_cd, 2)}</td>
                  <td style={tdStyle}>{row.status_estoque_cds ?? row.status_recebto ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visiveis.length && <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Nenhum item nesta fila.</div>}
        </div>
      )}
    </section>
  );
}
