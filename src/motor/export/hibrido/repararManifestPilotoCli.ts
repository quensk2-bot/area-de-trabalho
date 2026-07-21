/**
 * Repara manifest/resumo/dashboard sobrescritos (ex.: seed RLS) reutilizando gestao/cds no Storage.
 *
 * Uso:
 *   npx tsx src/motor/export/hibrido/repararManifestPilotoCli.ts
 *   npx tsx src/motor/export/hibrido/repararManifestPilotoCli.ts --dry-run
 */
import "dotenv/config";
import { HIBRIDO_PILOTO } from "../../../hibrido-v7/constants.ts";
import { buildManifest, computeHashConteudo } from "../../../hibrido-v7/manifest/manifestBuilder.ts";
import {
  dashboardLojasPath,
  dashboardRegionalPath,
  lojaCdsPath,
  lojaGestaoPath,
  lojaResumoPath,
  manifestFilePath,
} from "../../../hibrido-v7/manifest/manifestPaths.ts";
import type { CdsLojaJson, GestaoJson, RupturaManifest } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import { validarManifest } from "../../../hibrido-v7/manifest/manifestValidator.ts";
import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import { gerarResumoLoja, gerarResumoLojas, gerarResumoRegional } from "./gerarResumoLoja.ts";
import type { HibridoProdutoGestao, PublicacaoHibridaArtefato } from "./hibridoTypes.ts";
import { createServiceRoleClient, publicarStoragePrivado } from "./publicarStoragePrivado.ts";

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

function mapGestaoToConsolidado(produtos: HibridoProdutoGestao[], cds: CdsLojaJson): MotorProdutoLojaConsolidado[] {
  const cdsByProd = new Map(cds.produtos.map((p) => [p.seqproduto, p.cds]));
  return produtos.map((p) => ({
    loja: p.loja,
    seqproduto: p.seqproduto,
    descricao: p.descricao,
    codFornecedor: p.codFornecedor,
    fornecedor: p.razaoFornecedor,
    rede: p.rede,
    comprador: p.comprador,
    classificacaoPrazo: p.classificacaoPrazo,
    setorN2: p.setorN2,
    divisao: p.divisao,
    cds: (cdsByProd.get(p.seqproduto) ?? []).map((c) => ({
      posicaoLogica: c.posicaoLogica,
      codigoFisico: c.codigoFisico,
      estoque: c.estoque,
      pendencia: c.pendencia,
      statusCompra: c.statusCompra,
      diasCompra: c.diasCompra,
      diasRecebimento: c.diasRecebimento,
      flagCentralizacao: c.flagCentralizacao,
    })),
  })) as MotorProdutoLojaConsolidado[];
}

async function downloadJson<T>(path: string): Promise<T> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from("ruptura-v7").download(path);
  if (error || !data) throw new Error(`download ${path}: ${error?.message ?? "vazio"}`);
  return JSON.parse(await data.text()) as T;
}

async function loadGestaoProdutos(
  gestaoPath: string,
): Promise<{ meta: GestaoJson["meta"]; produtos: HibridoProdutoGestao[] }> {
  const gestao = await downloadJson<GestaoJson>(gestaoPath);
  if (!gestao.meta.chunked || !gestao.meta.chunkIndex) {
    return { meta: gestao.meta, produtos: gestao.produtos as HibridoProdutoGestao[] };
  }
  const lojaDir = gestaoPath.slice(0, gestaoPath.lastIndexOf("/") + 1);
  const produtos: HibridoProdutoGestao[] = [];
  for (const parte of gestao.meta.chunkIndex.partes) {
    const chunkPath = `${lojaDir}${parte.path}`;
    const chunk = await downloadJson<{ produtos: HibridoProdutoGestao[] }>(chunkPath);
    produtos.push(...chunk.produtos);
  }
  return { meta: gestao.meta, produtos };
}

export async function repararArtefatosPiloto(input?: {
  regional?: string;
  bandeira?: string;
  loja?: number;
  competencia?: string;
  dataReferencia?: string;
}): Promise<{ manifest: RupturaManifest; artefatos: PublicacaoHibridaArtefato[] }> {
  const regional = input?.regional ?? HIBRIDO_PILOTO.regional;
  const bandeira = input?.bandeira ?? HIBRIDO_PILOTO.bandeira;
  const loja = input?.loja ?? HIBRIDO_PILOTO.loja;
  const competencia = input?.competencia ?? HIBRIDO_PILOTO.competencia;
  const dataReferencia = input?.dataReferencia ?? HIBRIDO_PILOTO.dataReferencia;
  const scope = { regional, bandeira, competencia, loja };

  const [{ meta, produtos }, cds] = await Promise.all([
    loadGestaoProdutos(lojaGestaoPath(scope)),
    downloadJson<CdsLojaJson>(lojaCdsPath(scope)),
  ]);

  const itens = mapGestaoToConsolidado(produtos, cds);
  const resumo = gerarResumoLoja(itens, { regional, bandeira, loja, dataReferencia });
  const dashboardRegional = gerarResumoRegional([resumo], { ...scope, dataReferencia, versao: meta.versao });
  const dashboardLojas = gerarResumoLojas([resumo], scope);

  const conteudo = [
    { path: lojaResumoPath(scope), json: resumo },
    { path: dashboardRegionalPath(scope), json: dashboardRegional },
    { path: dashboardLojasPath(scope), json: dashboardLojas },
  ];

  const hashConteudo = computeHashConteudo(conteudo.map((a) => JSON.stringify(a.json)));
  const manifest = buildManifest({
    regional,
    bandeira,
    competencia,
    dataReferencia,
    versao: meta.versao,
    lojas: [loja],
    geradoEm: meta.geradoEm,
    hashConteudo,
  });

  const validated = validarManifest(manifest);
  if (!validated.ok) throw new Error(validated.erros.join("; "));

  const artefatos: PublicacaoHibridaArtefato[] = [
    { path: manifestFilePath(scope), json: manifest, bytes: Buffer.byteLength(JSON.stringify(manifest)) },
    ...conteudo.map((a) => ({
      path: a.path,
      json: a.json,
      bytes: Buffer.byteLength(JSON.stringify(a.json)),
    })),
  ];

  return { manifest, artefatos };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === true;

  const { manifest, artefatos } = await repararArtefatosPiloto();
  console.log(`Manifest versao ${manifest.versao}; lojas ${Object.keys(manifest.lojas).join(", ")}`);
  console.log("Artefatos a publicar:");
  for (const a of artefatos) console.log(`  ${a.path} (${a.bytes} bytes)`);

  if (dryRun) {
    console.log("Dry-run — nenhum upload.");
    return;
  }

  const supabase = createServiceRoleClient();
  const upload = await publicarStoragePrivado({ supabase, artefatos, upsert: true });
  if (!upload.ok) {
    console.error(upload.erros.join("; "));
    process.exit(1);
  }
  console.log("Reparo concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
