import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLUNAS_BASE_RUPTURA_V7, CABECALHOS_BASE_RUPTURA } from "../../export/baseRuptura/baseRupturaColumns.ts";
import {
  mapearBaseRuptura,
  nomeArquivoBaseRuptura,
  slugBandeiraArquivo,
  validarBaseRuptura,
} from "../../export/baseRuptura/baseRupturaTypes.ts";
import { validarTransicaoMotorPacote } from "../motorPacoteStatus.ts";
import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";

describe("motorPacote — status", () => {
  it("pronto_motor → processando_parser", () => {
    assert.equal(validarTransicaoMotorPacote("pronto_motor", "processando_parser"), true);
  });

  it("concluido não volta para parser", () => {
    assert.equal(validarTransicaoMotorPacote("concluido", "processando_parser"), false);
  });

  it("falhou permite retry", () => {
    assert.equal(validarTransicaoMotorPacote("falhou", "processando_parser"), true);
  });
});

describe("baseRuptura — colunas", () => {
  it("possui colunas oficiais mínimas", () => {
    assert.ok(CABECALHOS_BASE_RUPTURA.includes("LOJA"));
    assert.ok(CABECALHOS_BASE_RUPTURA.includes("SEQPRODUTO"));
    assert.ok(CABECALHOS_BASE_RUPTURA.includes("ESTQ_CD1"));
    assert.equal(CABECALHOS_BASE_RUPTURA.length, COLUNAS_BASE_RUPTURA_V7.length);
  });

  it("nome arquivo padrão MT COMPER", () => {
    const n = nomeArquivoBaseRuptura({
      regional: "MT",
      bandeira: "Comper MT",
      dataReferencia: "2026-07-18",
      extensao: "xlsx",
    });
    assert.match(n, /^BASE_RUPTURA_V7_MT_COMPER_MT_2026-07-18\.xlsx$/);
  });

  it("slug bandeira", () => {
    assert.equal(slugBandeiraArquivo("Comper MT"), "COMPER_MT");
  });
});

describe("baseRuptura — mapeamento", () => {
  it("mapeia consolidado sem inventar campos ausentes", () => {
    const item = {
      loja: 73,
      seqproduto: 100,
      descricao: "Produto teste",
      codFornecedor: 1,
      fornecedor: "Forn",
      estoqueLoja: 5,
      parMax: 10,
      pendenciaCpaCd: 0,
      embalagemCompra: "CX",
      setorNome: "Setor",
      setorN2: "S2",
      categoriaN1: "Cat",
      estoqueCd1: 1,
      estoqueCd2: 2,
      estoqueCd3: 3,
      estoqueCd4: 4,
      estoqueCd5: 5,
      ruptura104c: true,
      inventarioUnid: 0,
      rupturaComInventario: 0,
      rupturaSemInventario: 1,
      modCurtoPrazo: "M",
      ncurtoPrazo: "N",
      curtoPrazo: 1,
      crossDocking: 0,
      medioPrazo: 0,
      longoPrazo: 0,
      textoProdutoCentralizado: "P",
      diasPedido: 5,
      ultimaEntradaLoja: "2026-01-01",
      rede: "Rede",
      bandeira: "COMPER",
      statusSolicitacaoAtivacaoCd: "OK",
      diasRuptura: 3,
      statusEstoqueCds: "OK",
      acaoCurtoPrazo: "A",
      acaoMedioPrazo: "B",
      comprador: "C",
    } as unknown as MotorProdutoLojaConsolidado;

    const { linhas, camposAusentes } = mapearBaseRuptura([item]);
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]!.LOJA, 73);
    assert.equal(linhas[0]!["% Rup Inventário"], null);
    assert.ok(camposAusentes.includes("% Rup Inventário"));
    assert.equal(validarBaseRuptura(linhas).valido, true);
  });
});
