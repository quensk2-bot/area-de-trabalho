import { theme } from "../../styles.ts";
import { cardStyle, helpTextStyle } from "../components/rupturaSharedStyles.ts";
import type { DiagnosticoPacoteDrive } from "../../motor/drive/validacaoPacoteDrive.ts";

const corEstado = {
  ok: theme.colors.neonGreen,
  warn: theme.colors.warning,
  fail: theme.colors.danger,
} as const;

type Props = { diagnostico: DiagnosticoPacoteDrive | null };

export function RupturaPacoteDriveChecklist({ diagnostico }: Props) {
  if (!diagnostico) return null;
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 10px", color: theme.colors.neonOrange }}>Diagnóstico do pacote</h3>
      <ul style={{ ...helpTextStyle, margin: 0, paddingLeft: 18 }}>
        {diagnostico.itens.map((item) => (
          <li key={item.rotulo} style={{ color: corEstado[item.estado], marginBottom: 4 }}>
            {item.rotulo}
            {item.detalhe ? ` — ${item.detalhe}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
