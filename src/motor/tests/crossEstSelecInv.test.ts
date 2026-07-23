import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import type { MotorBreItemInput } from "../bre/breTypes.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import {
  calcularCrossSum,
  classificarPrazo,
  resolverCrossProduto,
} from "../bre/index.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";

/** 46 chaves homologadas Excel CP / V7 MP|LP antes da correção Cross (Loja 73). */
const DIVERGENCIAS_CROSS_LOJA73: Array<{ seq: number; pend: number; cross: number }> = [
  { seq: 19453, pend: 60, cross: 1020 },
  { seq: 19640, pend: 72, cross: 144 },
  { seq: 19674, pend: 0, cross: 120 },
  { seq: 64335, pend: 48, cross: 672 },
  { seq: 171425, pend: 72, cross: 1512 },
  { seq: 311499, pend: 12, cross: 42 },
  { seq: 339458, pend: 72, cross: 648 },
  { seq: 407704, pend: 12, cross: 132 },
  { seq: 526525, pend: 12, cross: 84 },
  { seq: 602205, pend: 24, cross: 96 },
  { seq: 637408, pend: 60, cross: 180 },
  { seq: 659703, pend: 40, cross: 40 },
  { seq: 762040, pend: 36, cross: 216 },
  { seq: 785237, pend: 12, cross: 36 },
  { seq: 956872, pend: 34, cross: 13.412 },
  { seq: 1070649, pend: 0, cross: 160 },
  { seq: 1135490, pend: 48, cross: 48 },
  { seq: 1196413, pend: 30, cross: 130 },
  { seq: 1233580, pend: 48, cross: 144 },
  { seq: 1390473, pend: 24, cross: 456 },
  { seq: 1511262, pend: 12, cross: 36 },
  { seq: 2360039, pend: 18, cross: 114 },
  { seq: 2560763, pend: 36, cross: 180 },
  { seq: 2598221, pend: 288, cross: 10656 },
  { seq: 2618362, pend: 132, cross: 1590 },
  { seq: 2643839, pend: 12, cross: 156 },
  { seq: 2685809, pend: 24, cross: 120 },
  { seq: 2729830, pend: 24, cross: 12 },
  { seq: 2745054, pend: 24, cross: 168 },
  { seq: 2862433, pend: 8, cross: 56 },
  { seq: 2872307, pend: 24, cross: 720 },
  { seq: 2886561, pend: 12, cross: 108 },
  { seq: 2907712, pend: 12, cross: 132 },
  { seq: 2935317, pend: 24, cross: 48 },
  { seq: 2953668, pend: 12, cross: 78 },
  { seq: 2964724, pend: 24, cross: 264 },
  { seq: 2964791, pend: 12, cross: 72 },
  { seq: 3077861, pend: 9, cross: 54 },
  { seq: 3097994, pend: 12, cross: 180 },
  { seq: 3098028, pend: 12, cross: 348 },
  { seq: 3105202, pend: 12, cross: 240 },
  { seq: 3105237, pend: 12, cross: 78 },
  { seq: 3105245, pend: 18, cross: 54 },
  { seq: 3105326, pend: 12, cross: 138 },
  { seq: 3105482, pend: 12, cross: 54 },
  { seq: 3148920, pend: 50, cross: 610 },
];

function produtoBase(overrides: Partial<MotorProdutoLojaNormalizado> = {}): MotorProdutoLojaNormalizado {
  return {
    regional: "MT",
    dataReferencia: "2026-07-13",
    loja: 73,
    seqproduto: 1135490,
    descricao: "TESTE CROSS",
    codFornecedor: 1001,
    fornecedor: "FORN",
    statusProduto: "A",
    familia: null,
    mediaVendaUnDia: 1,
    mediaVendaGp: 1,
    estoqueLoja: 0,
    parMin: 1,
    parMax: 10,
    pendenciaLoja: 48,
    diasCompraLj: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    embalagemCompra: "UN",
    hierarquia: {
      categoriaOriginal: "MERCEARIA|BEBIDAS",
      divisao: "MERCEARIA",
      setorN2: "BEBIDAS",
      grupoN3: null,
      subgrupoN4: null,
      tipoN5: null,
      niveisEncontrados: 2,
      ambiguidade: null,
    },
    estoqueCd1: 0,
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    statusCompraCd1: "A",
    statusCompraCd2: "A",
    statusCompraCd3: "A",
    statusCompraCd4: "A",
    diasRuptura: 3,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    custoLiquido: 1.5,
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    cds: [],
    alertas: [],
    ...overrides,
  };
}

function itemInput(overrides: Partial<MotorBreItemInput> = {}): MotorBreItemInput {
  const produto = produtoBase(overrides.produto as Partial<MotorProdutoLojaNormalizado> | undefined);
  return {
    produto,
    cd5: null,
    validacao: {
      numeroLinha: 1,
      loja: produto.loja,
      produto: produto.seqproduto,
      qtdItemRupturaNoMix: 1,
      qtdItemRuptura: 1,
      geraRuptura: true,
      ruptura104c: true,
    },
    inventario: { loja: produto.loja, produto: produto.seqproduto, inventarioUnid: 0 },
    estSelecInv: {
      estSelecInvCd1: produto.estSelecInvCd1,
      estSelecInvCd2: produto.estSelecInvCd2,
      estSelecInvCd3: produto.estSelecInvCd3,
      estSelecInvCd4: produto.estSelecInvCd4,
    },
    ...overrides,
  };
}

