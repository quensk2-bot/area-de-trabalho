/**
 * Fase 3C.1 — rastreamento classificacaoPrazo por camada (loja 73 MT)
 * Somente pipeline local — sem persistência.
 */
import { processarBre } from "../bre/index.ts";
import { chaveLojaProduto } from "../bre/breContext.ts";
import { loadCatalogos } from "../catalog/catalogService.ts";
import { consolidarLote } from "../consolidar/index.ts";
import { executarPipelineDm } from "../datamart/dmPipeline.ts";
import { mapearClassificacaoPrazoParaDb } from "../persistencia/persistenciaMapper.ts";
import { parseGrupoCds2 } from "../parsers/parseGrupoCds2.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { parseInventarioLojas } from "../parsers/parseInventarioLojas.ts";
import { parseValidacaoRuptura } from "../parsers/parseValidacaoRuptura.ts";
import { transformGrupoCds2 } from "../transform/transformGrupoCds2.ts";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import { transformInventario } from "../transform/transformInventario.ts";
import type { MotorClassificacaoPrazoPublicacao } from "../consolidar/consolidacaoTypes.ts";
import type { MotorClassificacaoPrazo } from "../bre/breTypes.ts";
import {
  assertPilotSourcesExist,
  resolvePilotFilePaths,
} from "../pilot/pilotFilePaths.ts";
import {
  extrairSeqprodutosGrupo1,
  filtroLojaGrupo1,
  filtroLojaInventario,
  filtroProdutosGrupo2,
} from "../pilot/pilotStoreFilter.ts";

const REGIONAL = "MT";
const LOJA = 73;
const DATA = "2026-03-26";

type LinhaContagem = {
  camada: string;
  total: number;
  com_classificacao: number;
  sem_classificacao: number;
  CP: number;
  MP: number;
  LP: number;
  sem_ruptura: number;
  bloqueado: number;
  dados_incompletos: number;
};

function vazio(nome: string): LinhaContagem {
  return {
    camada: nome,
    total: 0,
    com_classificacao: 0,
    sem_classificacao: 0,
    CP: 0,
    MP: 0,
    LP: 0,
    sem_ruptura: 0,
    bloqueado: 0,
    dados_incompletos: 0,
  };
}

function contarBre(classificacoes: (MotorClassificacaoPrazo | null)[]): LinhaContagem {
  const r = vazio("BRE resultado");
  r.total = classificacoes.length;
  for (const c of classificacoes) {
    if (c == null) r.sem_classificacao++;
    else {
      r.com_classificacao++;
      if (c === "CP") r.CP++;
      if (c === "MP") r.MP++;
      if (c === "LP") r.LP++;
    }
  }
  return r;
}

function contarPublicacao(
  nome: string,
  valores: (MotorClassificacaoPrazoPublicacao | null | undefined)[],
): LinhaContagem {
  const r = vazio(nome);
  r.total = valores.length;
  for (const c of valores) {
    if (c == null || c === (null as unknown as string)) {
      r.sem_classificacao++;
      continue;
    }
    r.com_classificacao++;
    if (c === "curto_prazo") r.CP++;
    else if (c === "medio_prazo") r.MP++;
    else if (c === "longo_prazo") r.LP++;
    else if (c === "sem_ruptura") r.sem_ruptura++;
    else if (c === "bloqueado") r.bloqueado++;
    else if (c === "dados_incompletos") r.dados_incompletos++;
  }
  return r;
}

function amostrar<T extends { loja: number; seqproduto: number }>(
  label: string,
  itens: T[],
  pick: (i: T) => Record<string, unknown>,
  max = 3,
): void {
  console.log(`\n--- Amostra ${label} (${Math.min(max, itens.length)}) ---`);
  for (const item of itens.slice(0, max)) {
    console.log(JSON.stringify(pick(item), null, 0));
  }
}

