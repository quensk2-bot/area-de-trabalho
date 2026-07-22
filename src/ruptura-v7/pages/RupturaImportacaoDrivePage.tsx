import { useCallback, useEffect, useMemo, useState } from "react";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { toHybridPendingError } from "../../hibrido-v7/hybridErrors.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaPacoteDriveChecklist } from "../components/RupturaPacoteDriveChecklist.tsx";
import { RupturaPacoteDriveHistorico } from "../components/RupturaPacoteDriveHistorico.tsx";
import { RupturaPacoteDriveResumo } from "../components/RupturaPacoteDriveResumo.tsx";
import {
  buttonGhostStyle,
  buttonStyle,
  cardStyle,
  helpTextStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "../components/rupturaSharedStyles.ts";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import { CATALOGO_ARQUIVOS_MOTOR_MT } from "../../motor/drive/catalogoArquivosMotor.ts";
import { rotuloImpactoTamanho } from "../../motor/drive/classificarTamanhoArquivoDrive.ts";
import {
  montarDiagnosticoPacote,
  type ArquivoPacoteDriveClassificado,
  type ResumoPacoteDrive,
} from "../../motor/drive/validacaoPacoteDrive.ts";
import {
  listarArquivosMotorDrive,
  testarPermissaoDriveImportacao,
  type ListarDriveResponse,
} from "../services/rupturaDriveListService.ts";
import {
  PIPELINE_PROCESSAR_TOOLTIP,
  buscarPastaMotorAtiva,
  buscarProgressoPacote,
  buscarSolicitacaoWorkerPacote,
  competenciaDivergeDaPasta,
  criarSolicitacaoMotor,
  criarSolicitacaoWorker,
  listarArquivosPacote,
  listarArquivosProgressoPacote,
  listarHistoricoPacotes,
  prepararClassificacaoDrive,
  sincronizarPacoteMotorDrive,
  validarPacoteMotorDrive,
  type DrivePastaMotorAtiva,
  type PacoteMotorDriveHistorico,
  type PacoteMotorDriveProgresso,
  type WorkerSolicitacaoResumo,
} from "../services/rupturaPacoteDriveService.ts";
import { RupturaPacoteDriveWorkerTimeline } from "../components/RupturaPacoteDriveWorkerTimeline.tsx";

function formatBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function rotuloTipo(tipo: string | null): string {
  if (!tipo) return "—";
  const cat = CATALOGO_ARQUIVOS_MOTOR_MT.find((c) => c.tipoArquivo === tipo);
  return cat?.tituloExibicao ?? tipo;
}

function competenciaDate(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export function RupturaImportacaoDrivePage() {
  const [ctx, setCtx, { readonly }] = useRupturaContextoScoped("importacao");
  const [ano, setAno] = useState(() => Number(ctx.dataReferencia.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(ctx.dataReferencia.slice(5, 7)));
  const [folderIdManual, setFolderIdManual] = useState("");
  const [pasta, setPasta] = useState<DrivePastaMotorAtiva | null>(null);
  const [historico, setHistorico] = useState<PacoteMotorDriveHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [hybridPending, setHybridPending] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [listagem, setListagem] = useState<ListarDriveResponse | null>(null);
  const [classificados, setClassificados] = useState<ArquivoPacoteDriveClassificado[]>([]);
  const [resumo, setResumo] = useState<ResumoPacoteDrive | null>(null);
  const [hashPacote, setHashPacote] = useState<string | null>(null);
  const [pacoteId, setPacoteId] = useState<string | null>(null);
  const [statusPacote, setStatusPacote] = useState<string | null>(null);
  const [ultimaConferencia, setUltimaConferencia] = useState<string | null>(null);
  const [perm, setPerm] = useState<{ podeListar: boolean; podeValidar: boolean; nivel?: string; msg?: string } | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [progresso, setProgresso] = useState<PacoteMotorDriveProgresso | null>(null);
  const [solicitacaoWorker, setSolicitacaoWorker] = useState<WorkerSolicitacaoResumo | null>(null);

  const competenciaLabel = useMemo(() => `${String(mes).padStart(2, "0")}/${ano}`, [mes, ano]);
  const competenciaInformadaDiverge = useMemo(
    () => competenciaDivergeDaPasta(ano, mes, pasta),
    [ano, mes, pasta],
  );
  const folderIdEfetivo = perm?.nivel === "ADM" && folderIdManual.trim() ? folderIdManual.trim() : pasta?.drive_folder_id;
  const isAdm = perm?.nivel === "ADM";

  const carregarPermissao = useCallback(async () => {
    const r = await testarPermissaoDriveImportacao();
    setPerm({
      podeListar: !!r.podeListarDrive,
      podeValidar: !!r.podeListarDrive,
      nivel: r.nivel,
      msg: r.message,
    });
  }, []);

  const carregarPastaEHistorico = useCallback(async () => {
    try {
      const bandeira = ctx.bandeira;
      if (!bandeira) {
        setPasta(null);
        setHistorico([]);
        return;
      }
      const [p, h] = await Promise.all([
        buscarPastaMotorAtiva(ctx.regional, "originais", bandeira),
        listarHistoricoPacotes(ctx.regional, 15),
      ]);
      setPasta(p);
      setHistorico(h);
    } catch (e) {
      const pending = toHybridPendingError(e);
      if (pending) {
        setHybridPending(pending.message);
        setErro(null);
      } else {
        setErro(e instanceof Error ? e.message : String(e));
      }
    }
  }, [ctx.regional, ctx.bandeira]);

  useEffect(() => {
    if (ctx.bandeira) return;
    setCtx({ bandeira: "COMPER" });
  }, [ctx.bandeira, setCtx]);

  useEffect(() => {
    void carregarPermissao();
  }, [carregarPermissao]);

  useEffect(() => {
    void carregarPastaEHistorico();
  }, [carregarPastaEHistorico]);

  const carregarProgressoWorker = useCallback(async (id: string) => {
    try {
      const [p, s, arqs] = await Promise.all([
        buscarProgressoPacote(id),
        buscarSolicitacaoWorkerPacote(id),
        listarArquivosProgressoPacote(id),
      ]);
      setProgresso(p);
      setSolicitacaoWorker(s);
      if (arqs.length) {
        setClassificados(
          arqs.map((a) => ({
            driveFileId: a.drive_file_id,
            nome: a.nome_original,
            mimeType: null,
            tamanhoBytes: a.tamanho_bytes,
            modifiedTime: a.modified_time,
            md5Checksum: a.md5_drive,
            tipoArquivo: a.tipo_arquivo as ArquivoPacoteDriveClassificado["tipoArquivo"],
            nomeNormalizado: a.nome_original,
            extensao: a.extensao ?? "",
            obrigatorio: true,
            reconhecido: a.status === "reconhecido",
            duplicado: a.status === "duplicado",
            vazio: a.status === "vazio",
            precisaPadronizacao: a.precisa_padronizacao,
            ordemProcessamento: a.ordem_processamento,
            categoriaTamanho: (a.categoria_tamanho as ArquivoPacoteDriveClassificado["categoriaTamanho"]) ?? "pequeno",
            parserDestino: a.parser_destino,
            motorEtapa: a.motor_etapa,
            status: a.status as ArquivoPacoteDriveClassificado["status"],
            observacao: a.observacao,
            avisos: a.observacao ? [a.observacao] : [],
          })),
        );
      }
      if (p?.status) setStatusPacote(p.status);
    } catch {
      /* progresso opcional */
    }
  }, []);

  useEffect(() => {
    if (!pacoteId) return;
    const workerStatuses = [
      "aguardando_worker",
      "baixando",
      "validando_conteudo",
      "padronizando",
      "pronto_motor",
      "processando_parser",
      "processando_transformacao",
      "processando_bre",
      "processando_consolidacao",
      "gerando_datamart",
      "persistindo",
      "ativando",
      "gerando_planilha",
      "concluido",
      "falhou_download",
      "falhou_validacao",
      "falhou_padronizacao",
      "falhou",
    ];
    if (!statusPacote || !workerStatuses.includes(statusPacote)) return;
    void carregarProgressoWorker(pacoteId);
    const t = setInterval(() => void carregarProgressoWorker(pacoteId), 8000);
    return () => clearInterval(t);
  }, [pacoteId, statusPacote, carregarProgressoWorker]);

  const diagnostico = useMemo(() => {
    if (!resumo) return null;
    return montarDiagnosticoPacote({
      resumo,
      pastaCadastrada: !!pasta,
      competenciaDivergente: competenciaInformadaDiverge,
      pacoteDuplicado: statusPacote === "duplicado",
    });
  }, [resumo, pasta, competenciaInformadaDiverge, statusPacote]);

  const arquivosOrdenados = useMemo(
    () => [...classificados].sort((a, b) => (a.ordemProcessamento ?? 999) - (b.ordemProcessamento ?? 999)),
    [classificados],
  );

  const verificarDrive = async () => {
    if (!folderIdEfetivo) {
      setErro("Nenhuma pasta originais cadastrada para esta regional.");
      return;
    }
    setLoading(true);
    setErro(null);
    setInfo(null);
    const res = await listarArquivosMotorDrive({
      regional: ctx.regional,
      ano: pasta?.ano ?? ano,
      mes: pasta?.mes ?? mes,
      folderId: folderIdEfetivo,
    });
    if (!res.ok) {
      setErro(res.message ?? "Falha ao listar arquivos no Drive");
      setListagem(null);
      setClassificados([]);
      setResumo(null);
      setLoading(false);
      return;
    }
    setListagem(res);
    const pastaRef = pasta ?? ({
      id: "",
      regional: ctx.regional,
      ano: pasta?.ano ?? ano,
      mes: pasta?.mes ?? mes,
      tipo_pasta: "originais",
      drive_folder_id: folderIdEfetivo,
      caminho_exibicao: null,
      descricao: null,
      observacao: null,
      ultima_verificacao: null,
      ultima_validacao: null,
    } as DrivePastaMotorAtiva);
    const prep = prepararClassificacaoDrive(res, { ...pastaRef, drive_folder_id: folderIdEfetivo });
    setClassificados(prep.classificados);
    setResumo(prep.resumo);
    setHashPacote(prep.hash);
    setStatusPacote(prep.resumo.status);
    setUltimaConferencia(new Date().toISOString());
    setInfo("Metadados listados do Drive. Salve a conferência para registrar o pacote.");
    setLoading(false);
  };

  const salvarConferencia = async () => {
    if (!pasta?.id || !resumo || !classificados.length) {
      setErro("Verifique o Drive antes de salvar a conferência.");
      return;
    }
    setLoading(true);
    setErro(null);
    const sync = await sincronizarPacoteMotorDrive({
      regional: ctx.regional,
      competencia: competenciaDate(ano, mes),
      dataReferencia: ctx.dataReferencia,
      pastaId: pasta.id,
      classificados,
      resumo,
    });
    if (!sync.ok) {
      setErro(sync.message ?? "Falha ao sincronizar pacote");
      setLoading(false);
      return;
    }
    setPacoteId(sync.pacoteId ?? null);
    setStatusPacote(sync.status ?? null);
    setHashPacote(sync.hashMetadadosPacote ?? hashPacote);
    setUltimaConferencia(new Date().toISOString());
    setInfo(sync.message ?? "Conferência salva.");
    await carregarPastaEHistorico();
    setLoading(false);
  };

  const validarPacote = async () => {
    if (!pacoteId) {
      setErro("Salve a conferência antes de validar o pacote.");
      return;
    }
    setLoading(true);
    setErro(null);
    const val = await validarPacoteMotorDrive(pacoteId, "drive");
    if (!val.ok) {
      setErro(val.message ?? "Validação não concluída");
      setStatusPacote(val.status ?? "invalido");
      setLoading(false);
      return;
    }
    setStatusPacote(val.status ?? "pronto_processamento");
    setHashPacote(val.hashMetadadosPacote ?? hashPacote);
    setInfo(val.message ?? "Pacote validado.");
    await carregarPastaEHistorico();
    setLoading(false);
  };

  const prepararArquivos = async () => {
    if (!pacoteId) {
      setErro("Valide o pacote antes de preparar os arquivos.");
      return;
    }
    setLoading(true);
    setErro(null);
    const res = await criarSolicitacaoWorker(pacoteId);
    if (!res.ok) {
      setErro(res.message ?? "Falha ao criar solicitação do Worker");
      setLoading(false);
      return;
    }
    setStatusPacote(res.status ?? "aguardando_worker");
    setInfo(res.message ?? "Solicitação registrada. Aguardando Worker.");
    await carregarProgressoWorker(pacoteId);
    await carregarPastaEHistorico();
    setLoading(false);
  };

  const processarMotor = async () => {
    if (!pacoteId) {
      setErro("Pacote não identificado.");
      return;
    }
    setLoading(true);
    setErro(null);
    const res = await criarSolicitacaoMotor(pacoteId);
    if (!res.ok) {
      setErro(res.message ?? "Falha ao enfileirar processamento Motor");
      setLoading(false);
      return;
    }
    setInfo(
      (res.message ?? "Solicitação Motor registrada.") +
        " Execute: npm run motor:pacote-process -- --once",
    );
    await carregarProgressoWorker(pacoteId);
    setLoading(false);
  };

  const metricasWorker = solicitacaoWorker?.metricas as Record<string, unknown> | undefined;
  const arquivosConcluidos = Number(metricasWorker?.arquivosBaixados ?? progresso?.quantidade_arquivos_encontrados ?? 0);
  const bytesBaixados = Number(metricasWorker?.bytesBaixados ?? 0);
  const bytesTotal = Number(metricasWorker?.bytesTotal ?? progresso?.tamanho_total_bytes ?? 0);
  const duracaoSeg = metricasWorker?.duracaoMs ? Math.round(Number(metricasWorker.duracaoMs) / 1000) : null;

  const abrirPacoteHistorico = async (id: string) => {
    setLoading(true);
    try {
      const arquivos = await listarArquivosPacote(id);
      setPacoteId(id);
      setClassificados(
        arquivos.map((a) => ({
          driveFileId: a.drive_file_id,
          nome: a.nome_original,
          mimeType: null,
          tamanhoBytes: a.tamanho_bytes,
          modifiedTime: a.modified_time,
          md5Checksum: a.md5_drive,
          tipoArquivo: a.tipo_arquivo as ArquivoPacoteDriveClassificado["tipoArquivo"],
          nomeNormalizado: a.nome_original,
          extensao: a.extensao ?? "",
          obrigatorio: true,
          reconhecido: a.status === "reconhecido",
          duplicado: a.status === "duplicado",
          vazio: a.status === "vazio",
          precisaPadronizacao: a.precisa_padronizacao,
          ordemProcessamento: a.ordem_processamento,
          categoriaTamanho: (a.categoria_tamanho as ArquivoPacoteDriveClassificado["categoriaTamanho"]) ?? "pequeno",
          parserDestino: a.parser_destino,
          motorEtapa: a.motor_etapa,
          status: a.status as ArquivoPacoteDriveClassificado["status"],
          observacao: a.observacao,
          avisos: a.observacao ? [a.observacao] : [],
        })),
      );
      const hist = historico.find((h) => h.pacote_id === id);
      if (hist) {
        setStatusPacote(hist.status);
        setUltimaConferencia(hist.ultima_conferencia_em);
      }
      setMostrarHistorico(false);
      setInfo(`Pacote ${id.slice(0, 8)}… carregado do histórico.`);
    } catch (e) {
      const pending = toHybridPendingError(e);
      if (pending) {
        setHybridPending(pending.message);
        setErro(null);
      } else {
        setErro(e instanceof Error ? e.message : String(e));
      }
    }
    setLoading(false);
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
          Importação Drive — Motor Ruptura
        </h1>
        <p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>
          Fase 4C.4 — fluxo completo: Worker → Motor → Data Mart → planilha padrão BASE_RUPTURA_V7.
        </p>
      </header>

      <div style={cardStyle}>
        <p style={helpTextStyle}>
          Importação <strong>regional e geral</strong> — o pacote no Drive contém arquivos de <strong>todas as lojas</strong> da regional
          (ex.: Inventário Lojas, Rede, grupos de ruptura). Não é limitado a uma loja específica.
        </p>
        <p style={{ ...helpTextStyle, marginBottom: 0 }}>
          A pasta ativa é localizada por <strong>Regional + Bandeira + tipo originais</strong>. A competência informada abaixo é atributo
          do pacote e <strong>não</strong> define a pasta física no Drive. A data referência registra o contexto operacional do pacote.
        </p>
        {pasta ? (
          <p style={{ ...helpTextStyle, marginBottom: 0 }}>
            Pasta cadastrada: <code>{pasta.caminho_exibicao ?? pasta.drive_folder_id}</code>
            {pasta.ultima_verificacao ? ` · última verificação ${new Date(pasta.ultima_verificacao).toLocaleString("pt-BR")}` : ""}
          </p>
        ) : ctx.bandeira ? (
          <p style={{ ...helpTextStyle, color: theme.colors.danger, marginBottom: 0 }}>
            Pasta ativa ainda não cadastrada para {ctx.regional} / {ctx.bandeira}.
          </p>
        ) : (
          <p style={{ ...helpTextStyle, color: theme.colors.danger, marginBottom: 0 }}>
            Selecione uma bandeira para localizar a pasta no Drive.
          </p>
        )}
      </div>

      <RupturaContextoBar
        ctx={ctx}
        onChange={setCtx}
        ocultarLoja
        permitirTodasBandeira={false}
        readonlyFields={readonly}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
        <label style={{ fontSize: 11, color: theme.colors.textMuted }}>
          Competência informativa (mês/ano)
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input type="number" min={1} max={12} value={mes} onChange={(e) => setMes(Number(e.target.value) || 1)} style={{ width: 56, background: "#0f172a", color: theme.colors.text, border: "1px solid #334155", borderRadius: 8, padding: 8 }} />
            <input type="number" min={2020} max={2035} value={ano} onChange={(e) => setAno(Number(e.target.value) || ano)} style={{ width: 72, background: "#0f172a", color: theme.colors.text, border: "1px solid #334155", borderRadius: 8, padding: 8 }} />
          </div>
        </label>
        <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
          Data referência: <strong>{ctx.dataReferencia}</strong>
        </div>
        <button type="button" style={buttonStyle} disabled={loading || perm?.podeListar === false || !folderIdEfetivo} onClick={() => void verificarDrive()}>
          {loading ? "Verificando…" : "Verificar Drive"}
        </button>
        <button type="button" style={buttonGhostStyle} disabled={loading || !perm?.podeValidar || !resumo} onClick={() => void salvarConferencia()}>
          Salvar conferência
        </button>
        <button type="button" style={buttonGhostStyle} disabled={loading || !perm?.podeValidar || !pacoteId} onClick={() => void validarPacote()}>
          Validar pacote
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading || !perm?.podeValidar || !pacoteId || statusPacote !== "pronto_processamento"}
          onClick={() => void prepararArquivos()}
        >
          Preparar arquivos
        </button>
        <button type="button" style={buttonGhostStyle} disabled={loading} onClick={() => void carregarPastaEHistorico()}>
          Atualizar
        </button>
        <button type="button" style={buttonGhostStyle} disabled={loading} onClick={() => setMostrarHistorico((v) => !v)}>
          Ver histórico
        </button>
        <span title={PIPELINE_PROCESSAR_TOOLTIP}>
          <button
            type="button"
            style={buttonStyle}
            disabled={
              loading ||
              !perm?.podeValidar ||
              !pacoteId ||
              !["pronto_motor", "falhou"].includes(statusPacote ?? "")
            }
            onClick={() => void processarMotor()}
          >
            Processar Motor
          </button>
        </span>
      </div>

      {isAdm && (
        <details style={cardStyle}>
          <summary style={{ cursor: "pointer", color: theme.colors.neonOrange }}>Avançado (ADM) — Folder ID manual</summary>
          <input value={folderIdManual} onChange={(e) => setFolderIdManual(e.target.value)} placeholder="Sobrescreve pasta cadastrada apenas para verificação" style={{ display: "block", width: "100%", marginTop: 8, background: "#0f172a", color: theme.colors.text, border: "1px solid #334155", borderRadius: 8, padding: 8 }} />
          {folderIdEfetivo && (
            <p style={{ ...helpTextStyle, marginTop: 8, marginBottom: 0 }}>Folder ID efetivo: <code>{folderIdEfetivo}</code></p>
          )}
        </details>
      )}

      {!isAdm && pasta?.drive_folder_id && (
        <details style={cardStyle}>
          <summary style={{ cursor: "pointer", color: theme.colors.textMuted, fontSize: 11 }}>Informação técnica — Folder ID</summary>
          <code style={{ fontSize: 11 }}>{pasta.drive_folder_id}</code>
        </details>
      )}

      {competenciaInformadaDiverge && pasta && (
        <div style={{ ...cardStyle, borderColor: theme.colors.warning }}>
          <strong style={{ color: theme.colors.warning }}>Competência divergente da pasta cadastrada</strong>
          <p style={helpTextStyle}>
            Competência informada: {competenciaLabel}. Pasta física cadastrada: {String(pasta.mes).padStart(2, "0")}/{pasta.ano}.
            Isso é permitido — o pacote usará a pasta ativa da regional.
          </p>
        </div>
      )}

      {perm && (
        <p style={{ ...helpTextStyle, color: perm.podeListar ? theme.colors.neonGreen : theme.colors.warning }}>
          Perfil {perm.nivel ?? "—"}: {perm.msg ?? (perm.podeListar ? "autorizado" : "somente leitura")}
        </p>
      )}

      {hybridPending && isModoHibrido() ? <HybridDataPending code="hybrid_pending" message={hybridPending} /> : null}
      {erro && <p style={{ color: theme.colors.danger }}>{erro}</p>}
      {info && <p style={{ color: theme.colors.neonGreen }}>{info}</p>}

      {resumo && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {[
            ["Esperados", resumo.quantidadeEsperados],
            ["Encontrados", resumo.quantidadeEncontrados],
            ["Válidos", resumo.quantidadeValidos],
            ["Faltantes", resumo.quantidadeFaltantes],
            ["Duplicidades", resumo.quantidadeDuplicidades],
            ["Desconhecidos", resumo.quantidadeDesconhecidos],
            ["Pequenos", resumo.quantidadePequenos],
            ["Médios", resumo.quantidadeMedios],
            ["Grandes", resumo.quantidadeGrandes],
            ["Pacote", resumo.pacoteCompleto ? "Completo" : "Incompleto"],
          ].map(([label, val]) => (
            <div key={String(label)} style={cardStyle}>
              <div style={{ fontSize: 10, color: theme.colors.textMuted }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: theme.colors.neonOrange }}>{String(val)}</div>
            </div>
          ))}
        </div>
      )}

      <RupturaPacoteDriveResumo
        regional={ctx.regional}
        competenciaLabel={competenciaLabel}
        dataReferencia={ctx.dataReferencia}
        pasta={pasta}
        resumo={resumo}
        hash={hashPacote}
        status={statusPacote}
        ultimaConferencia={ultimaConferencia}
      />

      <RupturaPacoteDriveChecklist diagnostico={diagnostico} />

      <RupturaPacoteDriveWorkerTimeline
        status={statusPacote}
        bytesBaixados={bytesBaixados}
        bytesTotal={bytesTotal}
        arquivoAtual={(metricasWorker?.arquivoAtual as string) ?? null}
        duracaoSegundos={duracaoSeg}
        erroResumo={progresso?.erro_resumo ?? solicitacaoWorker?.erro_resumo}
        arquivosConcluidos={arquivosConcluidos}
        arquivosTotal={classificados.length}
      />

      {statusPacote === "concluido" && (
        <div style={{ ...cardStyle, borderColor: theme.colors.neonGreen }}>
          <h3 style={{ margin: "0 0 8px", color: theme.colors.neonGreen }}>Processamento concluído</h3>
          <p style={{ ...helpTextStyle, marginBottom: 8 }}>
            Base gerada no Worker local em{" "}
            <code>src/motor/.tmp/worker/{pacoteId}/exportados/</code>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a href="/ruptura/gestao" style={{ ...buttonGhostStyle, textDecoration: "none" }}>
              Abrir Dashboard
            </a>
          </div>
        </div>
      )}

      {progresso?.hash_conteudo_pacote && (
        <p style={helpTextStyle}>
          Hash conteúdo: <code>{progresso.hash_conteudo_pacote.slice(0, 12)}…</code>
          {progresso.hash_metadados_pacote ? (
            <> · Hash metadados: <code>{progresso.hash_metadados_pacote.slice(0, 12)}…</code></>
          ) : null}
        </p>
      )}

      {arquivosOrdenados.length > 0 && (
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px", color: theme.colors.neonGreen }}>Arquivos do pacote</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Ordem", "Tipo", "Arquivo", "Ext.", "Tamanho", "Impacto", "Modificação", "MD5", "Status", "Padronização", "Obs."].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arquivosOrdenados.map((a) => (
                <tr key={a.driveFileId}>
                  <td style={tdStyle}>{a.ordemProcessamento ?? "—"}</td>
                  <td style={tdStyle}>{rotuloTipo(a.tipoArquivo)}</td>
                  <td style={tdStyle}>{a.nome}</td>
                  <td style={tdStyle}>{a.extensao || "—"}</td>
                  <td style={tdStyle}>{formatBytes(a.tamanhoBytes)}</td>
                  <td style={tdStyle}>{rotuloImpactoTamanho(a.categoriaTamanho)}</td>
                  <td style={tdStyle}>{a.modifiedTime ? new Date(a.modifiedTime).toLocaleString("pt-BR") : "—"}</td>
                  <td style={tdStyle}>{a.md5Checksum ?? "—"}</td>
                  <td style={tdStyle}>{a.status}</td>
                  <td style={tdStyle}>{a.precisaPadronizacao ? "Sim" : "Não"}</td>
                  <td style={tdStyle}>{a.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarHistorico && <RupturaPacoteDriveHistorico itens={historico} onAbrir={(id) => void abrirPacoteHistorico(id)} />}

      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", color: theme.colors.neonOrange }}>Catálogo MT — arquivos obrigatórios (11)</summary>
        <ul style={{ ...helpTextStyle, marginTop: 10 }}>
          {CATALOGO_ARQUIVOS_MOTOR_MT.map((c) => (
            <li key={c.tipoArquivo}>
              {c.tituloExibicao} ({c.formatosPermitidos.join(", ")}) — {c.descricaoAutoexplicativa}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
