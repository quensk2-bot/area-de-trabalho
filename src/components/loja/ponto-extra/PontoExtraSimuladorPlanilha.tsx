import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { theme } from "../../../styles";
import { buttonStyle, descStyle } from "./pontoExtraSharedStyles";
import { alertasPontoExtra, formatDateBR, formatNumber, formatPercent, monthLabel } from "./pontoExtraSharedUtils";
import {
  type ArvoreAprovacaoNode,
  type ArvoreAprovacaoPontaMeta,
  type ArvoreAprovacaoTotais,
  coberturaProduto,
  isMetaPonta,
  itensDoNo,
  montarArvoreCapaAprovacao,
  produtoElegivel,
  situacaoProduto,
} from "./pontoExtraSimuladorUtils";

type Props = {
  itens: Record<string, unknown>[];
  loading: boolean;
  onAprovar: (id: string, aprovado: boolean) => void;
  onAprovarPonta: (ids: string[], aprovado: boolean) => void;
  onAprovarElegiveis: () => void;
  onReprovarAlertas: () => void;
};

type BalaoPontaState = {
  nodeId: string;
  meta: ArvoreAprovacaoPontaMeta;
  top: number;
  left: number;
};

const COLUNAS = [
  "Rotulos de linha",
  "Ordem",
  "Codigo",
  "Descricao",
  "Fornecedor",
  "Setor",
  "Emb.",
  "Media",
  "Estoque CD",
  "Cobertura",
  "Participacao",
  "Unid.",
  "Caixas",
  "M3 produto",
  "% ponta",
  "Situacao",
  "Alertas",
  "Aprovacao",
] as const;

const headerStyle: CSSProperties = {
  background: "#4b5563",
  color: "#f9fafb",
  fontWeight: 800,
  padding: "10px 12px",
  borderBottom: "1px solid #6b7280",
  whiteSpace: "nowrap",
};

const rowBase: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(148,163,184,0.25)",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const levelIndent: Partial<Record<ArvoreAprovacaoNode["level"], number>> = {
  capa: 0,
  loja: 20,
  ponta: 40,
  produto: 60,
};

const levelBg: Partial<Record<ArvoreAprovacaoNode["level"], string>> = {
  capa: "rgba(2,6,23,0.92)",
  loja: "rgba(30,41,59,0.75)",
  ponta: "rgba(51,65,85,0.55)",
  produto: "transparent",
};

const situacaoColor: Record<string, string> = {
  APROVADO: theme.colors.neonGreen,
  ELEGIVEL: theme.colors.text,
  ALERTA: theme.colors.neonOrange,
  FORA_DA_REPARTICAO: theme.colors.textMuted,
};

function flattenVisible(nodes: ArvoreAprovacaoNode[], collapsed: Set<string>): Array<{ node: ArvoreAprovacaoNode }> {
  const rows: Array<{ node: ArvoreAprovacaoNode }> = [];
  for (const node of nodes) {
    rows.push({ node });
    if (!collapsed.has(node.id) && node.children.length > 0) {
      rows.push(...flattenVisible(node.children, collapsed));
    }
  }
  return rows;
}

function collectIds(nodes: ArvoreAprovacaoNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectIds(node.children)]);
}

function idsRecolhidosInicial(nodes: ArvoreAprovacaoNode[]): Set<string> {
  return new Set(collectIds(nodes).filter((id) => id.startsWith("capa|") || id.startsWith("loja|") || id.startsWith("ponta|")));
}

function dash(valor: string) {
  return <span style={{ color: theme.colors.textMuted }}>{valor}</span>;
}

function celulaResumo(totais: ArvoreAprovacaoTotais, campo: keyof ArvoreAprovacaoTotais, digits = 0) {
  return <span style={{ fontWeight: 800 }}>{formatNumber(totais[campo], digits)}</span>;
}

