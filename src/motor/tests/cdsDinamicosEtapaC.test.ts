import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadCatalogos } from "../catalog/catalogService.ts";
import {
  adaptarCdsLegadoFlat,
  chaveRegionalLojaProduto,
  chaveRegionalProduto,
  consolidarCdsProduto,
  consolidarLote,
  consolidarProdutoLoja,
  construirIndexes,
  criarMetricasVazias,
} from "../consolidar/index.ts";
import { criarMetricasCdsVazias } from "../consolidar/cds/consolidacaoCdsMetrics.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { ensureCatalogFixtures } from "./fixtures/catalogFixtures.ts";
import { cdBase } from "./fixtures/cdsDinamicosFixtures.ts";
import {
  breItemBase,
  breResultadoBase,
  cd5Base,
  cdsBloco1FromProdutoFlat,
  cdsBloco2FromCd5Flat,
  entradaConsolidadorBase,
  produtoConsolidadorBase,
  simularFlatLegadoConsolidado,
} from "./fixtures/consolidadorFixtures.ts";

function loadFixturesCatalogos() {
  const fixtures = ensureCatalogFixtures();
  return loadCatalogos({
    rede: fixtures.rede,
    compradores: fixtures.compradores,
    ordemCds: fixtures.ordemCds,
    plan6: fixtures.plan6,
    regras: fixtures.regras,
  }).catalogos;
}

function ctxTeste(entrada: ReturnType<typeof entradaConsolidadorBase>) {
  return {
    entrada,
    indexes: construirIndexes(entrada),
    diagnosticosJoin: [],
    duplicidades: [],
    erros: [],
    metricasParciais: criarMetricasVazias(entrada.produtosLoja.length),
    metricasCdsParciais: criarMetricasCdsVazias(),
  };
}

function flatCampos(item: MotorProdutoLojaConsolidado) {
  return adaptarCdsLegadoFlat(item.cds);
}

function gateMtEquivalencia(item: MotorProdutoLojaConsolidado, produto = produtoConsolidadorBase()) {
  const cd5 = cd5Base();
  const legado = simularFlatLegadoConsolidado(
    produto,
    cd5.estoqueCd5,
    cd5.pendenciaCd5,
    cd5.statusCompraCd5,
    cd5.diasCompraCd5,
    cd5.diasRecebtoCd5,
  );
  const adaptado = adaptarCdsLegadoFlat(item.cds);
  assert.deepEqual(adaptado, legado);
  assert.equal(item.curtoPrazo, 1);
  assert.equal(item.diasPedido, 5);
  assert.equal(item.textoProdutoCentralizado, "CD 101");
  assert.equal(item.statusEstoqueCds, "Estoque CD OK");
  assert.equal(item.statusSolicitacaoAtivacaoCd, "Ativo");
}

