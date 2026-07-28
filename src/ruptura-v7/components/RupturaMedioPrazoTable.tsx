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
  badgeMedioPrazo,
  prioridadeVisualMp,
  explicarMedioPrazo,
  formatarModalidade,
  textoAcaoMp,
  PRIORIDADE_TONE_MP,
  PRIORIDADE_LABEL_MP,
} from "../utils/medioPrazoPresentation.ts";

export type ColunaIdMp =
  | "loja"
  | "seqproduto"
  | "descricao"
  | "setor_n2"
  | "comprador"
  | "razao_fornecedor"
  | "modalidade"
  | "pendencia_loja"
  | "dias_pedido"
  | "dias_ruptura"
  | "pendencia_cpa_cd"
  | "acao_medio_prazo"
  | "status_solicitacao_ativacao_cd"
  | "par_max"
  | "embalagem_compra"
  | "rede"
  | "divisao"
  | "categoria_n5";

export const COLUNAS_MEDIO_PRAZO: { id: ColunaIdMp; label: string; default: boolean }[] = [
  { id: "loja", label: "Loja", default: true },
  { id: "seqproduto", label: "Código", default: true },
  { id: "descricao", label: "Descrição", default: true },
  { id: "setor_n2", label: "Seção", default: true },
  { id: "comprador", label: "Comprador", default: true },
  { id: "razao_fornecedor", label: "Fornecedor", default: true },
  { id: "modalidade", label: "Modalidade", default: true },
  { id: "pendencia_loja", label: "Pedido Loja", default: true },
  { id: "dias_pedido", label: "Dias Pedido", default: true },
  { id: "dias_ruptura", label: "Dias Ruptura", default: true },
  { id: "pendencia_cpa_cd", label: "Pendência Loja + CDs", default: true },
  { id: "acao_medio_prazo", label: "Ação Médio Prazo", default: true },
  { id: "status_solicitacao_ativacao_cd", label: "Status Ativação CD", default: true },
  { id: "par_max", label: "Parmax", default: false },
  { id: "embalagem_compra", label: "EMBCPA", default: false },
  { id: "rede", label: "Rede", default: false },
  { id: "divisao", label: "Divisão", default: false },
  { id: "categoria_n5", label: "Categoria", default: false },
];

type Props = {
  produtos: RupturaProdutoLoja[];
  loading?: boolean;
  colunasVisiveis: Set<ColunaIdMp>;
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

export function RupturaMedioPrazoTable({
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
        Nenhum produto em Médio Prazo encontrado para os filtros atuais.
      </div>
    );
  }

  const colunas = COLUNAS_MEDIO_PRAZO.filter((c) => colunasVisiveis.has(c.id));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ ...tableStyle, fontSize: 13 }}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.id} style={{ ...thStyle, fontSize: 12 }}>
                {c.id === "pendencia_cpa_cd" ? (
                  <Tooltip text="Soma da pendência da loja com as pendências relacionadas aos CDs.">
                    <span style={{ borderBottom: "1px dashed #64748b", cursor: "help" }}>
                      {c.label}
                    </span>
                  </Tooltip>
                ) : (
                  c.label
                )}
              </th>
            ))}
            <th style={{ ...thStyle, fontSize: 12 }}>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => {
            const acao = p.acao_medio_prazo;
            const badgeAcao = badgeMedioPrazo(acao);
            const prioridade = prioridadeVisualMp(acao);
            // alerta_alta (30-60 dias) usa laranja, alerta (20-30) usa amarelo
            const badgePri = prioridade === "alerta_alta"
              ? { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(251,146,60,0.15)", color: theme.colors.neonOrange ?? "#fb923c" }
              : badgeStyle(PRIORIDADE_TONE_MP[prioridade]);

            return (
              <tr key={`${p.loja}-${p.seqproduto}`}>
                {colunas.map((c) => (
                  <td key={c.id} style={{ ...tdStyle, fontSize: 12 }}>
                    {renderCelula(p, c.id, acao, badgeAcao, badgePri)}
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
  col: ColunaIdMp,
  acao: string | null | undefined,
  badgeAcao: string,
  badgePri: React.CSSProperties,
) {
  // Textos longos com ellipsis + tooltip
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

  // Ação MP — badge compacto com tooltip
  if (col === "acao_medio_prazo") {
    const fullText = textoAcaoMp(acao);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Tooltip text={fullText}>
          <span style={badgePri}>
            {badgeAcao}
          </span>
        </Tooltip>
        <span style={{ fontSize: 10, color: theme.colors.textMuted }}>
          {PRIORIDADE_LABEL_MP[prioridadeVisualMp(acao)]}
        </span>
      </div>
    );
  }

  // Explicação operacional
  if (col === "motivo_operacional" as ColunaIdMp) {
    return (
      <span style={{ fontSize: 11, lineHeight: 1.4, color: theme.colors.textMuted }}>
        {explicarMedioPrazo(acao)}
      </span>
    );
  }

  // Modalidade oficial (Plan 6)
  if (col === "modalidade") {
    const modalidade = formatarModalidade(p.modalidade_cd);
    return (
      <span style={{ ...badgeStyle("neutral"), fontSize: 11 }}>{modalidade}</span>
    );
  }

  // Loja — inteiro sem decimais
  if (col === "loja") {
    return <span>{p.loja}</span>;
  }

  // Código — inteiro sem decimais
  if (col === "seqproduto") {
    return <span>{p.seqproduto}</span>;
  }

  // Dias Pedido: null → "—", com cor por faixa
  if (col === "dias_pedido") {
    const val = p.dias_pedido;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return (
      <span
        style={{
          color:
            val >= 60
              ? theme.colors.danger ?? "#f87171"
              : val >= 30
                ? theme.colors.warning ?? "#facc15"
                : val >= 20
                  ? "#fbbf24"
                  : theme.colors.neonGreen ?? "#22c55e",
          fontWeight: 700,
        }}
      >
        {formatNumero(val, 0)}
      </span>
    );
  }

  // Dias Ruptura
  if (col === "dias_ruptura") {
    return <span style={{ fontWeight: 700 }}>{formatNumero(p.dias_ruptura, 0)}</span>;
  }

  // Pedido Loja: null/vazio → "Sem pedido", zero real → 0
  if (col === "pendencia_loja") {
    if (p.pendencia_loja == null) {
      return <span style={{ color: theme.colors.textMuted, fontStyle: "italic" }}>Sem pedido</span>;
    }
    return <span>{formatNumero(p.pendencia_loja, 0)}</span>;
  }

  // Pendência Loja + CDs
  if (col === "pendencia_cpa_cd") {
    const val = p.pendencia_cpa_cd;
    if (val == null) return <span style={{ color: theme.colors.textMuted }}>—</span>;
    return <span>{formatNumero(val, 0)}</span>;
  }

  // Status Ativação CD
  if (col === "status_solicitacao_ativacao_cd") {
    const val = p.status_solicitacao_ativacao_cd;
    if (!val) return <span style={{ color: theme.colors.textMuted }}>Não informado</span>;
    return (
      <span style={{ ...badgeStyle("neutral"), fontSize: 11 }}>{val}</span>
    );
  }

  // Campos de texto padrão
  const v = (p as unknown as Record<string, unknown>)[col];
  if (typeof v === "number") {
    return formatNumero(v, 0);
  }
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
