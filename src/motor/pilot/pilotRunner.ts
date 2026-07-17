import { processarBre } from "../bre/index.ts";
import { chaveLojaProduto } from "../bre/breContext.ts";
import { compararExcelV7 } from "../compare/compareExcelV7.ts";
import type { CompareRowInput } from "../compare/compareTypes.ts";
import {
  CAMPOS_PILOTO_COMPARE,
  mapConsolidadoParaCompare,
} from "../compare/mapConsolidadoParaCompare.ts";
import { loadCatalogos } from "../catalog/catalogService.ts";
import { consolidarLote } from "../consolidar/index.ts";
import { parseGrupoCds2 } from "../parsers/parseGrupoCds2.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { parseInventarioLojas } from "../parsers/parseInventarioLojas.ts";
import { parseValidacaoRuptura } from "../parsers/parseValidacaoRuptura.ts";
import { ColetorMemoriaAproximada } from "../parsers/streaming/streamingMetrics.ts";
import { transformGrupoCds2 } from "../transform/transformGrupoCds2.ts";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import { transformInventario } from "../transform/transformInventario.ts";
import type { MotorCd5Normalizado } from "../types/motorProdutoLojaNormalizado.ts";
import {
  assertPilotSourcesExist,
  defaultPilotOutputDir,
  resolvePilotFilePaths,
} from "./pilotFilePaths.ts";
import { indexarExcelPorChave, lerExcelRegionalLoja } from "./pilotExcelReader.ts";
import {
  classificarDivergencia,
  escreverSaidasPiloto,
  resumirQualidade,
  severidadeDivergencia,
} from "./pilotReport.ts";
import { selecionarAmostraEstratificada } from "./pilotSampleSelector.ts";
import {
  extrairSeqprodutosGrupo1,
  filtroLojaGrupo1,
  filtroLojaInventario,
  filtroProdutosGrupo2,
} from "./pilotStoreFilter.ts";
import type { PilotDivergencia, PilotEtapaMetricas, PilotOpcoes, PilotResultado } from "./pilotTypes.ts";

function nowMs(): number {
  return Date.now();
}

