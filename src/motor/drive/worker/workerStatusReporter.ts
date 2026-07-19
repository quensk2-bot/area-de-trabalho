import type { createInfraV7Db } from "./workerPackageLoader.ts";
import type { WorkerArquivoDb } from "./workerTypes.ts";
import { validarTransicaoPacote } from "./workerPackageValidator.ts";

export type ArquivoStatusUpdate = {
  id: string;
  sha256?: string;
  tamanhoBaixadoBytes?: number;
  hashValidado?: boolean;
  validacaoConteudoStatus?: string;
  validacaoConteudoErro?: string | null;
  padronizacaoStatus?: string;
  padronizacaoErro?: string | null;
  caminhoLocalOriginal?: string;
  caminhoLocalPadronizado?: string | null;
  baixadoEm?: string;
  padronizadoEm?: string;
};

export type StatusUpdateInput = {
  solicitacaoId: string;
  workerId: string;
  pacoteStatus: string;
  solicitacaoStatus?: string;
  erroResumo?: string | null;
  metricas?: Record<string, unknown>;
  hashConteudoPacote?: string | null;
  arquivos?: ArquivoStatusUpdate[];
};

export async function atualizarStatusWorker(
  db: ReturnType<typeof createInfraV7Db>,
  input: StatusUpdateInput,
  statusAtual?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (statusAtual && !validarTransicaoPacote(statusAtual, input.pacoteStatus)) {
    throw new Error(`Transição inválida: ${statusAtual} → ${input.pacoteStatus}`);
  }

  const { data, error } = await db.rpc("atualizar_status_worker_v1", {
    p_solicitacao_id: input.solicitacaoId,
    p_worker_id: input.workerId,
    p_pacote_status: input.pacoteStatus,
    p_solicitacao_status: input.solicitacaoStatus ?? null,
    p_erro_resumo: input.erroResumo ?? null,
    p_metricas: input.metricas ?? {},
    p_hash_conteudo_pacote: input.hashConteudoPacote ?? null,
    p_arquivos: (input.arquivos ?? []).map((a) => ({
      id: a.id,
      sha256: a.sha256,
      tamanhoBaixadoBytes: a.tamanhoBaixadoBytes,
      hashValidado: a.hashValidado,
      validacaoConteudoStatus: a.validacaoConteudoStatus,
      validacaoConteudoErro: a.validacaoConteudoErro,
      padronizacaoStatus: a.padronizacaoStatus,
      padronizacaoErro: a.padronizacaoErro,
      caminhoLocalOriginal: a.caminhoLocalOriginal,
      caminhoLocalPadronizado: a.caminhoLocalPadronizado,
      baixadoEm: a.baixadoEm,
      padronizadoEm: a.padronizadoEm,
    })),
  });

  if (error) throw new Error(error.message);
  const parsed = data as Record<string, unknown>;
  return { ok: !!parsed.ok, message: parsed.message as string | undefined };
}

export function serializarArquivoUpdate(arquivo: WorkerArquivoDb, extras: Partial<ArquivoStatusUpdate> = {}): ArquivoStatusUpdate {
  return {
    id: arquivo.id,
    sha256: arquivo.sha256 ?? undefined,
    tamanhoBaixadoBytes: arquivo.tamanho_baixado_bytes ?? undefined,
    hashValidado: arquivo.hash_validado,
    validacaoConteudoStatus: arquivo.validacao_conteudo_status ?? undefined,
    validacaoConteudoErro: arquivo.validacao_conteudo_erro,
    padronizacaoStatus: arquivo.padronizacao_status ?? undefined,
    padronizacaoErro: arquivo.padronizacao_erro,
    caminhoLocalOriginal: arquivo.caminho_local_original ?? undefined,
    caminhoLocalPadronizado: arquivo.caminho_local_padronizado,
    ...extras,
  };
}
