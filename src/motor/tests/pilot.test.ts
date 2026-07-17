import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { compararCampo } from "../compare/compareExcelV7.ts";
import { mapConsolidadoParaCompare } from "../compare/mapConsolidadoParaCompare.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import {
  extrairSeqprodutosGrupo1,
  filtroLojaGrupo1,
  filtroLojaInventario,
  filtroProdutosGrupo2,
} from "../pilot/pilotStoreFilter.ts";
import { selecionarAmostraEstratificada } from "../pilot/pilotSampleSelector.ts";
import { classificarDivergencia, severidadeDivergencia } from "../pilot/pilotReport.ts";
import { defaultPilotOutputDir } from "../pilot/pilotFilePaths.ts";

function itemBase(partial: Partial<MotorProdutoLojaConsolidado> = {}): MotorProdutoLojaConsolidado {
  return {
    regional: "MT",
    dataReferencia: "2026-03-26",
    bandeira: "Comper MT",
    loja: 73,
    seqproduto: 100,
    descricao: "PROD",
    codFornecedor: 1,
    fornecedor: "FORN",
    rede: "REDE",
    comprador: "COMP",
    statusProduto: null,
    familia: null,
    divisao: "COMPER MT",
    setorCodigo: null,
    setorNome: null,
    categoriaN1: null,
    setorN2: null,
    grupoN3: null,
    subgrupoN4: null,
    tipoN5: null,
    mediaVendaUnDia: null,
    mediaVendaGp: null,
    estoqueLoja: 1,
    parMin: null,
    parMax: null,
    pendenciaLoja: 0,
    diasRuptura: null,
    ultimaEntradaLoja: null,
    ultimaSaidaLoja: null,
    estoqueCd1: 0,
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
    estoqueCd5: 0,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    pendenciaCd5: 0,
    statusCompraCd1: null,
    statusCompraCd2: null,
    statusCompraCd3: null,
    statusCompraCd4: null,
    statusCompraCd5: null,
    diasCompraCd1: null,
    diasCompraCd2: null,
    diasCompraCd3: null,
    diasCompraCd4: null,
    diasCompraCd5: null,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    somaEstoqueCd: 0,
    crossSum: 0,
    crossDocking: 0,
    geraRuptura: true,
    ruptura104c: true,
    inventarioUnid: 0,
    rupturaComInventario: 0,
    rupturaSemInventario: 1,
    baseLimpa: "Base Limpa",
    ativacaoRecente: false,
    curtoPrazo: 1,
    medioPrazo: 0,
    longoPrazo: 0,
    classificacaoPrazo: "curto_prazo",
    pendenciaCpaCd: 72,
    diasPedido: 5,
    acaoCurtoPrazo: "Ação CP",
    acaoMedioPrazo: null,
    primeiroCd: 101,
    segundoCd: 102,
    terceiroCd: null,
    quartoCd: null,
    quintoCd: null,
    menorDiasRecebimento: 2,
    produtoCentralizado: 101,
    textoProdutoCentralizado: "CD 101",
    posicaoCdSelecionada: 1,
    codigoCdSelecionado: 101,
    flagPrimeiroCd: 1,
    flagSegundoCd: 0,
    flagTerceiroCd: 0,
    flagQuartoCd: 0,
    flagQuintoCd: 0,
    statusRecebto: "OK",
    statusEstoqueCds: "OK",
    statusSolicitacaoAtivacaoCd: "OK",
    qtdeEmbCompra: null,
    embalagemCompra: null,
    custoLiquido: null,
    pesoUnid: null,
    m3Unid: null,
    coberturaDias: null,
    modCurtoPrazo: null,
    ncurtoPrazo: null,
    statusOperacional: "curto_prazo",
    qualidadeDados: "completo",
    alertas: [],
    erros: [],
    fontesAusentes: [],
    ...partial,
  };
}

