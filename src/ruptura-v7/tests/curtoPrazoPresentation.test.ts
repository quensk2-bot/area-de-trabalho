import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarAcao,
  contarCardsPorAcao,
  badgeCurtoPrazo,
  prioridadeVisual,
  explicarCurtoPrazo,
  formatarModalidade,
  formatarCdTexto,
  badgeCrossDocking,
  extrairAcoesUnicas,
  type CardCounts,
} from "../utils/curtoPrazoPresentation.ts";

// ---------------------------------------------------------------------------
// Suite 1: normalizarAcao
// ---------------------------------------------------------------------------
describe("normalizarAcao", () => {
  it("'Nao e Ruptura Curto Prazo' normalizado -> 'Nao e Ruptura Curto Prazo'", () => {
    assert.equal(normalizarAcao("N\u00e3o \u00e9 Ruptura Curto Prazo"), "N\u00e3o \u00e9 Ruptura Curto Prazo");
  });

  it("'Nao e Ruptura Curto Prazo' (â) -> 'Nao e Ruptura Curto Prazo' (ã)", () => {
    assert.equal(normalizarAcao("N\u00e2o \u00e9 Ruptura Curto Prazo"), "N\u00e3o \u00e9 Ruptura Curto Prazo");
  });

  it("normaliza espacos ao redor de /", () => {
    assert.equal(
      normalizarAcao("Havia estoque no CD / Pedido dentro do Prazo"),
      "Havia estoque no CD/Pedido dentro do Prazo",
    );
    assert.equal(
      normalizarAcao("Havia estoque no CD/ Pedido dentro do Prazo"),
      "Havia estoque no CD/Pedido dentro do Prazo",
    );
  });

  it("null -> ''", () => { assert.equal(normalizarAcao(null), ""); });
  it("undefined -> ''", () => { assert.equal(normalizarAcao(undefined), ""); });
});

// ---------------------------------------------------------------------------
// Suite 2: badgeCurtoPrazo
// ---------------------------------------------------------------------------
describe("badgeCurtoPrazo", () => {
  it("'Havia estoque no CD/ Pedido dentro do Prazo' -> 'Estoque / pedido no prazo'", () => {
    assert.equal(badgeCurtoPrazo("Havia estoque no CD/ Pedido dentro do Prazo"), "Estoque / pedido no prazo");
  });
  it("'Recebimento Proximo/ Nao Existe Pedido' -> 'Recebimento / sem pedido'", () => {
    assert.equal(badgeCurtoPrazo("Recebimento Pr\u00f3ximo/ N\u00e3o Existe Pedido"), "Recebimento / sem pedido");
  });
  it("'Nao e Ruptura Curto Prazo' -> 'Sem acao definida'", () => {
    assert.equal(badgeCurtoPrazo("N\u00e3o \u00e9 Ruptura Curto Prazo"), "Sem acao definida");
  });
  it("com â normaliza corretamente", () => {
    assert.equal(badgeCurtoPrazo("N\u00e2o \u00e9 Ruptura Curto Prazo"), "Sem acao definida");
  });
  it("null -> em-dash", () => { assert.equal(badgeCurtoPrazo(null), "\u2014"); });
});

// ---------------------------------------------------------------------------
// Suite 3: prioridadeVisual
// ---------------------------------------------------------------------------
describe("prioridadeVisual", () => {
  it("Recebimento Proximo + Nao Existe Pedido -> critica", () => {
    assert.equal(prioridadeVisual("Recebimento Pr\u00f3ximo/ N\u00e3o Existe Pedido"), "critica");
  });
  it("Pedido Antigo -> alerta", () => {
    assert.equal(prioridadeVisual("Havia estoque no CD/ Pedido Antigo (Avaliar Cancelamento)"), "alerta");
  });
  it("Nao Existe Pedido -> alerta", () => {
    assert.equal(prioridadeVisual("Havia estoque no CD/ N\u00e3o Existe Pedido"), "alerta");
  });
  it("Pedido dentro do Prazo -> ok", () => {
    assert.equal(prioridadeVisual("Havia estoque no CD/ Pedido dentro do Prazo"), "ok");
  });
  it("Sem acao -> neutra", () => {
    assert.equal(prioridadeVisual("N\u00e3o \u00e9 Ruptura Curto Prazo"), "neutra");
  });
});

