import { chaveDmTexto } from "../datamart/dmMapping.ts";
import type { MotorV7Db, ExecucaoMotorRow, ExecucaoMotorStatusDb } from "./persistenciaTypes.ts";

export type CriarExecucaoMotorInput = {
  regional: string;
  dataReferencia: string;
  versao: number;
  hashPacote: string;
  quantidadeArquivos: number;
  quantidadeRegistros: number;
  quantidadeErros: number;
  status?: ExecucaoMotorStatusDb;
};

export async function criarExecucaoMotor(
  db: MotorV7Db,
  input: CriarExecucaoMotorInput,
): Promise<ExecucaoMotorRow> {
  const { data, error } = await db
    .from("execucao_motor")
    .insert({
      regional: input.regional,
      data_referencia: input.dataReferencia,
      versao: input.versao,
      hash_pacote: input.hashPacote,
      quantidade_arquivos: input.quantidadeArquivos,
      quantidade_registros: input.quantidadeRegistros,
      quantidade_erros: input.quantidadeErros,
      status: input.status ?? "processando",
      versao_ativa: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Falha ao criar execucao_motor: ${error.message}`);
  return data as ExecucaoMotorRow;
}

export async function atualizarExecucaoMotorStatus(
  db: MotorV7Db,
  execucaoMotorId: string,
  status: ExecucaoMotorStatusDb,
  extras?: { finalizado_em?: string; duracao_ms?: number },
): Promise<void> {
  const { error } = await db
    .from("execucao_motor")
    .update({
      status,
      ...(extras?.finalizado_em ? { finalizado_em: extras.finalizado_em } : {}),
      ...(extras?.duracao_ms != null ? { duracao_ms: extras.duracao_ms } : {}),
    })
    .eq("id", execucaoMotorId);

  if (error) throw new Error(`Falha ao atualizar execucao_motor: ${error.message}`);
}

export async function buscarExecucaoPorHash(
  db: MotorV7Db,
  regional: string,
  dataReferencia: string,
  hashPacote: string,
): Promise<ExecucaoMotorRow | null> {
  const { data, error } = await db
    .from("execucao_motor")
    .select("*")
    .eq("regional", regional)
    .eq("data_referencia", dataReferencia)
    .eq("hash_pacote", hashPacote)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar execucao por hash: ${error.message}`);
  return (data as ExecucaoMotorRow | null) ?? null;
}

export async function buscarExecucaoEmAndamento(
  db: MotorV7Db,
  regional: string,
  dataReferencia: string,
): Promise<ExecucaoMotorRow | null> {
  const { data, error } = await db
    .from("execucao_motor")
    .select("*")
    .eq("regional", regional)
    .eq("data_referencia", dataReferencia)
    .in("status", ["criada", "processando"])
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar execucao em andamento: ${error.message}`);
  return (data as ExecucaoMotorRow | null) ?? null;
}

export async function obterProximaVersao(
  db: MotorV7Db,
  regional: string,
  dataReferencia: string,
): Promise<number> {
  const { data, error } = await db
    .from("execucao_motor")
    .select("versao")
    .eq("regional", regional)
    .eq("data_referencia", dataReferencia)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao obter proxima versao: ${error.message}`);
  return data ? (data as { versao: number }).versao + 1 : 1;
}

export async function ativarExecucao(db: MotorV7Db, execucaoMotorId: string): Promise<void> {
  const { error } = await db.rpc("ativar_execucao", { p_execucao_id: execucaoMotorId });
  if (error) throw new Error(`Falha ao ativar execucao: ${error.message}`);
}

export async function contarVersoesAtivas(
  db: MotorV7Db,
  regional: string,
  dataReferencia: string,
): Promise<number> {
  const { count, error } = await db
    .from("execucao_motor")
    .select("*", { count: "exact", head: true })
    .eq("regional", regional)
    .eq("data_referencia", dataReferencia)
    .eq("versao_ativa", true);

  if (error) throw new Error(`Falha ao contar versoes ativas: ${error.message}`);
  return count ?? 0;
}

export function chaveExecucaoNatural(regional: string, dataReferencia: string, loja: number, seqproduto: number): string {
  return `${regional}|${dataReferencia}|${loja}|${seqproduto}`;
}

export { chaveDmTexto };
