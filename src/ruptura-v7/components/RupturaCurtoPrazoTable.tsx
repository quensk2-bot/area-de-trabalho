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
  badgeCurtoPrazo,
  prioridadeVisual,
  explicarCurtoPrazo,
  formatarModalidade,
  formatarCdTexto,
  badgeCrossDocking,
  PRIORIDADE_TONE,
  PRIORIDADE_LABEL,
} from "../utils/curtoPrazoPresentation.ts";
import { useState, useEffect, useRef } from "react";

export type ColunaId =
  | "loja"
  | "seqproduto"
  | "descricao"
  | "modalidade"
  | "cd"
  | "par_max"
  | "pendencia_loja"
  | "embalagem_compra"
  | "dias_pedido"
  | "razao_fornecedor"
  | "dias_ruptura"
  | "status_estoque_cds"
  | "soma_estoque_cd"
  | "curto_prazo_rebto_proximo"
  | "curto_prazo_nao_rebto_proximo"
  | "acao_curto_prazo"
  | "motivo_operacional"
  | "comprador"
  | "rede";

export const COLUNAS_CURTO_PRAZO: { id: ColunaId; label: string; default: boolean }[] = [
  { id: "loja", label: "Loja", default: true },
  { id: "seqproduto", label: "C\u00f3digo", default: true },
  { id: "descricao", label: "Descri\u00e7\u00e3o", default: true },
  { id: "modalidade", label: "Modalidade", default: true },
  { id: "cd", label: "CD", default: true },
  { id: "razao_fornecedor", label: "Fornecedor", default: true },
  { id: "pendencia_loja", label: "Pedido Loja", default: true },
  { id: "dias_pedido", label: "Dias Pedido", default: true },
  { id: "dias_ruptura", label: "Dias Ruptura", default: true },
  { id: "status_estoque_cds", label: "Status", default: true },
  { id: "acao_curto_prazo", label: "A\u00e7\u00e3o", default: true },
  { id: "par_max", label: "Parmax", default: true },
  { id: "embalagem_compra", label: "EMBCPA", default: true },
  { id: "soma_estoque_cd", label: "Soma Estoque CD", default: false },
  { id: "curto_prazo_rebto_proximo", label: "Rebote Pr\u00f3x.", default: false },
  { id: "curto_prazo_nao_rebto_proximo", label: "N\u00e3o Rebote Pr\u00f3x.", default: false },
  { id: "motivo_operacional", label: "Motivo Operacional", default: false },
  { id: "rede", label: "Rede", default: false },
];