describe("piloto MT loja 73", () => {
  it("01. filtro loja 73 retém linha correta", () => {
    const f = filtroLojaGrupo1(73);
    assert.equal(f({ LOJA: "73", SEQPRODUTO: "1" }), true);
    assert.equal(f({ LOJA: "82", SEQPRODUTO: "1" }), false);
  });

  it("02. produto da loja retido no filtro G2", () => {
    const produtos = new Set(["1252", "6599"]);
    const f = filtroProdutosGrupo2(produtos);
    assert.equal(f({ SEQPRODUTO: "1252" }), true);
    assert.equal(f({ SEQPRODUTO: "999999" }), false);
  });

  it("03. outra loja descartada no inventário", () => {
    const f = filtroLojaInventario(73);
    assert.equal(f({ "Código Empresa": "73", "Código Produto": "1" }), true);
    assert.equal(f({ "Código Empresa": "82", "Código Produto": "1" }), false);
  });

  it("04. extrair seqprodutos únicos", () => {
    const set = extrairSeqprodutosGrupo1([{ seqproduto: "10" }, { seqproduto: "10" }, { seqproduto: "20" }]);
    assert.equal(set.size, 2);
  });

  it("05. seleção estratificada respeita limite 300", () => {
    const itens = Array.from({ length: 500 }, (_, i) => itemBase({ seqproduto: 1000 + i, curtoPrazo: i % 2 }));
    const { amostra } = selecionarAmostraEstratificada(itens, 300);
    assert.equal(amostra.length, 300);
  });

  it("06. estrato ausente registrado", () => {
    const { estratos } = selecionarAmostraEstratificada([itemBase({ curtoPrazo: 0, medioPrazo: 0, longoPrazo: 0 })], 10);
    const cp = estratos.find((e) => e.id === "cp");
    assert.ok(cp);
    assert.equal(cp!.encontrado, false);
  });

  it("07. saída JSONL path ignorado pelo git (.tmp)", () => {
    const dir = defaultPilotOutputDir("MT", "2026-03-26", 73);
    assert.match(dir, /[\\/]\.tmp[\\/]piloto[\\/]/);
  });

  it("08. mapConsolidadoParaCompare produz chaves principais", () => {
    const mapped = mapConsolidadoParaCompare(itemBase());
    assert.equal(mapped["Curto Prazo"], 1);
    assert.equal(mapped.LOJA, 73);
  });

  it("09. divergência crítica em booleano CP", () => {
    const campo = compararCampo("Curto Prazo", 1, 0, { campo: "Curto Prazo" });
    assert.equal(severidadeDivergencia(campo), "critica");
    assert.equal(classificarDivergencia(campo), "bre");
  });

  it("10. tolerância decimal 0,01", () => {
    const campo = compararCampo("Média dias Pedido cd1", 10.005, 10, {
      campo: "Média dias Pedido cd1",
      toleranciaDecimal: 0.01,
    });
    assert.equal(campo.status, "tolerancia_decimal");
    assert.equal(severidadeDivergencia(campo), "tolerada");
  });

  it("11. null versus zero não equivalentes", () => {
    const nuloVsZero = compararCampo("Dias Pedido", 0, null, { campo: "Dias Pedido" });
    assert.notEqual(nuloVsZero.status, "igual");
    const zeroVsUm = compararCampo("Dias Pedido", 0, 1, { campo: "Dias Pedido" });
    assert.equal(zeroVsUm.status, "divergente");
  });

  it("12. nenhum Supabase no módulo piloto", () => {
    const src = fs.readFileSync(new URL("../pilot/pilotRunner.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /supabase/i);
  });

  it("13. nenhum arquivo bruto copiado pelo runner", () => {
    const src = fs.readFileSync(new URL("../pilot/pilotRunner.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /copyFile|writeFileSync\([^)]*Grupo de Ruptura/);
  });

  it("14. fontes reais lidas in-place (sem mutação)", () => {
    const src = fs.readFileSync(new URL("../pilot/pilotRunner.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /writeFileSync\([^)]*importar/);
  });

  it("15. métricas etapas definidas no runner", () => {
    const src = fs.readFileSync(new URL("../pilot/pilotRunner.ts", import.meta.url), "utf8");
    assert.match(src, /etapas\.push/);
    assert.match(src, /bytesLidosPorArquivo/);
  });
});
