import type { createInfraV7Db } from "../drive/worker/workerPackageLoader.ts";
import {
  type MotorPacoteStatusProcessamento,
  validarTransicaoMotorPacote,
} from "./motorPacoteStatus.ts";

export type AtualizarPacoteMotorInput = {
  pacoteId: string;
  status: MotorPacoteStatusProcessamento;
  statusAtual?: string;
  erroResumo?: string | null;
  execucaoMotorId?: string | null;
  metricas?: Record<string, unknown>;
  caminhoBaseXlsx?: string | null;
  caminhoBaseCsv?: string | null;
};

export async function atualizarStatusPacoteMotor(
  db: ReturnType<typeof createInfraV7Db>,
  input: AtualizarPacoteMotorInput,
): Promise<void> {
  if (input.statusAtual && !validarTransicaoMotorPacote(input.statusAtual, input.status)) {
    throw new Error(`Transição inválida: ${input.statusAtual} → ${input.status}`);
  }

  const patch: Record<string, unknown> = {
    status: input.status,
    erro_resumo: input.erroResumo ?? null,
    atualizado_em: new Date().toISOString(),
  };

  if (input.execucaoMotorId !== undefined) patch.execucao_motor_id = input.execucaoMotorId;
  if (input.status === "concluido") patch.processado_em = new Date().toISOString();
  if (input.metricas) {
    const { data: row } = await db.from("pacote_motor_drive").select("avisos").eq("id", input.pacoteId).maybeSingle();
    const avisos = (row?.avisos as unknown[] | null) ?? [];
    patch.avisos = [...avisos, { motor: input.metricas, em: new Date().toISOString() }];
  }

  const { error } = await db.from("pacote_motor_drive").update(patch).eq("id", input.pacoteId);
  if (error) throw new Error(error.message);
}

export async function atualizarSolicitacaoMotor(
  db: ReturnType<typeof createInfraV7Db>,
  solicitacaoId: string,
  patch: {
    status?: string;
    erroResumo?: string | null;
    metricas?: Record<string, unknown>;
    workerId?: string;
  },
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.status) {
    body.status = patch.status;
    if (patch.status === "concluida" || patch.status === "falhou") {
      body.finalizado_em = new Date().toISOString();
    }
  }
  if (patch.erroResumo !== undefined) body.erro_resumo = patch.erroResumo;
  if (patch.workerId) body.worker_id = patch.workerId;
  if (patch.metricas) {
    const { data: row } = await db.from("worker_solicitacao").select("metricas").eq("id", solicitacaoId).maybeSingle();
    const prev = (row?.metricas as Record<string, unknown> | null) ?? {};
    body.metricas = { ...prev, ...patch.metricas };
  }

  const { error } = await db.from("worker_solicitacao").update(body).eq("id", solicitacaoId);
  if (error) throw new Error(error.message);
}

export async function buscarPacoteMotor(
  db: ReturnType<typeof createInfraV7Db>,
  pacoteId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await db.from("pacote_motor_drive").select("*").eq("id", pacoteId).single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}
