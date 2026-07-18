import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogoOrdemCd } from "../catalog/catalogTypes.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { buildCdMapping } from "../compare/cdNormalization/buildCdMapping.ts";
import {
  compararCdsPorPosicao,
  compararCdsProduto,
  detectarColunasCdsExcel,
  enriquecerCodigosFisicosV7,
  mapConsolidadoCdsParaCompare,
  maxPosicaoDetectadaExcel,
  normalizarExcelCdsDeLinha,
  normalizarV7Cds,
  PERFIL_AUDITORIA_COMPLETA,
  PERFIL_EXCEL_MT_LEGADO_5CD,
  PERFIL_REGIONAL_8CD,
  resolverQuantidadePosicoesComparacao,
} from "../compare/cds/index.ts";
import type { MotorCdComparacaoItem } from "../compare/cds/motorCdComparacaoTypes.ts";
import { ESTADOS_CD_IGUAIS } from "../compare/cds/motorCdComparacaoTypes.ts";
import {
  compararProdutoCentralizadoSemantico,
  compararStatusAtivacaoSemantico,
  compararStatusEstoqueSemantico,
} from "../compare/cds/equivalenciaSemanticaCds.ts";
import { buildV7CdContexto } from "../compare/cdNormalization/buildV7CdContexto.ts";
import { mapConsolidadoParaCompare } from "../compare/mapConsolidadoParaCompare.ts";
import { exportarCdsEmLayout, gerarCabecalhosCds, gerarNomeColunaCd, PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD, PERFIL_EXPORT_REGIONAL_8CD } from "../export/cds/index.ts";
import { cdBase, colecaoN } from "./fixtures/cdsDinamicosFixtures.ts";
import { HEADERS_EXCEL_12CD, HEADERS_EXCEL_8CD, LINHA_EXCEL_8CD, headersExcelCds } from "./fixtures/excelCds8PosicoesExpected.ts";

const COMPER_MT_ORDEM: CatalogoOrdemCd[] = [
  {
    divisao: "COMPER MT",
    bandeira: "Comper MT",
    uf: "MT",
    cd1: 464,
    cd2: 468,
    cd3: 753,
    cd4: 904,
    cd5: 905,
  },
];

function configComperMT() {
  return buildCdMapping({
    regional: "MT",
    bandeira: "Comper MT",
    dataReferencia: "2026-03-26",
    ordemCds: COMPER_MT_ORDEM,
  });
}

function itemConsolidado(partial: Partial<MotorProdutoLojaConsolidado> = {}): MotorProdutoLojaConsolidado {
  return {
    regional: "MT",
    dataReferencia: "2026-03-26",
    bandeira: "Comper MT",
    loja: 73,
    seqproduto: 1000,
    descricao: "PROD",
    codFornecedor: 1,
    fornecedor: "FORN",
    rede: "REDE",
    comprador: "COMP",
    statusProduto: null,
    familia: null,
    divisao: "COMPER MT",
    setorCodigo: null,
    setorNome: null,
    categoriaN1: null,
    setorN2: null,
    grupoN3: null,
    subgrupoN4: null,
    tipoN5: null,
    mediaVendaUnDia: null,
    mediaVendaGp: null,
    estoqueLoja: 1,
    parMin: null,
    parMax: null,
    pendenciaLoja: 0,
    diasRuptura: null,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    cds: [],
    estoqueCd1: 0,
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
    estoqueCd5: 0,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    pendenciaCd5: 0,
    statusCompraCd1: null,
    statusCompraCd2: null,
    statusCompraCd3: null,
    statusCompraCd4: null,
    statusCompraCd5: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasCompraCd5: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    somaEstoqueCd: 0,
    crossSum: 0,
    crossDocking: 0,
    geraRuptura: true,
    ruptura104c: true,
    inventarioUnid: 0,
    rupturaComInventario: 0,
    rupturaSemInventario: 1,
    baseLimpa: "Base Limpa",
    ativacaoRecente: false,
    curtoPrazo: 1,
    medioPrazo: 0,
    longoPrazo: 0,
    classificacaoPrazo: "curto_prazo",
    pendenciaCpaCd: 0,
    diasPedido: 5,
    acaoCurtoPrazo: null,
    acaoMedioPrazo: null,
    primeiroCd: 464,
    segundoCd: 468,
    terceiroCd: 753,
    quartoCd: 904,
    quintoCd: 905,
    menorDiasRecebimento: null,
    produtoCentralizado: 753,
    textoProdutoCentralizado: "CD 753",
    posicaoCdSelecionada: 3,
    codigoCdSelecionado: 753,
    flagPrimeiroCd: 0,
    flagSegundoCd: 0,
    flagTerceiroCd: 1,
    flagQuartoCd: 0,
    flagQuintoCd: 0,
    statusRecebto: null,
    statusEstoqueCds: "Estoque no CD: (753)(904)",
    statusSolicitacaoAtivacaoCd: "Inativo CD: (753)(904)",
    qtdeEmbCompra: null,
    embalagemCompra: null,
    custoLiquido: null,
    pesoUnid: null,
    m3Unid: null,
    coberturaDias: null,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    statusOperacional: "curto_prazo",
    qualidadeDados: "completo",
    alertas: [],
    erros: [],
    fontesAusentes: [],
    ...partial,
  };
}