function RotuloNivel({
  node,
  onHoverPonta,
  onLeavePonta,
}: {
  node: ArvoreAprovacaoNode;
  onHoverPonta?: (node: ArvoreAprovacaoNode, target: HTMLElement) => void;
  onLeavePonta?: () => void;
}) {
  if (node.level === "capa") {
    return <span style={{ fontWeight: 800, color: theme.colors.neonGreen, fontSize: 13, letterSpacing: 0.3 }}>{node.label}</span>;
  }
  if (node.level === "loja") {
    return <span style={{ fontWeight: 800, fontSize: 12 }}>LOJA {node.label}</span>;
  }
  if (node.level === "ponta") {
    return (
      <span
        onMouseEnter={(e) => onHoverPonta?.(node, e.currentTarget)}
        onMouseLeave={onLeavePonta}
        style={{
          fontWeight: 700,
          fontSize: 12,
          cursor: "help",
          textDecoration: "underline dotted",
          textUnderlineOffset: 3,
        }}
      >
        {node.label}
      </span>
    );
  }
  return null;
}

function MetricaBalao({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function BalaoResumoPonta({
  meta,
  top,
  left,
  loading,
  itensPonta,
  onAprovarPonta,
  onMouseEnter,
  onMouseLeave,
}: {
  meta: ArvoreAprovacaoPontaMeta;
  top: number;
  left: number;
  loading: boolean;
  itensPonta: Record<string, unknown>[];
  onAprovarPonta: (ids: string[], aprovado: boolean) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const elegiveis = itensPonta.filter(produtoElegivel);
  const idsElegiveis = elegiveis.map((item) => String(item.id));
  const todosAprovados = elegiveis.length > 0 && elegiveis.every((item) => Boolean(item.aprovado));
  const algumAprovado = elegiveis.some((item) => Boolean(item.aprovado));

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 10000,
        width: 360,
        maxWidth: "92vw",
        background: "#0f172a",
        border: `1px solid ${theme.colors.neonGreen}`,
        borderRadius: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        padding: 14,
        color: theme.colors.text,
      }}
    >
      <div style={{ fontWeight: 800, color: theme.colors.neonGreen, marginBottom: 4 }}>{meta.pontaLabel}</div>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 10 }}>{meta.descricaoPonta}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
        <MetricaBalao label="Loja" value={meta.loja} />
        <MetricaBalao label="Cod. ponta" value={meta.codPonta || "-"} />
        <MetricaBalao label="Vigencia" value={monthLabel(meta.mesVigencia)} />
        <MetricaBalao label="Seq. vigencia" value={meta.seqVigencia || "-"} />
        <MetricaBalao label="Total M3" value={formatNumber(meta.totalM3, 4)} />
        <MetricaBalao label="% abastecimento" value={formatPercent(meta.percentualAbastecimento / 100, 0)} />
        <MetricaBalao label="M3 alvo" value={formatNumber(meta.m3Alvo, 5)} />
        <MetricaBalao label="M3 utilizado" value={formatNumber(meta.m3Utilizado, 4)} />
        <MetricaBalao label="Ocupacao" value={formatPercent(meta.percentualOcupacao / 100, 1)} />
        <MetricaBalao label="Limite SKU" value={meta.limiteSku} />
        <MetricaBalao label="Status" value={meta.statusSimulacao} />
        <MetricaBalao label="Itens aprovados" value={`${meta.itensAprovados} / ${meta.itensElegiveis}`} />
        <MetricaBalao label="Caixas" value={formatNumber(meta.somaCx, 2)} />
        <MetricaBalao label="Estoque CD" value={formatNumber(meta.somaEstoque, 0)} />
      </div>

      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 12 }}>
        Periodo {formatDateBR(meta.dtInicio)} a {formatDateBR(meta.dtFim)} | Setor {meta.setorCodigo} — {meta.setorNome}
        {meta.alertas > 0 ? ` | Alertas: ${meta.alertas}` : ""}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={loading || elegiveis.length === 0 || todosAprovados}
          onClick={() => onAprovarPonta(idsElegiveis, true)}
          style={{ ...buttonStyle, padding: "8px 12px", fontSize: 12 }}
        >
          Aprovar ponta ({elegiveis.length})
        </button>
        {algumAprovado && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onAprovarPonta(idsElegiveis, false)}
            style={{ ...buttonStyle, padding: "8px 12px", fontSize: 12, background: "#991b1b", color: "#fff" }}
          >
            Reprovar ponta
          </button>
        )}
      </div>
    </div>
  );
}

