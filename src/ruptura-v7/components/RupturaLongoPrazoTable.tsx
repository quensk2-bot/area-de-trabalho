import { useState, useEffect, useRef } from "react";
import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import {
  badgeStyle,
  formatNumero,
  tableStyle,
  tdStyle,
  thStyle,
} from "./rupturaSharedStyles.ts";
import { theme } from "../../styles.ts";
import {
  formatarModalidade,
  acaoVisualLp,
  ACAO_VISUAL_LABEL,
  ACAO_VISUAL_BADGE,
  ACAO_VISUAL_PRIORIDADE,
  PRIORIDADE_LABEL_LP,
  PRIORIDADE_TONE_LP,
  explicarAcaoVisualLp,
  formatarCentralizacao,
} from "../utils/longoPrazoPresentation.ts";

export type ColunaIdLp =
  | "loja"
  | "seqproduto"
  | "descricao"
  | "setor_n2"
  | "comprador"
  | "razao_fornecedor"
  | "modalidade"
  | "dias_ruptura"
  | "ultimo_pedido_loja"
  | "pendencia_loja"
  | "centralizacao"
  | "status_solicitacao_ativacao_cd"
  | "status_estoque_cds"
  | "acao_operacional"
  | "par_max"
  | "embalagem_compra"
  | "rede"
  | "categoria_n5"
  | "ultimo_pedido_loja_pq"
  | "dias_ultimo_pedido_dashboard"
  | "ativacao_30_sem_pedido"
  | "cd_fisicos_ativos"
  | "cd_fisicos_com_recebimento"
  | "dias_pedido"
  | "pendencia_cpa_cd";

export const COLUNAS_LONGO_PRAZO: { id: ColunaIdLp; label: string; default: boolean }[] = [
  { id: "loja", label: "Loja", default: true },
  { id: "seqproduto", label: "Código", default: true },
  { id: "descricao", label: "Descrição", default: true },
  { id: "setor_n2", label: "Seção", default: true },
  { id: "comprador", label: "Comprador", default: true },
  { id: "razao_fornecedor", label: "Fornecedor", default: true },
  { id: "modalidade", label: "Modalidade", default: true },
  { id: "dias_ruptura", label: "Dias Ruptura", default: true },
  { id: "ultimo_pedido_loja", label: "Último Pedido Loja", default: true },
  { id: "pendencia_loja", label: "Pedido Loja", default: true },
  { id: "centralizacao", label: "Centralização", default: true },
  { id: "status_solicitacao_ativacao_cd", label: "Status Ativação CD", default: true },
  { id: "status_estoque_cds", label: "Status Estoque CD", default: true },
  { id: "acao_operacional", label: "Ação Operacional", default: true },
  { id: "par_max", label: "Parmax", default: false },
  { id: "embalagem_compra", label: "EMBCPA", default: false },
  { id: "rede", label: "Rede", default: false },
  { id: "categoria_n5", label: "Categoria", default: false },
  { id: "ultimo_pedido_loja_pq", label: "Último Pedido PQ", default: false },
  { id: "dias_ultimo_pedido_dashboard", label: "Último Pedido Dashboard", default: false },
  { id: "ativacao_30_sem_pedido", label: "Ativação >30 sem pedido", default: false },
  { id: "cd_fisicos_ativos", label: "CDs com estoque", default: false },
  { id: "cd_fisicos_com_recebimento", label: "CDs com recebimento", default: false },
  { id: "dias_pedido", label: "Dias Pedido", default: false },
  { id: "pendencia_cpa_cd", label: "Pendência Loja + CDs", default: false },
];

type Props = {
  produtos: RupturaProdutoLoja[];
  loading?: boolean;
  colunasVisiveis: Set<ColunaIdLp>;
  onVerDetalhe?: (produto: RupturaProdutoLoja) => void;
};

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 200);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 6,
            padding: "6px 10px",
            background: theme.colors.bgElevated,
            border: `1px solid ${theme.colors.border ?? "#334155"}`,
            borderRadius: 6,
            color: theme.colors.text ?? "#e2e8f0",
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

