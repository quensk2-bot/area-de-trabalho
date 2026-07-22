import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CABECALHOS_BASE_RUPTURA, CAMPOS_AUSENTES_V7 } from "../../motor/export/baseRuptura/baseRupturaColumns.ts";
import { validarBaseRuptura } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import { toPermissionContext } from "../../auth-v7/authProfileUtils.ts";
import {
  canExportBandeiraCompleta,
  escopoArquivoExport,
  inferirModoExport,
  nomeArquivoExportRuptura,
} from "../services/rupturaExportBaseUtils.ts";
import {
  estoquesCdOficiais,
  mapearBaseRupturaHibrido,
  montarCdsDinamicos,
} from "../services/hibrido/mapearBaseRupturaHibrido.ts";
import { gerarCsvBaseRuptura } from "../utils/baseRupturaBrowserExport.ts";
import { RUPTURA_EXPORT_BROWSER_MAX_ROWS } from "../types/rupturaFiltrosTypes.ts";
import { assertEscopoHibrido } from "../services/hibrido/hibridoScope.ts";

const produtoBase: HibridoProdutoGestao = {
  loja: 73,
  seqproduto: 1001,
  descricao: "Arroz Tio João 5kg",
  codFornecedor: 10,
  razaoFornecedor: "FORN TESTE",
  rede: "REDE A",
  comprador: "COMPRADOR X",
  estoqueLoja: 2,
  mediaVendaDia: 1.5,
  parMin: 3,
  parMax: 10,
  somaEstoqueCd: 50,
  pendenciaCpaCd: 0,
  classificacaoPrazo: "curto_prazo",
  diasPedido: 15,
  produtoCentralizado: 464,
  codigoCdSelecionado: 464,
  statusEstoqueCds: "Com estoque",
  acaoRecomendada: "Pedido imediato",
  qualidadeDados: "completo",
  setorN2: "MERCEARIA",
  divisao: "ALIMENTOS",
};

describe("ruptura export base — colunas oficiais", () => {
  it("ordem BASE segue baseRupturaColumns", () => {
    assert.equal(CABECALHOS_BASE_RUPTURA[0], "LOJA");
    assert.equal(CABECALHOS_BASE_RUPTURA[1], "SEQPRODUTO");
    assert.equal(CABECALHOS_BASE_RUPTURA.includes("ESTQ_CD1"), true);
    assert.equal(CABECALHOS_BASE_RUPTURA.length, 62);
  });

  it("mapeamento hibrido preenche colunas mapeáveis", () => {
    const cds = [
      { posicaoLogica: 1, codigoFisico: 464, estoque: 10, pendencia: 0, statusCompra: "OK", diasCompra: 1, diasRecebimento: 2, flagCentralizacao: 1 },
      { posicaoLogica: 2, codigoFisico: 465, estoque: 0, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: null },
    ];
    const { linhas, camposAusentes } = mapearBaseRupturaHibrido({
      produtos: [produtoBase],
      cdsPorProduto: new Map([[1001, cds]]),
      bandeira: "COMPER",
    });
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]!.LOJA, 73);
    assert.equal(linhas[0]!.SEQPRODUTO, 1001);
    assert.equal(linhas[0]!.ESTQ_CD1, 10);
    assert.equal(linhas[0]!.ESTQ_CD2, 0);
    assert.equal(linhas[0]!["Curto Prazo"], 1);
    assert.equal(linhas[0]!["Médio Prazo"], 0);
    assert.equal(linhas[0]!.BANDEIRA, "COMPER");
    assert.ok(camposAusentes.includes("% Rup Inventário"));
    assert.equal(validarBaseRuptura(linhas).valido, true);
  });

  it("zero em estoque CD permanece 0 (nao null)", () => {
    const est = estoquesCdOficiais([
      { posicaoLogica: 1, codigoFisico: 1, estoque: 0, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: null },
    ]);
    assert.equal(est.ESTQ_CD1, 0);
  });

  it("CD ausente retorna null", () => {
    const est = estoquesCdOficiais([]);
    assert.equal(est.ESTQ_CD1, null);
    assert.equal(est.ESTQ_CD5, null);
  });
});

describe("ruptura export base — campos ausentes", () => {
  it("lista campos ausentes V7 oficiais", () => {
    assert.equal(CAMPOS_AUSENTES_V7.length, 22);
    assert.ok(CAMPOS_AUSENTES_V7.includes("% Curto Prazo"));
  });

  it("nao inventa ruptura104c", () => {
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [produtoBase],
      cdsPorProduto: new Map(),
      bandeira: "COMPER",
    });
    assert.equal(linhas[0]!["Ruptura 104C"], null);
    assert.equal(linhas[0]!["Flag Ruptura 104c"], null);
  });
});

