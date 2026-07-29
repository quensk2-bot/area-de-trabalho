import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBandeiraExport,
  formatBandeiraExportCompativel,
  formatTextoProduto,
} from "../../motor/export/baseRuptura/rupturaExportFormat.ts";
import {
  CABECALHOS_BASE_RUPTURA,
  CABECALHOS_OFICIAL_CONFERENCIA,
  CAMPOS_AUSENTES_V7,
} from "../../motor/export/baseRuptura/baseRupturaColumns.ts";
import { rotuloModoUniversoExport, validarBaseRuptura } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import { toPermissionContext } from "../../auth-v7/authProfileUtils.ts";
import {
  canExportBandeiraCompleta,
  escopoArquivoExport,
  escopoEquivaleBandeiraCompleta,
  inferirModoExport,
  maxLojasExportBrowser,
  nomeArquivoExportRuptura,
  resolverModoUniversoExport,
} from "../services/rupturaExportBaseUtils.ts";
import {
  estoquesCdOficiais,
  mapearBaseRupturaHibrido,
  montarCdsDinamicos,
  enriquecerStatusEstoqueCdsExport,
  inventarioUnidExport,
  statusEstoqueCdsPrecisaEnriquecer,
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
  pendenciaLoja: 144,
  pendenciaCpaCd: 146,
  baseLimpa: "Base Limpa",
  classificacaoPrazo: "curto_prazo",
  diasPedido: 15,
  produtoCentralizado: 464,
  codigoCdSelecionado: 464,
  statusEstoqueCds: "Estoque no CD: (753)",
  acaoRecomendada: "Pedido imediato",
  qualidadeDados: "completo",
  setorN2: "MERCEARIA",
  divisao: "ALIMENTOS",
  categoriaN1: "MERCEARIA SECA",
  embalagemCompra: "72",
  ruptura104c: false,
  geraRuptura: true,
  inventarioUnid: 0,
  rupturaComInventario: 0,
  rupturaSemInventario: 0,
  crossSum: 0,
  estSelecInvCd1: null,
  estSelecInvCd2: null,
  estSelecInvCd3: null,
  estSelecInvCd4: null,
  crossDocking: 0,
  modCurtoPrazo: null,
  ncurtoPrazo: null,
  curtoPrazo: 1,
  medioPrazo: 0,
  longoPrazo: 0,
  ultimaEntradaLoja: "2025-12-05",
  diasRuptura: 30,
  statusSolicitacaoAtivacaoCd: "Ativo no CD",
  acaoCurtoPrazo: "Pedido imediato",
  acaoMedioPrazo: null,
  textoProdutoCentralizado: "Arroz Tio João 5kg - 1001",
};