export function RupturaLongoPrazoTable({
  produtos,
  loading,
  colunasVisiveis,
  onVerDetalhe,
}: Props) {
  if (loading) {
    return <div style={{ color: theme.colors.textMuted }}>Carregando produtos…</div>;
  }

  if (!produtos.length) {
    return (
      <div style={{ color: theme.colors.textMuted }}>
        Nenhum produto em Longo Prazo encontrado para os filtros atuais.
      </div>
    );
  }

  const colunas = COLUNAS_LONGO_PRAZO.filter((c) => colunasVisiveis.has(c.id));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ ...tableStyle, fontSize: 13 }}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.id} style={{ ...thStyle, fontSize: 12 }}>
                {c.label}
              </th>
            ))}
            <th style={{ ...thStyle, fontSize: 12 }}>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => {
            const acao = acaoVisualLp(p);
            const prioridade = ACAO_VISUAL_PRIORIDADE[acao];
            const badgePri = prioridade === "critica"
              ? { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(248,113,113,0.15)", color: theme.colors.danger ?? "#f87171" }
              : badgeStyle(PRIORIDADE_TONE_LP[prioridade]);

            return (
              <tr key={`${p.loja}-${p.seqproduto}`}>
                {colunas.map((c) => (
                  <td key={c.id} style={{ ...tdStyle, fontSize: 12 }}>
                    {renderCelula(p, c.id, acao, badgePri)}
                  </td>
                ))}
                <td style={{ ...tdStyle, fontSize: 12 }}>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: `1px solid ${theme.colors.neonOrange ?? "#fb923c"}`,
                      borderRadius: 8,
                      color: theme.colors.neonOrange ?? "#fb923c",
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onClick={() => onVerDetalhe?.(p)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderCelula(
  p: RupturaProdutoLoja,
  col: ColunaIdLp,
  acao: ReturnType<typeof acaoVisualLp>,
  badgePri: React.CSSProperties,
) {
  if (col === "descricao") {
    return (
      <Tooltip text={p.descricao ?? "—"}>
        <span style={ellipsisStyle}>{p.descricao ?? "—"}</span>
      </Tooltip>
    );
  }

  if (col === "razao_fornecedor") {
    return (
      <Tooltip text={p.razao_fornecedor ?? "—"}>
        <span style={ellipsisStyle}>{p.razao_fornecedor ?? "—"}</span>
      </Tooltip>
    );
  }

  // Ação operacional — badge compacto com tooltip
  if (col === "acao_operacional") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Tooltip text={ACAO_VISUAL_LABEL[acao]}>
          <span style={badgePri}>
            {ACAO_VISUAL_BADGE[acao]}
          </span>
        </Tooltip>
        <span style={{ fontSize: 10, color: theme.colors.textMuted }}>
          {PRIORIDADE_LABEL_LP[ACAO_VISUAL_PRIORIDADE[acao]]}
        </span>
      </div>
    );
  }

  if (col === "modalidade") {
    const modalidade = formatarModalidade(p.modalidade_cd);
    return <span style={{ ...badgeStyle("neutral"), fontSize: 11 }}>{modalidade}</span>;
  }

  if (col === "loja") {
    return <span>{p.loja}</span>;
  }

  if (col === "seqproduto") {
    return <span>{p.seqproduto}</span>;
  }

  if (col === "dias_ruptura") {
    const val = p.dias_ruptura;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return (
      <span style={{ fontWeight: 700, color: val > 60 ? theme.colors.danger ?? "#f87171" : val > 30 ? theme.colors.warning ?? "#facc15" : theme.colors.neonGreen ?? "#22c55e" }}>
        {formatNumero(val, 0)}
      </span>
    );
  }

  if (col === "ultimo_pedido_loja") {
    const val = p.ultimo_pedido_loja_pq;
    if (val === 999 || val == null) {
      return <span style={{ color: theme.colors.danger ?? "#f87171", fontWeight: 700 }}>Sem pedido</span>;
    }
    return (
      <span style={{ fontWeight: 700, color: val > 60 ? theme.colors.danger ?? "#f87171" : val > 30 ? theme.colors.warning ?? "#facc15" : theme.colors.neonGreen ?? "#22c55e" }}>
        {formatNumero(val, 0)}
      </span>
    );
  }

  if (col === "ultimo_pedido_loja_pq") {
    const val = p.ultimo_pedido_loja_pq;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    if (val === 999) return <span style={{ color: theme.colors.danger ?? "#f87171" }}>999</span>;
    return <span>{formatNumero(val, 0)}</span>;
  }

  if (col === "dias_ultimo_pedido_dashboard") {
    const val = p.dias_ultimo_pedido_loja_dashboard;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span>{formatNumero(val, 0)}</span>;
  }

  if (col === "pendencia_loja") {
    if (p.pendencia_loja == null) {
      return <span style={{ color: theme.colors.textMuted, fontStyle: "italic" }}>Sem pedido</span>;
    }
    return <span>{formatNumero(p.pendencia_loja, 0)}</span>;
  }

  if (col === "pendencia_cpa_cd") {
    const val = p.pendencia_cpa_cd;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span>{formatNumero(val, 0)}</span>;
  }

  if (col === "centralizacao") {
    return (
      <span style={{ ...badgeStyle("neutral"), fontSize: 11 }}>
        {formatarCentralizacao(p.produto_centralizado)}
      </span>
    );
  }

  if (col === "status_solicitacao_ativacao_cd") {
    const val = p.status_solicitacao_ativacao_cd;
    if (!val) return <span style={{ color: theme.colors.textMuted }}>Não informado</span>;
    return <span style={{ ...badgeStyle("neutral"), fontSize: 11 }}>{val}</span>;
  }

  if (col === "status_estoque_cds") {
    const val = p.status_estoque_cds;
    if (!val) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span style={{ fontSize: 11 }}>{val}</span>;
  }

  if (col === "ativacao_30_sem_pedido") {
    const val = p.ativacao_ruptura_30_sem_pedido;
    if (val === 1 || val === true) return <span style={{ ...badgeStyle("danger"), fontSize: 11 }}>Sim</span>;
    return <span style={{ fontSize: 11 }}>Não</span>;
  }

  if (col === "cd_fisicos_ativos") {
    const cds = p.cd_fisicos_ativos;
    if (!cds || !cds.length) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span>{cds.join(" / ")}</span>;
  }

  if (col === "cd_fisicos_com_recebimento") {
    const cds = p.cd_fisicos_com_recebimento;
    if (!cds || !cds.length) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span>{cds.join(" / ")}</span>;
  }

  if (col === "dias_pedido") {
    const val = p.dias_pedido;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span>{formatNumero(val, 0)}</span>;
  }

  const v = (p as unknown as Record<string, unknown>)[col];
  if (typeof v === "number") return formatNumero(v, 0);
  if (v == null) return "—";
  return String(v);
}

const ellipsisStyle: React.CSSProperties = {
  maxWidth: 180,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "inline-block",
  verticalAlign: "middle",
  cursor: "default",
};
