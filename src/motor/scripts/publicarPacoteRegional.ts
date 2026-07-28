/**
 * Publica JSONs de todas as lojas de uma combinação regional+bandeira + dashboards regionais.
 * Uso: npm run motor:publicar-regional -- --regional MT --bandeira COMPER --versao 4 [--data-referencia 2026-07-13] [--dry-run]
 *
 * A lista de lojas é resolvida dinamicamente do catálogo oficial (app_v7.lojas).
 * Nenhuma loja fixa no código.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { gerarArtefatosHibridos } from "../export/hibrido/gerarManifestHibrido.ts";
import { validarArtefatosHibridos } from "../export/hibrido/validarArtefatosHibridos.ts";
import { createServiceRoleClient, publicarStoragePrivado } from "../export/hibrido/publicarStoragePrivado.ts";
import { registrarPacoteLeve } from "../export/hibrido/registrarPacoteLeve.ts";
import { competenciaFromDataReferencia } from "../../hibrido-v7/manifest/manifestPaths.ts";
import { resolveLojasFromBandeiraCsv, validarListaLojas } from "../catalog/resolverLojas.ts";
function parseArgv(): {
  regional: string;
  bandeira: string;
  versao: number;
  dataReferencia: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let regional = "";
  let bandeira = "";
  let versao = 0;
  let dataReferencia = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--regional") {
      regional = args[++i]?.trim().toUpperCase() ?? "";
    } else if (args[i] === "--bandeira") {
      bandeira = args[++i]?.trim().toUpperCase() ?? "";
    } else if (args[i] === "--versao") {
      const val = args[++i];
      if (!val || !/^\d+$/.test(val)) {
        console.error("ERRO: --versao requer um número inteiro positivo.");
        process.exit(1);
      }
      versao = Number.parseInt(val, 10);
    } else if (args[i] === "--data-referencia") {
      dataReferencia = args[++i]?.trim() ?? "";
    }
  }

  if (!regional) {
    console.error("ERRO: --regional é obrigatório. Use: --regional MT");
    process.exit(1);
  }
  if (!bandeira) {
    console.error("ERRO: --bandeira é obrigatório. Use: --bandeira COMPER");
    process.exit(1);
  }
  if (versao < 1) {
    console.error("ERRO: --versao é obrigatório. Use: --versao 4");
    process.exit(1);
  }
  if (!dataReferencia) {
    console.error("ERRO: --data-referencia é obrigatório. Use: --data-referencia 2026-07-13");
    process.exit(1);
  }

  return { regional, bandeira, versao, dataReferencia, dryRun };
}

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

function listarLojasDosConsolidados(consolidadoDir: string): number[] {
  if (!fs.existsSync(consolidadoDir)) return [];
  return fs
    .readdirSync(consolidadoDir)
    .filter((name) => name.startsWith("consolidado_loja_") && name.endsWith(".jsonl"))
    .map((name) => {
      const match = name.match(/consolidado_loja_(\d+)\.jsonl/);
      return match ? Number.parseInt(match[1]!, 10) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
}

async function resolverLojasPublicacao(
  consolidadoDir: string,
  regional: string,
  bandeira: string,
  dataReferencia: string,
): Promise<number[]> {
  // Resolve lojas do catálogo bandeira.csv (CLI, sem Supabase)
  const lojas = await resolveLojasFromBandeiraCsv(regional, bandeira, dataReferencia);

  if (lojas.length === 0) {
    // Fallback: deriva do nome dos arquivos consolidados
    const fallback = listarLojasDosConsolidados(consolidadoDir);
    if (fallback.length === 0) return [];
    console.log(`   ⚠️  bandeira.csv sem filtro para ${regional}/${bandeira}. Usando ${fallback.length} loja(s) dos consolidados.`);
    return fallback;
  }

  const v = validarListaLojas(lojas);
  if (!v.ok) {
    console.error(`❌ Catálogo inválido:`);
    for (const e of v.erros) console.error(`   - ${e}`);
    process.exit(1);
  }

  return lojas;
}

async function main(): Promise<void> {
  const { regional, bandeira, versao, dataReferencia, dryRun } = parseArgv();
  const competencia = competenciaFromDataReferencia(dataReferencia);

  const consolidadoDir = path.join(
    process.cwd(),
    "src",
    "motor",
    ".tmp",
    "hibrido",
    regional,
    bandeira,
    "consolidados",
  );

  console.log(`\n🚀 Publicação versão ${versao}${dryRun ? " (dry-run)" : ""}`);
  console.log(`   Regional: ${regional}`);
  console.log(`   Bandeira: ${bandeira}`);
  console.log(`   Competência: ${competencia}`);
  console.log(`   Data referência: ${dataReferencia}`);
  console.log(`   Consolidados em: ${consolidadoDir}\n`);

  // 1. Resolver lojas do catálogo bandeira.csv
  const lojasEsperadas = await resolverLojasPublicacao(consolidadoDir, regional, bandeira, dataReferencia);
  if (lojasEsperadas.length === 0) {
    console.error(`❌ Nenhuma loja encontrada para ${regional}/${bandeira}.`);
    console.error(`   Verifique o bandeira.csv ou os consolidados em: ${consolidadoDir}`);
    process.exit(1);
  }

  console.log(`📋 Catálogo (bandeira.csv): ${lojasEsperadas.length} loja(s)`);
  console.log(`   Lojas: ${lojasEsperadas.join(", ")}`);

  // 2. Listar consolidados disponíveis
  const lojasConsolidado = listarLojasDosConsolidados(consolidadoDir);
  console.log(`📁 Consolidados encontrados: ${lojasConsolidado.length} loja(s)`);

  const setEsperadas = new Set(lojasEsperadas);
  const setConsolidado = new Set(lojasConsolidado);

  const faltantes = lojasEsperadas.filter((l) => !setConsolidado.has(l));
  const extras = lojasConsolidado.filter((l) => !setEsperadas.has(l));
  const extrasComDetalhes = extras.map((l) => {
    // Verifica se o consolidado pertence a outra regional/bandeira
    const p = path.join(consolidadoDir, `consolidado_loja_${l}.jsonl`);
    try {
      const itens = fs.readFileSync(p, "utf8").trim().split("\n").slice(0, 3);
      for (const line of itens) {
        const obj = JSON.parse(line);
        if (obj.regional && obj.regional !== regional) {
          return `${l} (regional=\"${obj.regional}\", esperado=\"${regional}\")`;
        }
        if (obj.bandeira && obj.bandeira !== bandeira) {
          return `${l} (bandeira=\"${obj.bandeira}\", esperado=\"${bandeira}\")`;
        }
      }
      return `${l}`;
    } catch {
      return `${l}`;
    }
  });
  const duplicatas = lojasConsolidado.filter(
    (l, idx) => lojasConsolidado.indexOf(l) !== idx,
  );

  if (extras.length > 0) {
    console.error(`❌ ABORTADO: ${extras.length} loja(s) com consolidado mas AUSENTE no catálogo:`);
    for (const e of extrasComDetalhes) console.error(`   - ${e}`);
    console.error(`   Remova os consolidados extras ou atualize o catálogo.`);
    process.exit(1);
  }

  if (duplicatas.length > 0) {
    console.error(`❌ ABORTADO: ${duplicatas.length} loja(s) com consolidado duplicado: ${duplicatas.join(", ")}`);
    process.exit(1);
  }

  // 3. Carregar consolidados
  const itensPorLoja: Record<number, MotorProdutoLojaConsolidado[]> = {};
  const lojasPublicadas: number[] = [];

  for (const loja of lojasEsperadas) {
    const p = path.join(consolidadoDir, `consolidado_loja_${loja}.jsonl`);
    if (!fs.existsSync(p)) {
      console.error(`❌ Consolidado AUSENTE loja ${loja}: ${p}`);
      continue;
    }
    const itens = await loadJsonl(p);
    const filtrados = itens.filter((i) => i.loja === loja && i.regional === regional);

    // Validar que a dataReferencia do consolidado corresponde à CLI
    if (dataReferencia && filtrados.length > 0) {
      const refConsolidado = filtrados[0]!.dataReferencia ?? filtrados[0]!.competencia;
      if (refConsolidado && refConsolidado !== dataReferencia) {
        console.error(`❌ Loja ${loja}: dataReferencia do consolidado ("${refConsolidado}") diverge da CLI ("${dataReferencia}").`);
        process.exit(1);
      }
    }

    itensPorLoja[loja] = filtrados;
    lojasPublicadas.push(loja);

    if (filtrados.length === 0) {
      console.error(`❌ Loja ${loja}: 0 produtos após filtro regional — abortando.`);
      process.exit(1);
    }
    console.log(`   ✅ Loja ${loja}: ${filtrados.length} produtos`);
  }

  // 4. Abortar se faltar qualquer loja
  const lojasFaltantes = lojasEsperadas.filter((l) => !lojasPublicadas.includes(l));
  if (lojasFaltantes.length > 0) {
    console.error(
      `\n❌ ABORTADO: ${lojasFaltantes.length} loja(s) sem consolidado: ${lojasFaltantes.join(", ")}`,
    );
    console.error(`   Publicação: ${lojasPublicadas.length}/${lojasEsperadas.length}`);
    console.error(`   Publique novamente após gerar os consolidados faltantes.`);
    process.exit(1);
  }

  console.log(
    `\n📦 Gerando artefatos para ${lojasPublicadas.length}/${lojasEsperadas.length} lojas...`,
  );

  // 5. Gerar artefatos
  const pub = gerarArtefatosHibridos({
    regional,
    bandeira,
    competencia,
    dataReferencia,
    versao,
    lojas: lojasPublicadas,
    itensPorLoja,
  });

  // 6. Validar artefatos
  console.log(`🔍 Validando ${pub.artefatos.length} artefatos...`);
  const validacao = validarArtefatosHibridos(pub.artefatos);
  if (!validacao.ok) {
    console.error("❌ Validação falhou:", validacao.erros.join("; "));
    process.exit(1);
  }

  const vazios = pub.artefatos.filter((a) => a.bytes === 0);
  if (vazios.length > 0) {
    console.error(`❌ ABORTADO: ${vazios.length} artefato(s) vazio(s):`);
    for (const v of vazios) console.error(`   - ${v.path}`);
    process.exit(1);
  }

  console.log(`\n📋 Resumo dos artefatos:`);
  console.log(`   Total: ${pub.artefatos.length}`);
  console.log(`   Lojas: ${lojasPublicadas.length}/${lojasEsperadas.length}`);
  console.log(`   Versão ${versao} — paths com prefixo /v${versao}/`);

  for (const a of pub.artefatos) {
    const label = a.path.includes("manifest")
      ? "📄"
      : a.path.includes("dashboard")
        ? "📊"
        : a.path.includes("resumo")
          ? "📈"
          : a.path.includes("gestao")
            ? "📋"
            : a.path.includes("cds")
              ? "💿"
              : "  ";
    console.log(`   ${label} ${a.path}: ${(a.bytes / 1024).toFixed(1)} KB`);
  }

  if (dryRun) {
    console.log("\n✅ Dry-run concluído — nenhum upload realizado.");
    console.log(`   Paths da versão ${versao} não conflitam com versão anterior.`);
    console.log(`   Para publicar, execute sem --dry-run.`);
    return;
  }

  // 7. Publicação real
  console.log(`\n☁️  Enviando ${pub.artefatos.length} artefatos para o Storage...`);
  const supabase = createServiceRoleClient();
  const bucket = "ruptura-v7";

  const upload = await publicarStoragePrivado({ supabase, artefatos: pub.artefatos, upsert: false });
  if (!upload.ok) {
    console.error("❌ Upload falhou:");
    for (const e of upload.erros) console.error(`   - ${e}`);
    console.error(`   Uploads bem-sucedidos: ${upload.paths.length}/${pub.artefatos.length}`);
    console.error(`   A versão anterior continua ativa — execute rollback manual se necessário.`);
    process.exit(1);
  }

  console.log(`   ✅ Upload concluído: ${upload.paths.length} arquivos`);

  // 8. Ativação: cria ativo.json
  const manifest = pub.artefatos.find((a) => a.path.endsWith("/manifest.json"))?.json as
    | (Record<string, unknown> & { hashConteudo: string })
    | undefined;

  if (manifest?.hashConteudo) {
    const manifestPath = pub.artefatos.find((a) => a.path.endsWith("/manifest.json"))!.path;
    const ativoJson = {
      versao,
      manifestEm: manifestPath,
      ativadoEm: new Date().toISOString(),
    };
    const ativoBody = JSON.stringify(ativoJson);
    const { error: ativoError } = await supabase.storage.from(bucket).upload(
      `${regional}/${bandeira}/${competencia}/ativo.json`,
      ativoBody,
      { contentType: "application/json", upsert: true },
    );

    if (ativoError) {
      console.error(`❌ Falha ao criar ativo.json: ${ativoError.message}`);
      console.error(`   Os arquivos da versão ${versao} estão no Storage mas NÃO foram ativados.`);
      console.error(`   Para ativar manualmente, faça upload do ativo.json apontando para:\n     ${manifestPath}`);
      console.error(`   A versão anterior permanece ativa no Storage.`);
      process.exit(1);
    }

    console.log(`   ✅ ativo.json → versão ${versao} ativada`);
    console.log(`   📍 Manifesto em: ${manifestPath}`);

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
    if (reg.ok) {
      console.log(`   ✅ Pacote registrado: ${reg.pacoteId}`);
      console.log(`\n🎉 Versão ${versao} publicada e ativada com sucesso!`);
    } else {
      console.warn(`   ⚠️  Registro do pacote falhou: ${reg.erro}`);
      console.warn(`   Os arquivos estão no Storage e o ativo.json foi criado, mas o pacote não foi registrado no banco.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