export async function executarPiloto(opcoes: PilotOpcoes): Promise<PilotResultado> {
  const inicioTotal = nowMs();
  const memoria = new ColetorMemoriaAproximada();
  const etapas: PilotEtapaMetricas[] = [];
  const paths = resolvePilotFilePaths(opcoes.regional, opcoes.dataReferencia);
  assertPilotSourcesExist(paths);

  const outputDir = opcoes.outputDir || defaultPilotOutputDir(opcoes.regional, opcoes.dataReferencia, opcoes.loja);

  // 1) Grupo 1 — filtro precoce LOJA
  let t0 = nowMs();
  const parsedG1 = await parseGrupoRuptura1(paths.grupo1, undefined, {
    filtroLinha: filtroLojaGrupo1(opcoes.loja),
    maxErrosEmMemoria: 1000,
  });
  if (!parsedG1.cabecalhoOk) throw new Error("Cabeçalho inválido no 1º Grupo");
  const transformedG1 = transformGrupoRuptura1(parsedG1.linhas, opcoes.regional, opcoes.dataReferencia);
  const produtosLoja = transformedG1.itens;
  const seqprodutos = extrairSeqprodutosGrupo1(parsedG1.linhas);
  etapas.push({
    etapa: "parse_transform_g1",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedG1.metricas.linhasLidas,
    linhasRetidas: produtosLoja.length,
    bytesLidos: parsedG1.metricas.bytesLidos,
    produtosUnicos: seqprodutos.size,
  });
  memoria.amostrar();

  // 2) Grupo 2 — filtro por produtos da loja 73
  t0 = nowMs();
  const parsedG2 = await parseGrupoCds2(paths.grupo2, undefined, {
    filtroLinha: filtroProdutosGrupo2(seqprodutos),
    maxErrosEmMemoria: 1000,
  });
  const transformedG2 = transformGrupoCds2(parsedG2.linhas);
  const cds5 = new Map<number, MotorCd5Normalizado>();
  for (const cd of transformedG2.itens) cds5.set(cd.seqproduto, cd);
  etapas.push({
    etapa: "parse_transform_g2",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedG2.metricas.linhasLidas,
    linhasRetidas: transformedG2.itens.length,
    bytesLidos: parsedG2.metricas.bytesLidos,
  });
  memoria.amostrar();

  // 3) Inventário — filtro loja
  t0 = nowMs();
  const parsedInv = await parseInventarioLojas(paths.inventario, undefined, {
    filtroLinha: filtroLojaInventario(opcoes.loja),
    maxErrosEmMemoria: 1000,
  });
  const transformedInv = transformInventario(parsedInv.linhas);
  const inventarioMap = new Map(
    transformedInv.itens.map((i) => [chaveLojaProduto(i.loja, i.produto), i]),
  );
  etapas.push({
    etapa: "parse_transform_inventario",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedInv.metricas.linhasLidas,
    linhasRetidas: transformedInv.itens.length,
    bytesLidos: parsedInv.metricas.bytesLidos,
  });
  memoria.amostrar();

  // 4) Validação padronizada — filtro loja pós-parse
  t0 = nowMs();
  const parsedVal = await parseValidacaoRuptura(paths.validacaoPadrao);
  const validacaoFiltrada = parsedVal.linhas.filter((v) => v.loja === opcoes.loja);
  const validacaoMap = new Map(
    validacaoFiltrada.map((v) => [chaveLojaProduto(v.loja!, v.produto!), v]),
  );
  etapas.push({
    etapa: "parse_validacao",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedVal.linhas.length,
    linhasRetidas: validacaoFiltrada.length,
  });

  // 5) Catálogos
  t0 = nowMs();
  const catalogResult = loadCatalogos({
    regional: opcoes.regional,
    dataReferencia: opcoes.dataReferencia,
    rede: paths.rede,
    ordemCdsPadrao: paths.ordemCdsPadrao,
    compradores: paths.compradoresPadrao,
    plan6Cd: paths.plan6Cd,
    regras: paths.regrasPadrao,
    estruturaFake: paths.estruturaFakePadrao,
    bandeiraCsv: paths.bandeiraCsv,
  });
  etapas.push({ etapa: "catalogos", duracaoMs: nowMs() - t0 });

  // 6) BRE + centralização
  t0 = nowMs();
  const bre = processarBre({
    contexto: {
      regional: opcoes.regional,
      dataReferencia: opcoes.dataReferencia,
      catalogos: catalogResult.catalogos,
      alertas: catalogResult.alertas,
    },
    produtosLoja,
    cds5,
    validacao: validacaoMap,
    inventario: inventarioMap,
  });
  etapas.push({ etapa: "bre_centralizacao", duracaoMs: nowMs() - t0, linhasRetidas: bre.itens.length });
  memoria.amostrar();

  // 7) Consolidador
  t0 = nowMs();
  const consolidado = consolidarLote({
    contexto: {
      regional: opcoes.regional,
      dataReferencia: opcoes.dataReferencia,
      catalogos: catalogResult.catalogos,
    },
    produtosLoja,
    cds5,
    inventario: inventarioMap,
    validacao: validacaoMap,
    bre,
  });
  etapas.push({
    etapa: "consolidador",
    duracaoMs: nowMs() - t0,
    linhasRetidas: consolidado.itens.length,
  });
  memoria.amostrar();

  // 8) Amostra estratificada
  const { amostra, estratos } = selecionarAmostraEstratificada(
    opcoes.modoCompleto ? consolidado.itens : consolidado.itens,
    opcoes.sampleSize,
  );

  // 9) Excel × V7
  t0 = nowMs();
  const excelData = lerExcelRegionalLoja(paths.excelRegional, opcoes.loja);
  const excelIndex = indexarExcelPorChave(excelData.linhas);
  const compareInputs: CompareRowInput[] = amostra.map((item) => {
    const chave = `${item.loja}|${item.seqproduto}`;
    const excelRow = excelIndex.get(chave) ?? {};
    const v7 = mapConsolidadoParaCompare(item);
    const excel: Record<string, string | number | boolean | null> = {};
    for (const cfg of CAMPOS_PILOTO_COMPARE) {
      excel[cfg.campo] = (excelRow as Record<string, unknown>)[cfg.campo] as string | number | boolean | null ?? null;
    }
    return { loja: item.loja, produto: item.seqproduto, excel, v7 };
  });
  const comparacao = compararExcelV7(compareInputs, CAMPOS_PILOTO_COMPARE);
  etapas.push({ etapa: "comparacao_excel_v7", duracaoMs: nowMs() - t0, linhasRetidas: compareInputs.length });

  const divergencias: PilotDivergencia[] = [];
  for (const linha of comparacao.linhas) {
    for (const campo of linha.campos) {
      if (campo.status === "igual" || campo.status === "nao_comparavel") continue;
      divergencias.push({
        loja: linha.loja,
        produto: linha.produto,
        campo: campo.campo,
        esperadoExcel: campo.valorExcel,
        encontradoV7: campo.valorV7,
        categoria: classificarDivergencia(campo),
        regraMRelacionada: null,
        severidade: severidadeDivergencia(campo),
        observacao: campo.motivo,
      });
    }
  }

  const qualidade = resumirQualidade(consolidado.itens);
  const mem = memoria.finalizar();
  const divergenciasCriticas = divergencias.filter((d) => d.severidade === "critica").length;
  const divergenciasToleradas = divergencias.filter((d) => d.severidade === "tolerada").length;

  const metricas = {
    regional: opcoes.regional,
    loja: opcoes.loja,
    dataReferencia: opcoes.dataReferencia,
    bytesLidosPorArquivo: {
      grupo1: parsedG1.metricas.bytesLidos ?? 0,
      grupo2: parsedG2.metricas.bytesLidos ?? 0,
      inventario: parsedInv.metricas.bytesLidos ?? 0,
    },
    linhasLidasPorArquivo: {
      grupo1: parsedG1.metricas.linhasLidas,
      grupo2: parsedG2.metricas.linhasLidas,
      inventario: parsedInv.metricas.linhasLidas,
      validacao: parsedVal.linhas.length,
    },
    linhasLoja: produtosLoja.length,
    produtosUnicos: seqprodutos.size,
    duplicidades: consolidado.duplicidades.length,
    ...qualidade,
    etapas,
    duracaoTotalMs: nowMs() - inicioTotal,
    memoria: {
      heapUsedMbPicoAprox: mem.heapUsedMbPicoAprox,
      rssMbPicoAprox: mem.rssMbPicoAprox,
      externalMbPicoAprox: mem.externalMbPicoAprox,
      nota: mem.nota,
    },
    totalDivergencias: divergencias.length,
    divergenciasCriticas,
    divergenciasToleradas,
    motivoEncerramento: "eof",
  };

  const bloqueios: string[] = [];
  if (consolidado.duplicidades.length > 0) bloqueios.push("duplicidade indevida na base consolidada");
  if (divergenciasCriticas > 0) bloqueios.push(`${divergenciasCriticas} divergências críticas Excel × V7`);
  if (qualidade.linhasInvalidas > 0) bloqueios.push(`${qualidade.linhasInvalidas} linhas inválidas`);

  const resultado: PilotResultado = {
    opcoes,
    fontes: paths as unknown as Record<string, string>,
    excelFonte: excelData.fonte,
    consolidado,
    amostra,
    estratos,
    comparacao,
    divergencias,
    metricas,
    aprovado: bloqueios.length === 0,
    bloqueioMotivo: bloqueios.length > 0 ? bloqueios.join("; ") : null,
  };

  escreverSaidasPiloto(outputDir, resultado);
  return resultado;
}