describe("ruptura export base — colunas oficiais", () => {
  it("ordem BASE segue arquivo conferencia (ESTQ_CD5 pos 25)", () => {
    assert.deepEqual(CABECALHOS_BASE_RUPTURA, CABECALHOS_OFICIAL_CONFERENCIA);
    assert.equal(CABECALHOS_BASE_RUPTURA[0], "LOJA");
    assert.equal(CABECALHOS_BASE_RUPTURA[16], "Ruptura 104C");
    assert.equal(CABECALHOS_BASE_RUPTURA[24], "ESTQ_CD5");
    assert.equal(CABECALHOS_BASE_RUPTURA.length, 62);
  });

  it("mapeamento hibrido preenche colunas mapeáveis", () => {
    const cds = [
      { posicaoLogica: 1, codigoFisico: 464, estoque: 10, pendencia: 0, statusCompra: "OK", diasCompra: 1, diasRecebimento: 2, flagCentralizacao: 1 },
      { posicaoLogica: 2, codigoFisico: 465, estoque: 0, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: null },
      { posicaoLogica: 5, codigoFisico: 753, estoque: 3, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: null },
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
    assert.equal(linhas[0]!.ESTQ_CD5, 3);
    assert.equal(linhas[0]!["Curto Prazo"], 1);
    assert.equal(linhas[0]!["Médio Prazo"], 0);
    assert.equal(linhas[0]!.BANDEIRA, "COMPER");
    assert.equal(linhas[0]!.COMPRADOR, "COMPRADOR X");
    assert.equal(linhas[0]!.CATEGORIA, "MERCEARIA SECA");
    assert.equal(linhas[0]!.EMBCPA, "72");
    assert.equal(linhas[0]!["Ruptura 104C"], "Não é Ruptura");
    assert.equal(linhas[0]!["Flag Ruptura 104c"], "Gera Ruptura");
    assert.equal(linhas[0]!["Menor que três Unidades"], 0);
    assert.equal(linhas[0]!.PRODUTO, "Arroz Tio João 5kg - 1001");
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
  it("lista campos ausentes V7 oficiais (PQ)", () => {
    assert.equal(CAMPOS_AUSENTES_V7.length, 22);
    assert.ok(CAMPOS_AUSENTES_V7.includes("% Curto Prazo"));
  });

  it("nao inventa ruptura104c quando ausente no JSON", () => {
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [{ ...produtoBase, ruptura104c: null, geraRuptura: null }],
      cdsPorProduto: new Map(),
      bandeira: "COMPER",
    });
    assert.equal(linhas[0]!["Ruptura 104C"], null);
    assert.equal(linhas[0]!["Flag Ruptura 104c"], null);
  });
});

describe("ruptura export base — universo export", () => {
  it("filtra produtos por baseLimpa Base Limpa", () => {
    const produtos = [
      { ...produtoBase, seqproduto: 1, baseLimpa: "Base Limpa" as const },
      { ...produtoBase, seqproduto: 2, baseLimpa: "Não considera Ruptura" as const },
    ];
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: produtos.filter((p) => p.baseLimpa === "Base Limpa"),
      cdsPorProduto: new Map(),
      bandeira: "COMPER",
      modoUniverso: "oficial_compativel",
    });
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]!.SEQPRODUTO, 1);
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

  it("nome inclui modo universo V7_INTEGRAL", () => {
    const n = nomeArquivoExportRuptura({
      regional: "MT",
      bandeira: "COMPER",
      escopo: "BANDEIRA_COMPLETA",
      dataReferencia: "2026-07-13",
      extensao: "xlsx",
      universo: "integral",
    });
    assert.match(n, /V7_INTEGRAL/);
    assert.doesNotMatch(n, /BANDEIRA_COMPLETA_INTEGRAL_/);
  });

  it("nome inclui modo universo OFICIAL_COMPATIVEL", () => {
    const n = nomeArquivoExportRuptura({
      regional: "MT",
      bandeira: "COMPER",
      escopo: "BANDEIRA_COMPLETA",
      dataReferencia: "2026-07-13",
      extensao: "xlsx",
      universo: "oficial_compativel",
    });
    assert.match(n, /OFICIAL_COMPATIVEL/);
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

  it("selecao com todas lojas equivale bandeira completa", () => {
    const lojas = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173];
    assert.equal(
      escopoEquivaleBandeiraCompleta({ modo: "selecao", lojas, totalEscopo: 15 }),
      true,
    );
    assert.equal(
      escopoEquivaleBandeiraCompleta({ modo: "selecao", lojas: [73, 82], totalEscopo: 15 }),
      false,
    );
    assert.equal(
      escopoEquivaleBandeiraCompleta({ modo: "bandeira_completa", lojas: [73], totalEscopo: 15 }),
      true,
    );
  });

  it("max lojas browser export", () => {
    assert.equal(maxLojasExportBrowser(15), 2);
    assert.equal(maxLojasExportBrowser(1), 1);
  });

  it("RESUMO rotula modos V7_INTEGRAL e OFICIAL_COMPATIVEL", () => {
    assert.equal(rotuloModoUniversoExport("integral"), "V7_INTEGRAL");
    assert.equal(rotuloModoUniversoExport("oficial_compativel"), "OFICIAL_COMPATIVEL");
  });
});

