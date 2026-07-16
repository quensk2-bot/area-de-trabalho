import { executarPadronizacao, formatarRelatorioPadronizacao, MotorStandardizeError } from "./standardizeService.ts";
import { isMotorStandardizeTipo, type MotorStandardizeEntrada } from "./standardizeTypes.ts";
import { normalizarRegional } from "../workflow/motorWorkflowUtils.ts";

function parseArgs(argv: string[]): MotorStandardizeEntrada & { help?: boolean } {
  const args: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--report") {
      args.report = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }

  if (args.help === true) {
    return {
      caminho: "",
      tipo: "validacao_ruptura",
      regional: "MT",
      dataReferencia: "",
      outputDir: "",
      dryRun: false,
      gerarReport: false,
      help: true,
    };
  }

  const file = String(args.file ?? "");
  const tipo = String(args.tipo ?? "");
  const regional = String(args.regional ?? "");
  const data = String(args.data ?? "");
  const output = String(args.output ?? "");

  if (!file || !tipo || !regional || !data || !output) {
    throw new MotorStandardizeError(
      "Uso: motor:padronizar --file <arquivo> --tipo <tipo> --regional <MT|MS|...> --data YYYY-MM-DD --output <pasta> [--dry-run] [--report]",
      "ARGS_INVALIDOS",
    );
  }

  if (!isMotorStandardizeTipo(tipo)) {
    throw new MotorStandardizeError(
      `Tipo inválido: ${tipo}. Tipos: validacao_ruptura, ordem_cds, compradores, regras, estrutura_fake`,
      "TIPO_INVALIDO",
    );
  }

  normalizarRegional(regional);

  return {
    caminho: file,
    tipo,
    regional: regional.toUpperCase() as MotorStandardizeEntrada["regional"],
    dataReferencia: data,
    outputDir: output,
    dryRun: args.dryRun === true,
    gerarReport: args.report === true || args.dryRun === true,
  };
}

function printHelp(): void {
  console.log(`Motor Operacional V7 — Padronizador de Planilhas (Fase 2C.2.2)

Uso:
  npm run motor:padronizar -- --file <arquivo> --tipo <tipo> --regional <UF> --data YYYY-MM-DD --output <pasta>

Tipos:
  validacao_ruptura   Validação Ruptura → motor_validacao_ruptura_padrao.xlsx
  ordem_cds           Ordem CDs → motor_ordem_cds_padrao.xlsx
  compradores         Compradores → motor_compradores_padrao.xlsx
  regras              Regras → motor_regras_padrao.xlsx
  estrutura_fake      Estrutura Fake → motor_estrutura_fake_padrao.xlsx

Regionais: MT, MS, DF, GO, SC, RS, SP, MG

Opções:
  --dry-run   Inspecionar e validar sem gerar planilha padrão
  --report    Gerar relatório JSON na pasta de saída

Contratos: preliminares — aguardando validação com arquivo real (Fase 2C.2.3).
Original nunca é sobrescrito.
`);
}

async function main(): Promise<void> {
  try {
    const entrada = parseArgs(process.argv.slice(2));
    if (entrada.help) {
      printHelp();
      return;
    }

    const resultado = executarPadronizacao(entrada);
    console.log(formatarRelatorioPadronizacao(resultado.report));
    if (!resultado.sucesso && resultado.report.statusFinal === "erro") {
      process.exitCode = 1;
    }
  } catch (err) {
    if (err instanceof MotorStandardizeError) {
      console.error(`[motor:padronizar] ${err.codigo}: ${err.message}`);
    } else if (err instanceof Error) {
      console.error(`[motor:padronizar] ${err.message}`);
    } else {
      console.error("[motor:padronizar] Erro desconhecido");
    }
    process.exitCode = 1;
  }
}

main();
