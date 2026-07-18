import type { ReactNode } from "react";
import { theme } from "../../styles.ts";
import { helpTextStyle } from "./rupturaSharedStyles.ts";

type Props = {
  termo: string;
  texto: string;
  children?: ReactNode;
};

export function RupturaHelpTooltip({ termo, texto, children }: Props) {
  return (
    <span
      title={texto}
      style={{
        borderBottom: `1px dotted ${theme.colors.textMuted ?? "#94a3b8"}`,
        cursor: "help",
      }}
    >
      {children ?? termo}
    </span>
  );
}

export function RupturaContextHelp({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ ...helpTextStyle, padding: "10px 12px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.6)" }}>
      <strong style={{ color: theme.colors.neonOrange }}>{titulo}: </strong>
      {texto}
    </div>
  );
}

export function RupturaLegendaClassificacao() {
  const itens = [
    ["Curto Prazo", "Há possibilidade de solução imediata por estoque disponível ou condição operacional identificada pelo Motor."],
    ["Médio Prazo", "Existe pendência de compra ou reposição, mas não há solução imediata classificada como Curto Prazo."],
    ["Longo Prazo", "A ruptura não possui solução de Curto ou Médio Prazo identificada."],
    ["Bloqueado", "O produto não está elegível para decisão operacional até que uma dependência ou cadastro seja corrigido."],
    ["Sem Ruptura", "O produto não foi classificado como ruptura na execução ativa."],
  ] as const;

  return (
    <details style={helpTextStyle}>
      <summary style={{ cursor: "pointer", color: theme.colors.neonOrange, fontWeight: 700 }}>
        Legenda das classificações
      </summary>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        {itens.map(([titulo, desc]) => (
          <li key={titulo} style={{ marginBottom: 6 }}>
            <strong>{titulo}:</strong> {desc}
          </li>
        ))}
      </ul>
    </details>
  );
}
