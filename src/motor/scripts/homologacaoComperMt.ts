/**
 * Homologação agregada MT/COMPER — Excel regional v23.3 × V7 consolidados.
 * Classifica divergências na interseção válida de chaves (loja|seqproduto).
 */
import fs from "node:fs";
import path from "node:path";
import { CAMPOS_AUSENTES_V7 } from "../export/baseRuptura/baseRupturaColumns.ts";
import { executarRevalidacao } from "../pilot/revalidationRunner.ts";

const LOJAS = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
const CONSOLIDADO_DIR = path.join(process.cwd(), "src", "motor", ".tmp", "hibrido", "MT", "COMPER", "consolidados");
const OUT_TMP = path.join(process.cwd(), "src", "motor", ".tmp", "hibrido", "MT", "COMPER", "homologacao_comper_mt.json");
const OUT_ARCH = path.join(process.cwd(), "architecture", "hibrido-v7", "homologacao_comper_mt.json");

const RESSALVA_OFICIAL =
  "O V7 processa o universo integral dos arquivos TXT. A planilha oficial Excel pode apresentar quantidade menor de produtos por filtros, Base Limpa e materializações do Power Query. As comparações de regras devem considerar a interseção válida de chaves.";

function resolveExcelRegionalOficial(): string {
  const base = "C:\\area-de-trabalho-v7\\importar\\RUPTURA";
  const match = fs.readdirSync(base).find(
    (name) => name.startsWith("Ruptura por Regional") && !name.startsWith("~$") && name.endsWith(".xlsx"),
  );
  if (!match) throw new Error("Workbook regional v23.3 não encontrado");
  return path.join(base, match);
}

async function main(): Promise<void> {
  const excelPath = resolveExcelRegionalOficial();
  const porLoja: Record<string, unknown>[] = [];

  let intersecaoTotal = 0;
  let somenteV7Total = 0;
  let somenteExcelTotal = 0;
  let criticasNovasTotal = 0;
  let criticasJustificadasTotal = 0;
  let informativasTotal = 0;
  let cdEstruturaisTotal = 0;

  const resumoClassificacaoAgregado: Record<string, number> = {};

  for (const loja of LOJAS) {
    const consolidadoPath = path.join(CONSOLIDADO_DIR, `consolidado_loja_${loja}.jsonl`);
    if (!fs.existsSync(consolidadoPath)) {
      throw new Error(`Consolidado ausente loja ${loja}: ${consolidadoPath}`);
    }

    const rev = await executarRevalidacao({
      regional: "MT",
      loja,
      dataReferencia: "2026-07-13",
      consolidadoPath,
      excelPath,
    });

    intersecaoTotal += rev.paridade.intersecao;
    somenteV7Total += rev.paridade.somenteV7;
    somenteExcelTotal += rev.paridade.somenteExcel;
    cdEstruturaisTotal += rev.metricas.divergenciasCdEstruturais as number;

    const criticas = rev.divergencias.filter((d) => d.severidade === "critica");
    const criticasNovas = criticas.filter((d) => !["comprador", "bre", "join"].includes(d.classificacao));
    const criticasJustificadas = criticas.filter((d) => ["comprador", "bre", "join"].includes(d.classificacao));
    const informativas = rev.divergencias.filter((d) => d.severidade === "informativa");
    const cdEstruturais = rev.metricas.divergenciasCdEstruturais as number;

    const decisaoLoja =
      cdEstruturais > 0 || criticasNovas.length > 0 || rev.paridade.somenteExcel > 0
        ? "BLOQUEADO"
        : criticasJustificadas.length > 0 || rev.paridade.somenteV7 > 0
          ? "APROVADO COM RESSALVAS"
          : "APROVADO";

    criticasNovasTotal += criticasNovas.length;
    criticasJustificadasTotal += criticasJustificadas.length;
    informativasTotal += informativas.length;

    for (const [k, v] of Object.entries(rev.resumoClassificacao)) {
      resumoClassificacaoAgregado[k] = (resumoClassificacaoAgregado[k] ?? 0) + v;
    }

    porLoja.push({
      loja,
      decisao: decisaoLoja,
      paridade: {
        v7Total: rev.paridade.v7Total,
        excelTotal: rev.paridade.excelTotal,
        intersecao: rev.paridade.intersecao,
        somenteV7: rev.paridade.somenteV7,
        somenteExcel: rev.paridade.somenteExcel,
      },
      divergencias: {
        criticasNovas: criticasNovas.length,
        criticasJustificadas: criticasJustificadas.length,
        informativas: informativas.length,
        cdEstruturais: rev.metricas.divergenciasCdEstruturais,
        resumoClassificacao: rev.resumoClassificacao,
      },
    });

    console.log(
      `[homologacao] Loja ${loja}: interseção=${rev.paridade.intersecao}, só V7=${rev.paridade.somenteV7}, ` +
        `críticas novas=${criticasNovas.length}, justificadas=${criticasJustificadas.length}, decisão=${decisaoLoja}`,
    );
  }

  const classificacao = {
    divergenciasCriticasNovas: criticasNovasTotal,
    divergenciasJustificadas: criticasJustificadasTotal,
    divergenciasInformativas: informativasTotal,
    camposAusentesV7: CAMPOS_AUSENTES_V7,
    produtosSomenteV7: somenteV7Total,
    produtosSomenteExcel: somenteExcelTotal,
    intersecao: intersecaoTotal,
    cdsEstruturais: cdEstruturaisTotal,
    resumoClassificacao: resumoClassificacaoAgregado,
  };

  const criterios = {
    criticasNovasZero: criticasNovasTotal === 0,
    cdsEstruturaisZero: cdEstruturaisTotal === 0,
    somenteExcelZero: somenteExcelTotal === 0,
    universoDocumentado: somenteV7Total > 0,
  };

  const gateAprovado =
    criterios.criticasNovasZero && criterios.cdsEstruturaisZero && criterios.somenteExcelZero;

  const out = {
    escopo: { regional: "MT", bandeira: "COMPER", lojas: LOJAS.length, dataReferencia: "2026-07-13" },
    ressalvaOficial: RESSALVA_OFICIAL,
    excelPath: path.basename(excelPath),
    classificacao,
    criterios,
    decisao: gateAprovado ? "APROVADO COM RESSALVAS" : "BLOQUEADO",
    porLoja,
    geradoEm: new Date().toISOString(),
  };

  const json = JSON.stringify(out, null, 2);
  fs.mkdirSync(path.dirname(OUT_ARCH), { recursive: true });
  fs.writeFileSync(OUT_TMP, json, "utf8");
  fs.writeFileSync(OUT_ARCH, json, "utf8");

  console.log(JSON.stringify({ classificacao, criterios, decisao: out.decisao }, null, 2));
  if (!gateAprovado) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
