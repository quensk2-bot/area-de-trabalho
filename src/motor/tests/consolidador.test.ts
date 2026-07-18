import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processarBre } from "../bre/index.ts";
import type { MotorBreEntrada } from "../bre/breTypes.ts";
import { loadCatalogos } from "../catalog/catalogService.ts";
import {
  calcularQualidadeDados,
  calcularStatusOperacional,
  chaveConsolidacao,
  consolidarLote,
  consolidarProdutoLoja,
  construirIndexes,
  criarMetricasVazias,
  deduplicarAlertas,
  detectarDuplicidadesBase,
  joinBlocosCdsComplementares,
  joinCd5,
  ordenarProdutos,
  validarChaveConsolidacao,
} from "../consolidar/index.ts";
import { criarMetricasCdsVazias } from "../consolidar/cds/consolidacaoCdsMetrics.ts";
import { compararExcelV7 } from "../compare/compareExcelV7.ts";
import { CAMPOS_PRIORITARIOS_COMPARE } from "../compare/compareTypes.ts";
import { ensureCatalogFixtures } from "./fixtures/catalogFixtures.ts";
import {
  breItemBase,
  breResultadoBase,
  cd5Base,
  entradaConsolidadorBase,
  produtoConsolidadorBase,
} from "./fixtures/consolidadorFixtures.ts";
import {
  EXCEL_CONSOLIDADO_DIVERGENTE,
  EXCEL_CONSOLIDADO_FIXTURE,
  mapConsolidadoParaCompare,
} from "./fixtures/excelConsolidadoExpected.ts";

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

function ctxConsolidadorTeste(
  entrada: ReturnType<typeof entradaConsolidadorBase>,
  indexes: ReturnType<typeof construirIndexes>,
) {
  return {
    entrada,
    indexes,
    diagnosticosJoin: [] as import("../consolidar/consolidacaoTypes.ts").MotorJoinDiagnostico[],
    duplicidades: [],
    erros: [],
    metricasParciais: criarMetricasVazias(1),
    metricasCdsParciais: criarMetricasCdsVazias(),
  };
}

describe("consolidador keys", () => {
  it("01. chave válida regional|loja|seqproduto", () => {
    assert.equal(chaveConsolidacao("NORDESTE", 103, 2505088), "NORDESTE|103|2505088");
    assert.equal(validarChaveConsolidacao("NORDESTE", 103, 2505088).valida, true);
  });

  it("02. chave inválida — regional vazia", () => {
    const r = validarChaveConsolidacao("", 103, 2505088);
    assert.equal(r.valida, false);
    if (!r.valida) assert.match(r.motivo, /regional/i);
  });

  it("03. chave inválida — loja zero", () => {
    assert.equal(validarChaveConsolidacao("NORDESTE", 0, 2505088).valida, false);
  });

  it("04. chave inválida — produto negativo", () => {
    assert.equal(validarChaveConsolidacao("NORDESTE", 103, -1).valida, false);
  });
});

describe("consolidador duplicidade base", () => {
  it("05. detecta duplicidade na base principal", () => {
    const produtos = [
      produtoConsolidadorBase(),
      produtoConsolidadorBase({ descricao: "OUTRA LINHA" }),
    ];
    const dup = detectarDuplicidadesBase(produtos);
    assert.equal(dup.get("NORDESTE|103|2505088"), 2);
  });

  it("06. duplicidade gera erro estrutural e invalido", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produtoConsolidadorBase(), produtoConsolidadorBase({ descricao: "DUP" })],
    });
    const r = consolidarLote(entrada);
    assert.equal(r.itens.length, 1);
    assert.equal(r.itens[0].statusOperacional, "erro_estrutural");
    assert.equal(r.itens[0].qualidadeDados, "invalido");
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "duplicidade_base"));
  });

  it("07. duplicidade registra diagnóstico com quantidade", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produtoConsolidadorBase(), produtoConsolidadorBase(), produtoConsolidadorBase()],
    });
    const r = consolidarLote(entrada);
    assert.equal(r.duplicidades.length, 1);
    assert.equal(r.duplicidades[0].quantidade, 3);
    assert.equal(r.duplicidades[0].chave, "NORDESTE|103|2505088");
  });

  it("08. duplicidade não gera duas linhas de saída", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produtoConsolidadorBase(), produtoConsolidadorBase({ descricao: "X" })],
    });
    const r = consolidarLote(entrada);
    assert.equal(r.metricas.linhasEntrada, 2);
    assert.equal(r.metricas.linhasSaida, 1);
  });
});

