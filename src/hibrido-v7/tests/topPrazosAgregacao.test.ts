import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MotorProdutoLojaConsolidado } from "../../motor/consolidar/consolidacaoTypes.ts";
import {
  calcularStatusMovimentacaoLoja,
  gerarTopPrazos,
  TopPrazosCampoOficialInvalidoError,
  TopPrazosDuplicidadeConflitanteError,
} from "../../motor/export/hibrido/gerarTopPrazos.ts";
import { buildManifest } from "../manifest/manifestBuilder.ts";
import { validarManifest } from "../manifest/manifestValidator.ts";

const ESCOPO = {
  regional: "MT",
  bandeira: "COMPER",
  competencia: "2026-07",
  dataReferencia: "2026-07-13",
  versao: 8,
};

function produto(
  patch: Partial<MotorProdutoLojaConsolidado> = {},
): MotorProdutoLojaConsolidado {
  return {
    regional: "MT",
    bandeira: "Comper MT",
    loja: 73,
    seqproduto: 100,
    baseLimpa: "Base Limpa",
    rede: "REDE OFICIAL",
    fornecedor: "RAZAO BRUTA",
    divisao: "60-MERCEARIA",
    setorN2: "32-ALIMENT.COMPLEMENTAR",
    estoqueLoja: 1,
    mediaVendaUnDia: 0,
    custoLiquido: 0,
    ruptura104c: true,
    curtoPrazo: 0,
    medioPrazo: 1,
    longoPrazo: 0,
    pendenciaLoja: 0.15,
    ...patch,
  } as MotorProdutoLojaConsolidado;
}

describe("Top Prazos — agregador oficial", () => {
  it("aplica exatamente a regra de movimentação e trata null como zero somente nela", () => {
    assert.equal(
      calcularStatusMovimentacaoLoja({
        estoqueLoja: null,
        mediaVendaUnDia: null,
        custoLiquido: null,
      }),
      "Sem Movimentação",
    );
    assert.equal(
      calcularStatusMovimentacaoLoja({
        estoqueLoja: null,
        mediaVendaUnDia: 0.01,
        custoLiquido: null,
      }),
      "Com movimentação",
    );
  });

  it("usa rede, preserva fornecedor null e não recalcula os prazos oficiais", () => {
    const resultado = gerarTopPrazos(
      {
        73: [
          produto(),
          produto({
            seqproduto: 101,
            rede: null,
            fornecedor: "NAO USAR",
            ruptura104c: true,
            curtoPrazo: 0,
            medioPrazo: 1,
            longoPrazo: 0,
            pendenciaLoja: 0.15,
          }),
        ],
      },
      ESCOPO,
    );

    assert.equal(resultado.meta.totalGrupos, 2);
    assert.equal(resultado.totais.qtdeProdutos, 2);
    assert.equal(resultado.totais.totalRuptura, 2);
    assert.equal(resultado.totais.curtoPrazo, 0);
    assert.equal(resultado.totais.medioPrazo, 2);
    assert.equal(resultado.totais.longoPrazo, 0);
    assert.ok(resultado.grupos.some((grupo) => grupo.fornecedor === "REDE OFICIAL"));
    assert.ok(resultado.grupos.some((grupo) => grupo.fornecedor === null));
    assert.ok(!resultado.grupos.some((grupo) => grupo.fornecedor === "NAO USAR"));
  });

  it("não converte null para zero nas flags oficiais", () => {
    const item = produto({ curtoPrazo: null });
    assert.throws(
      () => gerarTopPrazos({ 73: [item] }, ESCOPO),
      (erro) =>
        erro instanceof TopPrazosCampoOficialInvalidoError &&
        erro.campo === "curtoPrazo" &&
        erro.valor === null,
    );
  });

  it("agrega por loja, fornecedor, setor, seção e movimentação", () => {
    const resultado = gerarTopPrazos(
      {
        73: [
          produto(),
          produto({ seqproduto: 101, curtoPrazo: 1, medioPrazo: 0 }),
          produto({
            seqproduto: 102,
            setorN2: "34-PERFUMARIA",
            estoqueLoja: 0,
            mediaVendaUnDia: 0,
            custoLiquido: 0,
            curtoPrazo: 0,
            medioPrazo: 0,
            longoPrazo: 1,
          }),
          produto({ seqproduto: 103, baseLimpa: "Não considera Ruptura" }),
        ],
      },
      ESCOPO,
    );

    assert.equal(resultado.meta.totalGrupos, 2);
    assert.deepEqual(resultado.totais, {
      qtdeProdutos: 3,
      totalRuptura: 3,
      curtoPrazo: 1,
      medioPrazo: 1,
      longoPrazo: 1,
    });
    const alimentacao = resultado.grupos.find(
      (grupo) => grupo.secao === "32-ALIMENT.COMPLEMENTAR",
    );
    assert.deepEqual(
      alimentacao && {
        qtdeProdutos: alimentacao.qtdeProdutos,
        totalRuptura: alimentacao.totalRuptura,
        curtoPrazo: alimentacao.curtoPrazo,
        medioPrazo: alimentacao.medioPrazo,
        longoPrazo: alimentacao.longoPrazo,
      },
      {
        qtdeProdutos: 2,
        totalRuptura: 2,
        curtoPrazo: 1,
        medioPrazo: 1,
        longoPrazo: 0,
      },
    );
  });

  it("deduplica linhas idênticas e aborta duplicidade conflitante com relatório", () => {
    const original = produto();
    const deduplicado = gerarTopPrazos({ 73: [original, { ...original }] }, ESCOPO);
    assert.equal(deduplicado.totais.qtdeProdutos, 1);

    assert.throws(
      () =>
        gerarTopPrazos(
          { 73: [original, { ...original, rede: "OUTRA REDE" }] },
          ESCOPO,
        ),
      (erro: unknown) => {
        assert.ok(erro instanceof TopPrazosDuplicidadeConflitanteError);
        assert.deepEqual(erro.relatorio, [
          {
            loja: 73,
            seqproduto: 100,
            camposDivergentes: ["rede"],
          },
        ]);
        return true;
      },
    );
  });

  it("inclui o ponteiro versionado e aceita manifesto antigo sem o campo opcional", () => {
    const manifest = buildManifest({
      ...ESCOPO,
      lojas: [73],
    });
    assert.equal(
      manifest.dashboardTopPrazos,
      "MT/COMPER/2026-07/v8/dashboard/top-prazos.json",
    );

    const legado = { ...manifest };
    delete legado.dashboardTopPrazos;
    assert.equal(validarManifest(legado).ok, true);
  });
});