describe("ruptura export base — bandeira e PENDCPA", () => {
  const cds = [
    { posicaoLogica: 1, codigoFisico: 464, estoque: 10, pendencia: 0, statusCompra: "OK", diasCompra: 1, diasRecebimento: 2, flagCentralizacao: 1 },
  ];

  it("BANDEIRA COMPER em V7 integral vs Comper MT em oficial_compativel", () => {
    const integral = mapearBaseRupturaHibrido({
      produtos: [produtoBase],
      cdsPorProduto: new Map([[1001, cds]]),
      bandeira: "COMPER",
      regional: "MT",
      modoUniverso: "integral",
    });
    const compat = mapearBaseRupturaHibrido({
      produtos: [produtoBase],
      cdsPorProduto: new Map([[1001, cds]]),
      bandeira: "COMPER",
      regional: "MT",
      modoUniverso: "oficial_compativel",
    });
    assert.equal(integral.linhas[0]!.BANDEIRA, "COMPER");
    assert.equal(compat.linhas[0]!.BANDEIRA, "Comper MT");
    assert.equal(formatBandeiraExport("COMPER"), "COMPER");
    assert.equal(formatBandeiraExportCompativel("MT", "COMPER"), "Comper MT");
  });

  it("PENDCPA usa somente a pendencia pura da loja", () => {
    const pendenciaLoja = 144;
    const pendenciaAgregada = 146;
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [{ ...produtoBase, pendenciaLoja, pendenciaCpaCd: pendenciaAgregada }],
      cdsPorProduto: new Map([[1001, cds]]),
      bandeira: "COMPER",
      regional: "MT",
      modoUniverso: "oficial_compativel",
    });
    assert.equal(linhas[0]!.PENDCPA, pendenciaLoja);
    assert.notEqual(linhas[0]!.PENDCPA, pendenciaAgregada);
  });

  it("PRODUTO usa descricao - seqproduto", () => {
    const produtos = [
      { ...produtoBase, seqproduto: 1001, descricao: "Arroz Tio João 5kg" },
      { ...produtoBase, seqproduto: 2002, descricao: "Feijão Carioca 1kg" },
    ];
    for (const p of produtos) {
      const esperado = formatTextoProduto(p.descricao, p.seqproduto);
      const { linhas } = mapearBaseRupturaHibrido({
        produtos: [p],
        cdsPorProduto: new Map([[p.seqproduto, cds]]),
        bandeira: "COMPER",
      });
      assert.equal(linhas[0]!.PRODUTO, esperado);
    }
  });

  it("colunas PQ ausentes permanecem null (sem zero fill)", () => {
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [produtoBase],
      cdsPorProduto: new Map([[1001, cds]]),
      bandeira: "COMPER",
    });
    for (const col of CAMPOS_AUSENTES_V7) {
      assert.equal(linhas[0]![col], null, `coluna PQ ${col} deve ser null`);
    }
  });
});

