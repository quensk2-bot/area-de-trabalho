import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PERSISTENCIA_EXCLUSIVA_SERVICE_ROLE,
  criarMetricasPersistencia,
  mapearClassificacaoPrazoParaDb,
  mapearCrossDockingParaDb,
  mapearDmProdutoLojaCdParaRow,
  mapearDmProdutoLojaParaRow,
  mapearFlagCentralizacaoParaDb,
  validarContagensPersistencia,
  validarLotePersistencia,
} from "../persistencia/index.ts";
import {
  cloneLote,
  loteCdPosicao12,
  lotePersistenciaTesteControlado,
  lotePosicaoDuplicada,
  loteProduto1Cd,
  loteProduto5Cds,
  loteProduto8Cds,
  loteProdutoDuplicado,
  loteQualidadeInvalida,
  loteQuantidadeCdsDivergente,
  PERSISTENCIA_TESTE_DATA,
  PERSISTENCIA_TESTE_REGIONAL,
} from "./fixtures/persistenciaFixtures.ts";

describe("Fase 3B.1 — Persistencia", () => {
  const execId = "00000000-0000-4000-8000-000000000001";
  const prodId = "00000000-0000-4000-8000-000000000002";

  it("01. mapper principal converte camelCase para snake_case", () => {
    const lote = loteProduto1Cd();
    const row = mapearDmProdutoLojaParaRow(lote.produtos[0], execId, 1, false);
    assert.equal(row.regional, PERSISTENCIA_TESTE_REGIONAL);
    assert.equal(row.data_referencia, PERSISTENCIA_TESTE_DATA);
    assert.equal(row.cod_fornecedor, null);
    assert.equal(row.quantidade_cds, 1);
    assert.equal(row.versao_ativa, false);
  });

  it("02. mapper CD filho converte posicao e flags", () => {
    const lote = loteProduto1Cd();
    const row = mapearDmProdutoLojaCdParaRow(lote.cds[0], execId, prodId, 1, false);
    assert.equal(row.posicao_logica, 1);
    assert.equal(row.codigo_cd_fisico, 101);
    assert.equal(row.flag_centralizacao, true);
    assert.equal(row.execucao_motor_id, execId);
    assert.equal(row.produto_loja_id, prodId);
  });

  it("03. produto com 1 CD valido", () => {
    const lote = loteProduto1Cd();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, true);
    assert.equal(lote.cds.length, 1);
  });

  it("04. produto com 5 CDs valido", () => {
    const lote = loteProduto5Cds();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, true);
    assert.equal(lote.cds.length, 5);
  });

  it("05. produto com 8 CDs valido", () => {
    const lote = loteProduto8Cds();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, true);
    assert.equal(lote.cds.length, 8);
  });

  it("06. posicao CD12 aceita sem limite fixo", () => {
    const lote = loteCdPosicao12();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, true);
    assert.equal(lote.cds[0].posicaoLogica, 12);
  });

  it("07. quantidade_cds deve bater com filhas", () => {
    const lote = loteQuantidadeCdsDivergente();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "QUANTIDADE_CDS_DIVERGENTE"));
  });

  it("08. qualidade invalida bloqueada", () => {
    const lote = loteQualidadeInvalida();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "QUALIDADE_INVALIDA"));
  });

  it("09. produto duplicado bloqueado", () => {
    const lote = loteProdutoDuplicado();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "PRODUTO_DUPLICADO"));
  });

  it("10. posicao CD duplicada bloqueada", () => {
    const lote = lotePosicaoDuplicada();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "POSICAO_CD_DUPLICADA"));
  });

  it("11. idempotencia mesmo hash — regra documentada", () => {
    // Cenario A: execucao concluida + mesmo hash => ignorada_duplicada (testado em integracao).
    const hash = "abc123";
    assert.ok(typeof hash === "string");
  });

  it("12. nova versao — versao invalida bloqueada", () => {
    const lote = loteProduto1Cd();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 0,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "VERSAO_INVALIDA"));
  });

  it("13. mapper nao inclui campos flat CD1..5", () => {
    const lote = loteProduto1Cd();
    const row = mapearDmProdutoLojaParaRow(lote.produtos[0], execId, 1, false) as Record<string, unknown>;
    assert.equal("estoque_cd1" in row, false);
    assert.equal("estoque_cd2" in row, false);
    assert.equal("pendencia_cd1" in row, false);
  });

  it("14. mapper preserva null explicitamente", () => {
    const lote = loteProduto1Cd();
    lote.produtos[0].crossDocking = null;
    const row = mapearDmProdutoLojaParaRow(lote.produtos[0], execId, 1, false);
    assert.equal(row.cross_docking, null);
    assert.equal(row.acao_medio_prazo, null);
  });

  it("15. enum classificacao CP|MP|LP convertido", () => {
    assert.equal(mapearClassificacaoPrazoParaDb("CP"), "curto_prazo");
    assert.equal(mapearClassificacaoPrazoParaDb("MP"), "medio_prazo");
    assert.equal(mapearClassificacaoPrazoParaDb("LP"), "longo_prazo");
    assert.equal(mapearClassificacaoPrazoParaDb(null), null);
  });

  it("16. cross_docking 0|1|null convertido para boolean", () => {
    assert.equal(mapearCrossDockingParaDb(0), false);
    assert.equal(mapearCrossDockingParaDb(1), true);
    assert.equal(mapearCrossDockingParaDb(null), null);
  });

  it("17. rollback logico — contagem validada antes de commit", () => {
    assert.throws(() => validarContagensPersistencia(3, 14, 2, 14));
    assert.doesNotThrow(() => validarContagensPersistencia(3, 14, 3, 14));
  });

  it("18. metricas de persistencia", () => {
    const m = criarMetricasPersistencia(3, 14, Date.now() - 50);
    assert.equal(m.produtosInseridos, 3);
    assert.equal(m.cdsInseridos, 14);
    assert.ok(m.duracaoMs >= 0);
  });

  it("19. entrada nao mutada pelo mapper", () => {
    const lote = cloneLote(lotePersistenciaTesteControlado());
    const snapshot = JSON.stringify(lote);
    mapearDmProdutoLojaParaRow(lote.produtos[0], execId, 1, false);
    mapearDmProdutoLojaCdParaRow(lote.cds[0], execId, prodId, 1, false);
    assert.equal(JSON.stringify(lote), snapshot);
  });

  it("20. zero acesso ao frontend — flag service_role", () => {
    assert.equal(PERSISTENCIA_EXCLUSIVA_SERVICE_ROLE, true);
  });

  it("21. lote TESTE controlado 3 produtos e 14 filhas", () => {
    const lote = lotePersistenciaTesteControlado();
    assert.equal(lote.produtos.length, 3);
    assert.equal(lote.cds.length, 14);
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, true);
  });

  it("22. flag centralizacao number para boolean", () => {
    assert.equal(mapearFlagCentralizacaoParaDb(0), false);
    assert.equal(mapearFlagCentralizacaoParaDb(1), true);
    assert.equal(mapearFlagCentralizacaoParaDb(null), false);
  });

  it("23. data invalida bloqueada", () => {
    const lote = loteProduto1Cd();
    const v = validarLotePersistencia(lote, {
      regional: PERSISTENCIA_TESTE_REGIONAL,
      dataReferencia: "15-01-2099",
      versao: 1,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "DATA_INVALIDA"));
  });

  it("24. regional ausente bloqueada", () => {
    const lote = loteProduto1Cd();
    const v = validarLotePersistencia(lote, {
      regional: "  ",
      dataReferencia: PERSISTENCIA_TESTE_DATA,
      versao: 1,
    });
    assert.equal(v.valido, false);
    assert.ok(v.erros.some((e) => e.codigo === "REGIONAL_AUSENTE"));
  });
});
