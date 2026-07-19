import "dotenv/config";
import { carregarWorkerConfig, obterStatusConfig } from "../drive/worker/workerConfig.ts";
import { executarWorkerLoop, executarWorkerPacote } from "../drive/worker/workerRunner.ts";

function parseArgs(argv: string[]) {
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--once") opts.once = true;
    else if (arg === "--keep-files") opts.keepFiles = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--poll-interval" && argv[i + 1]) opts.pollInterval = argv[++i]!;
    else if (arg === "--worker-id" && argv[i + 1]) opts.workerId = argv[++i]!;
    else if (arg === "--package-id" && argv[i + 1]) opts.packageId = argv[++i]!;
    else if (arg === "--max-retries" && argv[i + 1]) opts.maxRetries = argv[++i]!;
    else if (arg === "--only-file-type" && argv[i + 1]) opts.onlyFileType = argv[++i]!;
    else if (arg === "--max-files" && argv[i + 1]) opts.maxFiles = argv[++i]!;
  }
  return opts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const status = obterStatusConfig();
  console.log("[motor:drive-worker] Config:", JSON.stringify(status));

  const config = carregarWorkerConfig({
    workerId: typeof args.workerId === "string" ? args.workerId : undefined,
    pollIntervalMs: args.pollInterval ? Number(args.pollInterval) : undefined,
    maxRetries: args.maxRetries ? Number(args.maxRetries) : undefined,
    keepFiles: !!args.keepFiles,
    dryRun: !!args.dryRun,
    packageId: typeof args.packageId === "string" ? args.packageId : null,
    onlyFileType: typeof args.onlyFileType === "string" ? args.onlyFileType : null,
    maxFiles: args.maxFiles ? Number(args.maxFiles) : null,
  });

  if (config.onlyFileType || config.maxFiles) {
    console.log("[motor:drive-worker] Modo teste parcial — pacote NÃO será marcado pronto_motor");
  }

  const ac = new AbortController();
  process.on("SIGINT", () => {
    console.log("\n[motor:drive-worker] Encerramento solicitado…");
    ac.abort();
  });
  process.on("SIGTERM", () => ac.abort());

  console.log(`[motor:drive-worker] Iniciando worker ${config.workerId}`);

  if (args.once || config.packageId) {
    const result = await executarWorkerPacote(config, ac.signal);
    console.log(JSON.stringify({ ok: result.ok, pacoteId: result.pacoteId, status: result.statusFinal, message: result.message }));
    process.exit(result.ok ? 0 : 1);
  }

  await executarWorkerLoop(config, ac.signal);
  console.log("[motor:drive-worker] Encerrado.");
}

main().catch((err) => {
  console.error("[motor:drive-worker] Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
