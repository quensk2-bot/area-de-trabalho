import { useCallback, useEffect, useState } from "react";
import { theme } from "../../styles.ts";
import { RupturaContextHelp } from "../components/RupturaHelp.tsx";
import { badgeStyle, formatNumero, hashReduzido, tableStyle, tdStyle, thStyle, buttonGhostStyle, inputStyle } from "../components/rupturaSharedStyles.ts";
import { consultarExecucaoPorId, consultarExecucoes } from "../services/rupturaExecucoesService.ts";
import type { RupturaExecucao } from "../types/rupturaExecucaoTypes.ts";

export function RupturaExecucoesPage() {
  const [regional, setRegional] = useState("MT");
  const [dados, setDados] = useState<RupturaExecucao[]>([]);
  const [selecionada, setSelecionada] = useState<RupturaExecucao | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await consultarExecucoes({ regional });
    if (r.erro) setErro(r.erro.message);
    setDados(r.dados);
    setLoading(false);
  }, [regional]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function abrirExecucao(id: string) {
    const r = await consultarExecucaoPorId(id);
    if (r.erro) setErro(r.erro.message);
    setSelecionada(r.dado);
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Execuções do Motor</h1>
      </header>

      <RupturaContextHelp
        titulo="Execuções"
        texto="Cada processamento gera uma versão. Uma nova versão somente substitui a anterior após carga completa e validação."
      />

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, maxWidth: 160 }}>
        Regional
        <input style={inputStyle} value={regional} onChange={(e) => setRegional(e.target.value.toUpperCase())} />
      </label>

      {erro && <div style={{ color: theme.colors.danger }}>{erro}</div>}

      {loading ? (
        <div style={{ color: theme.colors.textMuted }}>Carregando execuções…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Regional", "Data", "Versão", "Ativa", "Status", "Produtos", "CDs", "Chunks", "Duração", "Hash", "Ação"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((row) => (
                <tr key={row.execucao_id}>
                  <td style={tdStyle}>{row.regional}</td>
                  <td style={tdStyle}>{row.data_referencia}</td>
                  <td style={tdStyle}>{row.versao}</td>
                  <td style={tdStyle}>
                    {row.versao_ativa ? <span style={badgeStyle("ok")}>Sim</span> : <span style={badgeStyle("neutral")}>Não</span>}
                  </td>
                  <td style={tdStyle}>{row.status}</td>
                  <td style={tdStyle}>{formatNumero(row.total_produtos)}</td>
                  <td style={tdStyle}>{formatNumero(row.total_cds)}</td>
                  <td style={tdStyle}>{row.chunks_concluidos}/{row.total_chunks}</td>
                  <td style={tdStyle}>{row.duracao_ms != null ? `${Math.round(row.duracao_ms / 1000)}s` : "—"}</td>
                  <td style={tdStyle}>{hashReduzido(row.hash_pacote)}</td>
                  <td style={tdStyle}>
                    <button type="button" style={buttonGhostStyle} onClick={() => void abrirExecucao(row.execucao_id)}>Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selecionada && (
        <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, background: "rgba(15,23,42,0.7)" }}>
          <h3 style={{ marginTop: 0, color: theme.colors.neonOrange }}>Resumo da execução v{selecionada.versao}</h3>
          <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
            <div>ID: {selecionada.execucao_id}</div>
            <div>Status: {selecionada.status} | Versão ativa: {selecionada.versao_ativa ? "Sim" : "Não"}</div>
            <div>Produtos: {formatNumero(selecionada.total_produtos)} | CDs: {formatNumero(selecionada.total_cds)}</div>
            <div>Chunks concluídos: {selecionada.chunks_concluidos} | Falhos: {selecionada.chunks_falhos} | Total: {selecionada.total_chunks}</div>
            <div>Início: {new Date(selecionada.iniciado_em).toLocaleString("pt-BR")} | Fim: {selecionada.finalizado_em ? new Date(selecionada.finalizado_em).toLocaleString("pt-BR") : "—"}</div>
            <div>Substitui execução: {selecionada.substitui_execucao_id ?? "—"}</div>
            <div>Hash pacote: {selecionada.hash_pacote}</div>
          </div>
          <button type="button" style={{ ...buttonGhostStyle, marginTop: 10 }} onClick={() => setSelecionada(null)}>Fechar</button>
        </div>
      )}
    </section>
  );
}
