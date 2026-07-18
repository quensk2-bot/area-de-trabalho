import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorBreItemInput } from "../bre/breTypes.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import { classificarPrazo } from "../bre/classificarPrazo.ts";
import { loadCatalogos } from "../catalog/catalogService.ts";
import {
  calcularClassificacaoPrazoPublicacao,
  calcularStatusOperacional,
} from "../consolidar/consolidacaoDiagnostics.ts";
import { consolidarLote } from "../consolidar/index.ts";
import { executarPipelineDm } from "../datamart/dmPipeline.ts";
import { mapearClassificacaoPrazoParaDb } from "../persistencia/persistenciaMapper.ts";
import { ensureCatalogFixtures } from "./fixtures/catalogFixtures.ts";
import {
  breItemBase,
  breResultadoBase,
  entradaConsolidadorBase,
  produtoConsolidadorBase,
} from "./fixtures/consolidadorFixtures.ts";
import { consolidadoDataMartBase } from "./fixtures/excelDataMartExpected.ts";

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

function produtoBase(overrides: Partial<MotorProdutoLojaNormalizado> = {}): MotorProdutoLojaNormalizado {
  return {
    regional: "NORDESTE",
    dataReferencia: "2026-07-13",
    loja: 103,
    seqproduto: 2505088,
    descricao: "TESTE",
    codFornecedor: 1001,
    fornecedor: "FORN",
    statusProduto: "A",
    familia: null,
    mediaVendaUnDia: 1,
    mediaVendaGp: 1,
    estoqueLoja: 5,
    parMin: 1,
    parMax: 10,
    pendenciaLoja: 0,
    diasCompraLj: null,
    diasRuptura: 1,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    embalagemCompra: null,
    custoLiquido: null,
    hierarquia: { divisao: "D", setorN2: "S2", grupoN3: "G3", subgrupoN4: "SG4", tipoN5: "T5", niveisEncontrados: 5 },
    estoqueCd1: 10,
    pendenciaCd1: 0,
    diasCompraCd1: null,
    diasRecebtoCd1: null,
    estoqueCd2: null,
    pendenciaCd2: null,
    diasCompraCd2: null,
    diasRecebtoCd2: null,
    estoqueCd3: null,
    pendenciaCd3: null,
    diasCompraCd3: null,
    diasRecebtoCd3: null,
    estoqueCd4: null,
    pendenciaCd4: null,
    diasCompraCd4: null,
    diasRecebtoCd4: null,
    estoqueCd5: null,
    pendenciaCd5: null,
    diasCompraCd5: null,
    diasRecebtoCd5: null,
    ...overrides,
  };
}

function itemInput(overrides: Partial<MotorBreItemInput> = {}): MotorBreItemInput {
  return {
    produto: produtoBase(),
    cd5: null,
    validacao: null,
    inventario: null,
    ...overrides,
  };
}