describe("consolidador joins", () => {
  it("09. join CD5 presente", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].estoqueCd5, 3);
    assert.equal(r.itens[0].diasRecebtoCd5, 2);
  });

  it("10. join CD5 ausente", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, { cds5: new Map() });
    const r = consolidarLote(entrada);
    assert.equal(r.itens[0].estoqueCd5, null);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "grupo2_ausente"));
  });

  it("11. join CD5 ambíguo", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos);
    const indexes = construirIndexes(entrada);
    indexes.blocosCdsPorChaveRegionalProduto.set("NORDESTE|2505088", [
      { numeroBloco: 2, origemArquivo: "a.txt", loja: null, cds: cd5Base({ estoqueCd5: 1 }).cds },
      { numeroBloco: 2, origemArquivo: "b.txt", loja: null, cds: cd5Base({ estoqueCd5: 9 }).cds },
    ]);
    const diagnosticos: import("../consolidar/consolidacaoTypes.ts").MotorJoinDiagnostico[] = [];
    const join = joinBlocosCdsComplementares("NORDESTE", 103, 2505088, indexes, diagnosticos);
    assert.equal(join.blocos.length, 0);
    assert.ok(join.alertas.some((a) => a.codigo === "cd5_ambiguo"));

    const ctx = ctxConsolidadorTeste(entrada, indexes);
    const item = consolidarProdutoLoja(entrada.produtosLoja[0], ctx, { duplicidadeBase: false });
    assert.equal(item.estoqueCd5, null);
    assert.equal(item.qualidadeDados, "incompleto");
  });

  it("12. inventário ausente", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, { inventario: new Map() });
    const r = consolidarLote(entrada);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "inventario_ausente"));
  });

  it("13. validação ausente", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, { validacao: new Map() });
    const r = consolidarLote(entrada);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "validacao_ausente"));
  });
});

describe("consolidador rede e comprador", () => {
  it("14. rede via NOME_REC", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].rede, "REDE ALPHA");
  });

  it("15. rede ausente sem NOME_REC — não usa RAZAO", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produtoConsolidadorBase({ codFornecedor: 1002, fornecedor: "FORN B" })],
    });
    const r = consolidarLote(entrada);
    assert.equal(r.itens[0].rede, null);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "rede_ausente"));
  });

  it("16. comprador via hierarquia", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].comprador, "JOAO_CORR");
  });

  it("17. comprador ausente sem rede", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produtoConsolidadorBase({ codFornecedor: 9999 })],
    });
    const r = consolidarLote(entrada);
    assert.equal(r.itens[0].comprador, null);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "comprador_ausente"));
  });

  it("18. comprador ausente hierarquia incompleta", () => {
    const catalogos = loadFixturesCatalogos();
    const p = produtoConsolidadorBase();
    p.hierarquia = { ...p.hierarquia, setorN2: null, niveisEncontrados: 3 };
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { produtosLoja: [p] }));
    assert.equal(r.itens[0].comprador, null);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "comprador_ausente"));
  });
});

describe("consolidador BRE consumo", () => {
  it("19. consome classificação CP do BRE", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].classificacaoPrazo, "curto_prazo");
    assert.equal(r.itens[0].curtoPrazo, 1);
    assert.equal(r.itens[0].statusOperacional, "curto_prazo");
  });

  it("20. consome dias pedido e ações do BRE", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].diasPedido, 5);
    assert.match(r.itens[0].acaoCurtoPrazo ?? "", /Recebimento Próximo/);
  });

  it("21. consome centralização do BRE", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].textoProdutoCentralizado, "CD 101");
    assert.equal(r.itens[0].produtoCentralizado, 101);
    assert.equal(r.itens[0].flagPrimeiroCd, 1);
    assert.equal(r.itens[0].primeiroCd, 101);
  });

  it("22. BRE ausente bloqueia operação", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, { bre: null });
    const r = consolidarLote(entrada);
    assert.equal(r.itens[0].statusOperacional, "bloqueado");
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "resultado_bre_ausente"));
  });

  it("23. integração processarBre → consolidar", () => {
    const catalogos = loadFixturesCatalogos();
    const produto = produtoConsolidadorBase();
    const chave = `${produto.loja}|${produto.seqproduto}`;
    const entradaBre: MotorBreEntrada = {
      contexto: { regional: "NORDESTE", dataReferencia: "2026-07-13", catalogos, alertas: [] },
      produtosLoja: [produto],
      cds5: new Map([[2505088, cd5Base()]]),
      inventario: new Map([[chave, { loja: 103, produto: 2505088, inventarioUnid: 0 }]]),
      validacao: new Map([
        [chave, { numeroLinha: 1, loja: 103, produto: 2505088, qtdItemRupturaNoMix: 1, qtdItemRuptura: 1, geraRuptura: true, ruptura104c: false }],
      ]),
    };
    const bre = processarBre(entradaBre);
    const consolidado = consolidarLote(
      entradaConsolidadorBase(catalogos, { bre, produtosLoja: [produto] }),
    );
    assert.equal(bre.itens.length, 1);
    assert.equal(consolidado.itens.length, 1);
    assert.equal(consolidado.itens[0].loja, produto.loja);
    assert.ok(consolidado.itens[0].baseLimpa != null || consolidado.itens[0].somaEstoqueCd != null);
  });
});

