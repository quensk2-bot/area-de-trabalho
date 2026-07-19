import { supabase } from "../../lib/supabaseClient.ts";
import { consumoDb } from "./rupturaDb.ts";

const infraDb = () => supabase.schema("infra_v7");
import {
  VERSAO_CATALOGO_MT,
  VERSAO_MOTOR_PADRAO,
  type TipoArquivoMotor,
} from "../../motor/drive/catalogoArquivosMotor.ts";
import {
  calcularHashMetadadosPacote,
  calcularResumoPacote,
  classificarArquivosPacoteDrive,
  type ArquivoPacoteDriveClassificado,
  type ResumoPacoteDrive,
} from "../../motor/drive/validacaoPacoteDrive.ts";
import type { ArquivoDriveRemoto, ListarDriveResponse } from "./rupturaDriveListService.ts";

export type DrivePastaMotorAtiva = {
  id: string;
  regional: string;
  ano: number;
  mes: number;
  tipo_pasta: string;
  drive_folder_id: string;
  caminho_exibicao: string | null;
  descricao: string | null;
  observacao: string | null;
  ultima_verificacao: string | null;
  ultima_validacao: string | null;
};

export type PacoteMotorDriveHistorico = {
  pacote_id: string;
  regional: string;
  competencia: string;
  data_referencia: string;
  status: string;
  pacote_completo: boolean;
  quantidade_arquivos_encontrados: number;
  quantidade_arquivos_faltantes: number;
  tamanho_total_bytes: number;
  hash_reduzido: string | null;
  ultima_conferencia_em: string | null;
  validado_em: string | null;
  origem_validacao: string | null;
  execucao_motor_id: string | null;
  criado_por_nome: string | null;
  pasta_caminho: string | null;
  pasta_ano: number;
  pasta_mes: number;
  tempo_validacao_segundos: number | null;
};

export type PacoteMotorDriveArquivoView = {
  id: string;
  pacote_id: string;
  drive_file_id: string;
  tipo_arquivo: string | null;
  nome_original: string;
  extensao: string | null;
  tamanho_bytes: number | null;
  modified_time: string | null;
  md5_drive: string | null;
  ordem_processamento: number | null;
  categoria_tamanho: string | null;
  parser_destino: string | null;
  motor_etapa: string | null;
  status: string;
  precisa_padronizacao: boolean;
  observacao: string | null;
};

export type SincronizarPacoteResult = {
  ok: boolean;
  pacoteId?: string;
  status?: string;
  message?: string;
  resumo?: ResumoPacoteDrive;
  hashMetadadosPacote?: string;
};

export type ValidarPacoteResult = {
  ok: boolean;
  validado?: boolean;
  status?: string;
  message?: string;
  pacoteId?: string;
  hashMetadadosPacote?: string;
  hashReduzido?: string;
};

export async function buscarPastaMotorAtiva(regional: string, tipoPasta = "originais"): Promise<DrivePastaMotorAtiva | null> {
  const { data, error } = await consumoDb()
    .from("vw_drive_pasta_motor_ativa")
    .select("*")
    .eq("regional", regional.toUpperCase())
    .eq("tipo_pasta", tipoPasta)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DrivePastaMotorAtiva | null) ?? null;
}

