import { executarRevalidacao } from "../pilot/revalidationRunner.ts";

function parseArgs(argv: string[]) {
  const get = (flag: string, fallback?: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : fallback;
  };
  return {
    regional: get("--regional", "MT")!,
    loja: Number(get("--loja", "73")),
    dataReferencia: get("--data", "2026-03-26")!,
    consolidadoPath: get("--consolidado"),
    outputDir: get("--output"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultado = await executarRevalidacao({
    regional: args.regional,
    loja: args.loja,
    dataReferencia: args.dataReferencia,
    consolidadoPath: args.consolidadoPath,
    outputDir: args.outputDir,
  });

  console.log(
    JSON.stringify(
      {
        paridade: {
          v7: resultado.paridade.v7Total,
          excel: resultado.paridade.excelTotal,
          intersecao: resultado.paridade.intersecao,
          somenteV7: resultado.paridade.somenteV7,
          somenteExcel: resultado.paridade.somenteExcel,
        },
        cdMapping: resultado.cdConfig.porPosicao,
        divergencias: resultado.divergencias.length,
        criticas: resultado.divergencias.filter((d) => d.severidade === "critica").length,
        resumo: resultado.resumoClassificacao,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