const baseLimpa = "Base Limpa" as const;

describe("cross EST_SELECINV — alinhamento Power Query", () => {
  it("crossSum — um CD com valor", () => {
    assert.equal(calcularCrossSum(5, null, null, null), 5);
  });

  it("crossSum — múltiplos CDs", () => {
    assert.equal(calcularCrossSum(2, 3, 1, 0), 6);
  });

  it("crossSum — null tratado como zero", () => {
    assert.equal(calcularCrossSum(null, null, 4, null), 4);
  });

  it("crossSum — todos zero", () => {
    assert.equal(calcularCrossSum(0, 0, 0, 0), 0);
  });

  it("crossSum — positivo sem estoque físico CD", () => {
    const cross = resolverCrossProduto(
      itemInput({
        produto: produtoBase({
          estoqueCd1: 0,
          estoqueCd2: 0,
          estSelecInvCd1: 0,
          estSelecInvCd2: 7,
        }),
      }),
    );
    assert.equal(cross.crossSum, 7);
    assert.equal(cross.origemCross, "EST_SELECINV_CD1..4");
  });

  it("crossSum — cross + pendência não altera soma literal", () => {
    const cross = resolverCrossProduto(
      itemInput({
        produto: produtoBase({
          pendenciaLoja: 48,
          estSelecInvCd3: 2,
        }),
      }),
    );
    assert.equal(cross.crossSum, 2);
  });

  it("CP — cross positivo eleva curto prazo sem estoque CD (padrão 44 CP→MP)", () => {
    const r = classificarPrazo({
      item: itemInput({
        produto: produtoBase({
          estoqueCd1: 0,
          pendenciaLoja: 48,
          estSelecInvCd1: 3,
        }),
      }),
      statusBaseLimpa: baseLimpa,
      menorQueTres: 1,
      somaEstoqueCd: 0,
      modCurtoPrazo: null,
      ncurtoPrazo: null,
    });
    assert.equal(r.curtoPrazo, 1);
    assert.equal(r.medioPrazo, 0);
    assert.equal(r.classificacaoPrazo, "CP");
    assert.equal(r.crossSum, 3);
    assert.equal(r.crossDocking, 1);
  });

  it("CP — cross docking (padrão 2 CP→LP)", () => {
    const r = classificarPrazo({
      item: itemInput({
        produto: produtoBase({
          seqproduto: 1070649,
          estoqueCd1: 0,
          pendenciaLoja: 0,
          estSelecInvCd2: 1,
        }),
      }),
      statusBaseLimpa: baseLimpa,
      menorQueTres: 1,
      somaEstoqueCd: 0,
      modCurtoPrazo: null,
      ncurtoPrazo: null,
    });
    assert.equal(r.curtoPrazo, 1);
    assert.equal(r.longoPrazo, 0);
    assert.equal(r.classificacaoPrazo, "CP");
    assert.equal(r.crossDocking, 1);
  });

  it("transform — EST_SELECINV propagado para produto e cds", async () => {
    const fixture = path.join(process.cwd(), "src/motor/tests/fixtures/grupo_ruptura_1_sample.txt");
    const parsed = await parseGrupoRuptura1(fixture);
    const linha = parsed.linhas[0];
    linha.estSelecInvCd1 = "2";
    linha.estSelecInvCd2 = "3";
    linha.estSelecInvCd3 = "";
    linha.estSelecInvCd4 = "1";

    const { itens } = transformGrupoRuptura1([linha], "MT", "2026-07-13");
    assert.equal(itens[0].estSelecInvCd1, 2);
    assert.equal(itens[0].estSelecInvCd2, 3);
    assert.equal(itens[0].estSelecInvCd3, null);
    assert.equal(itens[0].estSelecInvCd4, 1);
    assert.equal(itens[0].cds[0]?.estoqueSelecionadoInventario, 2);
    assert.equal(itens[0].cds[1]?.estoqueSelecionadoInventario, 3);
    assert.equal(itens[0].cds[2]?.estoqueSelecionadoInventario, null);
    assert.equal(itens[0].cds[3]?.estoqueSelecionadoInventario, 1);
  });

  it("matriz Loja 73 — 46 divergências CP corrigidas (cross positivo)", () => {
    assert.equal(DIVERGENCIAS_CROSS_LOJA73.length, 46);

    for (const { seq, pend, cross } of DIVERGENCIAS_CROSS_LOJA73) {
      const r = classificarPrazo({
        item: itemInput({
          produto: produtoBase({
            seqproduto: seq,
            pendenciaLoja: pend,
            estSelecInvCd1: cross,
          }),
        }),
        statusBaseLimpa: baseLimpa,
        menorQueTres: 1,
        somaEstoqueCd: 0,
        modCurtoPrazo: null,
        ncurtoPrazo: null,
      });
      assert.equal(r.classificacaoPrazo, "CP", `SEQPRODUTO ${seq} deveria ser CP após cross`);
      assert.equal(r.medioPrazo, 0, `SEQPRODUTO ${seq} não deveria ser MP`);
      assert.equal(r.longoPrazo, 0, `SEQPRODUTO ${seq} não deveria ser LP`);
      assert.equal(r.crossSum, cross, `SEQPRODUTO ${seq} crossSum`);
    }
  });
});
