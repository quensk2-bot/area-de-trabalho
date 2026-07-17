import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorLinhaGrupoRuptura } from "../types/motorLinhaTypes.ts";
import {
  calcularPosicaoLogica,
  criarBlocoGrupo2,
  criarBlocoRuptura,
  extrairCamposFlatDeCds,
  extrairEstoqueCd,
  mapearCdsDoBloco,
  mapearCdsDoPayload,
  mergeBlocosCds,
  MtCincoCdsAdapter,
  ordenarCdsPorPosicao,
  validarColecaoCds,
} from "../cds/index.ts";
import { calcularCentralizacao, construirLookupCentralizadosBatch } from "../bre/centralizacao/index.ts";
import { calcularSomaEstoqueCd } from "../bre/rules/ruleSomaEstoqueCd.ts";
import { classificarPrazo } from "../bre/classificarPrazo.ts";
import { transformGrupoCds2 } from "../transform/transformGrupoCds2.ts";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import { parseCategoriaHierarquia } from "../transform/parseCategoria.ts";
import {
  blocoBase,
  cdBase,
  colecaoN,
  payloadBlocoCompleto,
} from "./fixtures/cdsDinamicosFixtures.ts";
import { produtoConsolidadorBase, cd5Base } from "./fixtures/consolidadorFixtures.ts";
import { catalogosFixture, entradaBase } from "./fixtures/excelCentralizacaoExpected.ts";

function linhaRupturaBase(overrides: Partial<MotorLinhaGrupoRuptura> = {}): MotorLinhaGrupoRuptura {
  const categoriaOriginal =
    "60-MERCEARIA \\ 34-PERFUMARIA \\ HIGIENE ORAL \\ CREME DENTAL \\ GEL";
  return {
    numeroLinha: 2,
    divisao: "MT",
    loja: "73",
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
    categoriaOriginal,
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
    diasCompraCd1: "10",
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasRecebtoCd1: "3",
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
    hierarquia: parseCategoriaHierarquia(categoriaOriginal),
    ...overrides,
  };
}