export async function listarHistoricoPacotes(regional: string, limit = 20): Promise<PacoteMotorDriveHistorico[]> {
  const { data, error } = await consumoDb()
    .from("vw_pacote_motor_drive_historico")
    .select("*")
    .eq("regional", regional.toUpperCase())
    .order("criado_em", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PacoteMotorDriveHistorico[];
}

export async function listarArquivosPacote(pacoteId: string): Promise<PacoteMotorDriveArquivoView[]> {
  const { data, error } = await consumoDb()
    .from("vw_pacote_motor_drive_arquivo")
    .select("*")
    .eq("pacote_id", pacoteId)
    .order("ordem_processamento", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PacoteMotorDriveArquivoView[];
}

export function prepararClassificacaoDrive(
  listagem: ListarDriveResponse,
  pasta: DrivePastaMotorAtiva,
): { classificados: ArquivoPacoteDriveClassificado[]; resumo: ResumoPacoteDrive; hash: string } {
  const arquivosEntrada = (listagem.arquivos ?? []).map((a: ArquivoDriveRemoto) => ({
    driveFileId: a.driveFileId,
    nome: a.nome,
    mimeType: a.mimeType,
    tamanhoBytes: a.tamanhoBytes,
    modifiedTime: a.modifiedTime,
    md5Checksum: a.md5Checksum,
    webViewLink: a.webViewLink,
  }));
  const classificados = classificarArquivosPacoteDrive(arquivosEntrada, pasta.drive_folder_id);
  const resumo = calcularResumoPacote(classificados);
  const hash = calcularHashMetadadosPacote(classificados);
  return { classificados, resumo, hash };
}

function serializarArquivoRpc(a: ArquivoPacoteDriveClassificado) {
  return {
    driveFileId: a.driveFileId,
    driveFolderId: a.driveFolderId,
    nome: a.nome,
    nomeOriginal: a.nome,
    nomeNormalizado: a.nomeNormalizado,
    tipoArquivo: a.tipoArquivo,
    extensao: a.extensao,
    mimeType: a.mimeType,
    tamanhoBytes: a.tamanhoBytes,
    modifiedTime: a.modifiedTime,
    md5Drive: a.md5Checksum,
    obrigatorio: a.obrigatorio,
    reconhecido: a.reconhecido,
    duplicado: a.duplicado,
    vazio: a.vazio,
    precisaPadronizacao: a.precisaPadronizacao,
    ordemProcessamento: a.ordemProcessamento,
    categoriaTamanho: a.categoriaTamanho,
    parserDestino: a.parserDestino,
    motorEtapa: a.motorEtapa,
    status: a.status,
    observacao: a.observacao,
  };
}

export async function sincronizarPacoteMotorDrive(input: {
  regional: string;
  competencia: string;
  dataReferencia: string;
  pastaId: string;
  classificados: ArquivoPacoteDriveClassificado[];
  resumo: ResumoPacoteDrive;
}): Promise<SincronizarPacoteResult> {
  const { data, error } = await infraDb().rpc("sincronizar_pacote_motor_drive_v1", {
    p_regional: input.regional.toUpperCase(),
    p_competencia: input.competencia,
    p_data_referencia: input.dataReferencia,
    p_pasta_originais_id: input.pastaId,
    p_arquivos: input.classificados.map(serializarArquivoRpc),
    p_versao_motor: VERSAO_MOTOR_PADRAO,
    p_versao_catalogo: VERSAO_CATALOGO_MT,
    p_resumo: {
      quantidadeEsperados: input.resumo.quantidadeEsperados,
      quantidadeEncontrados: input.resumo.quantidadeEncontrados,
      quantidadeValidos: input.resumo.quantidadeValidos,
      quantidadeFaltantes: input.resumo.quantidadeFaltantes,
      quantidadeDuplicidades: input.resumo.quantidadeDuplicidades,
      quantidadeDesconhecidos: input.resumo.quantidadeDesconhecidos,
      quantidadePequenos: input.resumo.quantidadePequenos,
      quantidadeMedios: input.resumo.quantidadeMedios,
      quantidadeGrandes: input.resumo.quantidadeGrandes,
      tamanhoTotalBytes: input.resumo.tamanhoTotalBytes,
      pacoteCompleto: input.resumo.pacoteCompleto,
      status: input.resumo.status,
      avisos: input.resumo.avisos,
      faltantes: input.resumo.faltantes as TipoArquivoMotor[],
    },
  });
  if (error) return { ok: false, message: error.message };
  const parsed = data as Record<string, unknown>;
  return {
    ok: !!parsed.ok,
    pacoteId: parsed.pacoteId as string | undefined,
    status: parsed.status as string | undefined,
    message: parsed.message as string | undefined,
    hashMetadadosPacote: parsed.hashMetadadosPacote as string | undefined,
    resumo: input.resumo,
  };
}

export async function validarPacoteMotorDrive(pacoteId: string, origem: "drive" | "manual" = "drive"): Promise<ValidarPacoteResult> {
  const { data, error } = await infraDb().rpc("validar_pacote_motor_drive_v1", {
    p_pacote_id: pacoteId,
    p_origem_validacao: origem,
  });
  if (error) return { ok: false, message: error.message };
  const parsed = data as Record<string, unknown>;
  return {
    ok: !!parsed.ok,
    validado: !!parsed.validado,
    status: parsed.status as string | undefined,
    message: parsed.message as string | undefined,
    pacoteId: parsed.pacoteId as string | undefined,
    hashMetadadosPacote: parsed.hashMetadadosPacote as string | undefined,
    hashReduzido: parsed.hashReduzido as string | undefined,
  };
}

export function competenciaDivergeDaPasta(competenciaAno: number, competenciaMes: number, pasta: DrivePastaMotorAtiva | null): boolean {
  if (!pasta) return false;
  return pasta.ano !== competenciaAno || pasta.mes !== competenciaMes;
}

export const PIPELINE_PROCESSAR_TOOLTIP = [
  "Drive",
  "↓",
  "Worker Node",
  "↓",
  "Padronização",
  "↓",
  "Motor Operacional",
  "↓",
  "Data Mart",
  "↓",
  "Versão Ativa",
  "↓",
  "Dashboard",
].join("\n");
