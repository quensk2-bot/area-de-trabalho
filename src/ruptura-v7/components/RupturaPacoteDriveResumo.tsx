import { theme } from "../../styles.ts";
import { cardStyle, helpTextStyle } from "../components/rupturaSharedStyles.ts";
import { hashReduzido } from "../../motor/drive/validacaoPacoteDrive.ts";
import type { ResumoPacoteDrive } from "../../motor/drive/validacaoPacoteDrive.ts";
import type { DrivePastaMotorAtiva } from "../services/rupturaPacoteDriveService.ts";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

type Props = {
  regional: string;
  competenciaLabel: string;
  dataReferencia: string;
  pasta: DrivePastaMotorAtiva | null;
  resumo: ResumoPacoteDrive | null;
  hash?: string | null;
  status?: string | null;
  ultimaConferencia?: string | null;
};

export function RupturaPacoteDriveResumo({
  regional,
  competenciaLabel,
  dataReferencia,
  pasta,
  resumo,
  hash,
  status,
  ultimaConferencia,
}: Props) {
  if (!resumo) return null;
  return (
    <div style={{ ...cardStyle, borderColor: theme.colors.neonGreen }}>
      <h3 style={{ margin: "0 0 10px", color: theme.colors.neonGreen }}>Pacote encontrado</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, fontSize: 12 }}>
        <div><span style={{ color: theme.colors.textMuted }}>Regional:</span> {regional}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Competência:</span> {competenciaLabel}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Data referência:</span> {dataReferencia}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Pasta:</span> {pasta?.caminho_exibicao ?? "—"}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Arquivos:</span> {resumo.quantidadeValidos} / {resumo.quantidadeEsperados}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Tamanho total:</span> {formatBytes(resumo.tamanhoTotalBytes)}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Hash:</span> {hashReduzido(hash)}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Grandes / Médios / Pequenos:</span> {resumo.quantidadeGrandes} / {resumo.quantidadeMedios} / {resumo.quantidadePequenos}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Última conferência:</span> {ultimaConferencia ? new Date(ultimaConferencia).toLocaleString("pt-BR") : "—"}</div>
        <div><span style={{ color: theme.colors.textMuted }}>Status:</span> {status ?? resumo.status}</div>
      </div>
    </div>
  );
}
