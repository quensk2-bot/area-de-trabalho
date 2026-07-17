import fs from "fs";
import path from "path";
import readline from "readline";
import { loadCatalogos } from "../catalog/catalogService.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import {
  buildCdMapping,
  buildV7CdContexto,
  compararCampoCd,
  resolverBandeiraLoja,
  type MotorCdConfiguracaoVigente,
} from "../compare/cdNormalization/index.ts";
import { CAMPOS_PILOTO_COMPARE, mapConsolidadoParaCompare } from "../compare/mapConsolidadoParaCompare.ts";
import { calcularParidadeChaves } from "../compare/keyParityGate.ts";
import { investigarDivergenciasReais, resumirInvestigacaoReais } from "../compare/investigateRealDivergences.ts";
import { reclassificarComparacaoCampo, resumirReclassificacao } from "../compare/reclassifyDivergence.ts";
import type { MotorDivergenciaReclassificada, MotorDivergenciaRealDetalhe } from "../compare/cdNormalization/cdNormalizationTypes.ts";
import { defaultPilotOutputDir, resolvePilotFilePaths } from "../pilot/pilotFilePaths.ts";
import { indexarExcelPorChave, lerExcelRegionalLoja } from "../pilot/pilotExcelReader.ts";

export type RevalidacaoOpcoes = {
  regional: string;
  loja: number;
  dataReferencia: string;
  consolidadoPath?: string;
  outputDir?: string;
};

export type RevalidacaoResultado = {
  paridade: ReturnType<typeof calcularParidadeChaves>;
  cdConfig: MotorCdConfiguracaoVigente;
  divergencias: MotorDivergenciaReclassificada[];
  divergenciasReais: MotorDivergenciaRealDetalhe[];
  resumoClassificacao: Record<string, number>;
  metricas: Record<string, unknown>;
};

const CAMPOS_CD = new Set(["Produto Centralizado", "Status Estoque CDs", "Status Solicitação Ativação CD"]);

async function loadJsonl<T>(filePath: string): Promise<T[]> {
  const items: T[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, "utf8") });
  for await (const line of rl) {
    if (line.trim()) items.push(JSON.parse(line) as T);
  }
  return items;
}