describe("ruptura export base — filename e escopo", () => {
  it("nome inclui regional bandeira escopo data", () => {
    const n = nomeArquivoExportRuptura({
      regional: "MT",
      bandeira: "COMPER",
      escopo: "LOJA_73",
      dataReferencia: "2026-07-13",
      extensao: "xlsx",
    });
    assert.match(n, /^BASE_RUPTURA_V7_MT_COMPER_LOJA_73_2026-07-13\.xlsx$/);
  });

  it("escopo selecao multipla", () => {
    assert.equal(escopoArquivoExport({ modo: "selecao", lojas: [73, 82, 88], totalEscopo: 15 }), "SELECAO_3LOJAS");
  });

  it("escopo bandeira completa", () => {
    assert.equal(escopoArquivoExport({ modo: "bandeira_completa", lojas: [73, 82], totalEscopo: 15 }), "BANDEIRA_COMPLETA");
  });

  it("modo loja unica", () => {
    assert.equal(inferirModoExport({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13", loja: 73, lojas: [73] }, 15), "loja_unica");
  });
});

describe("ruptura export base — CSV", () => {
  it("UTF-8 BOM e CRLF", () => {
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [{ ...produtoBase, descricao: "Açúcar Cristal" }],
      cdsPorProduto: new Map(),
      bandeira: "COMPER",
    });
    const csv = gerarCsvBaseRuptura(linhas);
    assert.ok(csv.startsWith("\ufeff"));
    assert.ok(csv.includes("\r\n"));
    assert.ok(csv.includes("Açúcar Cristal"));
  });
});

describe("ruptura export base — perfis", () => {
  const adm = toPermissionContext({
    perfil: { user_id: "a", nome: "ADM", email: "a@test", nivel: "ADM", ativo: true },
    regionais: [],
    bandeiras: [],
    lojas: [],
    permissoes: [],
  });

  const n1 = toPermissionContext({
    perfil: { user_id: "n", nome: "N1", email: "n@test", nivel: "N1", ativo: true },
    regionais: [{ id: "r", user_id: "n", regional: "MT", ativo: true }],
    bandeiras: [{ id: "b", user_id: "n", regional: "MT", bandeira: "COMPER", ativo: true }],
    lojas: [],
    permissoes: ["ruptura.ver"],
  });

  const gerente = toPermissionContext({
    perfil: { user_id: "g", nome: "G", email: "g@test", nivel: "GERENTE_LOJA", ativo: true },
    regionais: [],
    bandeiras: [],
    lojas: [{ id: "l", user_id: "g", regional: "MT", bandeira: "COMPER", loja: 73, ativo: true }],
    permissoes: [],
  });

  it("ADM exporta bandeira completa", () => {
    assert.equal(canExportBandeiraCompleta(adm), true);
  });

  it("N1 exporta bandeira completa no escopo", () => {
    assert.equal(canExportBandeiraCompleta(n1), true);
  });

  it("Gerente nao exporta bandeira completa", () => {
    assert.equal(canExportBandeiraCompleta(gerente), false);
  });

  it("Gerente escopo unica loja", () => {
    process.env.VITE_MODO_HIBRIDO = "true";
    const ok = assertEscopoHibrido(gerente, {
      regional: "MT",
      bandeira: "COMPER",
      loja: 73,
      lojas: [73],
      dataReferencia: "2026-07-13",
    });
    assert.equal(ok, null);
    const bloq = assertEscopoHibrido(gerente, {
      regional: "MT",
      bandeira: "COMPER",
      loja: 0,
      lojas: [73, 82],
      dataReferencia: "2026-07-13",
    });
    assert.equal(bloq?.code, "forbidden");
  });
});

describe("ruptura export base — CDs dinamicos", () => {
  it("monta linhas por posicao logica", () => {
    const rows = montarCdsDinamicos(73, 1001, [
      { posicaoLogica: 2, codigoFisico: 465, estoque: 5, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: null },
      { posicaoLogica: 1, codigoFisico: 464, estoque: 10, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 1 },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.POSICAO_LOGICA, 1);
    assert.equal(rows[1]!.POSICAO_LOGICA, 2);
  });
});

describe("ruptura export base — roteamento tamanho", () => {
  it("limite browser 25k", () => {
    assert.equal(RUPTURA_EXPORT_BROWSER_MAX_ROWS, 25_000);
  });
});

describe("ruptura export base — sem consumo_v7", () => {
  it("servico export usa hibrido nao Postgres consumo", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../services/rupturaExportBaseService.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /consumoDb/);
    assert.doesNotMatch(src, /schema\("consumo_v7"\)/);
    assert.match(src, /carregarDadosExportBaseHibrido/);
  });

  it("RupturaExportMenu presente no dashboard e gestao", async () => {
    const fs = await import("node:fs/promises");
    const dash = await fs.readFile(new URL("../pages/RupturaDashboardPage.tsx", import.meta.url), "utf8");
    const gestao = await fs.readFile(new URL("../pages/RupturaGestaoPage.tsx", import.meta.url), "utf8");
    assert.match(dash, /RupturaExportMenu/);
    assert.match(gestao, /RupturaExportMenu/);
  });
});