function cdItem(
  posicao: number,
  overrides: Partial<MotorCdComparacaoItem> = {},
): MotorCdComparacaoItem {
  return {
    posicaoLogica: posicao,
    codigoFisico: configComperMT().porPosicaoNumerico.get(posicao) ?? null,
    estoque: posicao * 10,
    pendencia: posicao,
    statusCompra: "A",
    diasCompra: posicao,
    diasRecebimento: posicao,
    flagCentralizacao: 0,
    origem: "v7",
    alertas: [],
    ...overrides,
  };
}

describe("Etapa D — comparador e exportação CDs dinâmicos", () => {
  const cfg = configComperMT();

  it("01. comparar produto com 1 CD", () => {
    const r = compararCdsPorPosicao([cdItem(1, { origem: "excel", estoque: 10 })], [cdItem(1, { estoque: 10 })]);
    assert.equal(r.length, 1);
    assert.equal(r[0].estado, "igual_exato");
  });

  it("02. comparar produto com 4 CDs", () => {
    const excel = [1, 2, 3, 4].map((p) => cdItem(p, { origem: "excel" }));
    const v7 = [1, 2, 3, 4].map((p) => cdItem(p));
    const r = compararCdsProduto(73, 1, excel, v7);
    assert.equal(r.divergencias, 0);
    assert.equal(r.posicoes.length, 4);
  });

  it("03. comparar produto com 5 CDs", () => {
    const excel = [1, 2, 3, 4, 5].map((p) => cdItem(p, { origem: "excel" }));
    const v7 = [1, 2, 3, 4, 5].map((p) => cdItem(p));
    assert.equal(compararCdsProduto(73, 1, excel, v7).divergencias, 0);
  });

  it("04. comparar produto com 8 CDs", () => {
    const excel = Array.from({ length: 8 }, (_, i) => cdItem(i + 1, { origem: "excel", codigoFisico: null }));
    const v7 = Array.from({ length: 8 }, (_, i) => cdItem(i + 1, { codigoFisico: null }));
    assert.equal(compararCdsProduto(73, 1, excel, v7).posicoes.length, 8);
  });

  it("05. comparar produto com 12 CDs", () => {
    const excel = Array.from({ length: 12 }, (_, i) => cdItem(i + 1, { origem: "excel", codigoFisico: null }));
    const v7 = Array.from({ length: 12 }, (_, i) => cdItem(i + 1, { codigoFisico: null }));
    assert.equal(compararCdsProduto(73, 1, excel, v7).posicoes.length, 12);
  });

  it("06. posição CD6 equivalente", () => {
    const r = compararCdsPorPosicao(
      [cdItem(6, { origem: "excel", codigoFisico: null, estoque: 60 })],
      [cdItem(6, { codigoFisico: null, estoque: 60 })],
      { compararCodigoFisico: false },
    );
    assert.equal(r[0].estado, "igual_exato");
  });

  it("07. posição CD8 divergente", () => {
    const r = compararCdsPorPosicao(
      [cdItem(8, { origem: "excel", codigoFisico: null, estoque: 80 })],
      [cdItem(8, { codigoFisico: null, estoque: 81 })],
    );
    assert.equal(r[0].estado, "divergente_valor");
  });

  it("08. código físico equivalente", () => {
    const r = compararCdsPorPosicao(
      [cdItem(3, { origem: "excel", codigoFisico: 753, estoque: 5 })],
      [cdItem(3, { codigoFisico: 753, estoque: 5 })],
      { compararCodigoFisico: true },
    );
    assert.equal(r[0].estado, "igual_exato");
  });

  it("09. código físico divergente", () => {
    const r = compararCdsPorPosicao(
      [cdItem(3, { origem: "excel", codigoFisico: 753, estoque: 5 })],
      [cdItem(3, { codigoFisico: 904, estoque: 5 })],
      { compararCodigoFisico: true },
    );
    assert.equal(r[0].estado, "divergente_codigo");
  });

  it("10. posição ausente Excel", () => {
    const r = compararCdsPorPosicao([], [cdItem(2)]);
    assert.equal(r[0].estado, "posicao_ausente_excel");
  });

  it("11. posição ausente V7", () => {
    const r = compararCdsPorPosicao([cdItem(2, { origem: "excel" })], []);
    assert.equal(r[0].estado, "posicao_ausente_v7");
  });

  it("12. coleção fora de ordem", () => {
    const excel = [3, 1, 2].map((p) => cdItem(p, { origem: "excel" }));
    const v7 = [1, 2, 3].map((p) => cdItem(p));
    const r = compararCdsPorPosicao(excel, v7);
    assert.equal(r.every((x) => x.estado === "igual_exato"), true);
  });

  it("13. cabeçalho ESTQ_CD8", () => {
    const cols = detectarColunasCdsExcel(["ESTQ_CD8"]);
    assert.equal(cols[0].posicaoLogica, 8);
    assert.equal(maxPosicaoDetectadaExcel(["ESTQ_CD8"]), 8);
  });

  it("14. cabeçalho ESTQ_CD12", () => {
    assert.equal(maxPosicaoDetectadaExcel(["ESTQ_CD12"]), 12);
  });

  it("15. cabeçalho físico", () => {
    const cols = detectarColunasCdsExcel(["ESTQ_753"]);
    assert.equal(cols[0].tipoCabecalho, "fisico");
    assert.equal(cols[0].codigoFisico, 753);
    const linha = normalizarExcelCdsDeLinha({ ESTQ_753: 10 }, ["ESTQ_753"], cfg);
    assert.equal(linha[0].posicaoLogica, 3);
  });

  it("16. cabeçalho misto", () => {
    const cols = detectarColunasCdsExcel(["ESTQ_CD3_753"]);
    assert.equal(cols[0].tipoCabecalho, "misto");
    assert.equal(cols[0].posicaoLogica, 3);
    assert.equal(cols[0].codigoFisico, 753);
  });

  it("17. texto com um CD — Produto Centralizado", () => {
    const r = compararProdutoCentralizadoSemantico(cfg, "CD 753", "CD 753", 3, 753);
    assert.ok(ESTADOS_CD_IGUAIS.has(r.estado));
  });

  it("18. texto com múltiplos CDs — Status Estoque", () => {
    const v7 = buildV7CdContexto(
      itemConsolidado({
        cds: colecaoN(5).map((c, i) =>
          cdBase(i + 1, {
            codigoFisico: cfg.porPosicaoNumerico.get(i + 1) ?? null,
            estoque: [3, 4].includes(i + 1) ? 1 : 0,
          }),
        ),
        flagTerceiroCd: 1,
        flagQuartoCd: 1,
      }),
    );
    const r = compararStatusEstoqueSemantico(cfg, "Estoque no CD: (753)(904)", v7);
    assert.ok(ESTADOS_CD_IGUAIS.has(r.estado));
  });

  it("19. Produto Centralizado semântico", () => {
    const r = compararProdutoCentralizadoSemantico(cfg, "Não Centralizado", "Não Centralizado", null, null);
    assert.ok(ESTADOS_CD_IGUAIS.has(r.estado));
  });

  it("20. Status Estoque semântico", () => {
    const v7 = buildV7CdContexto(itemConsolidado());
    const r = compararStatusEstoqueSemantico(cfg, "Estoque no CD: (753)(904)", v7);
    assert.ok(ESTADOS_CD_IGUAIS.has(r.estado));
  });

  it("21. Status Ativação semântico", () => {
    const v7 = buildV7CdContexto(itemConsolidado());
    const r = compararStatusAtivacaoSemantico(cfg, "Inativo CD: (753)(904)", v7);
    assert.ok(ESTADOS_CD_IGUAIS.has(r.estado));
  });

  it("22. exportação 5 CDs", () => {
    const cds = [1, 2, 3, 4, 5].map((p) => ({
      posicaoLogica: p,
      codigoFisico: cfg.porPosicaoNumerico.get(p) ?? null,
      estoque: p,
      pendencia: null,
      statusCompra: null,
      diasCompra: null,
      diasRecebimento: null,
    }));
    const r = exportarCdsEmLayout({ cds, perfil: PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD });
    assert.equal(r.quantidadePosicoes, 5);
    assert.equal(r.colunas.ESTQ_CD5, 5);
  });

  it("23. exportação 8 CDs", () => {
    const cds = Array.from({ length: 8 }, (_, i) => ({
      posicaoLogica: i + 1,
      codigoFisico: null,
      estoque: i + 1,
      pendencia: null,
      statusCompra: null,
      diasCompra: null,
      diasRecebimento: null,
    }));
    const r = exportarCdsEmLayout({ cds, quantidadePosicoes: 8, campos: ["estoque"] });
    assert.equal(r.quantidadePosicoes, 8);
    assert.equal(r.colunas.ESTQ_CD8, 8);
  });

  it("24. exportação 12 CDs", () => {
    const cds = Array.from({ length: 12 }, (_, i) => ({
      posicaoLogica: i + 1,
      codigoFisico: null,
      estoque: i + 1,
      pendencia: null,
      statusCompra: null,
      diasCompra: null,
      diasRecebimento: null,
    }));
    const r = exportarCdsEmLayout({ cds, quantidadePosicoes: 12, campos: ["estoque"] });
    assert.equal(r.colunas.ESTQ_CD12, 12);
  });

  it("25. quantidade auto", () => {
    const cds = Array.from({ length: 7 }, (_, i) => ({
      posicaoLogica: i + 1,
      codigoFisico: null,
      estoque: 1,
      pendencia: null,
      statusCompra: null,
      diasCompra: null,
      diasRecebimento: null,
    }));
    const r = exportarCdsEmLayout({ cds, quantidadePosicoes: "auto", campos: ["estoque"] });
    assert.equal(r.quantidadePosicoes, 7);
  });

  it("26. perfil MT legado", () => {
    assert.equal(PERFIL_EXCEL_MT_LEGADO_5CD.quantidadePosicoes, 5);
    assert.equal(PERFIL_EXCEL_MT_LEGADO_5CD.usarAdaptadorLegado, true);
  });

  it("27. perfil outra regional", () => {
    assert.equal(PERFIL_REGIONAL_8CD.quantidadePosicoes, 8);
    assert.equal(PERFIL_REGIONAL_8CD.usarAdaptadorLegado, false);
  });

  it("28. código físico ausente na exportação", () => {
    const r = exportarCdsEmLayout({
      cds: [{ posicaoLogica: 1, codigoFisico: null, estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null }],
      formatoCabecalho: "fisico",
      usarCodigoFisicoNoCabecalho: true,
      campos: ["estoque"],
      quantidadePosicoes: 1,
    });
    assert.ok(r.alertas.some((a) => a.includes("codigo_fisico_ausente")));
    assert.equal(r.colunas.ESTQ_CD1, 1);
  });

  it("29. entrada não mutada", () => {
    const excel = [cdItem(1, { origem: "excel" })];
    const v7 = [cdItem(1)];
    const excelCopy = structuredClone(excel);
    const v7Copy = structuredClone(v7);
    compararCdsPorPosicao(excel, v7);
    assert.deepEqual(excel, excelCopy);
    assert.deepEqual(v7, v7Copy);
  });

  it("30. ordenação determinística", () => {
    const v7 = normalizarV7Cds(
      itemConsolidado({ cds: [cdBase(3), cdBase(1), cdBase(2)] }),
      PERFIL_EXCEL_MT_LEGADO_5CD,
    );
    assert.deepEqual(
      v7.cds.map((c) => c.posicaoLogica),
      [1, 2, 3],
    );
  });

  it("31. nenhuma coluna hardcoded até CD8", () => {
    const headers = gerarCabecalhosCds(12, ["estoque"], "logico");
    assert.ok(headers.includes("ESTQ_CD12"));
    assert.ok(!headers.some((h) => h === "ESTQ_CD13"));
  });

  it("32. MT mapConsolidadoParaCompare inclui ESTQ de cds[]", () => {
    const item = itemConsolidado({
      cds: [cdBase(1, { estoque: 11 }), cdBase(2, { estoque: 22 })],
    });
    const mapped = mapConsolidadoParaCompare(item);
    assert.equal(mapped.ESTQ_CD1, 11);
    assert.equal(mapped.ESTQ_CD2, 22);
  });

  it("33. mapConsolidadoCdsParaCompare posicional", () => {
    const item = itemConsolidado({
      cds: [cdBase(1, { estoque: 10, codigoFisico: 464 }), cdBase(2, { estoque: 20, codigoFisico: 468 })],
    });
    const excel = { ESTQ_CD1: 10, ESTQ_CD2: 20 };
    const r = mapConsolidadoCdsParaCompare(item, PERFIL_EXCEL_MT_LEGADO_5CD, excel, ["ESTQ_CD1", "ESTQ_CD2"], cfg);
    assert.equal(r.comparacaoPosicoes?.divergencias, 0);
  });

  it("34. divergência real continua detectável", () => {
    const r = compararCdsPorPosicao(
      [cdItem(1, { origem: "excel", estoque: 1 })],
      [cdItem(1, { estoque: 99 })],
    );
    assert.equal(r[0].estado, "divergente_valor");
  });

  it("35. diferença de formato deixa de ser crítica — cabeçalho misto reconhecido", () => {
    const cols = detectarColunasCdsExcel(["ESTQ_CD3_753"]);
    assert.notEqual(cols[0].tipoCabecalho, "nao_reconhecido");
  });

  it("36. resolverQuantidadePosicoes perfil MT", () => {
    assert.equal(resolverQuantidadePosicoesComparacao(PERFIL_EXCEL_MT_LEGADO_5CD, 12), 5);
  });

  it("37. resolverQuantidadePosicoes auditoria auto", () => {
    assert.equal(resolverQuantidadePosicoesComparacao(PERFIL_AUDITORIA_COMPLETA, 12), 12);
  });

  it("38. enriquecerCodigosFisicosV7 via catálogo", () => {
    const enriched = enriquecerCodigosFisicosV7(
      [{ ...cdItem(3, { codigoFisico: null }) }],
      cfg.porPosicaoNumerico,
    );
    assert.equal(enriched[0].codigoFisico, 753);
  });

  it("39. normalizar Excel 8 posições fixture", () => {
    const linha = normalizarExcelCdsDeLinha(LINHA_EXCEL_8CD, HEADERS_EXCEL_8CD, cfg);
    assert.equal(linha.length, 8);
    assert.equal(linha[7].estoque, 80);
  });

  it("40. gerarNomeColunaCd físico", () => {
    assert.equal(gerarNomeColunaCd("estoque", 3, 753, "fisico", true), "ESTQ_753");
  });

  it("41. gerarNomeColunaCd misto", () => {
    assert.equal(gerarNomeColunaCd("estoque", 3, 753, "misto", false), "ESTQ_CD3_753");
  });

  it("42. exportação perfil regional 8cd", () => {
    const r = exportarCdsEmLayout({
      cds: Array.from({ length: 8 }, (_, i) => ({
        posicaoLogica: i + 1,
        codigoFisico: null,
        estoque: 1,
        pendencia: null,
        statusCompra: null,
        diasCompra: null,
        diasRecebimento: null,
      })),
      perfil: PERFIL_EXPORT_REGIONAL_8CD,
    });
    assert.equal(r.quantidadePosicoes, 8);
  });

  it("43. headers dinâmicos 12 posições", () => {
    assert.equal(headersExcelCds(12).filter((h) => h.startsWith("ESTQ_CD")).length, 12);
  });
});
