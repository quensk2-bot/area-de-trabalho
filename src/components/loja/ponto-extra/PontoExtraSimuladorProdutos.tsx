import type { CSSProperties } from "react";
import { theme } from "../../../styles";
import { buttonStyle, cardStyle, descStyle, tableStyle, tdStyle, thStyle } from "./pontoExtraSharedStyles";
import { alertasPontoExtra, formatNumber, formatPercent } from "./pontoExtraSharedUtils";
import { coberturaProduto, produtoElegivel, situacaoProduto } from "./pontoExtraSimuladorUtils";

type Props = {
  itens: Record<string, unknown>[];
  limiteSku: number;
  loading: boolean;
  onAprovar: (id: string, aprovado: boolean) => void;
  onAprovarElegiveis: () => void;
  onReprovarAlertas: () => void;
};

const situacaoColor: Record<string, string> = {
  APROVADO: theme.colors.neonGreen,
  ELEGIVEL: theme.colors.text,
  ALERTA: theme.colors.neonOrange,
  FORA_DA_REPARTICAO: theme.colors.textMuted,
};

const cardProdutoStyle: CSSProperties = {
  ...cardStyle,
  margin: 0,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export function PontoExtraSimuladorProdutos({ itens, limiteSku, loading, onAprovar, onAprovarElegiveis, onReprovarAlertas }: Props) {
  const elegiveis = itens.filter(produtoElegivel);
  const fora = itens.filter((item) => item.fora_reparticao);
  const excedeuLimite = elegiveis.length > limiteSku;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" disabled={loading || elegiveis.length === 0} onClick={onAprovarElegiveis} style={{ ...buttonStyle, padding: "8px 14px" }}>
          Aprovar elegiveis ({elegiveis.length})
        </button>
        <button type="button" disabled={loading} onClick={onReprovarAlertas} style={{ ...buttonStyle, padding: "8px 14px", background: theme.colors.neonOrange, color: "#111827" }}>
          Reprovar alertas
        </button>
        <span style={descStyle}>
          Elegiveis: {elegiveis.length} / limite {limiteSku}
          {excedeuLimite ? " — atencao: mais elegiveis que o limite de reparticao" : ""}
        </span>
      </div>

      <div className="ponto-extra-sim-produtos-desktop" style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {[
                "Ordem", "Codigo", "Descricao", "Fornecedor", "Setor", "Emb.", "Media", "Estoque CD",
                "Cobertura", "Participacao", "Unid.", "Caixas", "M3 produto", "% ponta", "Situacao", "Alertas", "Aprovacao",
              ].map((header) => (
                <th key={header} style={thStyle}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && <tr><td style={tdStyle} colSpan={17}>Nenhum produto para esta ponta.</td></tr>}
            {itens.map((item) => {
              const alertas = alertasPontoExtra(item);
              const situacao = situacaoProduto(item);
              const id = String(item.id ?? "");
              return (
                <tr key={id || String(item.codigo_produto)}>
                  <td style={tdStyle}>{item.ordem_reparticao ?? "-"}</td>
                  <td style={tdStyle}>{item.codigo_produto}</td>
                  <td style={tdStyle}>{item.descricao_produto || "-"}</td>
                  <td style={tdStyle}>{item.fornecedor || "-"}</td>
                  <td style={tdStyle}>{item.setor_n2 || item.secao || "-"}</td>
                  <td style={tdStyle}>{formatNumber(item.qtde_emb_compra, 0)}</td>
                  <td style={tdStyle}>{formatNumber(item.media_venda_un_dia, 3)}</td>
                  <td style={tdStyle}>{formatNumber(item.estoque_cd, 0)}</td>
                  <td style={tdStyle}>{formatNumber(coberturaProduto(item), 1)}</td>
                  <td style={tdStyle}>{formatPercent(item.participacao, 2)}</td>
                  <td style={tdStyle}>{formatNumber(item.unidade_sugerida, 2)}</td>
                  <td style={tdStyle}>{formatNumber(item.caixas_sugeridas, 2)}</td>
                  <td style={tdStyle}>{formatNumber(item.m3_ocupado ?? item.m3_capacidade, 4)}</td>
                  <td style={tdStyle}>{formatNumber(item.percentual_ocupacao, 1)}%</td>
                  <td style={{ ...tdStyle, color: situacaoColor[situacao] ?? theme.colors.text }}>{situacao}</td>
                  <td style={{ ...tdStyle, color: alertas.length ? theme.colors.neonOrange : theme.colors.textMuted }}>
                    {alertas.join(" | ") || "-"}
                  </td>
                  <td style={tdStyle}>
                    {produtoElegivel(item) ? (
                      <button
                        type="button"
                        disabled={loading || !id}
                        onClick={() => onAprovar(id, !item.aprovado)}
                        style={{
                          ...buttonStyle,
                          padding: "6px 10px",
                          background: item.aprovado ? "#991b1b" : theme.colors.neonGreen,
                          color: item.aprovado ? "#fff" : "#022c22",
                        }}
                      >
                        {item.aprovado ? "Reprovar" : "Aprovar"}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ponto-extra-sim-produtos-mobile" style={{ display: "none", flexDirection: "column", gap: 10 }}>
        {itens.map((item) => {
          const alertas = alertasPontoExtra(item);
          const situacao = situacaoProduto(item);
          const id = String(item.id ?? "");
          return (
            <div key={`card-${id || item.codigo_produto}`} style={cardProdutoStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{item.codigo_produto}</strong>
                <span style={{ color: situacaoColor[situacao] }}>{situacao}</span>
              </div>
              <div style={{ fontSize: 12 }}>{item.descricao_produto || "-"}</div>
              <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr", fontSize: 11 }}>
                <span>Media: {formatNumber(item.media_venda_un_dia, 3)}</span>
                <span>Estoque: {formatNumber(item.estoque_cd, 0)}</span>
                <span>Unid.: {formatNumber(item.unidade_sugerida, 2)}</span>
                <span>Caixas: {formatNumber(item.caixas_sugeridas, 2)}</span>
                <span>M3: {formatNumber(item.m3_ocupado ?? item.m3_capacidade, 4)}</span>
                <span>% ponta: {formatNumber(item.percentual_ocupacao, 1)}%</span>
              </div>
              {alertas.length > 0 && <div style={{ fontSize: 11, color: theme.colors.neonOrange }}>{alertas.join(" | ")}</div>}
              {produtoElegivel(item) && (
                <button
                  type="button"
                  disabled={loading || !id}
                  onClick={() => onAprovar(id, !item.aprovado)}
                  style={{
                    ...buttonStyle,
                    padding: "8px 12px",
                    background: item.aprovado ? "#991b1b" : theme.colors.neonGreen,
                    color: item.aprovado ? "#fff" : "#022c22",
                  }}
                >
                  {item.aprovado ? "Reprovar produto" : "Aprovar produto"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {fora.length > 0 && (
        <p style={descStyle}>{fora.length} produto(s) marcados como FORA_DA_REPARTICAO e mantidos fora da simulacao ativa.</p>
      )}

      <style>{`
        @media (max-width: 900px) {
          .ponto-extra-sim-produtos-desktop { display: none !important; }
          .ponto-extra-sim-produtos-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
