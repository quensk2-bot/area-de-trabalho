import { defaultPilotOutputDir, executarPiloto } from "../pilot/index.ts";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const regional = args.regional ?? "MT";
  const loja = Number(args.loja ?? "73");
  const dataReferencia = args.data ?? "2026-03-26";
  const sampleSize = Number(args["sample-size"] ?? "300");
  const output = args.output ?? defaultPilotOutputDir(regional, dataReferencia, loja);

  console.log(`Piloto Motor V7 — ${regional} / loja ${loja} / ${dataReferencia}`);
  const resultado = await executarPiloto({
    regional,
    loja,
    dataReferencia,
    sampleSize,
    outputDir: output,
    modoCompleto: true,
  });

  console.log(JSON.stringify({
    aprovado: resultado.aprovado,
    bloqueio: resultado.bloqueioMotivo,
    produtos: resultado.consolidado.itens.length,
    amostra: resultado.amostra.length,
    divergenciasCriticas: resultado.metricas.divergenciasCriticas,
    duracaoMs: resultado.metricas.duracaoTotalMs,
    output,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
