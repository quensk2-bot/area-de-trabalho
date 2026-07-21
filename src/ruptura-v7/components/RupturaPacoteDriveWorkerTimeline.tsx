import { useMemo } from "react";
import { theme } from "../../styles.ts";
import { cardStyle, helpTextStyle } from "./rupturaSharedStyles.ts";

const ETAPAS = [
  { key: "validado", label: "Pacote validado", statuses: ["pronto_processamento"] },
  { key: "aguardando", label: "Aguardando Worker", statuses: ["aguardando_worker"] },
  { key: "baixando", label: "Baixando arquivos", statuses: ["baixando"] },
  { key: "validando", label: "Validando conteúdo", statuses: ["validando_conteudo"] },
  { key: "padronizando", label: "Padronizando planilhas", statuses: ["padronizando"] },
  { key: "pronto", label: "Pronto para Motor", statuses: ["pronto_motor"] },
  { key: "parser", label: "Parser / Transform", statuses: ["processando_parser", "processando_transformacao"] },
  { key: "bre", label: "BRE / Consolidador", statuses: ["processando_bre", "processando_consolidacao"] },
  { key: "dm", label: "Data Mart / Persistência", statuses: ["gerando_datamart", "persistindo", "ativando"] },
  { key: "planilha", label: "Planilha padrão", statuses: ["gerando_planilha"] },
  { key: "concluido", label: "Concluído", statuses: ["concluido"] },
] as const;

const FALHAS = ["falhou_download", "falhou_validacao", "falhou_padronizacao", "falhou"];

type Props = {
  status: string | null;
  bytesBaixados?: number;
  bytesTotal?: number;
  arquivoAtual?: string | null;
  duracaoSegundos?: number | null;
  erroResumo?: string | null;
  arquivosConcluidos?: number;
  arquivosTotal?: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function RupturaPacoteDriveWorkerTimeline({
  status,
  bytesBaixados = 0,
  bytesTotal = 0,
  arquivoAtual,
  duracaoSegundos,
  erroResumo,
  arquivosConcluidos = 0,
  arquivosTotal = 0,
}: Props) {
  const indiceAtivo = useMemo(() => {
    if (!status) return -1;
    if (FALHAS.includes(status)) return ETAPAS.findIndex((e) => e.key === "aguardando");
    const idx = ETAPAS.findIndex((e) => (e.statuses as readonly string[]).includes(status));
    if (idx >= 0) return idx;
    if (["pronto_processamento"].includes(status)) return 0;
    return -1;
  }, [status]);

  const percentual = bytesTotal > 0 ? Math.min(100, Math.round((bytesBaixados / bytesTotal) * 100)) : 0;

  if (!status || status === "pronto_processamento") return null;

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 12px", color: theme.colors.neonGreen }}>Progresso do Worker</h3>
      <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {ETAPAS.map((etapa, i) => {
          const done = i < indiceAtivo;
          const active = i === indiceAtivo;
          const falhou = FALHAS.includes(status ?? "") && active;
          return (
            <li
              key={etapa.key}
              style={{
                color: falhou ? theme.colors.danger : active ? theme.colors.neonOrange : done ? theme.colors.neonGreen : theme.colors.textMuted,
                fontWeight: active ? 700 : 400,
              }}
            >
              {etapa.label}
              {active && status ? ` (${status})` : ""}
            </li>
          );
        })}
      </ol>

      {(bytesTotal > 0 || arquivosTotal > 0) && (
        <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 12 }}>
          {arquivosTotal > 0 && (
            <span>
              Arquivos: {arquivosConcluidos}/{arquivosTotal}
            </span>
          )}
          {bytesTotal > 0 && (
            <span>
              Download: {formatBytes(bytesBaixados)} / {formatBytes(bytesTotal)} ({percentual}%)
            </span>
          )}
          {arquivoAtual && <span>Arquivo atual: {arquivoAtual}</span>}
          {duracaoSegundos != null && <span>Duração: {duracaoSegundos}s</span>}
        </div>
      )}

      {erroResumo && (
        <p style={{ ...helpTextStyle, color: theme.colors.danger, marginTop: 10, marginBottom: 0 }}>{erroResumo}</p>
      )}
    </div>
  );
}
