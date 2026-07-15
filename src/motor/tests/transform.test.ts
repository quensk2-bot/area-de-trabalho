import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCategoriaHierarquia } from "../transform/parseCategoria.ts";
import { parseDataBrasileira, parseTimestampErp } from "../transform/parseDates.ts";
import { parseDecimalBr, parseInteiro } from "../transform/parseNumbers.ts";
import { emptyToNull, normalizeCodigoNumerico } from "../transform/parseText.ts";
import { transformGrupoCds2 } from "../transform/transformGrupoCds2.ts";
import { deduplicarPorChave, transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import { agruparInventario } from "../transform/transformInventario.ts";
import type { MotorLinhaGrupoCds, MotorLinhaGrupoRuptura, MotorLinhaInventario } from "../types/motorLinhaTypes.ts";

function linhaRupturaBase(overrides: Partial<MotorLinhaGrupoRuptura> = {}): MotorLinhaGrupoRuptura {
  return {
    numeroLinha: 2,
    divisao: "NORDESTE",
    loja: "103",
    seqproduto: "2505088",
    descricao: "PRODUTO",
    codFornecedor: "1001",
    fornecedor: "FORN",
    status: "ATIVO",
    mediaVendaUnDia: "1,5",
    mediaVendaGp: "2,0",
    estoque: "10",
    parMin: "1",
    parMax: "5",
    pendencia: "0",
    embalagemCompra: "CX",
    categoriaOriginal: "60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL \\ CREME DENTAL \\ GEL",
    statusCompraCd1: "COMPRAR",
    statusCompraCd2: null,
    statusCompraCd3: null,
    statusCompraCd4: null,
    estoqueCd1: "100",
    estoqueCd2: null,
    estoqueCd3: null,
    estoqueCd4: null,
    pendenciaCd1: "0",
    pendenciaCd2: null,
    pendenciaCd3: null,
    pendenciaCd4: null,
    diasAtivacaoGeral: null,
    dataAtivacaoGeral: null,
    dtaUltAtivacao: null,
    ultimaEntradaLoja: "01/02/2026",
    ultimaSaidaLoja: "01/03/2026",
    diasCompraLj: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRuptura: "7",
    ultimaCpaLoja: null,
    ultimaCpaCd1: null,
    ultimaCpaCd2: null,
    ultimaCpaCd3: null,
    ultimaCpaCd4: null,
    familia: "100",
    custoLiquido: "10,50",
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    dtaUltEntradaCd1: null,
    dtaUltEntradaCd2: null,
    dtaUltEntradaCd3: null,
    dtaUltEntradaCd4: null,
    hierarquia: parseCategoriaHierarquia(
      "60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL \\ CREME DENTAL \\ GEL",
    ),
    ...overrides,
  };
}

describe("transformações", () => {
  it("3. decimal com vírgula", () => {
    const r = parseDecimalBr("10,50", "TESTE");
    assert.equal(r.valor, 10.5);
    assert.equal(r.erro, null);
  });

  it("4. vazio → null", () => {
    assert.equal(emptyToNull(""), null);
    assert.equal(emptyToNull("  "), null);
    assert.equal(emptyToNull("abc"), "abc");
  });

  it("5. data brasileira", () => {
    const r = parseDataBrasileira("15/07/2026", "DATA");
    assert.equal(r.valor, "2026-07-15");
    assert.equal(r.erro, null);
  });

  it("6. timestamp ERP", () => {
    const r = parseTimestampErp("2026-01-01-00.00.00.000000", "TS");
    assert.equal(r.valor, "2026-01-01");
    assert.equal(r.erro, null);
  });

  it("10. deduplicação por chave", () => {
    const itens = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const r = deduplicarPorChave(itens, (i) => String(i.id));
    assert.equal(r.itens.length, 2);
    assert.equal(r.duplicatasRemovidas, 1);
  });

  it("11. transform CD5 do grupo 2", () => {
    const linhas: MotorLinhaGrupoCds[] = [
      {
        numeroLinha: 2,
        seqproduto: "2505088",
        statusCompraCd5: "COMPRAR",
        estoqueCd5: "500",
        pendenciaCd5: "10",
        diasCompraCd5: "12",
        diasRecebtoCd5: "5",
        ultimaCpaCd5: "01/05/2026",
      },
      {
        numeroLinha: 3,
        seqproduto: "2505088",
        statusCompraCd5: "PARAR",
        estoqueCd5: "100",
        pendenciaCd5: "0",
        diasCompraCd5: "8",
        diasRecebtoCd5: "3",
        ultimaCpaCd5: null,
      },
    ];
    const r = transformGrupoCds2(linhas);
    assert.equal(r.itens.length, 1);
    assert.equal(r.itens[0].seqproduto, 2505088);
    assert.equal(r.itens[0].estoqueCd5, 500);
  });

  it("12. inventário agrupado com filtro > 2", () => {
    const linhas: MotorLinhaInventario[] = [
      { numeroLinha: 2, loja: "103", produto: "2505088", qtdSaidaOutras: "1,5" },
      { numeroLinha: 3, loja: "103", produto: "2505088", qtdSaidaOutras: "2,0" },
      { numeroLinha: 4, loja: "104", produto: "2505088", qtdSaidaOutras: "1" },
      { numeroLinha: 5, loja: "104", produto: "2505088", qtdSaidaOutras: "1" },
    ];
    const r = agruparInventario(linhas);
    assert.equal(r.itens.length, 1);
    assert.equal(r.itens[0].loja, 103);
    assert.equal(r.itens[0].produto, 2505088);
    assert.equal(r.itens[0].inventarioUnid, 3.5);
  });

  it("15. hierarquia completa (5 níveis)", () => {
    const h = parseCategoriaHierarquia(
      "60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL \\ CREME DENTAL \\ GEL",
    );
    assert.equal(h.niveisEncontrados, 5);
    assert.equal(h.divisao, "60-MERCEARIA");
    assert.equal(h.setorN2, "34-PERFUMARIA");
    assert.equal(h.grupoN3, "HIGIENE ORAL");
    assert.equal(h.subgrupoN4, "CREME DENTAL");
    assert.equal(h.tipoN5, "GEL");
    assert.equal(h.ambiguidade, null);
  });

  it("16. hierarquia incompleta (3 níveis)", () => {
    const h = parseCategoriaHierarquia("60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL");
    assert.equal(h.niveisEncontrados, 3);
    assert.equal(h.grupoN3, "HIGIENE ORAL");
    assert.equal(h.subgrupoN4, null);
    assert.equal(h.tipoN5, null);
  });

  it("23. código numérico com espaço", () => {
    assert.equal(normalizeCodigoNumerico(" 2505088 "), 2505088);
  });

  it("24. data inválida registrada como erro", () => {
    const r = parseDataBrasileira("99/99/9999", "DATA", 2);
    assert.equal(r.valor, null);
    assert.ok(r.erro);
    assert.equal(r.erro?.codigoErro, "DATA_INVALIDA");
  });

  it("transform grupo ruptura 1 — normalização", () => {
    const r = transformGrupoRuptura1([linhaRupturaBase()], "NORDESTE", "2026-07-15");
    assert.equal(r.itens.length, 1);
    assert.equal(r.itens[0].mediaVendaUnDia, 1.5);
    assert.equal(r.itens[0].custoLiquido, 10.5);
    assert.equal(r.itens[0].ultimaEntradaLoja, "2026-02-01");
    assert.equal(r.itens[0].hierarquia.tipoN5, "GEL");
  });

  it("inteiro inválido", () => {
    const r = parseInteiro("abc", "FAMILIA", 2);
    assert.equal(r.valor, null);
    assert.ok(r.erro);
  });
});
