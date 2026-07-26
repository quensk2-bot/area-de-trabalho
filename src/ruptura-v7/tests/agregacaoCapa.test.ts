import assert from "node:assert";
import { describe, it } from "node:test";
import { agregarCapaFromGestao } from "../utils/agregarCapaFromGestao.ts";
import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";

function mpProduto(
  seqproduto: number,
  diasPedido: number | null,
  overrides?: Partial<HibridoProdutoGestao>,
): HibridoProdutoGestao {
  const base: HibridoProdutoGestao = {
    loja: 73,
    seqproduto,
    descricao: `Produto ${seqproduto}`,
    codFornecedor: null,
    razaoFornecedor: null,
    rede: null,
    comprador: null,
    estoqueLoja: null,
    mediaVendaDia: null,
    parMin: null,
    parMax: null,
    somaEstoqueCd: null,
    pendenciaLoja: null,
    pendenciaCpaCd: null,
    baseLimpa: "Base Limpa",
    classificacaoPrazo: "medio_prazo",
    diasPedido,
    produtoCentralizado: null,
    codigoCdSelecionado: null,
    statusEstoqueCds: null,
    acaoRecomendada: null,
    qualidadeDados: null,
    setorN2: "60-MERCEARIA",
    divisao: "60-ALIMENTOS",
    grupoN3: null,
    categoriaN1: null,
    embalagemCompra: null,
    ruptura104c: true,
    geraRuptura: true,
    inventarioUnid: null,
    rupturaComInventario: null,
    rupturaSemInventario: null,
    crossSum: null,
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    crossDocking: null,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    curtoPrazo: 0,
    medioPrazo: 1,
    longoPrazo: 0,
    ultimaEntradaLoja: null,
    diasRuptura: null,
    statusSolicitacaoAtivacaoCd: null,
    acaoCurtoPrazo: null,
    acaoMedioPrazo: null,
    textoProdutoCentralizado: null,
    rupDiasRecebtoCd1: 0,
    rupDiasRecebtoCd2: 0,
    rupDiasRecebtoCd3: 0,
    rupDiasRecebtoCd4: 0,
    rupDiasRecebtoCd5: 0,
    rupDiasRecebtoMaiorData: 0,
    curtoPrazoRebtoProximo: 0,
    curtoPrazoNaoRebtoProximo: 0,
    ultimoPedidoLoja: null,
    ativacaoRuptura30SemPedido: null,
    itensVdaPendencia: null,
    rupSemPendenciaVda: null,
    rupInventarioPct: null,
    rupSemInventarioPct: null,
    ...overrides,
  };
  return base;
}

function cpProduto(seqproduto: number, overrides?: Partial<HibridoProdutoGestao>): HibridoProdutoGestao {
  return mpProduto(seqproduto, null, {
    classificacaoPrazo: "curto_prazo",
    curtoPrazo: 1,
    medioPrazo: 0,
    ...overrides,
  });
}

function lpProduto(seqproduto: number, overrides?: Partial<HibridoProdutoGestao>): HibridoProdutoGestao {
  return mpProduto(seqproduto, null, {
    classificacaoPrazo: "longo_prazo",
    curtoPrazo: 0,
    medioPrazo: 0,
    longoPrazo: 1,
    ...overrides,
  });
}

function semRupProduto(seqproduto: number, overrides?: Partial<HibridoProdutoGestao>): HibridoProdutoGestao {
  return mpProduto(seqproduto, null, {
    classificacaoPrazo: "sem_ruptura",
    curtoPrazo: 0,
    medioPrazo: 0,
    longoPrazo: 0,
    ruptura104c: false,
    ...overrides,
  });
}

describe("agregarCapaFromGestao — media_dias_pedido (MP)", () => {
  it("2 MP produtos com dias 10 e 20 + 8 não-MP → média MP = 15, não 3", () => {
    const produtos: HibridoProdutoGestao[] = [
      mpProduto(1, 10),
      mpProduto(2, 20),
      cpProduto(3),
      cpProduto(4),
      cpProduto(5),
      lpProduto(6),
      lpProduto(7),
      semRupProduto(8),
      semRupProduto(9),
      semRupProduto(10),
    ];
    const capa = agregarCapaFromGestao(produtos);
    const total = capa.total;

    assert.strictEqual(total.total_medio_prazo, 2, "total_medio_prazo deve ser 2");
    assert.strictEqual(total.media_dias_pedido, 15, "Média MP deve ser 15");
    assert.notStrictEqual(total.media_dias_pedido, 3, "Média NÃO deve usar total_skus como denominador");
    assert.strictEqual(total.total_skus, 10, "total_skus deve ser 10 (não alterado)");
    assert.strictEqual(total.total_curto_prazo, 3, "CP não deve ser alterado");
    assert.strictEqual(total.total_longo_prazo, 2, "LP não deve ser alterado");
  });

  it("MP produtos com diasPedido null → media_dias_pedido = 0", () => {
    const produtos: HibridoProdutoGestao[] = [
      mpProduto(1, null),
      mpProduto(2, null),
      cpProduto(3),
    ];
    const capa = agregarCapaFromGestao(produtos);
    const total = capa.total;

    assert.strictEqual(total.total_medio_prazo, 2, "2 MP produtos");
    assert.strictEqual(total.media_dias_pedido, 0, "Média deve ser 0 (soma 0 / 2 MP)");
  });

  it("MP produtos com diasPedido zero → media_dias_pedido = 0", () => {
    const produtos: HibridoProdutoGestao[] = [
      mpProduto(1, 0),
      mpProduto(2, 0),
    ];
    const capa = agregarCapaFromGestao(produtos);
    const total = capa.total;

    assert.strictEqual(total.total_medio_prazo, 2);
    assert.strictEqual(total.media_dias_pedido, 0, "Média deve ser 0");
  });

  it("Nenhum produto MP → media_dias_pedido = null", () => {
    const produtos: HibridoProdutoGestao[] = [
      cpProduto(1),
      cpProduto(2),
      lpProduto(3),
      semRupProduto(4),
    ];
    const capa = agregarCapaFromGestao(produtos);
    const total = capa.total;

    assert.strictEqual(total.total_medio_prazo, 0, "0 MP produtos");
    assert.strictEqual(total.media_dias_pedido, null, "Sem MP → media deve ser null");
  });

  it("Correção não altera Total MP, CP, LP, SKUs", () => {
    const produtos: HibridoProdutoGestao[] = [
      mpProduto(1, 5),
      mpProduto(2, 8),
      mpProduto(3, 12),
      cpProduto(4),
      cpProduto(5),
      cpProduto(6),
      lpProduto(7),
      lpProduto(8),
      semRupProduto(9),
      semRupProduto(10),
      semRupProduto(11),
    ];
    const capa = agregarCapaFromGestao(produtos);
    const total = capa.total;

    assert.strictEqual(total.total_medio_prazo, 3, "MP não alterado");
    assert.strictEqual(total.total_curto_prazo, 3, "CP não alterado");
    assert.strictEqual(total.total_longo_prazo, 2, "LP não alterado");
    assert.strictEqual(total.total_skus, 11, "SKUs não alterado");
    assert.strictEqual(total.media_dias_pedido, 8.33, "Média MP corrigida: (5+8+12)/3");
  });
});
