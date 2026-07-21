import { processarBre } from "../bre/index.ts";
import { chaveLojaProduto } from "../bre/breContext.ts";
import { loadCatalogos } from "../catalog/catalogService.ts";
import { consolidarLote } from "../consolidar/index.ts";
import type { MotorConsolidacaoResultado } from "../consolidar/consolidacaoTypes.ts";
import { parseGrupoCds2 } from "../parsers/parseGrupoCds2.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { parseInventarioLojas } from "../parsers/parseInventarioLojas.ts";
import { parseValidacaoRuptura } from "../parsers/parseValidacaoRuptura.ts";
import { ColetorMemoriaAproximada } from "../parsers/streaming/streamingMetrics.ts";
import { transformGrupoCds2 } from "../transform/transformGrupoCds2.ts";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import { transformInventario } from "../transform/transformInventario.ts";
import type { MotorCd5Normalizado } from "../types/motorProdutoLojaNormalizado.ts";
import type { PacoteMotorFilePaths } from "./pacoteFilePaths.ts";
import { resumirQualidade } from "../pilot/pilotReport.ts";

export type MotorRegionalEtapa = {
  etapa: string;
  duracaoMs: number;
  linhasLidas?: number;
  linhasRetidas?: number;
  bytesLidos?: number;
};

export type MotorRegionalMetricas = {
  regional: string;
  dataReferencia: string;
  bytesLidosPorArquivo: Record<string, number>;
  linhasLidasPorArquivo: Record<string, number>;
  linhasTotal: number;
  produtosUnicos: number;
  lojasUnicas: number;
  duplicidades: number;
  etapas: MotorRegionalEtapa[];
  duracaoTotalMs: number;
  memoria: {
    heapUsedMbPicoAprox: number;
    rssMbPicoAprox: number;
    externalMbPicoAprox: number;
    nota: string;
  };
};

export type MotorRegionalResultado = {
  regional: string;
  dataReferencia: string;
  fontes: PacoteMotorFilePaths;
  consolidado: MotorConsolidacaoResultado;
  metricas: MotorRegionalMetricas;
  aprovado: boolean;
  bloqueioMotivo: string | null;
};

export type MotorRegionalCallbacks = {
  onEtapa?: (etapa: string) => void | Promise<void>;
};

function nowMs(): number {
  return Date.now();
}

/**
 * Motor regional completo — todas as lojas, sem comparação Excel.
 * Reutiliza Parser, Transform, BRE congelado e Consolidador existentes.
 */
export async function executarMotorRegional(input: {
  regional: string;
  dataReferencia: string;
  paths: PacoteMotorFilePaths;
  callbacks?: MotorRegionalCallbacks;
}): Promise<MotorRegionalResultado> {
  const inicioTotal = nowMs();
  const memoria = new ColetorMemoriaAproximada();
  const etapas: MotorRegionalEtapa[] = [];
  const { regional, dataReferencia, paths, callbacks } = input;

  const emit = async (etapa: string) => {
    await callbacks?.onEtapa?.(etapa);
  };

  await emit("processando_parser");

  // 1) Grupo 1 — regional completo
  let t0 = nowMs();
  const parsedG1 = await parseGrupoRuptura1(paths.grupo1, undefined, { maxErrosEmMemoria: 5000 });
  if (!parsedG1.cabecalhoOk) throw new Error("Cabeçalho inválido no 1º Grupo");
  etapas.push({
    etapa: "parse_g1",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedG1.metricas.linhasLidas,
    bytesLidos: parsedG1.metricas.bytesLidos,
  });

  await emit("processando_transformacao");
  t0 = nowMs();
  const transformedG1 = transformGrupoRuptura1(parsedG1.linhas, regional, dataReferencia);
  const produtosLoja = transformedG1.itens;
  const seqprodutos = new Set(produtosLoja.map((p) => p.seqproduto));
  const lojas = new Set(produtosLoja.map((p) => p.loja));
  etapas.push({
    etapa: "transform_g1",
    duracaoMs: nowMs() - t0,
    linhasRetidas: produtosLoja.length,
    produtosUnicos: seqprodutos.size,
  } as MotorRegionalEtapa);
  memoria.amostrar();

  // 2) Grupo 2
  t0 = nowMs();
  const parsedG2 = await parseGrupoCds2(paths.grupo2, undefined, { maxErrosEmMemoria: 5000 });
  etapas.push({
    etapa: "parse_g2",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedG2.metricas.linhasLidas,
    bytesLidos: parsedG2.metricas.bytesLidos,
  });

  t0 = nowMs();
  const transformedG2 = transformGrupoCds2(parsedG2.linhas);
  const cds5 = new Map<number, MotorCd5Normalizado>();
  for (const cd of transformedG2.itens) cds5.set(cd.seqproduto, cd);
  etapas.push({
    etapa: "transform_g2",
    duracaoMs: nowMs() - t0,
    linhasRetidas: transformedG2.itens.length,
  });
  memoria.amostrar();

  // 3) Inventário
  t0 = nowMs();
  const parsedInv = await parseInventarioLojas(paths.inventario, undefined, { maxErrosEmMemoria: 5000 });
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

  // 4) Validação padronizada — todas as lojas
  t0 = nowMs();
  const parsedVal = await parseValidacaoRuptura(paths.validacaoPadrao);
  const validacaoMap = new Map(
    parsedVal.linhas.map((v) => [chaveLojaProduto(v.loja!, v.produto!), v]),
  );
  etapas.push({
    etapa: "parse_validacao",
    duracaoMs: nowMs() - t0,
    linhasLidas: parsedVal.linhas.length,
    linhasRetidas: parsedVal.linhas.length,
  });

  // 5) Catálogos
  t0 = nowMs();
  const catalogResult = loadCatalogos({
    regional,
    dataReferencia,
    rede: paths.rede,
    ordemCdsPadrao: paths.ordemCdsPadrao,
    compradores: paths.compradoresPadrao,
    plan6Cd: paths.plan6Cd,
    regras: paths.regrasPadrao,
    estruturaFake: paths.estruturaFakePadrao,
    bandeiraCsv: paths.bandeiraCsv,
  });
  etapas.push({ etapa: "catalogos", duracaoMs: nowMs() - t0 });

  // 6) BRE
  await emit("processando_bre");
  t0 = nowMs();
  const bre = processarBre({
    contexto: {
      regional,
      dataReferencia,
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
  await emit("processando_consolidacao");
  t0 = nowMs();
  const consolidado = consolidarLote({
    contexto: {
      regional,
      dataReferencia,
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

  const qualidade = resumirQualidade(consolidado.itens);
  const mem = memoria.finalizar();

  const metricas: MotorRegionalMetricas = {
    regional,
    dataReferencia,
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
    linhasTotal: consolidado.itens.length,
    produtosUnicos: seqprodutos.size,
    lojasUnicas: lojas.size,
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
  };

  const bloqueios: string[] = [];
  if (consolidado.duplicidades.length > 0) bloqueios.push("duplicidade indevida na base consolidada");
  if (qualidade.linhasInvalidas > 0) bloqueios.push(`${qualidade.linhasInvalidas} linhas inválidas`);

  return {
    regional,
    dataReferencia,
    fontes: paths,
    consolidado,
    metricas,
    aprovado: bloqueios.length === 0,
    bloqueioMotivo: bloqueios.length > 0 ? bloqueios.join("; ") : null,
  };
}