// ---------------------------------------------------------------------------
// Suite 4: explicarCurtoPrazo
// ---------------------------------------------------------------------------
describe("explicarCurtoPrazo", () => {
  it("Nao e Ruptura -> explicacao correta", () => {
    assert.equal(explicarCurtoPrazo("N\u00e3o \u00e9 Ruptura Curto Prazo"), "Sem acao especifica identificada.");
  });
  it("Havia estoque + Pedido dentro do Prazo", () => {
    assert.equal(explicarCurtoPrazo("Havia estoque no CD/ Pedido dentro do Prazo"), "Havia estoque no CD, pedido dentro do prazo.");
  });
  it("Havia estoque + Pedido Antigo", () => {
    assert.equal(explicarCurtoPrazo("Havia estoque no CD/ Pedido Antigo (Avaliar Cancelamento)"), "Havia estoque no CD, mas pedido esta antigo.");
  });
  it("Havia estoque + Nao Existe Pedido", () => {
    assert.equal(explicarCurtoPrazo("Havia estoque no CD/ N\u00e3o Existe Pedido"), "Havia estoque no CD, sem pedido.");
  });
  it("null -> fallback", () => {
    assert.equal(explicarCurtoPrazo(null), "Classificado como Curto Prazo pelo Motor.");
  });
  it("Cross Docking + Pedido Antigo -> texto especifico", () => {
    const e = explicarCurtoPrazo("Havia estoque no CD/ Pedido Antigo (Avaliar Cancelamento)", true);
    assert.ok(e.includes("Cross Docking"));
    assert.ok(e.includes("Acompanhar entrega ao CD"));
  });
  it("Cross Docking + Nao Existe Pedido -> texto especifico", () => {
    const e = explicarCurtoPrazo("Havia estoque no CD/ N\u00e3o Existe Pedido", true);
    assert.ok(e.includes("Cross Docking"));
    assert.ok(e.includes("Verificar programacao"));
  });
  it("Nao Cross Docking + Pedido Antigo -> texto normal", () => {
    const e = explicarCurtoPrazo("Havia estoque no CD/ Pedido Antigo (Avaliar Cancelamento)", false);
    assert.ok(!e.includes("Cross Docking"));
    assert.ok(e.includes("pedido esta antigo"));
  });
});

// ---------------------------------------------------------------------------
// Suite 5: formatarModalidade -- oficial (Plan 6), nunca deduzida
// ---------------------------------------------------------------------------
describe("formatarModalidade", () => {
  it("Modalidade oficial CD Armazenagem", () => {
    assert.equal(formatarModalidade("CD Armazenagem"), "CD Armazenagem");
  });
  it("Modalidade oficial ED Direto Loja", () => {
    assert.equal(formatarModalidade("ED Direto Loja"), "ED Direto Loja");
  });
  it("Modalidade oficial CD Suprimentos (Armazenagem)", () => {
    assert.equal(formatarModalidade("CD Suprimentos (Armazenagem)"), "CD Suprimentos (Armazenagem)");
  });
  it("null -> ED Direto Loja", () => { assert.equal(formatarModalidade(null), "ED Direto Loja"); });
  it("undefined -> ED Direto Loja", () => { assert.equal(formatarModalidade(undefined), "ED Direto Loja"); });
});

// ---------------------------------------------------------------------------
// Suite 6: badgeCrossDocking -- badge SEPARADO da modalidade
// ---------------------------------------------------------------------------
describe("badgeCrossDocking", () => {
  it("true, sem modalidade -> 'Cross Docking'", () => { assert.equal(badgeCrossDocking(true), "Cross Docking"); });
  it("false -> null", () => { assert.equal(badgeCrossDocking(false), null); });
  it("null -> null", () => { assert.equal(badgeCrossDocking(null), null); });
  it("undefined -> null", () => { assert.equal(badgeCrossDocking(undefined), null); });
  it("true com modalidade 'CD Cross Docking' -> null (ja contido)", () => {
    assert.equal(badgeCrossDocking(true, "CD Cross Docking"), null);
  });
  it("true com modalidade 'CD Cross Docking (Comercial)' -> null (ja contido)", () => {
    assert.equal(badgeCrossDocking(true, "CD Cross Docking (Comercial)"), null);
  });
  it("true com modalidade 'CD Armazenagem' -> 'Cross Docking' (nao contido)", () => {
    assert.equal(badgeCrossDocking(true, "CD Armazenagem"), "Cross Docking");
  });
  it("true com modalidade null -> 'Cross Docking' (sem modalidade)", () => {
    assert.equal(badgeCrossDocking(true, null), "Cross Docking");
  });
});

