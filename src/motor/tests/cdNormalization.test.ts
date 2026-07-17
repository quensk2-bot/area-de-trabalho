import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CatalogoOrdemCd } from "../catalog/catalogTypes.ts";
import {
  buildCdMapping,
  codigoParaPosicao,
  compararCampoCd,
  conjuntosCodigosEquivalentes,
  extrairCodigosFisicos,
  normalizeProdutoCentralizado,
  normalizeStatusAtivacaoCd,
  normalizeStatusEstoqueCds,
  posicaoParaCodigo,
  type MotorV7CdContexto,
} from "../compare/cdNormalization/index.ts";
import { calcularParidadeChaves } from "../compare/keyParityGate.ts";
import { reclassificarComparacaoCampo } from "../compare/reclassifyDivergence.ts";

const COMPER_MT_ORDEM: CatalogoOrdemCd[] = [
  {
    divisao: "COMPER MT",
    bandeira: "Comper MT",
    uf: "MT",
    cd1: 464,
    cd2: 468,
    cd3: 753,
    cd4: 904,
    cd5: 905,
  },
  {
    divisao: "COMPER MS",
    bandeira: "Comper MS",
    uf: "MS",
    cd1: 164,
    cd2: 167,
    cd3: 168,
    cd4: 744,
    cd5: 743,
  },
];

function configComperMT() {
  return buildCdMapping({
    regional: "MT",
    bandeira: "Comper MT",
    dataReferencia: "2026-03-26",
    ordemCds: COMPER_MT_ORDEM,
  });
}

function v7Base(over: Partial<MotorV7CdContexto> = {}): MotorV7CdContexto {
  return {
    posicaoCdSelecionada: null,
    codigoCdSelecionado: null,
    flags: { CD1: 0, CD2: 0, CD3: 0, CD4: 0, CD5: 0 },
    codigosFisicos: { CD1: 464, CD2: 468, CD3: 753, CD4: 904, CD5: 905 },
    textoProdutoCentralizado: null,
    statusEstoqueCds: null,
    statusSolicitacaoAtivacaoCd: null,
    ...over,
  };
}

describe("cdNormalization buildCdMapping", () => {
  it("1. CD1 mapeado para código físico do catálogo", () => {
    const cfg = configComperMT();
    assert.equal(cfg.porPosicao.CD1, 464);
    assert.equal(posicaoParaCodigo(cfg, "CD1"), 464);
  });

  it("2. CD3 mapeado para 753 no catálogo Comper MT", () => {
    const cfg = configComperMT();
    assert.equal(cfg.porPosicao.CD3, 753);
    assert.equal(codigoParaPosicao(cfg, 753), "CD3");
  });

  it("3. outra bandeira com ordem diferente", () => {
    const cfg = buildCdMapping({
      regional: "MT",
      bandeira: "Comper MS",
      dataReferencia: "2026-03-26",
      ordemCds: COMPER_MT_ORDEM,
    });
    assert.equal(cfg.porPosicao.CD1, 164);
    assert.equal(cfg.porPosicao.CD3, 168);
  });

  it("4. código físico sem posição quando cadastro ausente", () => {
    const cfg = configComperMT();
    assert.equal(codigoParaPosicao(cfg, 999), null);
  });

  it("13. vigência ausente gera alerta", () => {
    const cfg = configComperMT();
    assert.equal(cfg.vigenciaStatus, "nao_disponivel");
    assert.ok(cfg.alertas.includes("vigencia_cd_ausente"));
  });

  it("14. cadastro ausente para bandeira desconhecida", () => {
    const cfg = buildCdMapping({
      regional: "MT",
      bandeira: "Inexistente",
      dataReferencia: "2026-03-26",
      ordemCds: COMPER_MT_ORDEM,
    });
    assert.equal(cfg.mapeamentos.length, 0);
    assert.ok(cfg.alertas.includes("cadastro_cd_ausente"));
  });

  it("23. nenhum código hardcoded no mapeamento — deriva do catálogo", () => {
    const cfg = buildCdMapping({
      regional: "MT",
      bandeira: "Comper MT",
      dataReferencia: "2026-03-26",
      ordemCds: [{ divisao: "X", bandeira: "Comper MT", uf: "MT", cd1: 111, cd2: 222, cd3: 333, cd4: 444, cd5: 555 }],
    });
    assert.equal(cfg.porPosicao.CD1, 111);
    assert.notEqual(cfg.porPosicao.CD3, 753);
  });
});

