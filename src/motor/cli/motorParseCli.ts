import { isMotorTipoArquivo } from "../constants/tiposArquivo.ts";
import { executarMotorParse, MotorParseError } from "../services/motorParseService.ts";
import type { MotorArquivoEntrada } from "../types/motorTypes.ts";

function parseArgs(argv: string[]): MotorArquivoEntrada & { help?: boolean } {
  const args: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
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
      tipo: "grupo_ruptura_1",
      regional: "",
      dataReferencia: "",
      dryRun: true,
      help: true,
    };
  }

  const file = String(args.file ?? "");
  const tipo = String(args.tipo ?? "");
  const regional = String(args.regional ?? "NORDESTE");
  const data = String(args.data ?? new Date().toISOString().slice(0, 10));
  const limitRaw = args.limit;
  const limit = limitRaw != null ? Number(limitRaw) : undefined;
  const output = args.output != null ? String(args.output) : undefined;

  if (!file || !tipo) {
    throw new MotorParseError(
      "Uso: motor:parse --file <caminho> --tipo <tipo> [--regional X] [--data YYYY-MM-DD] [--limit N] [--dry-run] [--output arquivo.jsonl]",
      "ARGS_INVALIDOS",
    );
  }

  if (!isMotorTipoArquivo(tipo)) {
    throw new MotorParseError(`Tipo inválido: ${tipo}`, "TIPO_INVALIDO");
  }

  return {
    caminho: file,
    tipo,
    regional,
    dataReferencia: data,
    limiteLinhas: Number.isFinite(limit) ? limit : undefined,
    dryRun: args.dryRun === true,
    outputPath: output,
  };
}

function printHelp(): void {
  console.log(`Motor Operacional V7 — Parser CLI (Fase 2A)

Uso:
  npm run motor:parse -- --file <caminho> --tipo <tipo> [opções]

Tipos:
  grupo_ruptura_1   1º Grupo de Ruptura (TXT 57 cols)
  grupo_cds_2       2º Grupo de CDs (TXT 57 cols → CD5)
  inventario_lojas  Inventário de Lojas (TXT dinâmico)
  validacao_ruptura Validação Ruptura (XLSX)

Opções:
  --regional <nome>   Regional (padrão: NORDESTE)
  --data <YYYY-MM-DD> Data de referência
  --limit <N>         Limitar linhas processadas
  --dry-run           Não gravar saída temporária
  --output <arquivo>  Gravar JSONL em src/motor/.tmp/
`);
}

export async function runMotorParseCli(argv: string[]): Promise<number> {
  try {
    const entrada = parseArgs(argv);

    if (entrada.help) {
      printHelp();
      return 0;
    }

    const resultado = await executarMotorParse(entrada);

    console.log(`[motor] tipo=${resultado.tipo} regional=${resultado.regional} data=${resultado.dataReferencia}`);
    console.log(
      `[motor] linhas=${resultado.metricas.linhasLidas} validas=${resultado.metricas.linhasValidas} invalidas=${resultado.metricas.linhasInvalidas}`,
    );
    console.log(
      `[motor] duracao=${resultado.metricas.duracaoMs}ms throughput=${resultado.metricas.linhasPorSegundo} linhas/s`,
    );
    console.log(`[motor] itens=${resultado.itens.length} erros=${resultado.erros.length} alertas=${resultado.alertas.length}`);

    if (entrada.dryRun) {
      console.log("[motor] dry-run: nenhuma saída temporária gerada");
    } else if (entrada.outputPath) {
      console.log(`[motor] saída gravada: ${entrada.outputPath}`);
    }

    return 0;
  } catch (error) {
    if (error instanceof MotorParseError) {
      console.error(`[motor] erro: ${error.message}`);
      return 1;
    }
    console.error(`[motor] falha inesperada: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("motor/cli/motorParseCli.ts");
if (isDirectRun) {
  const code = await runMotorParseCli(process.argv.slice(2));
  process.exit(code);
}