// ---------------------------------------------------------------------------
// Suite 7: formatarCdTexto -- com parsing de statusEstoqueCds
// ---------------------------------------------------------------------------
describe("formatarCdTexto", () => {
  // Testes com statusEstoqueCds (nova funcionalidade de parsing)
  it("statusEstoqueCds com 2 CDs -> '464 / 753'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 753,
      statusEstoqueCds: "Estoque no CD: (464) (753)",
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464 / 753");
  });
  it("statusEstoqueCds com 1 CD -> '464'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 464,
      statusEstoqueCds: "Estoque no CD: (464)",
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464");
  });
  it("statusEstoqueCds vazio, codigoCdSelecionado presente -> fallback codigo", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 468,
      statusEstoqueCds: "Estoque no CD:",
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "468");
  });
  it("statusEstoqueCds 'Ruptura CD', codigoCdSelecionado=464 -> '464'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 464,
      statusEstoqueCds: "Ruptura CD",
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464");
  });
  it("codigoCdSelecionado=null -> em-dash", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: null,
      statusEstoqueCds: null,
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "\u2014");
  });
  it("statusEstoqueCds null, codigoCdSelecionado null -> em-dash", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: null,
      statusEstoqueCds: null,
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "\u2014");
  });
  it("statusEstoqueCds vazio, codigoCdSelecionado=null -> em-dash", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: null,
      statusEstoqueCds: "",
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "\u2014");
  });
  it("statusEstoqueCds com 4 CDs -> '464 / 468 / 753 / 904'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 464,
      statusEstoqueCds: "Estoque no CD: (464) (468) (753) (904)",
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464 / 468 / 753 / 904");
  });
  it("cdFisicosAtivos [464, 753] -> '464 / 753'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 753,
      statusEstoqueCds: "Estoque no CD:",
      cdFisicosAtivos: [464, 753],
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464 / 753");
  });
  it("cdFisicosAtivos [464] -> '464'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 753,
      statusEstoqueCds: null,
      cdFisicosAtivos: [464],
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464");
  });
  it("cdFisicosAtivos [] (vazio), fallback codigoCdSelecionado -> '753'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 753,
      statusEstoqueCds: null,
      cdFisicosAtivos: [],
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "753");
  });
  it("cdFisicosAtivos [464, 468, 753] -> '464 / 468 / 753'", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: 753,
      statusEstoqueCds: null,
      cdFisicosAtivos: [464, 468, 753],
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464 / 468 / 753");
  });
  it("cdFisicosAtivos null, statusEstoqueCds com (464) (753) -> '464 / 753' (parser)", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: null,
      statusEstoqueCds: "Estoque no CD: (464) (753)",
      cdFisicosAtivos: null,
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "464 / 753");
  });
  it("cdFisicosAtivos undefined, fallback statusEstoqueCds vazio, fallback codigo=null -> em-dash", () => {
    assert.equal(formatarCdTexto({
      codigoCdSelecionado: null,
      statusEstoqueCds: "",
      cdFisicosAtivos: undefined,
      est_selec_inv_cd1: null, est_selec_inv_cd2: null, est_selec_inv_cd3: null, est_selec_inv_cd4: null,
    }), "\u2014");
  });
});

// ---------------------------------------------------------------------------
// Suite 8: extrairAcoesUnicas -- dinamico a partir dos dados
// ---------------------------------------------------------------------------
describe("extrairAcoesUnicas", () => {
  it("Produtos vazios -> array vazio", () => {
    assert.deepEqual(extrairAcoesUnicas([]), []);
  });

  it("Extrai acoes unicas ordenadas: Havia > Recebimento > Nao e", () => {
    const produtos = [
      { acao_curto_prazo: "N\u00e3o \u00e9 Ruptura Curto Prazo" },
      { acao_curto_prazo: "Havia estoque no CD/ Pedido dentro do Prazo" },
      { acao_curto_prazo: "Havia estoque no CD/ Pedido Antigo (Avaliar Cancelamento)" },
      { acao_curto_prazo: "Recebimento Pr\u00f3ximo/ N\u00e3o Existe Pedido" },
    ];
    const acoes = extrairAcoesUnicas(produtos);
    assert.equal(acoes.length, 4);
    // Havia estoque deve vir primeiro
    assert.ok(acoes[0].startsWith("Havia estoque"));
    assert.ok(acoes[1].startsWith("Havia estoque"));
    // Depois Recebimento
    assert.ok(acoes[2].startsWith("Recebimento Pr\u00f3ximo"));
    // Nao e Ruptura por ultimo
    assert.ok(acoes[3].startsWith("N\u00e3o \u00e9 Ruptura"));
  });

  it("Ignora null/undefined/vazio", () => {
    const produtos = [
      { acao_curto_prazo: "Havia estoque no CD/ Pedido dentro do Prazo" },
      { acao_curto_prazo: null },
      { acao_curto_prazo: undefined },
      { acao_curto_prazo: "  " },
    ];
    const acoes = extrairAcoesUnicas(produtos);
    assert.equal(acoes.length, 1);
  });
});