describe("ruptura export base — universos integral vs oficial", () => {
  it("oficial_compativel exclui produtos fora Base Limpa", () => {
    const produtos = [
      { ...produtoBase, seqproduto: 1252, baseLimpa: "Base Limpa" as const },
      { ...produtoBase, seqproduto: 99999, baseLimpa: "Não considera Ruptura" as const },
    ];
    const filtrados = produtos.filter((p) => p.baseLimpa === "Base Limpa");
    assert.ok(filtrados.length < produtos.length);
    assert.equal(filtrados.some((p) => p.seqproduto === 99999), false);
  });

  it("v7_integral preserva contagem total antes do filtro", () => {
    const linhas = [
      { LOJA: 73, SEQPRODUTO: 1252 },
      { LOJA: 99999, SEQPRODUTO: 1 },
    ];
    assert.equal(linhas.length, 2);
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

describe("ruptura export base — status estoque CDs enriquecimento", () => {
  const cds753 = [
    { posicaoLogica: 3, codigoFisico: 753, estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 1 },
  ];

  it("detecta status incompleto sem códigos", () => {
    assert.equal(statusEstoqueCdsPrecisaEnriquecer("Estoque no CD:"), true);
    assert.equal(statusEstoqueCdsPrecisaEnriquecer("Estoque no CD: (753)"), false);
    assert.equal(statusEstoqueCdsPrecisaEnriquecer("Ruptura CD"), false);
  });

  it("enriquece Estoque no CD: com codigoFisico e flagCentralizacao (LOJA=73 SEQ=1252)", () => {
    const texto = enriquecerStatusEstoqueCdsExport(
      "Estoque no CD:",
      { produtoCentralizado: 753, somaEstoqueCd: 1 },
      cds753,
    );
    assert.equal(texto, "Estoque no CD: (753)");
  });

  it("enriquece com codigoFisico ausente via ordem Comper MT (LOJA=73 SEQ=1252)", () => {
    const cds = [
      { posicaoLogica: 3, codigoFisico: null, estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 753 },
    ];
    const texto = enriquecerStatusEstoqueCdsExport(
      "Estoque no CD:",
      { produtoCentralizado: 753, codigoCdSelecionado: 753, somaEstoqueCd: 1 },
      cds,
      "MT",
      "COMPER",
    );
    assert.equal(texto, "Estoque no CD: (753)");
  });

  it("enriquece multiplos CDs com codigoFisico ausente (SEQ=1495208)", () => {
    const cds = [
      { posicaoLogica: 1, codigoFisico: null, estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 753 },
      { posicaoLogica: 3, codigoFisico: null, estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 753 },
    ];
    const texto = enriquecerStatusEstoqueCdsExport(
      "Estoque no CD:",
      { produtoCentralizado: 753, codigoCdSelecionado: 753, somaEstoqueCd: 2 },
      cds,
      "MT",
      "COMPER",
    );
    assert.equal(texto, "Estoque no CD: (464) (753)");
  });

  it("enriquece via produtoCentralizado quando flag legado traz codigo", () => {
    const cds = [
      { posicaoLogica: 5, codigoFisico: 753, estoque: 1, pendencia: null, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 753 },
    ];
    const texto = enriquecerStatusEstoqueCdsExport(
      "Estoque no CD:",
      { produtoCentralizado: 753, somaEstoqueCd: 1 },
      cds,
    );
    assert.equal(texto, "Estoque no CD: (753)");
  });

  it("mapeamento export preenche Status Estoque CDs enriquecido", () => {
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [{ ...produtoBase, statusEstoqueCds: "Estoque no CD:", produtoCentralizado: 753 }],
      cdsPorProduto: new Map([[1001, cds753]]),
      bandeira: "COMPER",
    });
    assert.equal(linhas[0]!["Status Estoque CDs"], "Estoque no CD: (753)");
  });

  it("status completo permanece inalterado", () => {
    const texto = enriquecerStatusEstoqueCdsExport(
      "Estoque no CD: (753)",
      { produtoCentralizado: 753, somaEstoqueCd: 1 },
      cds753,
    );
    assert.equal(texto, "Estoque no CD: (753)");
  });
});

describe("ruptura export base — inventario unid sentinel", () => {
  it("inventarioUnidExport retorna 0 para null", () => {
    assert.equal(inventarioUnidExport(null), 0);
    assert.equal(inventarioUnidExport(undefined), 0);
    assert.equal(inventarioUnidExport(5), 5);
  });

  it("mapeamento export emite 0 quando inventarioUnid ausente no gestao", () => {
    const cds = [
      { posicaoLogica: 1, codigoFisico: 464, estoque: 10, pendencia: 0, statusCompra: "OK", diasCompra: 1, diasRecebimento: 2, flagCentralizacao: 1 },
    ];
    const { linhas } = mapearBaseRupturaHibrido({
      produtos: [{ ...produtoBase, inventarioUnid: null }],
      cdsPorProduto: new Map([[1001, cds]]),
      bandeira: "COMPER",
    });
    assert.equal(linhas[0]!["Inventário (Unid)"], 0);
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

  it("servico nao bloqueia bandeira completa sem fallback worker", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../services/rupturaExportBaseService.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /Configure baseXlsxDriveFileId no manifest ou reduza o escopo/);
    assert.match(src, /escopoEquivaleBandeiraCompleta/);
    assert.match(src, /gerarViaWorker/);
  });

  it("resolve o universo homologado por estrategia e preserva escolha explicita", () => {
    assert.equal(resolverModoUniversoExport("auto"), "oficial_compativel");
    assert.equal(resolverModoUniversoExport("oficial_compativel"), "oficial_compativel");
    assert.equal(resolverModoUniversoExport("integral_worker"), "integral");
    assert.equal(resolverModoUniversoExport("drive"), "integral");
    assert.equal(resolverModoUniversoExport("auto", "integral"), "integral");
    assert.equal(resolverModoUniversoExport("drive", "oficial_compativel"), "oficial_compativel");
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
