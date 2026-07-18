import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import type { RupturaProdutoCd } from "../types/rupturaCdTypes.ts";
import { consultarCdsProduto } from "../services/rupturaCdsService.ts";
import { theme } from "../../styles.ts";
import { CLASSIFICACAO_LABEL, formatNumero, tableStyle, tdStyle, thStyle } from "./rupturaSharedStyles.ts";
import { RupturaLegendaClassificacao } from "./RupturaHelp.tsx";

type Props = {
  produto: RupturaProdutoLoja | null;
  aberto: boolean;
  onFechar: () => void;
};

export function RupturaProdutoDetalhe({ produto, aberto, onFechar }: Props) {
  const [cds, setCds] = useState<RupturaProdutoCd[]>([]);
  const [loadingCds, setLoadingCds] = useState(false);

  useEffect(() => {
    if (!aberto || !produto) {
      setCds([]);
      return;
    }
    setLoadingCds(true);
    void consultarCdsProduto({
      regional: produto.regional,
      dataReferencia: produto.data_referencia,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
    })
      .then((r) => setCds(r.dados))
      .finally(() => setLoadingCds(false));
  }, [aberto, produto]);

  if (!aberto || !produto) return null;

  const overlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.72)",
    zIndex: 50,
    display: "flex",
    justifyContent: "flex-end",
  };

  const drawer: CSSProperties = {
    width: "min(720px, 100vw)",
    height: "100%",
    overflow: "auto",
    background: "#0b1220",
    borderLeft: `1px solid ${theme.colors.borderSoft}`,
    padding: 20,
  };

  const section = (titulo: string, body: ReactNode) => (
    <section style={{ marginBottom: 18 }}>
      <h3 style={{ margin: "0 0 8px", color: theme.colors.neonOrange, fontSize: 14 }}>{titulo}</h3>
      {body}
    </section>
  );

  return (
    <div style={overlay} onClick={onFechar}>
      <div style={drawer} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: theme.colors.textMuted }}>Produto {produto.seqproduto}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>{produto.descricao ?? "—"}</h2>
          </div>
          <button type="button" onClick={onFechar} style={{ background: "transparent", border: "none", color: theme.colors.text, cursor: "pointer", fontSize: 20 }}>
            ×
          </button>
        </div>

        {section(
          "Identificação",
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>Fornecedor: {produto.razao_fornecedor ?? "—"} ({produto.cod_fornecedor ?? "—"})</div>
            <div>Rede / Comprador: {produto.rede ?? "—"} / {produto.comprador ?? "—"}</div>
            <div>Bandeira: {produto.bandeira ?? "—"}</div>
          </div>,
        )}

        {section(
          "Loja e parâmetros",
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>Estoque loja: {formatNumero(produto.estoque_loja, 2)} | Média venda/dia: {formatNumero(produto.media_venda_dia, 2)}</div>
            <div>Mín / Máx: {formatNumero(produto.par_min, 2)} / {formatNumero(produto.par_max, 2)}</div>
            <div>Pendência loja: {formatNumero(produto.pendencia_loja, 2)} | Inventário: {formatNumero(produto.inventario_unidades, 2)}</div>
          </div>,
        )}

        {section(
          "Classificação",
          <div style={{ fontSize: 13 }}>
            <div>Classificação: {CLASSIFICACAO_LABEL[produto.classificacao_prazo ?? ""] ?? produto.classificacao_prazo ?? "—"}</div>
            <div>Base Limpa: {produto.base_limpa ?? "—"} | Flag ruptura: {produto.flag_ruptura ? "Sim" : "Não"}</div>
            <div style={{ marginTop: 8 }}>
              <RupturaLegendaClassificacao />
            </div>
          </div>,
        )}

        {section("Ação recomendada", <div style={{ fontSize: 13 }}>{produto.acao_recomendada ?? "—"}</div>)}

        {section(
          "Pedido e recebimento",
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>Dias pedido: {formatNumero(produto.dias_pedido)}</div>
            <div>Status recebimento: {produto.status_recebto ?? "—"}</div>
            <div>Pendência CPA/CD: {formatNumero(produto.pendencia_cpa_cd, 2)}</div>
          </div>,
        )}

        {section(
          "Centralização",
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>Produto centralizado: {formatNumero(produto.produto_centralizado)} — {produto.texto_produto_centralizado ?? "—"}</div>
            <div>CD selecionado: pos {produto.posicao_cd_selecionada ?? "—"} / código {produto.codigo_cd_selecionado ?? "—"}</div>
            <div>Status estoque CDs: {produto.status_estoque_cds ?? "—"}</div>
            <div>Ativação CD: {produto.status_solicitacao_ativacao_cd ?? "—"}</div>
          </div>,
        )}

        {section(
          "CDs dinâmicos",
          loadingCds ? (
            <div style={{ fontSize: 12, color: theme.colors.textMuted }}>Carregando posições de CD…</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["Pos.", "Código", "Estoque", "Pend.", "Status compra", "Dias compra", "Dias receb.", "Central.", "Origem"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cds.map((cd) => (
                    <tr key={cd.posicao_logica}>
                      <td style={tdStyle}>{cd.posicao_logica}</td>
                      <td style={tdStyle}>{cd.codigo_cd_fisico ?? "—"}</td>
                      <td style={tdStyle}>{formatNumero(cd.estoque, 2)}</td>
                      <td style={tdStyle}>{formatNumero(cd.pendencia, 2)}</td>
                      <td style={tdStyle}>{cd.status_compra ?? "—"}</td>
                      <td style={tdStyle}>{formatNumero(cd.dias_compra)}</td>
                      <td style={tdStyle}>{formatNumero(cd.dias_recebimento)}</td>
                      <td style={tdStyle}>{cd.flag_centralizacao ? "Sim" : "Não"}</td>
                      <td style={tdStyle}>{cd.origem_arquivo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!cds.length && <div style={{ fontSize: 12, color: theme.colors.textMuted }}>Nenhuma posição de CD.</div>}
            </div>
          ),
        )}

        {section(
          "Qualidade e versão",
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>Qualidade: {produto.qualidade_dados ?? "—"} | Status operacional: {produto.status_operacional ?? "—"}</div>
            <div>Versão {produto.versao} | Execução {produto.execucao_id}</div>
          </div>,
        )}
      </div>
    </div>
  );
}