function CelulasResumo({ node }: { node: ArvoreAprovacaoNode }) {
  const isPonta = node.level === "ponta";
  const isCapaOuLoja = node.level === "capa" || node.level === "loja";

  if (isCapaOuLoja) {
    return (
      <>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
      </>
    );
  }

  if (isPonta) {
    return (
      <>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaEstoque", 0)}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaCx", 2)}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
        <td style={rowBase}>{dash("—")}</td>
      </>
    );
  }

  return (
    <>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaMedia", 3)}</td>
      <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaEstoque", 0)}</td>
      <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "coberturaMedia", 1)}</td>
      <td style={{ ...rowBase, textAlign: "right" }}><span style={{ fontWeight: 800 }}>{formatPercent(node.totais.participacaoMedia, 2)}</span></td>
      <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaUnid", 2)}</td>
      <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaCx", 2)}</td>
      <td style={{ ...rowBase, textAlign: "right" }}>{celulaResumo(node.totais, "somaM3", 4)}</td>
      <td style={{ ...rowBase, textAlign: "right" }}><span style={{ fontWeight: 800 }}>{formatNumber(node.totais.percentualPontaMedia, 1)}%</span></td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
      <td style={rowBase}>{dash("—")}</td>
    </>
  );
}

export function PontoExtraSimuladorPlanilha({ itens, loading, onAprovar, onAprovarPonta, onAprovarElegiveis, onReprovarAlertas }: Props) {
  const arvore = useMemo(() => montarArvoreCapaAprovacao(itens), [itens]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [balaoPonta, setBalaoPonta] = useState<BalaoPontaState | null>(null);
  const balaoPontaNodeRef = useRef<ArvoreAprovacaoNode | null>(null);
  const hideBalaoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setCollapsed(idsRecolhidosInicial(arvore));
  }, [arvore]);

  useEffect(() => () => {
    if (hideBalaoTimerRef.current) window.clearTimeout(hideBalaoTimerRef.current);
  }, []);

  const elegiveis = itens.filter(produtoElegivel);
  const rows = useMemo(() => flattenVisible(arvore, collapsed), [arvore, collapsed]);

  function cancelarFechamentoBalao() {
    if (hideBalaoTimerRef.current) {
      window.clearTimeout(hideBalaoTimerRef.current);
      hideBalaoTimerRef.current = null;
    }
  }

  function agendarFechamentoBalao() {
    cancelarFechamentoBalao();
    hideBalaoTimerRef.current = window.setTimeout(() => {
      setBalaoPonta(null);
      balaoPontaNodeRef.current = null;
    }, 180);
  }

  function abrirBalaoPonta(node: ArvoreAprovacaoNode, target: HTMLElement) {
    if (!node.meta || !isMetaPonta(node.meta)) return;
    cancelarFechamentoBalao();
    balaoPontaNodeRef.current = node;
    const rect = target.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 380);
    setBalaoPonta({
      nodeId: node.id,
      meta: node.meta,
      top: rect.bottom + 8,
      left: Math.max(12, left),
    });
  }

  function toggleNode(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" disabled={loading || elegiveis.length === 0} onClick={onAprovarElegiveis} style={{ ...buttonStyle, padding: "8px 14px" }}>
          Aprovar elegiveis ({elegiveis.length})
        </button>
        <button type="button" disabled={loading} onClick={onReprovarAlertas} style={{ ...buttonStyle, padding: "8px 14px", background: theme.colors.neonOrange, color: "#111827" }}>
          Reprovar alertas
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(new Set())}
          style={{ ...buttonStyle, padding: "8px 14px", background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}
        >
          Expandir tudo
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(idsRecolhidosInicial(arvore))}
          style={{ ...buttonStyle, padding: "8px 14px", background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}
        >
          Recolher niveis
        </button>
        <span style={descStyle}>
          Capas: {arvore.length} | Produtos: {itens.length} | Passe o mouse na ponta para resumo e aprovacao rapida
        </span>
      </div>

      {balaoPonta && balaoPontaNodeRef.current && (
        <BalaoResumoPonta
          meta={balaoPonta.meta}
          top={balaoPonta.top}
          left={balaoPonta.left}
          loading={loading}
          itensPonta={itensDoNo(balaoPontaNodeRef.current)}
          onAprovarPonta={onAprovarPonta}
          onMouseEnter={cancelarFechamentoBalao}
          onMouseLeave={agendarFechamentoBalao}
        />
      )}

      <div style={{ overflowX: "auto", border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1800 }}>
          <thead>
            <tr>
              {COLUNAS.map((header) => (
                <th
                  key={header}
                  style={{
                    ...headerStyle,
                    textAlign: header === "Rotulos de linha" || header === "Descricao" || header === "Fornecedor" || header === "Setor" || header === "Situacao" || header === "Alertas" || header === "Aprovacao"
                      ? "left"
                      : "right",
                    minWidth: header === "Rotulos de linha" ? 360 : header === "Descricao" ? 220 : undefined,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUNAS.length} style={{ ...rowBase, color: theme.colors.textMuted }}>Nenhum dado processado para exibir.</td>
              </tr>
            )}
            {rows.map(({ node }, index) => {
              const isProduto = node.level === "produto";
              const item = node.item;
              const hasChildren = node.children.length > 0;
              const isCollapsed = collapsed.has(node.id);
              const situacao = item ? situacaoProduto(item) : "";
              const alertas = item ? alertasPontoExtra(item) : [];
              const id = String(item?.id ?? "");
              const zebra = index % 2 === 0 ? "rgba(15,23,42,0.35)" : "rgba(15,23,42,0.18)";
              const indent = levelIndent[node.level] ?? 0;
              const background = isProduto ? zebra : (levelBg[node.level] ?? "transparent");

              return (
                <tr key={node.id} style={{ background, color: theme.colors.text }}>
                  <td style={{ ...rowBase, paddingLeft: 12 + indent }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleNode(node.id)}
                          style={{
                            width: 22,
                            height: 22,
                            border: "1px solid #9ca3af",
                            borderRadius: 4,
                            background: "#e5e7eb",
                            color: "#111827",
                            fontWeight: 900,
                            cursor: "pointer",
                            lineHeight: 1,
                            padding: 0,
                            flexShrink: 0,
                          }}
                        >
                          {isCollapsed ? "+" : "−"}
                        </button>
                      ) : (
                        <span style={{ display: "inline-block", width: 22, flexShrink: 0 }} />
                      )}
                      {!isProduto && (
                        <RotuloNivel
                          node={node}
                          onHoverPonta={abrirBalaoPonta}
                          onLeavePonta={agendarFechamentoBalao}
                        />
                      )}
                    </div>
                  </td>

                  {isProduto && item ? (
                    <>
                      <td style={{ ...rowBase, textAlign: "right", fontWeight: 800, color: theme.colors.neonGreen }}>{item.ordem_reparticao ?? "-"}</td>
                      <td style={rowBase}>{item.codigo_produto}</td>
                      <td style={rowBase}>{item.descricao_produto || "-"}</td>
                      <td style={rowBase}>{item.fornecedor || "-"}</td>
                      <td style={rowBase}>{item.setor_n2 || item.secao || "-"}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.qtde_emb_compra, 0)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.media_venda_un_dia, 3)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.estoque_cd, 0)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(coberturaProduto(item), 1)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatPercent(item.participacao, 2)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.unidade_sugerida, 2)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.caixas_sugeridas, 2)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.m3_ocupado ?? item.m3_capacidade, 4)}</td>
                      <td style={{ ...rowBase, textAlign: "right" }}>{formatNumber(item.percentual_ocupacao, 1)}%</td>
                      <td style={{ ...rowBase, color: situacaoColor[situacao] ?? theme.colors.text }}>{situacao}</td>
                      <td style={{ ...rowBase, color: alertas.length ? theme.colors.neonOrange : theme.colors.textMuted }}>
                        {alertas.join(" | ") || "-"}
                      </td>
                      <td style={rowBase}>
                        {produtoElegivel(item) ? (
                          <button
                            type="button"
                            disabled={loading || !id}
                            onClick={() => onAprovar(id, !item.aprovado)}
                            style={{
                              ...buttonStyle,
                              padding: "5px 10px",
                              fontSize: 11,
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
                    </>
                  ) : (
                    <CelulasResumo node={node} />
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
