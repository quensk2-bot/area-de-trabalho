import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularMetricasDm,
  camposPersistiveis,
  chaveDmTexto,
  DM_SCHEMA_PRODUTO_LOJA,
  executarPipelineDm,
  exportarAuditoria,
  exportarBaseCentral,
  exportarLayout5Cds,
  exportarLayout8Cds,
  exportarLayoutNCds,
  exportarLegadoFlatSomenteExportacao,
  formatarDiagnosticoTexto,
  gerarDiagnosticoDm,
  mapearCdsParaDmProdutoLojaCd,
  mapearConsolidadoParaDmProdutoLoja,
  obterSchemaPorTabela,
  validarEntradaConsolidado,
  validarLoteDm,
  validarPipeline,
} from "../datamart/index.ts";
import {
  CATALOGO_MT_5CD,
  consolidadoComFlatDivergente,
  consolidadoDataMart8Cds,
  consolidadoDataMart12Cds,
  consolidadoDataMartBase,
  DM_CD_ESPERADO_POS1,
  DM_PRODUTO_LOJA_ESPERADO,
} from "./fixtures/excelDataMartExpected.ts";
import { cdBase } from "./fixtures/cdsDinamicosFixtures.ts";

describe("Fase 3A — Data Mart publicação", () => {
  const base = consolidadoDataMartBase();

  it("01. mapeia dm_produto_loja a partir do consolidado", () => {
    const dm = mapearConsolidadoParaDmProdutoLoja(base);
    assert.equal(dm.regional, DM_PRODUTO_LOJA_ESPERADO.regional);
    assert.equal(dm.loja, 73);
    assert.equal(dm.seqproduto, 1000);
    assert.equal(dm.rede, "REDE DM");
    assert.equal(dm.quantidadeCds, 5);
  });

  it("02. quantidadeCds vem de cds.length", () => {
    const item = consolidadoDataMart8Cds();
    const dm = mapearConsolidadoParaDmProdutoLoja(item);
    assert.equal(dm.quantidadeCds, 8);
  });

  it("03. mapeia dm_produto_loja_cd exclusivamente de cds[]", () => {
    const linhas = mapearCdsParaDmProdutoLojaCd(base);
    assert.equal(linhas.length, 5);
    assert.equal(linhas[0].posicaoLogica, 1);
    assert.equal(linhas[0].estoque, DM_CD_ESPERADO_POS1.estoque);
  });

  it("04. flat legado não influencia mapeamento CD", () => {
    const item = consolidadoComFlatDivergente();
    const linhas = mapearCdsParaDmProdutoLojaCd(item);
    assert.equal(linhas.length, 2);
    assert.equal(linhas[0].estoque, 999);
    assert.notEqual(linhas[0].estoque, item.estoqueCd1);
  });

  it("05. suporta N CDs sem limite fixo", () => {
    const item = consolidadoDataMart12Cds();
    const linhas = mapearCdsParaDmProdutoLojaCd(item);
    assert.equal(linhas.length, 12);
    assert.equal(linhas[11].posicaoLogica, 12);
  });

  it("06. flag centralização por posição 1..5", () => {
    const linhas = mapearCdsParaDmProdutoLojaCd(base);
    const cd3 = linhas.find((l) => l.posicaoLogica === 3);
    assert.equal(cd3?.flagCentralizacao, 1);
    assert.equal(linhas.find((l) => l.posicaoLogica === 1)?.flagCentralizacao, 0);
  });

  it("07. posição >5 sem flag centralização", () => {
    const item = consolidadoDataMart8Cds();
    const linhas = mapearCdsParaDmProdutoLojaCd(item);
    assert.equal(linhas.find((l) => l.posicaoLogica === 8)?.flagCentralizacao, null);
  });

  it("08. chave natural única por produto", () => {
    const dm = mapearConsolidadoParaDmProdutoLoja(base);
    assert.equal(chaveDmTexto(dm), "MT|2026-03-26|73|1000");
  });

  it("09. schema produto_loja tem campos persistíveis", () => {
    const campos = camposPersistiveis("dm_produto_loja");
    assert.ok(campos.includes("regional"));
    assert.ok(campos.includes("comprador"));
    assert.ok(campos.includes("quantidadeCds"));
  });

  it("10. schema produto_loja_cd tem posicaoLogica", () => {
    const campos = camposPersistiveis("dm_produto_loja_cd");
    assert.ok(campos.includes("posicaoLogica"));
    assert.ok(campos.includes("estoque"));
  });

  it("11. campos legado flat marcados não persistir", () => {
    const legado = DM_SCHEMA_PRODUTO_LOJA.find((s) => s.campo === "estoqueCd1");
    assert.equal(legado?.persistir, "nao");
  });

  it("12. alertas marcados diagnostico only", () => {
    const alertas = DM_SCHEMA_PRODUTO_LOJA.find((s) => s.campo === "alertas");
    assert.equal(alertas?.persistir, "diagnostico");
  });

  it("13. validação entrada aceita consolidado válido", () => {
    const r = validarEntradaConsolidado([base]);
    assert.equal(r.valido, true);
  });

  it("14. validação rejeita regional ausente", () => {
    const r = validarEntradaConsolidado([consolidadoDataMartBase({ regional: "" })]);
    assert.equal(r.valido, false);
    assert.ok(r.itens.some((i) => i.codigo === "regional_ausente"));
  });

  it("15. validação rejeita produto duplicado", () => {
    const r = validarEntradaConsolidado([base, base]);
    assert.equal(r.valido, false);
    assert.ok(r.itens.some((i) => i.codigo === "produto_duplicado"));
  });

  it("16. validação rejeita posição CD duplicada", () => {
    const dup = consolidadoDataMartBase({
      cds: [cdBase(1, { estoque: 1 }), cdBase(1, { estoque: 2 })],
    });
    const r = validarEntradaConsolidado([dup]);
    assert.ok(r.itens.some((i) => i.codigo === "cd_posicao_duplicada"));
  });

  it("17. validar lote dm válido", () => {
    const pipeline = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    const r = validarLoteDm(pipeline.lote);
    assert.equal(r.valido, true);
  });

  it("18. pipeline retorna lote produtos + cds", () => {
    const r = executarPipelineDm({ consolidado: [base, consolidadoDataMart8Cds()], incluirExportacao: false });
    assert.equal(r.lote.produtos.length, 2);
    assert.equal(r.lote.cds.length, 13);
  });

  it("19. pipeline validação integrada", () => {
    const r = executarPipelineDm({ consolidado: [base] });
    assert.equal(r.validacao.valido, true);
  });

  it("20. pipeline métricas produtos", () => {
    const r = executarPipelineDm({ consolidado: [base, consolidadoDataMart8Cds()], incluirExportacao: false });
    assert.equal(r.metricas.produtos.total, 2);
    assert.equal(r.metricas.produtos.comCds, 2);
    assert.equal(r.metricas.produtos.maxCdsEmProduto, 8);
  });

  it("21. pipeline métricas CDs", () => {
    const r = executarPipelineDm({ consolidado: [consolidadoDataMart12Cds()], incluirExportacao: false });
    assert.equal(r.metricas.cds.totalLinhas, 12);
    assert.equal(r.metricas.cds.produtosPorQuantidade[12], 1);
  });

  it("22. pipeline métricas qualidade", () => {
    const r = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    assert.equal(r.metricas.qualidade.completo, 1);
  });

  it("23. pipeline métricas campos preenchidos", () => {
    const r = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    assert.ok(r.metricas.campos.taxaPreenchimentoProduto > 0.5);
    assert.ok(r.metricas.campos.taxaPreenchimentoCd > 0.5);
  });

  it("24. pipeline métricas volume e tempo", () => {
    const r = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    assert.ok(r.metricas.volumeBytesEstimado > 0);
    assert.ok(r.duracaoMs >= 0);
  });

  it("25. diagnóstico campos nulos", () => {
    const pipeline = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    const d = gerarDiagnosticoDm(pipeline.lote, [base]);
    assert.ok(Array.isArray(d.camposNulos));
    assert.equal(d.resumo.totalProdutos, 1);
  });

  it("26. diagnóstico produtos por quantidade CDs", () => {
    const items = [base, consolidadoDataMart8Cds()];
    const pipeline = executarPipelineDm({ consolidado: items, incluirExportacao: false });
    const d = gerarDiagnosticoDm(pipeline.lote, items);
    assert.equal(d.produtosPorQuantidadeCds[5], 1);
    assert.equal(d.produtosPorQuantidadeCds[8], 1);
  });

  it("27. diagnóstico alertas do consolidado", () => {
    const comAlerta = consolidadoDataMartBase({
      alertas: [{ codigo: "teste", mensagem: "alerta", severidade: "aviso" }],
    });
    const pipeline = executarPipelineDm({ consolidado: [comAlerta], incluirExportacao: false });
    const d = gerarDiagnosticoDm(pipeline.lote, [comAlerta]);
    assert.equal(d.resumo.produtosComAlertas, 1);
    assert.equal(d.alertasConsolidado.length, 1);
  });

  it("28. formatar diagnóstico texto", () => {
    const pipeline = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    const txt = formatarDiagnosticoTexto(gerarDiagnosticoDm(pipeline.lote, [base]));
    assert.match(txt, /Produtos: 1/);
  });

  it("29. exportar layout 5 CDs", () => {
    const r = exportarLayout5Cds(base, CATALOGO_MT_5CD);
    assert.equal(r.quantidadePosicoes, 5);
    assert.ok(Object.keys(r.colunas).some((k) => k.includes("CD1") || k.includes("ESTQ")));
  });

  it("30. exportar layout 8 CDs", () => {
    const item = consolidadoDataMart8Cds();
    const r = exportarLayout8Cds(item);
    assert.equal(r.quantidadePosicoes, 8);
    assert.ok(Object.keys(r.colunas).length > 5);
  });

  it("31. exportar layout N CDs auto", () => {
    const item = consolidadoDataMart12Cds();
    const r = exportarLayoutNCds(item, "auto");
    assert.equal(r.quantidadePosicoes, 12);
  });

  it("32. exportar base central", () => {
    const r = exportarBaseCentral(base);
    assert.ok(Object.keys(r.colunas).length >= 5);
  });

  it("33. exportar auditoria com código físico", () => {
    const item = consolidadoDataMartBase({
      cds: [
        cdBase(1, { estoque: 1, codigoFisico: 464 }),
        cdBase(2, { estoque: 2, codigoFisico: 468 }),
      ],
    });
    const r = exportarAuditoria(item, CATALOGO_MT_5CD);
    assert.ok(r.alertas.length === 0 || r.colunas);
    assert.ok(Object.keys(r.colunas).length > 0);
  });

  it("34. adaptador legado somente exportação", () => {
    const legado = exportarLegadoFlatSomenteExportacao(base.cds);
    assert.equal(legado.estoqueCd1, 10);
    assert.equal(legado.estoqueCd5, 50);
  });

  it("35. pipeline inclui exportação completa", () => {
    const r = executarPipelineDm({ consolidado: [base], catalogoPorPosicao: CATALOGO_MT_5CD });
    assert.equal(r.exportacao.length, 1);
    assert.ok(Object.keys(r.exportacao[0].layout5Cds).length > 0);
    assert.ok(Object.keys(r.exportacao[0].auditoria).length > 0);
  });

  it("36. pipeline sem exportação opcional", () => {
    const r = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    assert.equal(r.exportacao.length, 0);
  });

  it("37. validarPipeline combina entrada e lote", () => {
    const r = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    const v = validarPipeline([base], r.lote);
    assert.equal(v.valido, true);
  });

  it("38. calcularMetricasDm isolado", () => {
    const pipeline = executarPipelineDm({ consolidado: [base], incluirExportacao: false });
    const m = calcularMetricasDm(pipeline.lote, 10);
    assert.equal(m.duracaoMs, 10);
    assert.equal(m.produtos.total, 1);
  });

  it("39. obterSchemaPorTabela dm_produto_loja", () => {
    const s = obterSchemaPorTabela("dm_produto_loja");
    assert.ok(s.every((c) => c.tabela === "dm_produto_loja"));
    assert.ok(s.length > 10);
  });

  it("40. obterSchemaPorTabela dm_produto_loja_cd", () => {
    const s = obterSchemaPorTabela("dm_produto_loja_cd");
    assert.ok(s.some((c) => c.campo === "posicaoLogica"));
  });

  it("41. produto sem cds gera lote vazio filho", () => {
    const semCds = consolidadoDataMartBase({ cds: [] });
    const linhas = mapearCdsParaDmProdutoLojaCd(semCds);
    assert.equal(linhas.length, 0);
    const dm = mapearConsolidadoParaDmProdutoLoja(semCds);
    assert.equal(dm.quantidadeCds, 0);
  });

  it("42. BRE campos mapeados sem recálculo", () => {
    const item = consolidadoDataMartBase({ curtoPrazo: 0, medioPrazo: 1, longoPrazo: 0, classificacaoPrazo: "medio_prazo" });
    const dm = mapearConsolidadoParaDmProdutoLoja(item);
    assert.equal(dm.curtoPrazo, 0);
    assert.equal(dm.medioPrazo, 1);
    assert.equal(dm.classificacaoPrazo, "medio_prazo");
  });

  it("43. status operacional preservado", () => {
    const item = consolidadoDataMartBase({ statusOperacional: "medio_prazo" });
    const dm = mapearConsolidadoParaDmProdutoLoja(item);
    assert.equal(dm.statusOperacional, "medio_prazo");
  });

  it("44. export 8 CDs inclui posições 6-8", () => {
    const item = consolidadoDataMart8Cds();
    const r = exportarLayout8Cds(item);
    const keys = Object.keys(r.colunas);
    assert.ok(keys.some((k) => k.includes("6") || k.includes("CD6") || k.includes("ESTQ_CD6")));
  });
});
