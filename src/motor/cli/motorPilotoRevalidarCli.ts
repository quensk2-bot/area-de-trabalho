import { executarPilotoRevalidacao } from "../pilot/pilotoRevalidacaoOrchestrator.ts";

function parseArgs(argv: string[]) {
  const get = (flag: string, fallback?: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : fallback;
  };
  return {
    regional: get("--regional", "MT")!,
    loja: Number(get("--loja", "73")),
    dataReferencia: get("--data", "2026-03-26")!,
    sampleSize: Number(get("--sample-size", "300")),
    excel: get("--excel"),
    limpar: argv.includes("--limpar"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultado = await executarPilotoRevalidacao({
    regional: args.regional,
    loja: args.loja,
    dataReferencia: args.dataReferencia,
    sampleSize: args.sampleSize,
    excelPath: args.excel,
    limparTemporarios: args.limpar,
  });

  console.log(
    JSON.stringify(
      {
        decisao: resultado.revalidacao.decisao,
        paridade: {
          v7: resultado.revalidacao.paridade.v7Total,
          excel: resultado.revalidacao.paridade.excelTotal,
          intersecao: resultado.revalidacao.paridade.intersecao,
          somenteV7: resultado.revalidacao.paridade.somenteV7,
          somenteExcel: resultado.revalidacao.paridade.somenteExcel,
        },
        divergencias: {
          total: resultado.revalidacao.divergencias.length,
          comprador: resultado.revalidacao.metricas.divergenciasComprador,
          bre: resultado.revalidacao.metricas.divergenciasBre,
          rede: resultado.revalidacao.metricas.divergenciasRede,
          cdEstruturais: resultado.revalidacao.metricas.divergenciasCdEstruturais,
          novas: resultado.revalidacao.metricas.divergenciasNovas,
        },
        piloto: {
          produtosConsolidados: resultado.piloto.consolidado.itens.length,
          duracaoMs: resultado.piloto.metricas.duracaoTotalMs,
          memoria: resultado.piloto.metricas.memoria,
        },
        duracaoTotalMs: resultado.duracaoTotalMs,
        outputPilotoDir: resultado.outputPilotoDir,
        outputRevalidacaoDir: resultado.outputRevalidacaoDir,
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
