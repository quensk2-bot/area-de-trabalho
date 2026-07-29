import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadCatalogos } from "../catalog/catalogService.ts";
import { mergeCompradores, resolverComprador } from "../catalog/parseCompradores.ts";
import { parseRede, resolverRedeFornecedor } from "../catalog/parseRede.ts";
import { parseOrdemCd } from "../catalog/parseOrdemCds.ts";
import { isProdutoExclusivo, getModCurtoPrazo } from "../catalog/parseProdutosExclusivos.ts";
import { getNCurtoPrazo } from "../catalog/parseModalidadesExclusivas.ts";
import { ensureCatalogFixtures } from "./fixtures/catalogFixtures.ts";

const fixtures = ensureCatalogFixtures();

describe("catalog", () => {
  it("1. rede por fornecedor", () => {
    const rede = parseRede(fixtures.rede);
    assert.equal(resolverRedeFornecedor(rede.itens, 1001, null), "REDE ALPHA");
    assert.equal(rede.quantidadeCarregada, 3);
  });

  it("2. fornecedor sem rede", () => {
    const rede = parseRede(fixtures.rede);
    assert.equal(resolverRedeFornecedor(rede.itens, 1002, "FORN B"), "FORN B");
    assert.equal(resolverRedeFornecedor(rede.itens, 9999, "FALLBACK"), "FALLBACK");
  });

  it("3. comprador normal", () => {
    const loaded = loadCatalogos({ compradores: fixtures.compradores });
    const res = resolverComprador(loaded.catalogos.compradores, "REDE GAMMA", "PERFUMARIA", "HIGIENE", "SABONETE");
    assert.equal(res.comprador, "MARIA");
    assert.equal(res.origemComprador, "hierarquia_exata");
    assert.equal(res.fallbackComprador, false);
    assert.equal(res.alertas.length, 0);
  });

  it("4. comprador corrigido", () => {
    const loaded = loadCatalogos({ compradores: fixtures.compradores });
    const res = resolverComprador(loaded.catalogos.compradores, "REDE ALPHA", "MERCEARIA", "BEBIDAS", "REFRIGERANTES");
    assert.equal(res.comprador, "JOAO_CORR");
  });

  it("5. conflito de comprador", () => {
    const merged = mergeCompradores(
      [{ rede: "R1", secao: "S1", nivel2: "N2", nivel3: "N3", comprador: "A", origem: "principal" }],
      [{ rede: "R1", secao: "S1", nivel2: "N2", nivel3: "N3", comprador: "B", origem: "correcao" }],
    );
    assert.equal(merged.conflitos.length, 1);
    assert.equal(merged.itens[0].comprador, "B");
    assert.ok(merged.alertas.some((a) => a.includes("Conflito comprador")));
  });

  it("6. ordem de cinco CDs", () => {
    const ordem = parseOrdemCd(fixtures.ordemCds);
    assert.equal(ordem.itens.length, 1);
    const item = ordem.itens[0];
    assert.deepEqual([item.cd1, item.cd2, item.cd3, item.cd4, item.cd5], [101, 102, 103, 104, 105]);
  });

  it("7. bandeira sem ordem", () => {
    const ordem = parseOrdemCd(fixtures.ordemCds);
    const found = ordem.itens.find((o) => o.bandeira === "INEXISTENTE");
    assert.equal(found, undefined);
  });

  it("8. produto exclusivo", () => {
    const loaded = loadCatalogos({
      ordemCds: fixtures.ordemCds,
      bandeiraCsv: undefined,
      plan6Cd: fixtures.plan6,
    });
    assert.equal(isProdutoExclusivo(loaded.catalogos.produtosExclusivos, 9002), true);
    assert.equal(isProdutoExclusivo(loaded.catalogos.produtosExclusivos, 9001), false);
    assert.equal(getModCurtoPrazo(loaded.catalogos.produtosExclusivos, 9002), "LJ_Exclusiva");
  });

  it("9. produto/loja com G", () => {
    const loaded = loadCatalogos({ ordemCds: fixtures.ordemCds, plan6Cd: fixtures.plan6 });
    assert.equal(getNCurtoPrazo(loaded.catalogos.excecoesProdutoLoja, 9003, 104), "G");
  });

  it("10. produto/loja com NG", () => {
    const loaded = loadCatalogos({ ordemCds: fixtures.ordemCds, plan6Cd: fixtures.plan6 });
    assert.equal(getNCurtoPrazo(loaded.catalogos.excecoesProdutoLoja, 9002, 103), "NG");
  });

  it("11. exclusivo sem correspondência de loja", () => {
    const loaded = loadCatalogos({ ordemCds: fixtures.ordemCds, plan6Cd: fixtures.plan6 });
    assert.equal(getNCurtoPrazo(loaded.catalogos.excecoesProdutoLoja, 9002, 999), null);
  });

  it("25. hierarquia incompleta no comprador", () => {
    const catalogo = [
      { rede: "REDE MULTI", secao: "D1", nivel2: "S1", nivel3: "C1", comprador: "ANA", origem: "principal" as const },
      { rede: "REDE MULTI", secao: "D2", nivel2: "S2", nivel3: "C2", comprador: "JOAO", origem: "principal" as const },
    ];
    const res = resolverComprador(catalogo, "REDE MULTI", null, "BEBIDAS", "REFRIGERANTES");
    assert.equal(res.comprador, null);
    assert.ok(res.alertas.some((a) => a.includes("Hierarquia incompleta")));
    assert.ok(res.alertas.some((a) => a.includes("fallback") || a.includes("Fallback")));
  });

  it("26. 3M resolve LUCIMARY somente porque a rede possui comprador único", () => {
    const catalogo = [
      {
        rede: "3M DO BRASIL",
        secao: "63-BAZAR",
        nivel2: "47-UTILIDADES DOMESTICAS",
        nivel3: "LIMPEZA BAZAR",
        comprador: "LUCIMARY",
        origem: "correcao" as const,
      },
      {
        rede: "3M DO BRASIL",
        secao: "63-BAZAR",
        nivel2: "51-BASICO BAZAR",
        nivel3: "PAPELARIA",
        comprador: "LUCIMARY",
        origem: "correcao" as const,
      },
    ];
    const res = resolverComprador(catalogo, "3M DO BRASIL", "60-MERCEARIA", "34-PERFUMARIA", null);
    assert.equal(res.comprador, "LUCIMARY");
    assert.equal(res.origemComprador, "rede_unica");
    assert.equal(res.chaveComprador, "rede:3M DO BRASIL");
    assert.equal(res.fallbackComprador, true);
  });

  it("27. rede com compradores distintos nunca recebe fallback", () => {
    const catalogo = [
      { rede: "R", secao: "D1", nivel2: "S1", nivel3: "C1", comprador: "ANA", origem: "principal" as const },
      { rede: "R", secao: "D2", nivel2: "S2", nivel3: "C2", comprador: "JOAO", origem: "principal" as const },
    ];
    const res = resolverComprador(catalogo, "R", "D9", "S9", "C9");
    assert.equal(res.comprador, null);
    assert.equal(res.fallbackComprador, false);
  });
});