describe("cdNormalization comparação textual", () => {
  const cfg = configComperMT();

  it("6. Produto Centralizado igual exato", () => {
    const r = normalizeProdutoCentralizado(cfg, "CD 753", v7Base({ textoProdutoCentralizado: "CD 753" }));
    assert.equal(r.estado, "igual_exato");
  });

  it("7. Produto Centralizado igual semântico", () => {
    const r = normalizeProdutoCentralizado(cfg, "CD 753", v7Base({
      textoProdutoCentralizado: "CD 753",
      posicaoCdSelecionada: "CD3",
      codigoCdSelecionado: 753,
    }));
    assert.equal(r.estado, "igual_exato");
  });

  it("8. Status Estoque um CD", () => {
    const r = normalizeStatusEstoqueCds(cfg, "Estoque no CD: (753)", v7Base({ statusEstoqueCds: "Estoque no CD: (753)" }));
    assert.equal(r.estado, "igual_exato");
  });

  it("9. Status Estoque múltiplos CDs", () => {
    const ex = "Estoque no CD: (464)(753)";
    const r = normalizeStatusEstoqueCds(cfg, ex, v7Base({ statusEstoqueCds: ex }));
    assert.equal(r.estado, "igual_exato");
    assert.deepEqual(extrairCodigosFisicos(ex).sort(), [464, 753]);
  });

  it("10. Status Ativação ativo", () => {
    const r = normalizeStatusAtivacaoCd(cfg, "Ativo no CD", v7Base({ statusSolicitacaoAtivacaoCd: "Ativo no CD" }));
    assert.equal(r.estado, "igual_exato");
  });

  it("11. Ruptura CD", () => {
    const r = normalizeStatusEstoqueCds(cfg, "Ruptura CD", v7Base({ statusEstoqueCds: "Ruptura CD" }));
    assert.equal(r.estado, "igual_exato");
  });

  it("12. Não Centralizado", () => {
    const r = normalizeProdutoCentralizado(cfg, "Não Centralizado", v7Base({ textoProdutoCentralizado: "Não Centralizado" }));
    assert.equal(r.estado, "igual_exato");
  });

  it("19. diferença de formato não crítica via reclassificação", () => {
    const cd = compararCampoCd("Status Estoque CDs", cfg, "Estoque no CD: (753)", v7Base({
      statusEstoqueCds: "Estoque no CD:",
      flags: { CD1: 0, CD2: 0, CD3: 1, CD4: 0, CD5: 0 },
    }));
    assert.ok(["igual_semantico", "divergente_texto"].includes(cd.estado));
    const div = reclassificarComparacaoCampo({
      loja: 73,
      seqproduto: 1,
      descricao: null,
      fornecedor: null,
      campo: "Status Estoque CDs",
      valorExcel: "Estoque no CD: (753)",
      valorV7: "Estoque no CD:",
      resultadoCd: cd,
    });
    if (div) assert.notEqual(div.severidade, "critica");
  });

  it("21. texto físico versus lógico classificado", () => {
    const r = normalizeStatusAtivacaoCd(cfg, "Ativo no CD", v7Base({ statusSolicitacaoAtivacaoCd: "Não Centralizado" }));
    assert.equal(r.estado, "divergente_texto");
  });
});

describe("keyParityGate", () => {
  it("15. interseção de chaves", () => {
    const p = calcularParidadeChaves({
      regional: "MT",
      loja: 73,
      dataReferencia: "2026-03-26",
      v7Produtos: [{ loja: 73, seqproduto: 1 }, { loja: 73, seqproduto: 2 }],
      excelProdutos: [{ loja: 73, seqproduto: 2 }, { loja: 73, seqproduto: 3 }],
    });
    assert.equal(p.intersecao, 1);
    assert.equal(p.somenteV7, 1);
    assert.equal(p.somenteExcel, 1);
  });

  it("16. somente V7", () => {
    const p = calcularParidadeChaves({
      regional: "MT",
      loja: 73,
      dataReferencia: "2026-03-26",
      v7Produtos: [{ loja: 73, seqproduto: 99 }],
      excelProdutos: [],
    });
    assert.equal(p.somenteV7, 1);
    assert.equal(p.somenteExcel, 0);
  });

  it("17. somente Excel", () => {
    const p = calcularParidadeChaves({
      regional: "MT",
      loja: 73,
      dataReferencia: "2026-03-26",
      v7Produtos: [],
      excelProdutos: [{ loja: 73, seqproduto: 88 }],
    });
    assert.equal(p.somenteExcel, 1);
  });
});

describe("reclassifyDivergence", () => {
  it("18. coluna ausente não crítica", () => {
    const div = reclassificarComparacaoCampo({
      loja: 73,
      seqproduto: 1,
      descricao: null,
      fornecedor: null,
      campo: "1ºCD",
      valorExcel: null,
      valorV7: 0,
      colunasExcelPresentes: new Set(["LOJA", "SEQPRODUTO"]),
    });
    assert.ok(div);
    assert.equal(div.classificacao, "dado_ausente_excel");
    assert.equal(div.severidade, "informativa");
  });

  it("20. divergência real crítica", () => {
    const div = reclassificarComparacaoCampo({
      loja: 73,
      seqproduto: 1,
      descricao: null,
      fornecedor: null,
      campo: "Curto Prazo",
      valorExcel: 1,
      valorV7: 0,
    });
    assert.ok(div);
    assert.equal(div.classificacao, "bre");
    assert.equal(div.severidade, "critica");
  });
});

describe("utilitários cdNormalization", () => {
  it("24. conjuntosCodigosEquivalentes", () => {
    assert.ok(conjuntosCodigosEquivalentes([753, 464], [464, 753]));
    assert.ok(!conjuntosCodigosEquivalentes([753], [464]));
  });

  it("25. compararCampoCd não muta entrada", () => {
    const cfg = configComperMT();
    const v7 = v7Base({ textoProdutoCentralizado: "CD 753" });
    const snap = JSON.stringify(v7);
    compararCampoCd("Produto Centralizado", cfg, "CD 753", v7);
    assert.equal(JSON.stringify(v7), snap);
  });
});