async function main(): Promise<void> {
  const paths = resolvePilotFilePaths(REGIONAL, DATA);
  assertPilotSourcesExist(paths);

  const parsedG1 = await parseGrupoRuptura1(paths.grupo1, undefined, {
    filtroLinha: filtroLojaGrupo1(LOJA),
    maxErrosEmMemoria: 1000,
  });
  const produtosLoja = transformGrupoRuptura1(parsedG1.linhas, REGIONAL, DATA).itens;
  const seqprodutos = extrairSeqprodutosGrupo1(parsedG1.linhas);

  const parsedG2 = await parseGrupoCds2(paths.grupo2, undefined, {
    filtroLinha: filtroProdutosGrupo2(seqprodutos),
    maxErrosEmMemoria: 1000,
  });
  const cds5 = new Map(transformGrupoCds2(parsedG2.linhas).itens.map((c) => [c.seqproduto, c]));

  const parsedInv = await parseInventarioLojas(paths.inventario, undefined, {
    filtroLinha: filtroLojaInventario(LOJA),
    maxErrosEmMemoria: 1000,
  });
  const inventarioMap = new Map(
    transformInventario(parsedInv.linhas).itens.map((i) => [chaveLojaProduto(i.loja, i.produto), i]),
  );

  const parsedVal = await parseValidacaoRuptura(paths.validacaoPadrao);
  const validacaoMap = new Map(
    parsedVal.linhas.filter((v) => v.loja === LOJA).map((v) => [chaveLojaProduto(v.loja!, v.produto!), v]),
  );

  const catalogResult = loadCatalogos({
    regional: REGIONAL,
    dataReferencia: DATA,
    rede: paths.rede,
    ordemCdsPadrao: paths.ordemCdsPadrao,
    compradores: paths.compradoresPadrao,
    plan6Cd: paths.plan6Cd,
    regras: paths.regrasPadrao,
    estruturaFake: paths.estruturaFakePadrao,
    bandeiraCsv: paths.bandeiraCsv,
  });

  const bre = processarBre({
    contexto: {
      regional: REGIONAL,
      dataReferencia: DATA,
      catalogos: catalogResult.catalogos,
      alertas: catalogResult.alertas,
    },
    produtosLoja,
    cds5,
    validacao: validacaoMap,
    inventario: inventarioMap,
  });

  const breMap = new Map(bre.itens.map((i) => [chaveLojaProduto(i.loja, i.seqproduto), i]));

  const consolidado = consolidarLote({
    contexto: {
      regional: REGIONAL,
      dataReferencia: DATA,
      catalogos: catalogResult.catalogos,
    },
    produtosLoja,
    cds5,
    inventario: inventarioMap,
    validacao: validacaoMap,
    bre,
  });

  const dm = executarPipelineDm({ consolidado: consolidado.itens });

  const linhas: LinhaContagem[] = [
    { ...vazio("Grupo1 normalizado"), total: produtosLoja.length },
    { ...vazio("Entrada BRE"), total: produtosLoja.length },
    contarBre(bre.itens.map((i) => i.classificacaoPrazo)),
    contarBre(consolidado.itens.map((i) => breMap.get(chaveLojaProduto(i.loja, i.seqproduto))?.classificacaoPrazo ?? null)),
    {
      ...vazio("Consolidado"),
      total: consolidado.itens.length,
      com_classificacao: consolidado.itens.filter((i) => i.curtoPrazo === 1 || i.medioPrazo === 1 || i.longoPrazo === 1).length,
      sem_classificacao: consolidado.itens.filter((i) => i.curtoPrazo !== 1 && i.medioPrazo !== 1 && i.longoPrazo !== 1).length,
      CP: consolidado.itens.filter((i) => i.curtoPrazo === 1).length,
      MP: consolidado.itens.filter((i) => i.medioPrazo === 1).length,
      LP: consolidado.itens.filter((i) => i.longoPrazo === 1).length,
    },
    contarPublicacao("Consolidado.classificacaoPrazo", consolidado.itens.map((i) => i.classificacaoPrazo)),
    contarPublicacao("Data Mart", dm.lote.produtos.map((p) => p.classificacaoPrazo)),
    contarPublicacao(
      "Mapper SQL",
      dm.lote.produtos.map((p) => mapearClassificacaoPrazoParaDb(p.classificacaoPrazo) as MotorClassificacaoPrazoPublicacao),
    ),
  ];

  console.log("\n=== TABELA POR CAMADA ===");
  console.table(linhas);

  const semClassCons = consolidado.itens.filter((i) => i.classificacaoPrazo == null);
  const cp = consolidado.itens.filter((i) => i.classificacaoPrazo === "curto_prazo");
  const mp = consolidado.itens.filter((i) => i.classificacaoPrazo === "medio_prazo");
  const lp = consolidado.itens.filter((i) => i.classificacaoPrazo === "longo_prazo");
  const sr = consolidado.itens.filter((i) => i.classificacaoPrazo === "sem_ruptura");
  const bl = consolidado.itens.filter((i) => i.classificacaoPrazo === "bloqueado");
  const inc = consolidado.itens.filter((i) => i.classificacaoPrazo === "dados_incompletos");

  amostrar("CP", cp, (i) => ({
    loja: i.loja,
    seqproduto: i.seqproduto,
    baseLimpa: i.baseLimpa,
    curtoPrazo: i.curtoPrazo,
    classificacaoBre: breMap.get(chaveLojaProduto(i.loja, i.seqproduto))?.classificacaoPrazo,
    classificacaoConsolidador: i.classificacaoPrazo,
    classificacaoDm: dm.lote.produtos.find((p) => p.seqproduto === i.seqproduto)?.classificacaoPrazo,
    statusOperacional: i.statusOperacional,
  }));

  amostrar("sem_ruptura", sr, (i) => ({
    loja: i.loja,
    seqproduto: i.seqproduto,
    baseLimpa: i.baseLimpa,
    menorQueTres: breMap.get(chaveLojaProduto(i.loja, i.seqproduto))?.menorQueTresUnidades,
    classificacaoBre: breMap.get(chaveLojaProduto(i.loja, i.seqproduto))?.classificacaoPrazo,
    classificacaoConsolidador: i.classificacaoPrazo,
    statusOperacional: i.statusOperacional,
  }));

  amostrar("bloqueado", bl, (i) => ({
    loja: i.loja,
    seqproduto: i.seqproduto,
    baseLimpa: i.baseLimpa,
    classificacaoBre: breMap.get(chaveLojaProduto(i.loja, i.seqproduto))?.classificacaoPrazo,
    classificacaoConsolidador: i.classificacaoPrazo,
    statusOperacional: i.statusOperacional,
    alertas: i.alertas.slice(0, 2).map((a) => a.codigo),
  }));

  console.log("\n=== GATE DATA MART ===");
  console.log(`valido=${dm.validacao.valido} erros=${dm.validacao.itens.filter((i) => i.severidade === "erro").length}`);
  console.log(`sem classificacao consolidado=${semClassCons.length}`);

  const dist = {
    curto_prazo: cp.length,
    medio_prazo: mp.length,
    longo_prazo: lp.length,
    sem_ruptura: sr.length,
    bloqueado: bl.length,
    dados_incompletos: inc.length,
  };
  console.log("\n=== DISTRIBUICAO FINAL ===");
  console.log(JSON.stringify(dist, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
