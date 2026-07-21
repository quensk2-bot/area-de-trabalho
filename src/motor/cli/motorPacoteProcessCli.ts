import "dotenv/config";
import { createInfraV7Db } from "../drive/worker/workerPackageLoader.ts";
import { carregarWorkerConfig, obterStatusConfig } from "../drive/worker/workerConfig.ts";
import { executarProcessamentoPacoteMotor } from "../pacote/motorPacoteProcessRunner.ts";

function parseArgs(argv: string[]) {
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--once") opts.once = true;
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--poll-interval" && argv[i + 1]) opts.pollInterval = argv[++i]!;
    else if (arg === "--worker-id" && argv[i + 1]) opts.workerId = argv[++i]!;
    else if (arg === "--package-id" && argv[i + 1]) opts.packageId = argv[++i]!;
  }
  return opts;
}

async function claimMotor(config: ReturnType<typeof carregarWorkerConfig>) {
  const db = createInfraV7Db({
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  });
  const { data, error } = await db.rpc("claim_solicitacao_motor_v1", {
    p_worker_id: config.workerId,
    p_pacote_id: config.packageId,
  });
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

async function processarUm(config: ReturnType<typeof carregarWorkerConfig>): Promise<boolean> {
  if (config.packageId) {
    const result = await executarProcessamentoPacoteMotor({
      pacoteId: config.packageId,
      workerId: config.workerId,
      dryRunMotor: false,
    });
    console.log(JSON.stringify(result, null, 2));
    return result.ok;
  }

  const claim = await claimMotor(config);
  if (!claim.ok) {
    console.log("[motor:pacote-process]", claim.message ?? "Nada pendente");
    return false;
  }

  const sol = claim.solicitacao as Record<string, unknown>;
  const pacote = claim.pacote as Record<string, unknown>;
  const pacoteId = String(pacote.id);
  const solicitacaoId = String(sol.id);

  console.log(`[motor:pacote-process] Processando pacote ${pacoteId}…`);

  const result = await executarProcessamentoPacoteMotor({
    pacoteId,
    workerId: config.workerId,
    solicitacaoId,
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ok;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const status = obterStatusConfig();
  console.log("[motor:pacote-process] Config:", JSON.stringify(status));

  const config = carregarWorkerConfig({
    workerId: typeof args.workerId === "string" ? args.workerId : `motor-process-${process.pid}`,
    packageId: typeof args.packageId === "string" ? args.packageId : null,
  });

  const ac = new AbortController();
  process.on("SIGINT", () => ac.abort());
  process.on("SIGTERM", () => ac.abort());

  if (args.once || config.packageId) {
    const ok = await processarUm(config);
    process.exit(ok ? 0 : 1);
  }

  const interval = args.pollInterval ? Number(args.pollInterval) : 15_000;
  console.log(`[motor:pacote-process] Polling a cada ${interval}ms`);

  while (!ac.signal.aborted) {
    try {
      await processarUm(config);
    } catch (err) {
      console.error("[motor:pacote-process] Erro:", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

main().catch((err) => {
  console.error("[motor:pacote-process] Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
