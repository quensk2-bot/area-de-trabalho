/**
 * Publica JSONs das 15 lojas Comper MT + dashboards regionais.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { HIBRIDO_PILOTO } from "../../hibrido-v7/constants.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { gerarArtefatosHibridos } from "../export/hibrido/gerarManifestHibrido.ts";
import { validarArtefatosHibridos } from "../export/hibrido/validarArtefatosHibridos.ts";
import { createServiceRoleClient, publicarStoragePrivado } from "../export/hibrido/publicarStoragePrivado.ts";
import { registrarPacoteLeve } from "../export/hibrido/registrarPacoteLeve.ts";

const LOJAS = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
const CONSOLIDADO_DIR = path.join(process.cwd(), "src", "motor", ".tmp", "hibrido", "MT", "COMPER", "consolidados");

async function loadJsonl(filePath: string): Promise<MotorProdutoLojaConsolidado[]> {
  const itens: MotorProdutoLojaConsolidado[] = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    itens.push(JSON.parse(trimmed) as MotorProdutoLojaConsolidado);
  }
  return itens;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const itensPorLoja: Record<number, MotorProdutoLojaConsolidado[]> = {};
  const lojasPublicadas: number[] = [];

  for (const loja of LOJAS) {
    const p = path.join(CONSOLIDADO_DIR, `consolidado_loja_${loja}.jsonl`);
    if (!fs.existsSync(p)) {
      console.warn(`Consolidado ausente loja ${loja}: ${p}`);
      continue;
    }
    const itens = await loadJsonl(p);
    itensPorLoja[loja] = itens.filter((i) => i.loja === loja && i.regional === HIBRIDO_PILOTO.regional);
    lojasPublicadas.push(loja);
    console.log(`Loja ${loja}: ${itensPorLoja[loja]!.length} produtos`);
  }

  const pub = gerarArtefatosHibridos({
    regional: HIBRIDO_PILOTO.regional,
    bandeira: HIBRIDO_PILOTO.bandeira,
    competencia: HIBRIDO_PILOTO.competencia,
    dataReferencia: HIBRIDO_PILOTO.dataReferencia,
    versao: 1,
    lojas: lojasPublicadas,
    itensPorLoja,
  });

  const validacao = validarArtefatosHibridos(pub.artefatos);
  if (!validacao.ok) {
    console.error("Validação falhou:", validacao.erros.join("; "));
    process.exit(1);
  }

  console.log(`Artefatos: ${pub.artefatos.length}, lojas: ${lojasPublicadas.length}/${LOJAS.length}`);
  for (const [p, bytes] of Object.entries(validacao.tamanhos)) {
    console.log(`  ${p}: ${bytes} B`);
  }

  if (dryRun) {
    console.log("Dry-run — sem upload.");
    return;
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
    const totalProdutos = Object.values(itensPorLoja).reduce((s, arr) => s + arr.length, 0);
    const totalCds = Object.values(itensPorLoja).reduce(
      (s, arr) => s + arr.reduce((c, p) => c + (p.cds?.length ?? 0), 0),
      0,
    );
    const reg = await registrarPacoteLeve({
      supabase,
      manifest: manifest as import("../../hibrido-v7/manifest/manifestTypes.ts").RupturaManifest,
      totalArquivos: pub.artefatos.length,
      totalProdutos,
      totalCds,
      status: "concluido",
    });
    console.log(reg.ok ? `Pacote registrado: ${reg.pacoteId}` : `Registro falhou: ${reg.erro}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
