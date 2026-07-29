import assert from "node:assert";
import { describe, it } from "node:test";
import { validarListaLojas } from "../catalog/resolverLojas.ts";

describe("validarListaLojas", () => {
  it("aceita lista vazia", () => {
    const r = validarListaLojas([]);
    assert.equal(r.ok, true);
    assert.deepEqual(r.erros, []);
  });

  it("aceita lista de lojas válidas", () => {
    const r = validarListaLojas([73, 82, 83, 88]);
    assert.equal(r.ok, true);
    assert.deepEqual(r.erros, []);
  });

  it("rejeita loja zero", () => {
    const r = validarListaLojas([0, 73]);
    assert.equal(r.ok, false);
    assert.ok(r.erros.some((e) => e.includes("0")));
  });

  it("rejeita loja negativa", () => {
    const r = validarListaLojas([-1, 73]);
    assert.equal(r.ok, false);
    assert.ok(r.erros.some((e) => e.includes("-1")));
  });

  it("rejeita loja duplicada", () => {
    const r = validarListaLojas([73, 82, 73]);
    assert.equal(r.ok, false);
    assert.ok(r.erros.some((e) => e.includes("duplicada") && e.includes("73")));
  });

  it("reporta múltiplos erros", () => {
    const r = validarListaLojas([0, -1, 73, 73]);
    assert.equal(r.ok, false);
    assert.ok(r.erros.length >= 2);
  });

  it("lojas MT COMPER válidas", () => {
    const r = validarListaLojas([73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173]);
    assert.equal(r.ok, true);
  });
});

describe("resolverLojasFromBandeiraCsv (catálogo real)", () => {
  it("resolve lojas para MT + COMPER do bandeira.csv", async () => {
    // Usa o catálogo real do bandeira.csv
    const { resolveLojasFromBandeiraCsv } = await import("../catalog/resolverLojas.ts");
    const lojas = await resolveLojasFromBandeiraCsv("MT", "COMPER");
    assert.ok(lojas.length > 0, "Deveria encontrar lojas COMPER no bandeira.csv");
    // COMPER MT tem ~15 lojas
    assert.ok(lojas.length >= 10, `Esperado >= 10 lojas, encontrado ${lojas.length}`);
    // Verificar que a loja 73 está presente (piloto original)
    assert.ok(lojas.includes(73), "Loja 73 deve estar na lista COMPER");
  });

  it("resolve lojas para MT + FORT do bandeira.csv", async () => {
    const { resolveLojasFromBandeiraCsv } = await import("../catalog/resolverLojas.ts");
    const lojas = await resolveLojasFromBandeiraCsv("MT", "FORT");
    assert.ok(lojas.length >= 0, "Deveria executar sem erro");
  });

  it("resolve lojas lista vazia para bandeira inexistente", async () => {
    const { resolveLojasFromBandeiraCsv } = await import("../catalog/resolverLojas.ts");
    const lojas = await resolveLojasFromBandeiraCsv("MT", "BANDEIRA_INEXISTENTE_XYZ");
    assert.equal(lojas.length, 0);
  });

  it("resolve lojas lista vazia para regional com bandeira.csv sem coluna regional", async () => {
    // Como o bandeira.csv NÃO tem coluna regional, todas as lojas da bandeira
    // são retornadas independentemente da regional.
    // Isso é o comportamento esperado — o filtro regional só funciona
    // com motor_ordem_cds_padrao.xlsx.
    const { resolveLojasFromBandeiraCsv } = await import("../catalog/resolverLojas.ts");
    const lojasMt = await resolveLojasFromBandeiraCsv("MT", "COMPER");
    const lojasGo = await resolveLojasFromBandeiraCsv("GO", "COMPER");
    // Ambas retornam as mesmas lojas (já que bandeira.csv não tem regional)
    assert.deepEqual(lojasMt, lojasGo);
  });
});

describe("carregarCatalogoLojasBandeira", () => {
  it("carrega catálogo do bandeira.csv (fonte principal disponível)", async () => {
    const { carregarCatalogoLojasBandeira } = await import("../catalog/resolverLojas.ts");
    const catalogo = carregarCatalogoLojasBandeira("MT");
    assert.ok(catalogo.length > 0, "Deveria carregar ao menos algumas lojas");
    // Todas as lojas devem ter loja > 0 e bandeira preenchida
    for (const l of catalogo) {
      assert.ok(l.loja > 0, `Loja inválida: ${l.loja}`);
      assert.ok(l.bandeira.length > 0, `Bandeira vazia para loja ${l.loja}`);
    }
  });
});