describe("consolidador posicaoCdSelecionada", () => {
  it("24. posição vem do resultado estruturado BRE", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].posicaoCdSelecionada, 1);
    assert.equal(r.itens[0].codigoCdSelecionado, 101);
  });

  it("25. posição null quando centralização incompleta", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([
      breItemBase({
        posicaoCdSelecionada: null,
        textoProdutoCentralizado: "CD 101",
        produtoCentralizado: 101,
      }),
    ]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].posicaoCdSelecionada, null);
    assert.ok(r.itens[0].alertas.some((a) => a.codigo === "resultado_centralizacao_incompleto"));
  });

  it("26. posição null sem BRE — não infere do texto", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre: null }));
    assert.equal(r.itens[0].posicaoCdSelecionada, null);
    assert.equal(r.itens[0].textoProdutoCentralizado, null);
  });

  it("27. posição 3 propagada do BRE", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ posicaoCdSelecionada: 3, codigoCdSelecionado: 103 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].posicaoCdSelecionada, 3);
    assert.equal(r.itens[0].codigoCdSelecionado, 103);
  });
});

describe("consolidador campos bloqueados", () => {
  it("28. campos sem origem ficam null", () => {
    const catalogos = loadFixturesCatalogos();
    const item = consolidarLote(entradaConsolidadorBase(catalogos)).itens[0];
    assert.equal(item.qtdeEmbCompra, null);
    assert.equal(item.pesoUnid, null);
    assert.equal(item.m3Unid, null);
    assert.equal(item.coberturaDias, null);
    assert.equal(item.setorCodigo, null);
    assert.equal(item.setorNome, null);
    assert.equal(item.categoriaN1, null);
  });

  it("29. alerta campo_sem_origem para bloqueados", () => {
    const catalogos = loadFixturesCatalogos();
    const item = consolidarLote(entradaConsolidadorBase(catalogos)).itens[0];
    const bloqueados = item.alertas.filter((a) => a.codigo === "campo_sem_origem");
    assert.ok(bloqueados.length >= 7);
  });
});

describe("consolidador status e qualidade", () => {
  it("30. médio prazo operacional", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "MP", curtoPrazo: 0, medioPrazo: 1, longoPrazo: 0 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].statusOperacional, "medio_prazo");
  });

  it("31. longo prazo operacional", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "LP", curtoPrazo: 0, medioPrazo: 0, longoPrazo: 1 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].statusOperacional, "longo_prazo");
  });

  it("32. sem ruptura", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([
      breItemBase({ classificacaoPrazo: null, curtoPrazo: 0, medioPrazo: 0, longoPrazo: 0 }),
    ]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].statusOperacional, "sem_ruptura");
    assert.equal(r.itens[0].classificacaoPrazo, "sem_ruptura");
  });

  it("33. qualidade completo_com_alertas", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, { inventario: new Map() });
    const r = consolidarLote(entrada);
    assert.equal(r.itens[0].qualidadeDados, "completo_com_alertas");
  });

  it("34. calcularQualidadeDados invalido por duplicidade", () => {
    assert.equal(
      calcularQualidadeDados([], [], true, false, false),
      "invalido",
    );
  });

  it("35. calcularStatusOperacional erro estrutural chave inválida", () => {
    assert.equal(
      calcularStatusOperacional({
        chaveInvalida: true,
        duplicidadeBase: false,
        breAusente: false,
        breBloqueado: false,
        curtoPrazo: 1,
        medioPrazo: 0,
        longoPrazo: 0,
        classificacaoConfiavel: true,
      }),
      "erro_estrutural",
    );
  });
});

