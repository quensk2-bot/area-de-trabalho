import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import {
  aplicarSlicersBaseComprador,
  deduplicarBaseCompradorPorCodigo,
  montarBaseCompradorFromGestao,
  produtoParaBaseCompradorLinha,
} from "../utils/mapearBaseCompradorFromGestao.ts";

function produto(partial: Partial<HibridoProdutoGestao> & { seqproduto: number }): HibridoProdutoGestao {
  return {
    loja: 73,
    descricao: "PROD TESTE",
    codFornecedor: 1,
    razaoFornecedor: "FORN A",
    rede: "R",
    comprador: "ILZA",
    estoqueLoja: 0,
    mediaVendaDia: null,
    parMin: null,
    parMax: null,
    somaEstoqueCd: null,
    pendenciaLoja: null,
    pendenciaCpaCd: null,
    baseLimpa: "Base Limpa",
    classificacaoPrazo: null,
    diasPedido: null,
    produtoCentralizado: null,
    codigoCdSelecionado: null,
    statusEstoqueCds: null,
    acaoRecomendada: null,
    qualidadeDados: null,
    setorN2: "31-ALIMENTACAO BASICA",
    divisao: "60-MERCEARIA",
    grupoN3: "AZEITES",
    categoriaN1: null,
    embalagemCompra: null,
    ruptura104c: null,
    geraRuptura: true,
    inventarioUnid: null,
    rupturaComInventario: null,
    rupturaSemInventario: null,
    crossDocking: null,
    crossSum: null,
    estSelecInvCd1: null,
    estSelecInvCd2: null,
    estSelecInvCd3: null,
    estSelecInvCd4: null,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    curtoPrazo: null,
    medioPrazo: null,
    longoPrazo: null,
    ultimaEntradaLoja: null,
    diasRuptura: null,
    statusSolicitacaoAtivacaoCd: null,
    acaoCurtoPrazo: null,
    acaoMedioPrazo: null,
    textoProdutoCentralizado: null,
    rupDiasRecebtoMaiorData: null,
    ultimoPedidoLoja: null,
    ativacaoRuptura30SemPedido: null,
    itensVdaPendencia: null,
    rupSemPendenciaVda: null,
    rupInventarioPct: null,
    rupSemInventarioPct: null,
    ...partial,
  };
}

describe("mapearBaseCompradorFromGestao", () => {
  it("mapeia colunas da tabela dinâmica", () => {
    const row = produtoParaBaseCompradorLinha(produto({ seqproduto: 1523864, descricao: "AZEITE X" }));
    assert.equal(row.codigo, 1523864);
    assert.equal(row.departamento, "60-MERCEARIA");
    assert.equal(row.secao, "31-ALIMENTACAO BASICA");
    assert.equal(row.categoria, "AZEITES");
    assert.equal(row.fornecedor, "FORN A");
    assert.equal(row.comprador, "ILZA");
  });

  it("deduplica por código em multi-loja", () => {
    const linhas = montarBaseCompradorFromGestao({
      produtos: [
        produto({ seqproduto: 1, loja: 73 }),
        produto({ seqproduto: 1, loja: 82, descricao: "OUTRA" }),
      ],
      universoOficial: false,
    });
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]?.descCompleta, "PROD TESTE");
  });

  it("prefere grupoN3 sobre categoriaN1", () => {
    const row = produtoParaBaseCompradorLinha(
      produto({ seqproduto: 1, grupoN3: "HIDRATACAO", categoriaN1: "LEGADO" }),
    );
    assert.equal(row.categoria, "HIDRATACAO");
  });

  it("slicers departamento e seção", () => {
    const linhas = deduplicarBaseCompradorPorCodigo([
      produtoParaBaseCompradorLinha(produto({ seqproduto: 1, divisao: "60-MERCEARIA" })),
      produtoParaBaseCompradorLinha(
        produto({ seqproduto: 2, divisao: "63-BAZAR", setorN2: "51-BASICO", categoriaN1: "X" }),
      ),
    ]);
    const filtrado = aplicarSlicersBaseComprador(
      linhas,
      { departamentos: ["63-BAZAR"], secoes: [], categorias: [] },
      2,
      2,
      2,
    );
    assert.equal(filtrado.length, 1);
    assert.equal(filtrado[0]?.departamento, "63-BAZAR");
  });

  it("filtra categoria e busca por código ou descrição", () => {
    const linhas = [
      produtoParaBaseCompradorLinha(
        produto({ seqproduto: 43273, grupoN3: "BISCOITOS", descricao: "BISCOITO TESTE" }),
      ),
      produtoParaBaseCompradorLinha(
        produto({ seqproduto: 612480, grupoN3: "HIGIENE", descricao: "CREME TESTE" }),
      ),
    ];

    const porCategoria = aplicarSlicersBaseComprador(
      linhas,
      { departamentos: [], secoes: [], categorias: ["HIGIENE"] },
      1,
      1,
      2,
    );
    assert.deepEqual(porCategoria.map((linha) => linha.codigo), [612480]);

    const porCodigo = aplicarSlicersBaseComprador(
      linhas,
      { departamentos: [], secoes: [], categorias: [] },
      1,
      1,
      2,
      "43273",
    );
    assert.deepEqual(porCodigo.map((linha) => linha.codigo), [43273]);

    const porDescricao = aplicarSlicersBaseComprador(
      linhas,
      { departamentos: [], secoes: [], categorias: [] },
      1,
      1,
      2,
      "creme",
    );
    assert.deepEqual(porDescricao.map((linha) => linha.codigo), [612480]);
  });

  it("sinaliza conflito de atributos ao deduplicar o mesmo código em várias lojas", () => {
    const linhas = deduplicarBaseCompradorPorCodigo([
      produtoParaBaseCompradorLinha(produto({ seqproduto: 1, loja: 73, grupoN3: "BISCOITOS" })),
      produtoParaBaseCompradorLinha(produto({ seqproduto: 1, loja: 82, grupoN3: "HIGIENE" })),
    ]);
    assert.equal(linhas.length, 1);
    assert.deepEqual(linhas[0]?.conflitoAtributos, ["categoria"]);
  });
});
