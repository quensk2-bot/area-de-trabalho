import { createClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./workerConfig.ts";
import type { WorkerClaimPayload } from "./workerTypes.ts";

export function createInfraV7Db(config: Pick<WorkerConfig, "supabaseUrl" | "supabaseServiceRoleKey">) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    db: { schema: "infra_v7" },
  });
}

export async function claimSolicitacaoWorker(
  db: ReturnType<typeof createInfraV7Db>,
  workerId: string,
  pacoteId?: string | null,
): Promise<WorkerClaimPayload> {
  const { data, error } = await db.rpc("claim_solicitacao_worker_v1", {
    p_worker_id: workerId,
    p_pacote_id: pacoteId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as WorkerClaimPayload;
}

export async function buscarSolicitacaoPorPacote(
  db: ReturnType<typeof createInfraV7Db>,
  pacoteId: string,
): Promise<WorkerClaimPayload | null> {
  const { data: sol, error: solErr } = await db
    .from("worker_solicitacao")
    .select("*")
    .eq("pacote_id", pacoteId)
    .in("status", ["pendente", "em_execucao"])
    .order("solicitado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (solErr) throw new Error(solErr.message);
  if (!sol) return null;

  const { data: pacote, error: pacErr } = await db.from("pacote_motor_drive").select("*").eq("id", pacoteId).single();
  if (pacErr) throw new Error(pacErr.message);

  const { data: arquivos, error: arqErr } = await db
    .from("pacote_motor_drive_arquivo")
    .select("*")
    .eq("pacote_id", pacoteId)
    .eq("status", "reconhecido")
    .order("ordem_processamento", { ascending: true });
  if (arqErr) throw new Error(arqErr.message);

  const { data: pastaRow } = await db
    .from("pacote_motor_drive")
    .select("pasta_originais_id")
    .eq("id", pacoteId)
    .single();

  let pasta: Record<string, unknown> | undefined;
  if (pastaRow?.pasta_originais_id) {
    const { data: p } = await db.from("drive_pastas_motor").select("*").eq("id", pastaRow.pasta_originais_id).maybeSingle();
    pasta = (p as Record<string, unknown>) ?? undefined;
  }

  return {
    ok: true,
    solicitacao: sol as WorkerClaimPayload["solicitacao"],
    pacote: pacote as WorkerClaimPayload["pacote"],
    arquivos: (arquivos ?? []) as WorkerClaimPayload["arquivos"],
    pasta,
  };
}
