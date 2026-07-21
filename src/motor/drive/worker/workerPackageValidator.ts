import { ordenarArquivosDownload } from "./workerHash.ts";
import type { WorkerArquivoDb, WorkerPacoteDb } from "./workerTypes.ts";

const TRANSICOES_PACOTE: Record<string, Set<string>> = {
  baixando: new Set(["validando_conteudo", "falhou_download", "baixando"]),
  validando_conteudo: new Set(["padronizando", "falhou_validacao", "validando_conteudo", "baixando", "aguardando_worker"]),
  padronizando: new Set(["pronto_motor", "falhou_padronizacao", "padronizando", "aguardando_worker"]),
  aguardando_worker: new Set(["baixando"]),
  pronto_motor: new Set(["pronto_motor"]),
  falhou_download: new Set(["falhou_download", "aguardando_worker"]),
  falhou_validacao: new Set(["falhou_validacao"]),
  falhou_padronizacao: new Set(["falhou_padronizacao"]),
};

export function validarTransicaoPacote(atual: string, proximo: string): boolean {
  const permitidos = TRANSICOES_PACOTE[atual];
  if (!permitidos) return true;
  return permitidos.has(proximo);
}

export function validarPacoteParaProcessamento(pacote: WorkerPacoteDb, arquivos: WorkerArquivoDb[]): string[] {
  const erros: string[] = [];
  if (!pacote.hash_metadados_pacote) erros.push("Hash de metadados ausente");
  if (!arquivos.length) erros.push("Nenhum arquivo reconhecido para download");
  const faltantes = arquivos.filter((a) => !a.drive_file_id || a.drive_file_id.startsWith("faltante:"));
  if (faltantes.length) erros.push(`${faltantes.length} arquivo(s) sem drive_file_id`);
  return erros;
}

export function filtrarArquivosTesteParcial(
  arquivos: WorkerArquivoDb[],
  opts: { onlyFileType?: string | null; maxFiles?: number | null },
): WorkerArquivoDb[] {
  let list = ordenarArquivosDownload(arquivos);
  if (opts.onlyFileType) {
    list = list.filter((a) => a.tipo_arquivo === opts.onlyFileType);
  }
  if (opts.maxFiles != null && opts.maxFiles > 0) {
    list = list.slice(0, opts.maxFiles);
  }
  return list;
}

export function isModoTesteParcial(config: { onlyFileType?: string | null; maxFiles?: number | null }): boolean {
  return Boolean(config.onlyFileType || (config.maxFiles != null && config.maxFiles > 0));
}

export function todosArquivosValidos(arquivos: WorkerArquivoDb[]): boolean {
  return arquivos.every(
    (a) => a.hash_validado !== false && a.validacao_conteudo_status !== "invalido" && !!a.sha256,
  );
}

export function calcularProgressoBytes(arquivos: WorkerArquivoDb[]): { baixados: number; total: number; percentual: number } {
  const total = arquivos.reduce((s, a) => s + (a.tamanho_bytes ?? 0), 0);
  const baixados = arquivos.reduce((s, a) => s + (a.tamanho_baixado_bytes ?? 0), 0);
  const percentual = total > 0 ? Math.min(100, Math.round((baixados / total) * 100)) : 0;
  return { baixados, total, percentual };
}