describe("Etapa C — consolidador cds[]", () => {
  it("01. consolidado com 1 CD", () => {
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(1, { estoque: 5 })],
      blocosComplementares: [],
      blocosEsperados: [],
    });
    assert.equal(r.cds.length, 1);
  });

  it("02. consolidado com 4 CDs", () => {
    const produto = produtoConsolidadorBase();
    const r = consolidarCdsProduto({
      regional: produto.regional,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
      cdsBlocoPrincipal: produto.cds,
      blocosComplementares: [],
      blocosEsperados: [],
    });
    assert.equal(r.cds.length, 4);
  });

  it("03. consolidado com 5 CDs", () => {
    const produto = produtoConsolidadorBase();
    const r = consolidarCdsProduto({
      regional: produto.regional,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
      cdsBlocoPrincipal: produto.cds,
      blocosComplementares: [{ numeroBloco: 2, origemArquivo: "g2.txt", loja: null, cds: cd5Base().cds }],
      blocosEsperados: [2],
    });
    assert.equal(r.cds.length, 5);
  });

  it("04. consolidado com 8 CDs", () => {
    const bloco1 = [1, 2, 3, 4].map((p) => cdBase(p, { numeroBloco: 1, origemArquivo: "b1.txt" }));
    const bloco2 = [5, 6, 7, 8].map((p) =>
      cdBase(p, {
        numeroBloco: 2,
        origemArquivo: "b2.txt",
        estoque: p === 8 ? 88 : p * 10,
        pendencia: p === 6 ? 66 : null,
        diasRecebimento: p === 7 ? 7 : null,
        codigoFisico: p === 8 ? 800 : p + 100,
      }),
    );
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 99,
      cdsBlocoPrincipal: bloco1,
      blocosComplementares: [{ numeroBloco: 2, origemArquivo: "b2.txt", loja: null, cds: bloco2 }],
      blocosEsperados: [2],
    });
    assert.equal(r.cds.length, 8);
    assert.equal(r.cds.find((c) => c.posicaoLogica === 8)?.estoque, 88);
    assert.equal(r.cds.find((c) => c.posicaoLogica === 6)?.pendencia, 66);
  });

  it("05. merge bloco 1 + bloco 2", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].cds.length, 5);
    assert.equal(r.itens[0].estoqueCd5, 3);
  });

  it("06. bloco 2 parcial", () => {
    const produto = produtoConsolidadorBase();
    const r = consolidarCdsProduto({
      regional: produto.regional,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
      cdsBlocoPrincipal: produto.cds,
      blocosComplementares: [
        {
          numeroBloco: 2,
          origemArquivo: "g2.txt",
          loja: null,
          cds: [cdBase(5, { estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null })],
        },
      ],
      blocosEsperados: [2],
    });
    assert.equal(r.cds.length, 5);
    assert.equal(r.cds.find((c) => c.posicaoLogica === 5)?.estoque, 1);
  });

  it("07. bloco 3 complementar", () => {
    const produto = produtoConsolidadorBase();
    const r = consolidarCdsProduto({
      regional: produto.regional,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
      cdsBlocoPrincipal: produto.cds,
      blocosComplementares: [
        { numeroBloco: 2, origemArquivo: "g2.txt", loja: null, cds: cd5Base().cds },
        { numeroBloco: 3, origemArquivo: "g3.txt", loja: null, cds: [cdBase(6, { estoque: 60, numeroBloco: 3 })] },
      ],
      blocosEsperados: [2],
    });
    assert.equal(r.cds.length, 6);
  });

  it("08. posição duplicada invalida", () => {
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(1, { numeroBloco: 1, origemArquivo: "a.txt" })],
      blocosComplementares: [
        { numeroBloco: 2, origemArquivo: "b.txt", loja: null, cds: [cdBase(1, { estoque: 9, numeroBloco: 2 })] },
      ],
      blocosEsperados: [],
    });
    assert.ok(r.posicaoDuplicada);
    assert.ok(r.alertas.some((a) => a.codigo === "cd_posicao_duplicada"));
    assert.equal(r.cds.filter((c) => c.posicaoLogica === 1).length, 0);
  });

  it("09. bloco sobreposto gera diagnóstico", () => {
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(3, { numeroBloco: 1 }), cdBase(4, { numeroBloco: 1 })],
      blocosComplementares: [
        { numeroBloco: 2, origemArquivo: "b.txt", loja: null, cds: [cdBase(3, { estoque: 99, numeroBloco: 2 })] },
      ],
      blocosEsperados: [],
    });
    assert.ok(r.blocoSobreposto || r.posicaoDuplicada);
  });

  it("10. posição fora de ordem mantém ordenação na saída", () => {
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(3), cdBase(1), cdBase(2)],
      blocosComplementares: [],
      blocosEsperados: [],
    });
    assert.deepEqual(
      r.cds.map((c) => c.posicaoLogica),
      [1, 2, 3],
    );
  });

  it("11. código físico ausente gera alerta", () => {
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(1, { codigoFisico: null })],
      blocosComplementares: [],
      blocosEsperados: [],
    });
    assert.ok(r.codigoFisicoAusente);
    assert.ok(r.alertas.some((a) => a.codigo === "cd_codigo_fisico_ausente"));
  });

  it("12. regional isolada no índice", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos);
    const indexes = construirIndexes(entrada);
    const chave = chaveRegionalProduto("NORDESTE", 2505088);
    assert.ok(indexes.blocosCdsPorChaveRegionalProduto.has(chave));
    assert.equal(indexes.blocosCdsPorChaveRegionalProduto.get("MT|999")?.length ?? 0, 0);
  });

  it("13. não cruzar regional", () => {
    const produto = produtoConsolidadorBase({ regional: "SUL" });
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      contexto: { regional: "SUL", dataReferencia: "2026-07-13", catalogos, blocosEsperados: [] },
      produtosLoja: [produto],
      cds5: new Map(),
    });
    const indexes = construirIndexes(entrada);
    assert.equal(indexes.blocosCdsPorChaveRegionalProduto.get("NORDESTE|2505088")?.length ?? 0, 0);
  });

  it("14. adaptador estoqueCd1", () => {
    const flat = adaptarCdsLegadoFlat([cdBase(1, { estoque: 42 })]);
    assert.equal(flat.estoqueCd1, 42);
    assert.equal(flat.estoqueCd2, null);
  });

  it("15. adaptador estoqueCd5", () => {
    const flat = adaptarCdsLegadoFlat([cdBase(5, { estoque: 55 })]);
    assert.equal(flat.estoqueCd5, 55);
  });

  it("16. adaptador sem CD5", () => {
    const flat = adaptarCdsLegadoFlat([cdBase(1), cdBase(2), cdBase(3), cdBase(4)]);
    assert.equal(flat.estoqueCd5, null);
  });

  it("17. coleção oficial contém posições que flat legado não expõe além de 5", () => {
    const merged = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(1, { estoque: 99 })],
      blocosComplementares: [
        { numeroBloco: 2, origemArquivo: "b2.txt", loja: null, cds: [cdBase(6, { estoque: 66 })] },
      ],
      blocosEsperados: [],
    });
    const flat = adaptarCdsLegadoFlat(merged.cds);
    assert.equal(merged.cds.find((c) => c.posicaoLogica === 6)?.estoque, 66);
    assert.equal(flat.estoqueCd5, null);
  });

  it("18. flat derivado da coleção", () => {
    const produto = produtoConsolidadorBase();
    const flat = adaptarCdsLegadoFlat([...produto.cds, ...cd5Base().cds]);
    assert.equal(flat.estoqueCd1, 10);
    assert.equal(flat.estoqueCd5, 3);
  });

  it("19. MT consolidado equivalente gate", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    gateMtEquivalencia(r.itens[0]);
  });

  it("20. MT CP preservado", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].classificacaoPrazo, "CP");
    assert.equal(r.itens[0].curtoPrazo, 1);
  });

  it("21. MT MP preservado", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "MP", curtoPrazo: 0, medioPrazo: 1, longoPrazo: 0 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].medioPrazo, 1);
  });

  it("22. MT LP preservado", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "LP", curtoPrazo: 0, medioPrazo: 0, longoPrazo: 1 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].longoPrazo, 1);
  });

  it("23. MT Dias Pedido preservado", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].diasPedido, 5);
  });

  it("24. MT Centralização preservada", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].produtoCentralizado, 101);
    assert.equal(r.itens[0].flagPrimeiroCd, 1);
  });

  it("25. produto com CD8 no cds[]", () => {
    const bloco1 = [1, 2, 3, 4].map((p) => cdBase(p, { numeroBloco: 1 }));
    const bloco2 = [5, 6, 7, 8].map((p) => cdBase(p, { numeroBloco: 2, origemArquivo: "b2.txt" }));
    const catalogos = loadFixturesCatalogos();
    const produto = produtoConsolidadorBase({ cds: bloco1 });
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produto],
      cds5: new Map(),
      blocosCdsComplementares: [
        { loja: null, seqproduto: 2505088, numeroBloco: 2, origemArquivo: "b2.txt", cds: bloco2 },
      ],
    });
    const r = consolidarLote(entrada);
    assert.equal(r.itens[0].cds.length, 8);
    assert.equal(r.itens[0].cds[7].posicaoLogica, 8);
  });

  it("26. produto com pendência CD6", () => {
    const cds = [cdBase(6, { pendencia: 12, numeroBloco: 2 })];
    const flat = adaptarCdsLegadoFlat(cds);
    assert.equal(flat.pendenciaCd5, null);
    assert.equal(cds[0].pendencia, 12);
  });

  it("27. Status Ativação vem do BRE não do cds[]", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ statusSolicitacaoAtivacaoCd: "Ativo CD8" })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].statusSolicitacaoAtivacaoCd, "Ativo CD8");
  });

  it("28. qualidade inválida por posição duplicada", () => {
    const catalogos = loadFixturesCatalogos();
    const produto = produtoConsolidadorBase();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produto],
      cds5: new Map(),
      blocosCdsComplementares: [
        {
          loja: null,
          seqproduto: 2505088,
          numeroBloco: 2,
          origemArquivo: "dup.txt",
          cds: [cdBase(1, { estoque: 999, numeroBloco: 2, origemArquivo: "dup.txt" })],
        },
      ],
    });
    const item = consolidarProdutoLoja(produto, ctxTeste(entrada), { duplicidadeBase: false });
    assert.equal(item.qualidadeDados, "invalido");
    assert.equal(item.statusOperacional, "erro_estrutural");
  });

  it("29. qualidade completo_com_alertas por código físico ausente", () => {
    const produto = produtoConsolidadorBase({
      cds: [cdBase(1, { codigoFisico: null, estoque: 1 })],
    });
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produto],
      cds5: new Map(),
      contexto: { regional: "NORDESTE", dataReferencia: "2026-07-13", catalogos, blocosEsperados: [] },
    });
    const item = consolidarProdutoLoja(produto, ctxTeste(entrada), { duplicidadeBase: false });
    assert.equal(item.qualidadeDados, "completo_com_alertas");
    assert.ok(item.alertas.some((a) => a.codigo === "cd_codigo_fisico_ausente"));
  });

  it("30. métricas dinâmicas no lote", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.metricas.cds.totalProdutosComCds, 1);
    assert.equal(r.metricas.cds.produtosCom5Cds, 1);
    assert.ok(r.metricas.cds.mediaCdsPorProduto >= 5);
  });

  it("31. entrada não mutada", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos);
    const snap = JSON.stringify(entrada.produtosLoja[0].cds);
    consolidarLote(entrada);
    assert.equal(JSON.stringify(entrada.produtosLoja[0].cds), snap);
  });

  it("32. saída cds[] ordenada", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    const pos = r.itens[0].cds.map((c) => c.posicaoLogica);
    assert.deepEqual(pos, [...pos].sort((a, b) => a - b));
  });

  it("33. nenhuma linha duplicada no lote base", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.metricas.linhasSaida, 1);
  });

  it("34. posição não contígua gera alerta", () => {
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: [cdBase(1), cdBase(2), cdBase(5)],
      blocosComplementares: [],
      blocosEsperados: [],
    });
    assert.ok(r.posicoesNaoContiguas);
    assert.ok(r.alertas.some((a) => a.codigo === "cd_posicao_nao_contigua"));
  });

  it("35. cenário 8 CDs — adaptador 1..5 e cds[] 1..8", () => {
    const bloco1 = [1, 2, 3, 4].map((p) =>
      cdBase(p, { numeroBloco: 1, origemArquivo: "b1.txt", codigoFisico: 100 + p }),
    );
    const bloco2 = [5, 6, 7, 8].map((p) =>
      cdBase(p, {
        numeroBloco: 2,
        origemArquivo: "b2.txt",
        estoque: p === 8 ? 800 : null,
        pendencia: p === 6 ? 6 : null,
        diasRecebimento: p === 7 ? 7 : null,
        codigoFisico: p === 8 ? 888 : 200 + p,
      }),
    );
    const merged = consolidarCdsProduto({
      regional: "MT",
      loja: 73,
      seqproduto: 1,
      cdsBlocoPrincipal: bloco1,
      blocosComplementares: [{ numeroBloco: 2, origemArquivo: "b2.txt", loja: null, cds: bloco2 }],
      blocosEsperados: [2],
    });
    const flat = adaptarCdsLegadoFlat(merged.cds);
    assert.equal(merged.cds.length, 8);
    assert.equal(flat.estoqueCd5, null);
    assert.equal(merged.cds.find((c) => c.posicaoLogica === 8)?.estoque, 800);
    assert.equal(merged.cds.find((c) => c.posicaoLogica === 6)?.pendencia, 6);
    assert.equal(merged.cds.find((c) => c.posicaoLogica === 7)?.diasRecebimento, 7);
  });

  it("36. chave preferencial regional+loja+produto", () => {
    const catalogos = loadFixturesCatalogos();
    const produto = produtoConsolidadorBase();
    const chaveLoja = chaveRegionalLojaProduto("NORDESTE", 103, 2505088);
    const entrada = entradaConsolidadorBase(catalogos, {
      blocosCdsComplementares: [
        {
          loja: 103,
          seqproduto: 2505088,
          numeroBloco: 2,
          origemArquivo: "loja.txt",
          cds: cdsBloco2FromCd5Flat(cd5Base({ estoqueCd5: 77 })),
        },
      ],
      cds5: new Map(),
    });
    const indexes = construirIndexes(entrada);
    assert.ok(indexes.blocosCdsPorChaveLojaProduto.has(chaveLoja));
    const r = consolidarLote(entrada);
    assert.equal(flatCampos(r.itens[0]).estoqueCd5, 77);
  });

  it("37. bloco ausente só quando esperado", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      cds5: new Map(),
      contexto: { regional: "NORDESTE", dataReferencia: "2026-07-13", catalogos, blocosEsperados: [2] },
    });
    const item = consolidarProdutoLoja(produtoConsolidadorBase(), ctxTeste(entrada), { duplicidadeBase: false });
    assert.ok(item.alertas.some((a) => a.codigo === "cd_bloco_ausente"));
  });

  it("38. sem cd_bloco_ausente quando blocosEsperados vazio", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      cds5: new Map(),
      contexto: { regional: "MT", dataReferencia: "2026-07-13", catalogos, blocosEsperados: [] },
    });
    const item = consolidarProdutoLoja(
      produtoConsolidadorBase({ regional: "MT" }),
      ctxTeste(entrada),
      { duplicidadeBase: false },
    );
    assert.ok(!item.alertas.some((a) => a.codigo === "cd_bloco_ausente"));
  });

  it("39. gate MT — campos flat adaptados iguais ao legado simulado", () => {
    const catalogos = loadFixturesCatalogos();
    const produto = produtoConsolidadorBase();
    const cd5 = cd5Base();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    const esperado = simularFlatLegadoConsolidado(
      produto,
      cd5.estoqueCd5,
      cd5.pendenciaCd5,
      cd5.statusCompraCd5,
      cd5.diasCompraCd5,
      cd5.diasRecebtoCd5,
    );
    assert.deepEqual(flatCampos(r.itens[0]), esperado);
  });

  it("40. nenhum limite de cinco no módulo consolidar/cds", () => {
    const oito = Array.from({ length: 8 }, (_, i) => cdBase(i + 1));
    const r = consolidarCdsProduto({
      regional: "MT",
      loja: 1,
      seqproduto: 1,
      cdsBlocoPrincipal: oito,
      blocosComplementares: [],
      blocosEsperados: [],
    });
    assert.equal(r.cds.length, 8);
  });
});

describe("Etapa C — alertas estruturais separados", () => {
  it("41. novos alertas cd_* não mascaram gate MT flat", () => {
    const catalogos = loadFixturesCatalogos();
    const produto = produtoConsolidadorBase({
      cds: produtoConsolidadorBase().cds.map((c) => ({ ...c, codigoFisico: null })),
    });
    const r = consolidarLote(
      entradaConsolidadorBase(catalogos, {
        produtosLoja: [produto],
        contexto: { regional: "NORDESTE", dataReferencia: "2026-07-13", catalogos, blocosEsperados: [2] },
      }),
    );
    const alertasCd = r.itens[0].alertas.filter((a) => a.codigo.startsWith("cd_"));
    const alertasLegado = r.itens[0].alertas.filter((a) => !a.codigo.startsWith("cd_"));
    assert.ok(alertasCd.some((a) => a.codigo === "cd_codigo_fisico_ausente"));
    assert.ok(alertasLegado.some((a) => a.codigo === "campo_sem_origem"));
    gateMtEquivalencia(r.itens[0], produto);
  });
});
