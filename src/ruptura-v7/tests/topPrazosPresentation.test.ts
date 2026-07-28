import assert from "node:assert/strict";
import test from "node:test";
import type { TopPrazosGrupo } from "../../hibrido-v7/topPrazosTypes.ts";
import {
  agregarIndicadoresTopPrazos,
  agregarRankingTopPrazos,
  calcularPercentual,
  filtrarGruposTopPrazos,
  rotuloFornecedor,
  topRankingPorSetor,
} from "../utils/topPrazosPresentation.ts";

const grupos: TopPrazosGrupo[] = [
  {
    regional: "MT",
    bandeira: "COMPER",
    competencia: "2026-07",
    loja: 73,
    setor: "60-MERCEARIA",
    secao: "32-ALIMENT.COMPLEMENTAR",
    fornecedor: "BETA",
    statusMovimentacaoLoja: "Com movimentação",
    qtdeProdutos: 10,
    totalRuptura: 4,
    curtoPrazo: 1,
    medioPrazo: 2,
    longoPrazo: 1,
  },
  {
    regional: "MT",
    bandeira: "COMPER",
    competencia: "2026-07",
    loja: 91,
    setor: "60-MERCEARIA",
    secao: "32-ALIMENT.COMPLEMENTAR",
    fornecedor: null,
    statusMovimentacaoLoja: "Sem Movimentação",
    qtdeProdutos: 5,
    totalRuptura: 3,
    curtoPrazo: 0,
    medioPrazo: 1,
    longoPrazo: 2,
  },
  {
    regional: "MT",
    bandeira: "COMPER",
    competencia: "2026-07",
    loja: 73,
    setor: "62-PERECIVEIS",
    secao: "44-FRIOS",
    fornecedor: "ALFA",
    statusMovimentacaoLoja: "Com movimentação",
    qtdeProdutos: 20,
    totalRuptura: 6,
    curtoPrazo: 1,
    medioPrazo: 5,
    longoPrazo: 0,
  },
];

test("percentual com denominador zero permanece ausente", () => {
  assert.equal(calcularPercentual(1, 0), null);
  assert.equal(calcularPercentual(1, 4), 25);
  const vazio = agregarIndicadoresTopPrazos([], "compra");
  assert.equal(vazio.percentualRuptura, null);
  assert.equal(vazio.percentualPrazo, null);
});

test("filtros compartilhados restringem o mesmo universo dos cards", () => {
  const filtrados = filtrarGruposTopPrazos(grupos, {
    lojas: [73],
    setor: "60-MERCEARIA",
    secao: null,
    statusMovimentacaoLoja: "Com movimentação",
  });
  assert.equal(filtrados.length, 1);
  assert.deepEqual(agregarIndicadoresTopPrazos(filtrados, "compra"), {
    qtdeProdutos: 10,
    totalRuptura: 4,
    curtoPrazo: 1,
    medioPrazo: 2,
    longoPrazo: 1,
    percentualRuptura: 40,
    percentualPrazo: 25,
  });
});

test("ranking respeita prazo, ruptura e fornecedor", () => {
  const ranking = agregarRankingTopPrazos(grupos, "compra");
  assert.deepEqual(
    ranking.map((linha) => [linha.fornecedor, linha.longoPrazo]),
    [
      [null, 2],
      ["BETA", 1],
    ],
  );
  assert.deepEqual(
    topRankingPorSetor(ranking, "60-MERCEARIA", 1).map(
      (linha) => linha.fornecedor,
    ),
    [null],
  );
});

test("modo recebimento usa Médio Prazo sem recalcular classificação", () => {
  const indicadores = agregarIndicadoresTopPrazos(grupos, "recebimento");
  assert.equal(indicadores.medioPrazo, 8);
  assert.equal(indicadores.percentualPrazo, (8 / 13) * 100);

  const ranking = agregarRankingTopPrazos(grupos, "recebimento");
  assert.deepEqual(
    ranking.map((linha) => [linha.fornecedor, linha.medioPrazo]),
    [
      ["ALFA", 5],
      ["BETA", 2],
      [null, 1],
    ],
  );
});

test("fornecedor nulo tem apenas rótulo visual", () => {
  assert.equal(rotuloFornecedor(null), "Não identificado");
  assert.equal(rotuloFornecedor("REDE OFICIAL"), "REDE OFICIAL");
});