function writeCsv(filePath: string, header: string[], rows: Record<string, unknown>[]): void {
  const lines = [header.join(";")];
  for (const row of rows) {
    lines.push(header.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(";"));
  }
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

export async function executarRevalidacao(opcoes: RevalidacaoOpcoes): Promise<RevalidacaoResultado> {
  const paths = resolvePilotFilePaths(opcoes.regional, opcoes.dataReferencia);
  const pilotoDir = defaultPilotOutputDir(opcoes.regional, opcoes.dataReferencia, opcoes.loja);
  const consolidadoPath = opcoes.consolidadoPath ?? path.join(pilotoDir, "consolidado_loja_73.jsonl");
  const outputDir = opcoes.outputDir ?? path.join(pilotoDir, "revalidacao");

  if (!fs.existsSync(consolidadoPath)) {
    throw new Error(`Consolidado ausente: ${consolidadoPath}. Execute o piloto 2E.2 primeiro.`);
  }

  const consolidado = await loadJsonl<MotorProdutoLojaConsolidado>(consolidadoPath);
  const excelData = lerExcelRegionalLoja(paths.excelRegional, opcoes.loja);
  const excelIndex = indexarExcelPorChave(excelData.linhas);

  const catalog = loadCatalogos({
    regional: opcoes.regional,
    dataReferencia: opcoes.dataReferencia,
    rede: paths.rede,
    ordemCdsPadrao: paths.ordemCdsPadrao,
    compradores: paths.compradoresPadrao,
    bandeiraCsv: paths.bandeiraCsv,
  });

  const bandeiraLoja = resolverBandeiraLoja(opcoes.loja, catalog.catalogos.bandeira);
  const bandeira = bandeiraLoja?.bandeira ?? "Comper MT";

  const cdConfig = buildCdMapping({
    regional: opcoes.regional,
    bandeira,
    dataReferencia: opcoes.dataReferencia,
    ordemCds: catalog.catalogos.ordemCd,
    sequenciaCds: catalog.catalogos.sequenciaCd,
  });

  const paridade = calcularParidadeChaves({
    regional: opcoes.regional,
    loja: opcoes.loja,
    dataReferencia: opcoes.dataReferencia,
    excelDataExport: excelData.fonte.dataExportacao,
    v7Produtos: consolidado.map((c) => ({ loja: c.loja, seqproduto: c.seqproduto })),
    excelProdutos: excelData.linhas.map((r) => ({ loja: r.LOJA, seqproduto: r.SEQPRODUTO })),
  });

  const colunasExcel = new Set(excelData.fonte.camposPresentes);
  const consolidadoMap = new Map(consolidado.map((c) => [`${c.loja}|${c.seqproduto}`, c]));
  const divergencias: MotorDivergenciaReclassificada[] = [];

  let comparacoesCampo = 0;
  let iguaisExactSemantic = 0;

  for (const chave of paridade.chavesIntersecao) {
    const item = consolidadoMap.get(chave);
    const excelRow = excelIndex.get(chave);
    if (!item || !excelRow) continue;

    const v7Flat = mapConsolidadoParaCompare(item);
    const v7Cd = buildV7CdContexto(item);

    for (const cfg of CAMPOS_PILOTO_COMPARE) {
      comparacoesCampo++;
      const valorExcel = (excelRow as Record<string, unknown>)[cfg.campo] as string | number | boolean | null ?? null;
      const valorV7 = v7Flat[cfg.campo] ?? null;

      const resultadoCd = CAMPOS_CD.has(cfg.campo)
        ? compararCampoCd(
            cfg.campo,
            cdConfig,
            typeof valorExcel === "string" ? valorExcel : valorExcel != null ? String(valorExcel) : null,
            v7Cd,
          )
        : undefined;

      if (resultadoCd && (resultadoCd.estado === "igual_exato" || resultadoCd.estado === "igual_semantico")) {
        iguaisExactSemantic++;
        continue;
      }

      if (
        !resultadoCd &&
        (valorExcel === valorV7 ||
          String(valorExcel ?? "").trim().toLowerCase() === String(valorV7 ?? "").trim().toLowerCase())
      ) {
        iguaisExactSemantic++;
        continue;
      }

      const div = reclassificarComparacaoCampo({
        loja: item.loja,
        seqproduto: item.seqproduto,
        descricao: item.descricao,
        fornecedor: item.fornecedor,
        campo: cfg.campo,
        valorExcel,
        valorV7,
        toleranciaDecimal: cfg.toleranciaDecimal,
        colunasExcelPresentes: colunasExcel,
        resultadoCd,
      });

      if (div) divergencias.push(div);
    }
  }

  const divergenciasReais = investigarDivergenciasReais(divergencias, excelData.fonte.arquivo);
  const resumoClassificacao = resumirReclassificacao(divergencias);
  const criticas = divergencias.filter((d) => d.severidade === "critica");
  const resolvidas = divergencias.filter((d) =>
    ["igual_semantico", "formato", "dado_ausente_excel", "coluna_excel_intermediaria", "cadastro_cd_ausente"].includes(
      d.classificacao,
    ),
  );

  const metricas = {
    fase: "2E.3",
    regional: opcoes.regional,
    loja: opcoes.loja,
    dataReferencia: opcoes.dataReferencia,
    bandeira,
    comparacoesCampo,
    iguaisExactSemantic,
    totalDivergencias: divergencias.length,
    criticas: criticas.length,
    informativas: divergencias.length - criticas.length,
    resumoClassificacao,
    investigacaoReais: resumirInvestigacaoReais(divergenciasReais),
    paridade,
    cdConfigResumo: {
      origem: cdConfig.origem,
      vigenciaStatus: cdConfig.vigenciaStatus,
      alertas: cdConfig.alertas,
      porPosicao: cdConfig.porPosicao,
    },
    revalidacaoVsPiloto: {
      criticasOriginaisEstimadas: 674,
      criticasPosNormalizador: criticas.length,
      resolvidasEstimadas: Math.max(0, 674 - criticas.length),
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "paridade_chaves.json"), JSON.stringify(paridade, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outputDir, "cd_mapping.json"),
    JSON.stringify(
      {
        ...cdConfig,
        porCodigo: Object.fromEntries(cdConfig.porCodigo),
      },
      null,
      2,
    ),
    "utf8",
  );
  fs.writeFileSync(path.join(outputDir, "metricas_revalidacao.json"), JSON.stringify(metricas, null, 2), "utf8");

  writeCsv(
    path.join(outputDir, "divergencias_reclassificadas.csv"),
    ["loja", "seqproduto", "campo", "valorExcel", "valorV7", "classificacao", "severidade", "estadoCd", "observacao"],
    divergencias as unknown as Record<string, unknown>[],
  );

  writeCsv(
    path.join(outputDir, "divergencias_reais.csv"),
    [
      "loja",
      "seqproduto",
      "campo",
      "valorExcel",
      "valorV7",
      "classificacao",
      "categoriaInvestigacao",
      "hipotese",
      "conclusao",
      "correcaoEm",
      "statusInvestigacao",
    ],
    divergenciasReais as unknown as Record<string, unknown>[],
  );

  const resolvidasRows = divergencias.filter((d) => d.severidade !== "critica");
  writeCsv(
    path.join(outputDir, "divergencias_resolvidas.csv"),
    ["loja", "seqproduto", "campo", "classificacao", "severidade", "observacao"],
    resolvidasRows as unknown as Record<string, unknown>[],
  );

  const resumo = [
    `Revalidação 2E.3 — MT Loja ${opcoes.loja}`,
    `Data referência: ${opcoes.dataReferencia}`,
    `Bandeira: ${bandeira}`,
    `V7: ${paridade.v7Total} | Excel: ${paridade.excelTotal} | Interseção: ${paridade.intersecao}`,
    `Somente V7: ${paridade.somenteV7} | Somente Excel: ${paridade.somenteExcel}`,
    `Mapeamento CD: ${JSON.stringify(cdConfig.porPosicao)}`,
    `Vigência: ${cdConfig.vigenciaStatus} (${cdConfig.alertas.join(", ")})`,
    `Comparações campo (interseção): ${comparacoesCampo}`,
    `Divergências totais: ${divergencias.length} | Críticas: ${criticas.length}`,
    `Decisão: ${criticas.length === 0 && paridade.somenteV7 === 0 ? "APROVADO" : criticas.length <= 50 ? "APROVADO COM RESSALVAS" : "BLOQUEADO"}`,
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "resumo_revalidacao.txt"), resumo, "utf8");

  return { paridade, cdConfig, divergencias, divergenciasReais, resumoClassificacao, metricas };
}