describe("consolidador lote", () => {
  it("36. ordenação determinística regional→loja→produto", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [
        produtoConsolidadorBase({ loja: 104, seqproduto: 2 }),
        produtoConsolidadorBase({ loja: 103, seqproduto: 99 }),
        produtoConsolidadorBase({ loja: 103, seqproduto: 1 }),
      ],
      bre: breResultadoBase([
        breItemBase({ loja: 104, seqproduto: 2 }),
        breItemBase({ loja: 103, seqproduto: 99 }),
        breItemBase({ loja: 103, seqproduto: 1 }),
      ]),
      cds5: new Map([
        [2, cd5Base({ seqproduto: 2 })],
        [99, cd5Base({ seqproduto: 99 })],
        [1, cd5Base({ seqproduto: 1 })],
      ]),
    });
    const ordenados = ordenarProdutos(entrada);
    assert.deepEqual(
      ordenados.map((p) => `${p.loja}|${p.seqproduto}`),
      ["103|1", "103|99", "104|2"],
    );
  });

  it("37. imutabilidade da entrada", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos);
    const snapshot = JSON.stringify(entrada.produtosLoja);
    consolidarLote(entrada);
    assert.equal(JSON.stringify(entrada.produtosLoja), snapshot);
  });

  it("38. métricas linhas entrada e saída", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.metricas.linhasEntrada, 1);
    assert.equal(r.metricas.linhasSaida, 1);
    assert.ok(r.metricas.duracaoMs >= 0);
  });

  it("39. deduplicar alertas", () => {
    const dedup = deduplicarAlertas([
      { codigo: "x", mensagem: "a", severidade: "aviso" },
      { codigo: "x", mensagem: "a", severidade: "aviso" },
      { codigo: "y", mensagem: "b", severidade: "info" },
    ]);
    assert.equal(dedup.length, 2);
  });

  it("40. bandeira resolvida do catálogo", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].bandeira, "FORT");
  });
});

describe("consolidador compare harness", () => {
  it("41. fixture consolidado igual", () => {
    const campos = CAMPOS_PRIORITARIOS_COMPARE.filter((c) =>
      ["Curto Prazo", "Dias Pedido", "Produto Centralizado", "1ºCD", "Ação Curto Prazo"].includes(c.campo),
    );
    const r = compararExcelV7(EXCEL_CONSOLIDADO_FIXTURE, campos);
    assert.equal(r.resumo.divergentes, 0);
  });

  it("42. fixture consolidado divergente comprador", () => {
    const campos = [{ campo: "Comprador", comparavelNestaEtapa: true }];
    const r = compararExcelV7(EXCEL_CONSOLIDADO_DIVERGENTE, campos);
    assert.equal(r.resumo.divergentes, 1);
  });

  it("43. mapConsolidadoParaCompare inclui status", () => {
    const catalogos = loadFixturesCatalogos();
    const item = consolidarLote(entradaConsolidadorBase(catalogos)).itens[0];
    const mapped = mapConsolidadoParaCompare(item);
    assert.equal(mapped.Rede, "REDE ALPHA");
    assert.equal(mapped.qualidadeDados, "completo_com_alertas");
  });
});

describe("consolidador item isolado", () => {
  it("44. consolidarProdutoLoja chave inválida", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos, {
      produtosLoja: [produtoConsolidadorBase({ regional: "" })],
    });
    const indexes = construirIndexes(entrada);
    const ctx = ctxConsolidadorTeste(entrada, indexes);
    const item = consolidarProdutoLoja(entrada.produtosLoja[0], ctx, { duplicidadeBase: false });
    assert.equal(item.statusOperacional, "erro_estrutural");
    assert.ok(item.alertas.some((a) => a.codigo === "chave_invalida"));
  });

  it("45. dados incompletos com blocos CDs ambíguos", () => {
    const catalogos = loadFixturesCatalogos();
    const entrada = entradaConsolidadorBase(catalogos);
    const indexes = construirIndexes(entrada);
    indexes.blocosCdsPorChaveRegionalProduto.set("NORDESTE|2505088", [
      { numeroBloco: 2, origemArquivo: "a.txt", loja: null, cds: cd5Base({ estoqueCd5: 1 }).cds },
      { numeroBloco: 2, origemArquivo: "b.txt", loja: null, cds: cd5Base({ estoqueCd5: 9 }).cds },
    ]);
    const ctx = ctxConsolidadorTeste(entrada, indexes);
    const item = consolidarProdutoLoja(entrada.produtosLoja[0], ctx, { duplicidadeBase: false });
    assert.equal(item.statusOperacional, "dados_incompletos");
    assert.equal(item.qualidadeDados, "incompleto");
  });
});