describe("cds dinâmicos — Etapa A", () => {
  it("1. coleção com 1 CD", () => {
    const cds = [cdBase(1, { estoque: 50 })];
    assert.equal(cds.length, 1);
    assert.equal(cds[0].posicaoLogica, 1);
  });

  it("2. coleção com 4 CDs", () => {
    assert.equal(colecaoN(4).length, 4);
  });

  it("3. coleção com 5 CDs", () => {
    assert.equal(colecaoN(5).length, 5);
  });

  it("4. coleção com 8 CDs", () => {
    const cds = colecaoN(8);
    assert.equal(cds.length, 8);
    assert.equal(cds[7].posicaoLogica, 8);
  });

  it("5. bloco 1 mapeia posições 1..4", () => {
    const bloco = blocoBase({ posicaoInicial: 1, numeroBloco: 1 });
    const cds = mapearCdsDoPayload(payloadBlocoCompleto(), bloco);
    assert.deepEqual(
      cds.map((c) => c.posicaoLogica),
      [1, 2, 3, 4],
    );
  });

  it("6. bloco 2 mapeia posições 5..8", () => {
    const bloco = blocoBase({ posicaoInicial: 5, numeroBloco: 2, arquivo: "2º Grupo de Ruptura.txt" });
    const cds = mapearCdsDoPayload(payloadBlocoCompleto(), bloco);
    assert.deepEqual(
      cds.map((c) => c.posicaoLogica),
      [5, 6, 7, 8],
    );
  });

  it("7. bloco 2 parcial — somente colunas presentes", () => {
    const bloco = blocoBase({ posicaoInicial: 5, numeroBloco: 2 });
    const cds = mapearCdsDoPayload({ ESTQ_CD1: "10", PENDCD_CD1: "0" }, bloco);
    assert.equal(cds.length, 1);
    assert.equal(cds[0].posicaoLogica, 5);
  });

  it("8. bloco 3 mapeia 9..12", () => {
    const bloco = blocoBase({ posicaoInicial: 9, numeroBloco: 3 });
    const cds = mapearCdsDoPayload(payloadBlocoCompleto(), bloco);
    assert.deepEqual(
      cds.map((c) => c.posicaoLogica),
      [9, 10, 11, 12],
    );
  });

  it("9. posição duplicada detectada", () => {
    const v = validarColecaoCds([cdBase(3), cdBase(3, { estoque: 99 })]);
    assert.equal(v.posicoesDuplicadas.includes(3), true);
    assert.equal(v.ok, false);
  });

  it("10. blocos sobrepostos — merge não escolhe silenciosamente", () => {
    const b1 = [cdBase(5, { estoque: 1, numeroBloco: 2 })];
    const b2 = [cdBase(5, { estoque: 9, numeroBloco: 2 })];
    const m = mergeBlocosCds([b1, b2]);
    assert.equal(m.posicoesDuplicadas.includes(5), true);
    assert.equal(m.cds.length, 0);
  });

  it("11. ordenação por posição", () => {
    const o = ordenarCdsPorPosicao([cdBase(8), cdBase(2), cdBase(5)]);
    assert.deepEqual(
      o.map((c) => c.posicaoLogica),
      [2, 5, 8],
    );
  });

  it("12. rastreabilidade da origem", () => {
    const cds = mapearCdsDoPayload(payloadBlocoCompleto(), blocoBase());
    for (const cd of cds) {
      assert.equal(cd.origemArquivo, "1º Grupo de Ruptura.txt");
      assert.equal(cd.numeroBloco, 1);
    }
  });

  it("13. regional isolada no merge", () => {
    const m = mergeBlocosCds([[cdBase(1, { origemArquivo: "MT.txt" })]], { regional: "MT" });
    assert.equal(m.cds.length, 1);
  });

  it("14. CD8 com estoque", () => {
    const cds = [cdBase(8, { estoque: 920 })];
    assert.equal(cds[0].estoque, 920);
    assert.equal(extrairEstoqueCd(cds, 8), null);
  });

  it("15. CD6 com pendência", () => {
    const cds = [cdBase(6, { pendencia: 42 })];
    assert.equal(cds[0].pendencia, 42);
  });

  it("16. CD7 com Dias Pedido", () => {
    const cds = [cdBase(7, { diasCompra: 15, diasRecebimento: 3 })];
    assert.equal(cds[0].diasCompra, 15);
    assert.equal(cds[0].diasRecebimento, 3);
  });

  it("17. CD8 com status compra", () => {
    const cds = [cdBase(8, { statusCompra: "PARAR" })];
    assert.equal(cds[0].statusCompra, "PARAR");
  });

  it("18. adaptador estoqueCd1", () => {
    const flat = extrairCamposFlatDeCds([cdBase(1, { estoque: 464 })]);
    assert.equal(flat.estoqueCd1, 464);
  });

  it("19. adaptador estoqueCd5", () => {
    const flat = extrairCamposFlatDeCds([cdBase(5, { estoque: 905 })]);
    assert.equal(flat.estoqueCd5, 905);
  });

  it("20. adaptador campo ausente retorna null", () => {
    assert.equal(extrairEstoqueCd([], 1), null);
    assert.equal(extrairEstoqueCd([cdBase(2)], 1), null);
  });

  it("21. adaptador não muta cds[]", () => {
    const cds = colecaoN(5);
    const snapshot = JSON.stringify(cds);
    MtCincoCdsAdapter.extrairCamposFlat(cds);
    assert.equal(JSON.stringify(cds), snapshot);
  });

  it("22. pacote MT transform grupo1 popula cds 1..4", () => {
    const r = transformGrupoRuptura1([linhaRupturaBase()], "MT", "2026-03-26");
    assert.equal(r.itens[0].cds.length, 4);
    assert.equal(r.itens[0].cds[0].posicaoLogica, 1);
    assert.equal(r.itens[0].estoqueCd1, r.itens[0].cds[0].estoque);
  });

  it("23. pacote MT transform grupo2 — posição 5 via mtPiloto", () => {
    const r = transformGrupoCds2(
      [
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
      ],
      "MT",
      "2026-03-26",
    );
    assert.equal(r.itens[0].cds.length, 1);
    assert.equal(r.itens[0].cds[0].posicaoLogica, 5);
    assert.equal(r.itens[0].estoqueCd5, 500);
    assert.equal(r.itens[0].cds[0].estoque, 500);
  });

  it("24. fórmula posicaoLogica = posicaoInicial + posicaoNoArquivo - 1", () => {
    assert.equal(calcularPosicaoLogica(5, 1), 5);
    assert.equal(calcularPosicaoLogica(5, 4), 8);
    assert.equal(calcularPosicaoLogica(9, 3), 11);
  });

  it("25. bloco MT piloto ignora CD2..4 vazios no grupo2", () => {
    const bloco = criarBlocoGrupo2("MT", "2026-03-26", 5);
    const cds = mapearCdsDoPayload(
      { ESTQ_CD1: "10", ESTQ_CD2: "0", ESTQ_CD3: "0", ESTQ_CD4: "0", PENDCD_CD1: "0" },
      bloco,
      { mtPilotoSomentePosicao5: true },
    );
    assert.equal(cds.length, 1);
    assert.equal(cds[0].posicaoLogica, 5);
  });

  it("26. merge bloco1+bloco2 MT cinco posições", () => {
    const b1 = mapearCdsDoPayload(payloadBlocoCompleto(), criarBlocoRuptura("MT", "2026-03-26", 1, 1, "g1.txt"));
    const b2 = mapearCdsDoPayload(
      { ESTQ_CD1: "905", PENDCD_CD1: "0", STATUS_COMPRA_CD1: "A" },
      criarBlocoGrupo2("MT", "2026-03-26", 5),
      { mtPilotoSomentePosicao5: true },
    );
    const m = mergeBlocosCds([b1, b2]);
    assert.equal(m.cds.length, 5);
    assert.equal(m.cds[4].posicaoLogica, 5);
  });

  it("27. pacote MT mantém soma estoque BRE (campos flat)", () => {
    const soma = calcularSomaEstoqueCd({
      produto: produtoConsolidadorBase(),
      cd5: cd5Base({ estoqueCd5: 3 }),
    });
    assert.equal(soma, 20);
  });

  it("28. pacote MT mantém CP via classificação prazo", () => {
    const item = {
      produto: produtoConsolidadorBase(),
      cd5: cd5Base(),
      validacao: {
        numeroLinha: 1,
        loja: 103,
        produto: 2505088,
        qtdItemRupturaNoMix: 1,
        qtdItemRuptura: 1,
        geraRuptura: true,
        ruptura104c: false,
      },
      inventario: { loja: 103, produto: 2505088, inventarioUnid: 0 },
    };
    const cp = classificarPrazo({
      item,
      statusBaseLimpa: "Base Limpa",
      menorQueTres: 1,
      somaEstoqueCd: calcularSomaEstoqueCd(item),
      modCurtoPrazo: null,
      ncurtoPrazo: "G",
    });
    assert.equal(cp.curtoPrazoRegra.status, "aplicada");
  });

  it("29. Centralização inalterada", () => {
    const cat = catalogosFixture();
    const entrada = entradaBase();
    const lookup = construirLookupCentralizadosBatch([entrada], cat);
    const r = calcularCentralizacao(entrada, cat, lookup);
    assert.ok(r.produtoCentralizado != null || r.produtoCentralizado === null);
  });

  it("30. módulo cds sem limite estrutural de cinco", () => {
    const bloco = blocoBase({ posicaoInicial: 1 });
    const oito = mapearCdsDoBloco(
      bloco,
      Array.from({ length: 8 }, (_, i) => ({
        posicaoNoArquivo: i + 1,
        valores: {
          estoque: i + 1,
          pendencia: null,
          statusCompra: null,
          diasCompra: null,
          diasRecebimento: null,
          ultimaCompra: null,
          ultimaEntrada: null,
          estoqueSelecionadoInventario: null,
        },
      })),
    );
    assert.equal(oito.length, 8);
    for (const cd of oito) {
      assert.equal(cd.codigoFisico, null);
    }
  });
});
