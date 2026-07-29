import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { parsePlan6Txt, buscarModalidadePlan6 } from "../catalog/parsePlan6Txt.ts";
import { parsePlan6Produtos } from "../catalog/parseProdutosExclusivos.ts";

const PLAN_6_PATH = path.resolve(process.cwd(), "../importar/RUPTURA/Plan 6 CD.txt");

describe("parsePlan6Produtos — parser de produção (Motor pipeline)", () => {
  it("Carrega o arquivo real sem erros", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    assert.equal(result.erros.length, 0, `Erros: ${result.erros.join("; ")}`);
    assert.ok(result.quantidadeCarregada > 0, "Deveria ter produtos carregados");
    assert.ok(result.itens.length > 0, "Deveria ter itens");
  });

  it("Produto conhecido 2640619 → CD Armazenagem", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    const p = result.itens.find((i) => i.codigo === 2640619);
    assert.ok(p, "Produto 2640619 deveria existir");
    assert.equal(p!.modalidadeCd, "CD Armazenagem");
  });

  it("Produto conhecido 1720490 → ED Direto Loja", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    const p = result.itens.find((i) => i.codigo === 1720490);
    assert.ok(p, "Produto 1720490 deveria existir");
    assert.equal(p!.modalidadeCd, "ED Direto Loja");
  });

  it("Produto conhecido 1471694 → CD Suprimentos (Armazenagem)", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    const p = result.itens.find((i) => i.codigo === 1471694);
    assert.ok(p, "Produto 1471694 deveria existir");
    assert.equal(p!.modalidadeCd, "CD Suprimentos (Armazenagem)");
  });

  it("Código não encontrado → não está na lista (fallback no consumidor)", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    const p = result.itens.find((i) => i.codigo === 99999999);
    assert.equal(p, undefined, "Código inexistente não deve estar na lista");
  });

  it("Produtos com MODALIDADECD vazia entram como ED Direto Loja", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    const edCount = result.itens.filter((i) => i.modalidadeCd === "ED Direto Loja").length;
    assert.ok(edCount > 20000, `ED Direto Loja deveria ter >20000, tem ${edCount}`);
  });

  it("Modalidade CD Cross Docking existe com mais de 10.000 produtos", () => {
    const result = parsePlan6Produtos(PLAN_6_PATH);
    const cdCount = result.itens.filter((i) => i.modalidadeCd.startsWith("CD Cross Docking")).length;
    assert.ok(cdCount > 10000, `CD Cross Docking deveria ter >10000, tem ${cdCount}`);
  });
});

describe("parsePlan6Txt — parser independente (testes legados)", () => {
  it("Carrega o arquivo real sem erros", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    assert.equal(result.erros.length, 0, `Erros ao carregar Plan 6: ${result.erros.join("; ")}`);
    assert.ok(result.totalLinhas > 0, "Deveria ter linhas lidas");
    assert.ok(result.mapa.size > 0, "Deveria ter produtos no mapa");
    assert.ok(result.modalidadesUnicas.length >= 3, "Deveria ter pelo menos 3 modalidades únicas");
  });

  it("Modalidades esperadas estão presentes", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    const mods = new Set(result.modalidadesUnicas);
    assert.ok(mods.has("ED Direto Loja"), "Deveria conter ED Direto Loja");
    assert.ok(mods.has("CD Armazenagem"), "Deveria conter CD Armazenagem");
    assert.ok(mods.has("CD Cross Docking"), "Deveria conter CD Cross Docking");
    assert.ok(mods.has("CD Suprimentos (Armazenagem)"), "Deveria conter CD Suprimentos (Armazenagem)");
    assert.ok(mods.has("CD Imobilizados (Armazenagem)"), "Deveria conter CD Imobilizados (Armazenagem)");
  });

  it("Produto conhecido 2640619 → CD Armazenagem", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    const modalidade = buscarModalidadePlan6(result.mapa, 2640619);
    assert.equal(modalidade, "CD Armazenagem");
  });

  it("Produto conhecido 1720490 → ED Direto Loja", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    const modalidade = buscarModalidadePlan6(result.mapa, 1720490);
    assert.equal(modalidade, "ED Direto Loja");
  });

  it("Produto conhecido 1471694 → CD Suprimentos (Armazenagem)", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    const modalidade = buscarModalidadePlan6(result.mapa, 1471694);
    assert.equal(modalidade, "CD Suprimentos (Armazenagem)");
  });

  it("Código inexistente → ED Direto Loja", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    const modalidade = buscarModalidadePlan6(result.mapa, 99999999);
    assert.equal(modalidade, "ED Direto Loja");
  });

  it("Código 0 → ED Direto Loja", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    const modalidade = buscarModalidadePlan6(result.mapa, 0);
    assert.equal(modalidade, "ED Direto Loja");
  });

  it("Arquivo inexistente → mapa vazio + erro", () => {
    const result = parsePlan6Txt("/caminho/inexistente/Plan 6 CD.txt");
    assert.equal(result.mapa.size, 0);
    assert.ok(result.erros.length > 0);
    assert.equal(result.totalLinhas, 0);
  });

  it("Modalidade CD Cross Docking existe com mais de 10.000 produtos", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    let count = 0;
    for (const [, mod] of result.mapa) {
      if (mod.startsWith("CD Cross Docking")) count++;
    }
    assert.ok(count > 10000, `CD Cross Docking deveria ter >10000 produtos, tem ${count}`);
  });

  it("ED Direto Loja tem mais de 20.000 produtos", () => {
    const result = parsePlan6Txt(PLAN_6_PATH);
    let count = 0;
    for (const [, mod] of result.mapa) {
      if (mod === "ED Direto Loja") count++;
    }
    assert.ok(count > 20000, `ED Direto Loja deveria ter >20000 produtos, tem ${count}`);
  });
});