describe("classificacaoPrazo publicacao Fase 3C.1", () => {
  it("01. CP gera curto_prazo no consolidado", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(r.itens[0].classificacaoPrazo, "curto_prazo");
    assert.equal(r.itens[0].curtoPrazo, 1);
  });

  it("02. MP gera medio_prazo no consolidado", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "MP", curtoPrazo: 0, medioPrazo: 1, longoPrazo: 0 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].classificacaoPrazo, "medio_prazo");
  });

  it("03. LP gera longo_prazo no consolidado", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "LP", curtoPrazo: 0, medioPrazo: 0, longoPrazo: 1 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].classificacaoPrazo, "longo_prazo");
  });

  it("04. sem ruptura gera sem_ruptura", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([
      breItemBase({ classificacaoPrazo: null, curtoPrazo: 0, medioPrazo: 0, longoPrazo: 0 }),
    ]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].classificacaoPrazo, "sem_ruptura");
  });

  it("05. bloqueio gera bloqueado", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre: null }));
    assert.equal(r.itens[0].classificacaoPrazo, "bloqueado");
  });

  it("06. dados incompletos gera dados_incompletos", () => {
    const status = calcularStatusOperacional({
      chaveInvalida: false,
      duplicidadeBase: false,
      breAusente: false,
      breBloqueado: false,
      curtoPrazo: 0,
      medioPrazo: 0,
      longoPrazo: 0,
      classificacaoConfiavel: false,
    });
    assert.equal(calcularClassificacaoPrazoPublicacao(status), "dados_incompletos");
  });

  it("07. precedencia CP sobre MP no BRE", () => {
    const r = classificarPrazo({
      item: itemInput(),
      statusBaseLimpa: "Base Limpa",
      menorQueTres: 1,
      somaEstoqueCd: 10,
      modCurtoPrazo: null,
      ncurtoPrazo: null,
    });
    assert.equal(r.classificacaoPrazo, "CP");
    assert.equal(r.medioPrazo, 0);
  });

  it("08. precedencia MP sobre LP no BRE", () => {
    const r = classificarPrazo({
      item: itemInput({ produto: produtoBase({ estoqueCd1: 0, pendenciaLoja: 10 }) }),
      statusBaseLimpa: "Base Limpa",
      menorQueTres: 1,
      somaEstoqueCd: 0,
      modCurtoPrazo: null,
      ncurtoPrazo: null,
    });
    assert.equal(r.classificacaoPrazo, "MP");
    assert.equal(r.longoPrazo, 0);
  });

  it("09. todo produto valido do consolidador possui classificacao", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    for (const item of r.itens) {
      assert.ok(item.classificacaoPrazo);
    }
  });

  it("10. mapper preserva enum publicado", () => {
    assert.equal(mapearClassificacaoPrazoParaDb("sem_ruptura"), "sem_ruptura");
    assert.equal(mapearClassificacaoPrazoParaDb("bloqueado"), "bloqueado");
    assert.equal(mapearClassificacaoPrazoParaDb("dados_incompletos"), "dados_incompletos");
    assert.equal(mapearClassificacaoPrazoParaDb("curto_prazo"), "curto_prazo");
  });

  it("11. Data Mart aceita todos os estados", () => {
    const estados = ["curto_prazo", "medio_prazo", "longo_prazo", "sem_ruptura", "bloqueado", "dados_incompletos"] as const;
    for (const estado of estados) {
      const dm = executarPipelineDm({
        consolidado: [consolidadoDataMartBase({ classificacaoPrazo: estado, statusOperacional: estado === "dados_incompletos" ? "dados_incompletos" : estado })],
      });
      assert.equal(dm.lote.produtos[0].classificacaoPrazo, estado);
      assert.equal(dm.validacao.itens.filter((i) => i.campo === "classificacaoPrazo" && i.severidade === "erro").length, 0);
    }
  });

  it("12. produto invalido continua bloqueado na classificacao", () => {
    const catalogos = loadFixturesCatalogos();
    const p = produtoConsolidadorBase();
    const r = consolidarLote(
      entradaConsolidadorBase(catalogos, {
        produtosLoja: [p, p],
      }),
    );
    assert.equal(r.itens[0].qualidadeDados, "invalido");
    assert.equal(r.itens[0].classificacaoPrazo, "bloqueado");
  });

  it("13. zero alteracao em Dias Pedido", () => {
    const catalogos = loadFixturesCatalogos();
    const antes = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.equal(antes.itens[0].diasPedido, 5);
  });

  it("14. zero alteracao nas Acoes", () => {
    const catalogos = loadFixturesCatalogos();
    const r = consolidarLote(entradaConsolidadorBase(catalogos));
    assert.match(r.itens[0].acaoCurtoPrazo ?? "", /Recebimento/);
  });

  it("15. erro estrutural mapeia bloqueado", () => {
    assert.equal(calcularClassificacaoPrazoPublicacao("erro_estrutural"), "bloqueado");
  });

  it("16. BRE legado CP mapeado via status operacional", () => {
    const catalogos = loadFixturesCatalogos();
    const bre = breResultadoBase([breItemBase({ classificacaoPrazo: "CP", curtoPrazo: 1, medioPrazo: 0, longoPrazo: 0 })]);
    const r = consolidarLote(entradaConsolidadorBase(catalogos, { bre }));
    assert.equal(r.itens[0].statusOperacional, "curto_prazo");
    assert.equal(r.itens[0].classificacaoPrazo, "curto_prazo");
  });

  it("17. BRE interno inalterado — classificarPrazo ainda retorna CP|MP|LP|null", () => {
    const r = classificarPrazo({
      item: itemInput(),
      statusBaseLimpa: "Base Limpa",
      menorQueTres: 1,
      somaEstoqueCd: 10,
      modCurtoPrazo: null,
      ncurtoPrazo: null,
    });
    assert.equal(r.classificacaoPrazo, "CP");
  });

  it("18. gate Data Mart verde para lote consolidado fixture", () => {
    const item = consolidadoDataMartBase();
    const dm = executarPipelineDm({ consolidado: [item] });
    assert.equal(dm.validacao.valido, true);
  });
});