type Props = {
  produtos: RupturaProdutoLoja[];
  loading?: boolean;
  colunasVisiveis: Set<ColunaId>;
  onConfigColunas?: () => void;
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

export function RupturaCurtoPrazoTable({
  produtos,
  loading,
  colunasVisiveis,
  onVerDetalhe,
}: Props) {
  if (loading) {
    return <div style={{ color: theme.colors.textMuted }}>Carregando produtos\u2026</div>;
  }

  if (!produtos.length) {
    return (
      <div style={{ color: theme.colors.textMuted }}>
        Nenhum produto em Curto Prazo encontrado para os filtros atuais.
      </div>
    );
  }

  const colunas = COLUNAS_CURTO_PRAZO.filter((c) => colunasVisiveis.has(c.id));

  return (        <div style={{ overflowX: "auto" }}>
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
            const acao = p.acao_curto_prazo;
            const badgeAcao = badgeCurtoPrazo(acao);
            const prioridade = prioridadeVisual(acao);
            const badgePri = badgeStyle(PRIORIDADE_TONE[prioridade]);

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
  col: ColunaId,
  acao: string | null | undefined,
  badgeAcao: string,
  badgePri: React.CSSProperties,
) {
  // Colunas textuais longas com ellipsis + tooltip
  if (col === "descricao") {
    return (
      <Tooltip text={p.descricao ?? "\u2014"}>
        <span style={ellipsisStyle}>{p.descricao ?? "\u2014"}</span>
      </Tooltip>
    );
  }

  if (col === "razao_fornecedor") {
    return (
      <Tooltip text={p.razao_fornecedor ?? "\u2014"}>
        <span style={ellipsisStyle}>{p.razao_fornecedor ?? "\u2014"}</span>
      </Tooltip>
    );
  }

  // Acao -- badge compacto com tooltip
  if (col === "acao_curto_prazo") {
    const fullText = acao ?? "\u2014";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Tooltip text={fullText}>
          <span style={badgePri}>
            {badgeAcao}
          </span>
        </Tooltip>
        <span style={{ fontSize: 10, color: theme.colors.textMuted }}>
          {PRIORIDADE_LABEL[prioridadeVisual(acao)]}
        </span>
      </div>
    );
  }

  // Modalidade oficial -- NAO deduzida por crossDocking/codigoCdSelecionado
  if (col === "modalidade") {
    const modalidade = formatarModalidade(p.modalidade_cd);
    // badgeCrossDocking recebe modalidadeCd para suprimir badge redundante
    const xdBadge = badgeCrossDocking(p.cross_docking, p.modalidade_cd);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span style={{ ...badgeStyle("neutral"), fontSize: 11 }}>{modalidade}</span>
        {xdBadge && (
          <span style={{ ...badgeStyle("warn"), fontSize: 11, background: "#78350f", color: "#fbbf24" }}>
            {xdBadge}
          </span>
        )}
      </div>
    );
  }

  // CD
  if (col === "cd") {
    const cdTexto = formatarCdTexto({
      codigoCdSelecionado: p.codigo_cd_selecionado,
      statusEstoqueCds: p.status_estoque_cds,
      cdFisicosAtivos: p.cd_fisicos_ativos,
      est_selec_inv_cd1: p.est_selec_inv_cd1,
      est_selec_inv_cd2: p.est_selec_inv_cd2,
      est_selec_inv_cd3: p.est_selec_inv_cd3,
      est_selec_inv_cd4: p.est_selec_inv_cd4,
    });
    return <span style={{ fontWeight: 700, fontSize: 12 }}>{cdTexto}</span>;
  }

  // Motivo operacional
  if (col === "motivo_operacional") {
    const explicacao = explicarCurtoPrazo(acao, p.cross_docking);
    return (
      <span style={{ fontSize: 11, lineHeight: 1.4, color: theme.colors.textMuted }}>
        {explicacao}
      </span>
    );
  }

  // Loja -- inteiro sem decimais
  if (col === "loja") {
    return <span>{p.loja}</span>;
  }

  // Codigo -- inteiro sem decimais
  if (col === "seqproduto") {
    return <span>{p.seqproduto}</span>;
  }

  // Campos especificos com formatacao controlada
  if (col === "par_max") {
    const val = p.par_max;
    return (
      <span
        style={{
          color:
            val == null || val === 0
              ? theme.colors.danger ?? "#f87171"
              : undefined,
          fontWeight: val == null || val === 0 ? 700 : undefined,
        }}
      >
        {formatNumero(val, 0)}
      </span>
    );
  }

  if (col === "dias_pedido") {
    const val = p.dias_pedido;
    return (
      <span
        style={{
          color:
            val == null || val === 0
              ? theme.colors.danger ?? "#f87171"
              : val != null && val > 7
                ? theme.colors.warning ?? "#facc15"
                : theme.colors.neonGreen ?? "#22c55e",
          fontWeight: 700,
        }}
      >
        {formatNumero(val, 0)}
      </span>
    );
  }

  if (col === "dias_ruptura") {
    return <span style={{ fontWeight: 700 }}>{formatNumero(p.dias_ruptura, 0)}</span>;
  }

  // Pedido Loja: null/vazio -> "Sem pedido", zero real -> 0
  if (col === "pendencia_loja") {
    if (p.pendencia_loja == null) {
      return <span style={{ color: theme.colors.textMuted, fontStyle: "italic" }}>Sem pedido</span>;
    }
    return <span>{formatNumero(p.pendencia_loja, 0)}</span>;
  }

  if (col === "status_estoque_cds") {
    return (
      <span
        style={{
          ...badgeStyle(
            p.soma_estoque_cd != null && p.soma_estoque_cd > 0 ? "ok" : "danger",
          ),
          fontSize: 11,
        }}
      >
        {p.status_estoque_cds ?? "\u2014"}
      </span>
    );
  }

  if (col === "curto_prazo_rebto_proximo") {
    const val = p.curto_prazo_rebto_proximo === 1;
    return (
      <span style={{ ...badgeStyle(val ? "ok" : "neutral"), fontSize: 11 }}>
        {val ? "Sim" : "N\u00e3o"}
      </span>
    );
  }

  if (col === "curto_prazo_nao_rebto_proximo") {
    const val = p.curto_prazo_nao_rebto_proximo === 1;
    return (
      <span style={{ ...badgeStyle(val ? "danger" : "neutral"), fontSize: 11 }}>
        {val ? "Sim" : "N\u00e3o"}
      </span>
    );
  }

  if (col === "soma_estoque_cd") {
    return (
      <span
        style={{
          color:
            p.soma_estoque_cd != null && p.soma_estoque_cd > 0
              ? theme.colors.neonGreen ?? "#22c55e"
              : theme.colors.danger ?? "#f87171",
          fontWeight: 700,
        }}
      >
        {formatNumero(p.soma_estoque_cd, 2)}
      </span>
    );
  }

  // Campos de texto padrao
  const v = (p as unknown as Record<string, unknown>)[col];
  if (typeof v === "number") {
    return formatNumero(v, 0);
  }
  if (v == null) return "\u2014";
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
