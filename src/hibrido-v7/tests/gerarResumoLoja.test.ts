import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { describe, it } from "node:test";
import type { MotorProdutoLojaConsolidado } from "../../motor/consolidar/consolidacaoTypes.ts";
import { gerarResumoLoja } from "../../motor/export/hibrido/gerarResumoLoja.ts";
import { mapResumoToDashboard } from "../../ruptura-v7/services/hibrido/mapResumoDashboard.ts";

const INPUT = { regional: "MT", bandeira: "COMPER", loja: 73, dataReferencia: "2026-03-26" };

function item(partial: Partial<MotorProdutoLojaConsolidado> & Pick<MotorProdutoLojaConsolidado, "seqproduto">): MotorProdutoLojaConsolidado {
  return {
    regional: "MT",
    dataReferencia: "2026-03-26",
    bandeira: "COMPER",
    loja: 73,
    descricao: null,
    codFornecedor: null,
    fornecedor: null,
    rede: null,
    comprador: null,
    classificacaoPrazo: "sem_ruptura",
    baseLimpa: "Base Limpa",
    geraRuptura: false,
    somaEstoqueCd: 0,
    produtoCentralizado: null,
    textoProdutoCentralizado: "Não Centralizado",
    cds: [],
    ...partial,
  } as MotorProdutoLojaConsolidado;
}

describe("gerarResumoLoja — indicadores H6/H9", () => {
  it("CP+MP+LP = totalRupturaClassificada", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo" }),
        item({ seqproduto: 2, classificacaoPrazo: "medio_prazo" }),
        item({ seqproduto: 3, classificacaoPrazo: "longo_prazo" }),
        item({ seqproduto: 4, classificacaoPrazo: "bloqueado" }),
        item({ seqproduto: 5, classificacaoPrazo: "sem_ruptura" }),
      ],
      INPUT,
    );
    assert.equal(resumo.totalRupturaClassificada, 3);
    assert.equal(resumo.curtoPrazo + resumo.medioPrazo + resumo.longoPrazo, resumo.totalRupturaClassificada);
  });

  it("geral vs classificada não se confundem", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo" }),
        item({ seqproduto: 2, classificacaoPrazo: "bloqueado" }),
      ],
      INPUT,
    );
    assert.equal(resumo.totalRupturaClassificada, 1);
    assert.equal(resumo.totalRupturaGeral, 2);
    assert.equal(resumo.ruptura, resumo.totalRupturaGeral);
  });

  it("percentuais usam Base Limpa elegível como denominador", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo", baseLimpa: "Base Limpa" }),
        item({ seqproduto: 2, classificacaoPrazo: "bloqueado", baseLimpa: "Base Limpa" }),
        item({ seqproduto: 3, classificacaoPrazo: "sem_ruptura", baseLimpa: "Não considera Ruptura" }),
      ],
      INPUT,
    );
    assert.equal(resumo.totalBaseLimpaElegivel, 2);
    assert.equal(resumo.percentualRupturaGeral, 100);
    assert.equal(resumo.percentualRupturaClassificada, 50);
  });

  it("comEstoqueCd + semEstoqueCd = universo de ruptura geral", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo", somaEstoqueCd: 5 }),
        item({ seqproduto: 2, classificacaoPrazo: "bloqueado", somaEstoqueCd: 0 }),
        item({ seqproduto: 3, classificacaoPrazo: "sem_ruptura", somaEstoqueCd: 99 }),
      ],
      INPUT,
    );
    assert.equal(resumo.comEstoqueCd, 1);
    assert.equal(resumo.semEstoqueCd, 1);
    assert.equal(resumo.comEstoqueCd + resumo.semEstoqueCd, resumo.totalRupturaGeral);
  });

  it("produto com múltiplos CDs conta estoque uma vez via somaEstoqueCd", () => {
    const resumo = gerarResumoLoja(
      [
        item({
          seqproduto: 1,
          classificacaoPrazo: "medio_prazo",
          somaEstoqueCd: 3,
          cds: [
            { posicaoLogica: 1, codigoFisico: 1, estoque: 1, pendencia: 0, statusCompra: null, diasCompra: null, diasRecebimento: null },
            { posicaoLogica: 2, codigoFisico: 2, estoque: 2, pendencia: 0, statusCompra: null, diasCompra: null, diasRecebimento: null },
          ],
        }),
      ],
      INPUT,
    );
    assert.equal(resumo.comEstoqueCd, 1);
    assert.equal(resumo.semEstoqueCd, 0);
  });

  it("centralizado / não / sem info no universo de ruptura geral", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo", produtoCentralizado: 753, textoProdutoCentralizado: "CD 753" }),
        item({ seqproduto: 2, classificacaoPrazo: "bloqueado", produtoCentralizado: null, textoProdutoCentralizado: "Não Centralizado" }),
        item({ seqproduto: 3, classificacaoPrazo: "medio_prazo", produtoCentralizado: 0, textoProdutoCentralizado: "?" }),
      ],
      INPUT,
    );
    assert.equal(resumo.totalCentralizados, 1);
    assert.equal(resumo.totalNaoCentralizados, 1);
    assert.equal(resumo.totalCentralizacaoSemInfo, 1);
    assert.equal(
      (resumo.totalCentralizados ?? 0) + (resumo.totalNaoCentralizados ?? 0) + (resumo.totalCentralizacaoSemInfo ?? 0),
      resumo.totalRupturaGeral,
    );
  });

  it("comprador null permanece (sem comprador)", () => {
    const resumo = gerarResumoLoja(
      [item({ seqproduto: 1, classificacaoPrazo: "curto_prazo", comprador: null })],
      INPUT,
    );
    assert.ok(resumo.compradores?.some((c) => c.comprador === "(sem comprador)"));
  });

  it("mapResumoToDashboard alinha cards e gráficos aos mesmos campos", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo", somaEstoqueCd: 1, produtoCentralizado: 101 }),
        item({ seqproduto: 2, classificacaoPrazo: "bloqueado", somaEstoqueCd: 0, produtoCentralizado: null, textoProdutoCentralizado: "Não Centralizado" }),
      ],
      INPUT,
    );
    const kpi = mapResumoToDashboard(resumo);
    assert.equal(kpi.total_ruptura_geral, resumo.totalRupturaGeral);
    assert.equal(kpi.total_ruptura_classificada, resumo.totalRupturaClassificada);
    assert.equal(kpi.total_com_estoque_cd, resumo.comEstoqueCd);
    assert.equal(kpi.total_sem_estoque_cd, resumo.semEstoqueCd);
    assert.equal(kpi.total_centralizado, resumo.totalCentralizados);
    assert.equal(kpi.total_nao_centralizado, resumo.totalNaoCentralizados);
    assert.equal(kpi.percentual_ruptura_geral, resumo.percentualRupturaGeral);
    assert.equal(kpi.percentual_ruptura_classificada, resumo.percentualRupturaClassificada);
    assert.equal(kpi.total_curto_prazo + kpi.total_medio_prazo + kpi.total_longo_prazo, kpi.total_ruptura_classificada);
  });

  it("texto explicativo coerente com relação geral ⊃ classificada", () => {
    const resumo = gerarResumoLoja(
      [
        item({ seqproduto: 1, classificacaoPrazo: "curto_prazo" }),
        item({ seqproduto: 2, classificacaoPrazo: "bloqueado" }),
      ],
      INPUT,
    );
    assert.ok(resumo.totalRupturaGeral >= resumo.totalRupturaClassificada);
    assert.equal(
      resumo.totalRupturaClassificada,
      resumo.curtoPrazo + resumo.medioPrazo + resumo.longoPrazo,
    );
  });
});