// ---------------------------------------------------------------------------
// Suite 9: contarCardsPorAcao
// ---------------------------------------------------------------------------
describe("contarCardsPorAcao", () => {
  it("Total CP = quantidade de itens", () => {
    const r = contarCardsPorAcao([
      "Havia estoque no CD/ Pedido dentro do Prazo",
      "N\u00e3o \u00e9 Ruptura Curto Prazo",
      "Recebimento Pr\u00f3ximo/ N\u00e3o Existe Pedido",
    ]);
    assert.equal(r.total_curto_prazo, 3);
  });

  it("Nao e Ruptura conta apenas em sem_acao_definida", () => {
    const r = contarCardsPorAcao(["N\u00e3o \u00e9 Ruptura Curto Prazo"]);
    assert.equal(r.havia_estoque_cd, 0);
    assert.equal(r.rebote_proximo, 0);
    assert.equal(r.sem_acao_definida, 1);
  });

  it("Havia estoque conta em havia_estoque_cd", () => {
    const r = contarCardsPorAcao(["Havia estoque no CD/ Pedido dentro do Prazo"]);
    assert.equal(r.havia_estoque_cd, 1);
    assert.equal(r.rebote_proximo, 0);
    assert.equal(r.sem_acao_definida, 0);
  });

  it("Recebimento Proximo conta em rebote_proximo", () => {
    const r = contarCardsPorAcao(["Recebimento Pr\u00f3ximo/ N\u00e3o Existe Pedido"]);
    assert.equal(r.rebote_proximo, 1);
    assert.equal(r.havia_estoque_cd, 0);
  });

  it("Contagem com â funciona", () => {
    const r = contarCardsPorAcao(["N\u00e2o \u00e9 Ruptura Curto Prazo"]);
    assert.equal(r.sem_acao_definida, 1);
    assert.equal(r.total_curto_prazo, 1);
  });

  it("Array vazio -> todos zero", () => {
    const r = contarCardsPorAcao([]);
    assert.equal(r.total_curto_prazo, 0);
    assert.equal(r.havia_estoque_cd, 0);
    assert.equal(r.rebote_proximo, 0);
    assert.equal(r.sem_acao_definida, 0);
  });

  it("Simula Loja 73 completa -- 149 itens", () => {
    const loja73 = [
      ...Array(57).fill("Havia estoque no CD/ Pedido dentro do Prazo"),
      ...Array(46).fill("N\u00e3o \u00e9 Ruptura Curto Prazo"),
      ...Array(38).fill("Recebimento Pr\u00f3ximo/ Pedido dentro do Prazo"),
      ...Array(3).fill("Havia estoque no CD/ Pedido Antigo (Avaliar Cancelamento)"),
      ...Array(2).fill("Havia estoque no CD/ N\u00e3o Existe Pedido"),
      ...Array(2).fill("Recebimento Pr\u00f3ximo/ N\u00e3o Existe Pedido"),
      ...Array(1).fill("Recebimento Pr\u00f3ximo/ Pedido Antigo (Avaliar Cancelamento)"),
    ];
    assert.equal(loja73.length, 149);
    const r = contarCardsPorAcao(loja73);
    assert.equal(r.total_curto_prazo, 149);
    assert.equal(r.havia_estoque_cd, 62);  // 57+3+2
    assert.equal(r.rebote_proximo, 41);    // 38+2+1
    assert.equal(r.sem_acao_definida, 46);
  });

  it("Total Curto Prazo contem TODOS os itens, inclusive 'Nao e Ruptura'", () => {
    const r = contarCardsPorAcao([
      "Havia estoque no CD/ Pedido dentro do Prazo",
      "N\u00e3o \u00e9 Ruptura Curto Prazo",
    ]);
    assert.equal(r.total_curto_prazo, 2);
    assert.equal(r.havia_estoque_cd, 1);
    assert.equal(r.sem_acao_definida, 1);
  });
});
