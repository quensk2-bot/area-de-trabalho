/**
 * CLI Worker — publicação piloto H6 (local only).
 *
 * Uso:
 *   npx tsx src/motor/export/hibrido/publicarPilotoCli.ts
 *   npx tsx src/motor/export/hibrido/publicarPilotoCli.ts --consolidado ./path/consolidado_loja_73.jsonl
 *   npx tsx src/motor/export/hibrido/publicarPilotoCli.ts --dry-run
 *
 * Requer .env local (gitignored):
 *   SUPABASE_URL ou VITE_SUPABASE_URL → projeto híbrido
 *   SUPABASE_SERVICE_ROLE_KEY → sb_secret_...
 *
 * Não commitar JSON gerado. Saída vai direto ao Storage privado ruptura-v7.
 */
import "dotenv/config";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { HIBRIDO_PILOTO } from "../../../hibrido-v7/constants.ts";
import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import { gerarArtefatosHibridos } from "./gerarManifestHibrido.ts";
import { validarArtefatosHibridos } from "./validarArtefatosHibridos.ts";
import { createServiceRoleClient, publicarStoragePrivado } from "./publicarStoragePrivado.ts";
import { registrarPacoteLeve } from "./registrarPacoteLeve.ts";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function loadJsonl(path: string): Promise<MotorProdutoLojaConsolidado[]> {
  const itens: MotorProdutoLojaConsolidado[] = [];
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    itens.push(JSON.parse(trimmed) as MotorProdutoLojaConsolidado);
  }
  return itens;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === true;
  const regional = String(args.regional ?? HIBRIDO_PILOTO.regional);
  const bandeira = String(args.bandeira ?? HIBRIDO_PILOTO.bandeira);
  const loja = Number(args.loja ?? HIBRIDO_PILOTO.loja);
  const competencia = String(args.competencia ?? HIBRIDO_PILOTO.competencia);
  const dataReferencia = String(args["data-referencia"] ?? HIBRIDO_PILOTO.dataReferencia);
  const versao = Number(args.versao ?? "1");
  const consolidadoPath = typeof args.consolidado === "string" ? args.consolidado : undefined;

  let itens: MotorProdutoLojaConsolidado[] = [];
  if (consolidadoPath) {
    console.log(`Carregando consolidado: ${consolidadoPath}`);
    itens = await loadJsonl(consolidadoPath);
    itens = itens.filter((i) => i.loja === loja && i.regional === regional);
    console.log(`Itens filtrados loja ${loja}: ${itens.length}`);
  } else {
    console.log("Sem --consolidado: publicando estrutura piloto vazia (stub).");
  }

  const pub = gerarArtefatosHibridos({
    regional,
    bandeira,
    competencia,
    dataReferencia,
    versao,
    lojas: [loja],
    itensPorLoja: { [loja]: itens },
    baseXlsxDriveFileId: typeof args["xlsx-drive-id"] === "string" ? args["xlsx-drive-id"] : null,
    baseCsvDriveFileId: typeof args["csv-drive-id"] === "string" ? args["csv-drive-id"] : null,
  });

  const validacao = validarArtefatosHibridos(pub.artefatos);
  if (!validacao.ok) {
    console.error("Validação falhou:", validacao.erros.join("; "));
    process.exit(1);
  }

  console.log("Tamanhos (bytes):");
  for (const [path, bytes] of Object.entries(validacao.tamanhos)) {
    console.log(`  ${path}: ${bytes}`);
  }

  if (dryRun) {
    console.log("Dry-run — nenhum upload realizado.");
    process.exit(0);
  }

  const supabase = createServiceRoleClient();
  const upload = await publicarStoragePrivado({ supabase, artefatos: pub.artefatos, upsert: true });
  if (!upload.ok) {
    console.error("Upload falhou:", upload.erros.join("; "));
    process.exit(1);
  }
  console.log(`Upload OK: ${upload.paths.length} arquivos`);

  const manifest = pub.artefatos.find((a) => a.path.endsWith("/manifest.json"))?.json;
  if (manifest && typeof manifest === "object" && "hashConteudo" in manifest) {
    const reg = await registrarPacoteLeve({
      supabase,
      manifest: manifest as import("../../../hibrido-v7/manifest/manifestTypes.ts").RupturaManifest,
      totalArquivos: pub.artefatos.length,
      totalProdutos: pub.resumo.totalProdutos,
      totalCds: pub.cds.produtos.reduce((s, p) => s + p.cds.length, 0),
      status: "concluido",
    });
    if (!reg.ok) {
      console.warn("Registro pacote leve falhou:", reg.erro);
    } else {
      console.log(`Pacote registrado: ${reg.pacoteId}`);
    }
  }

  console.log("Publicação piloto concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