describe("gerarResumoLoja — piloto loja 73", () => {
  it("métricas esperadas do consolidado MT", async () => {
    const path = "src/motor/.tmp/piloto/MT/2026-03-26/loja-73/consolidado_loja_73.jsonl";
    const itens: MotorProdutoLojaConsolidado[] = [];
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      itens.push(JSON.parse(trimmed) as MotorProdutoLojaConsolidado);
    }

    const resumo = gerarResumoLoja(itens, INPUT);
    assert.equal(resumo.totalProdutos, 10873);
    assert.equal(resumo.totalRupturaGeral, 2133);
    assert.equal(resumo.totalRupturaClassificada, 799);
    assert.equal(resumo.curtoPrazo, 103);
    assert.equal(resumo.medioPrazo, 624);
    assert.equal(resumo.longoPrazo, 72);
    assert.equal(resumo.bloqueados, 1334);
    assert.equal(resumo.totalBaseLimpaElegivel, 9539);
    assert.equal(resumo.comEstoqueCd, 184);
    assert.equal(resumo.semEstoqueCd, 1949);
    assert.equal(resumo.totalCentralizados, 1035);
    assert.equal(resumo.totalNaoCentralizados, 1098);
    assert.equal(resumo.percentualRupturaGeral, 22.36);
    assert.equal(resumo.percentualRupturaClassificada, 8.38);
  });
});
