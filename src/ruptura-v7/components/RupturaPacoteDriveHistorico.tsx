import { theme } from "../../styles.ts";
import { cardStyle, tableStyle, tdStyle, thStyle } from "../components/rupturaSharedStyles.ts";
import type { PacoteMotorDriveHistorico } from "../services/rupturaPacoteDriveService.ts";

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  itens: PacoteMotorDriveHistorico[];
  onAbrir?: (pacoteId: string) => void;
};

export function RupturaPacoteDriveHistorico({ itens, onAbrir }: Props) {
  if (!itens.length) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: 12 }}>Nenhum pacote registrado ainda.</p>
      </div>
    );
  }
  return (
    <div style={{ ...cardStyle, overflowX: "auto" }}>
      <h3 style={{ margin: "0 0 12px", color: theme.colors.neonOrange }}>Histórico de pacotes</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            {["Competência", "Data ref.", "Status", "Encontrados", "Faltantes", "Tamanho", "Hash", "Validação", "Usuário", "Execução", "Ação"].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.pacote_id}>
              <td style={tdStyle}>{p.competencia?.slice(0, 7) ?? "—"}</td>
              <td style={tdStyle}>{p.data_referencia ?? "—"}</td>
              <td style={tdStyle}>{p.status}</td>
              <td style={tdStyle}>{p.quantidade_arquivos_encontrados}</td>
              <td style={tdStyle}>{p.quantidade_arquivos_faltantes}</td>
              <td style={tdStyle}>{formatBytes(Number(p.tamanho_total_bytes ?? 0))}</td>
              <td style={tdStyle}>{p.hash_reduzido ?? "—"}</td>
              <td style={tdStyle}>{p.validado_em ? new Date(p.validado_em).toLocaleString("pt-BR") : "—"}</td>
              <td style={tdStyle}>{p.criado_por_nome ?? "—"}</td>
              <td style={tdStyle}>{p.execucao_motor_id ? p.execucao_motor_id.slice(0, 8) : "—"}</td>
              <td style={tdStyle}>
                <button type="button" onClick={() => onAbrir?.(p.pacote_id)} style={{ background: "transparent", border: "none", color: theme.colors.neonOrange, cursor: "pointer" }}>
                  Abrir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
