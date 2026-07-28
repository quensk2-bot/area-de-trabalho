import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  badgeMedioPrazo,
  prioridadeVisualMp,
  contarCardsPorAcaoMp,
  explicarMedioPrazo,
  normalizarAcao,
  extrairAcoesUnicasMp,
  formatarModalidade,
  PRIORIDADE_TONE_MP,
  TEXTOS_MP,
  TEXTOS_MP_LIST,
  acaoIgual,
  textoAcaoMp,
} from "../utils/medioPrazoPresentation.ts";

// ---------------------------------------------------------------------------
// TEXTOS_MP / TEXTOS_MP_LIST
// ---------------------------------------------------------------------------
describe("TEXTOS_MP", () => {
  it("possui 4 textos oficiais", () => {
    assert.equal(TEXTOS_MP_LIST.length, 4);
  });
  it("todos os textos são strings não vazias", () => {
    for (const t of TEXTOS_MP_LIST) {
      assert.ok(typeof t === "string" && t.length > 0);
    }
  });
  it("textos oficiais correspondem ao Power Query", () => {
    assert.equal(TEXTOS_MP.DENTRO_PRAZO, "Pedido dentro do prazo");
    assert.equal(TEXTOS_MP.VINTE_TRINTA, "Pedidos dentre 20 há 30 dias");
    assert.equal(TEXTOS_MP.TRINTA_SESSENTA, "Pedido dentre 30 há 60 Dias");
    assert.equal(TEXTOS_MP.SUPERIOR_SESSENTA, "Superior há 60 Dias");
  });
});

// ---------------------------------------------------------------------------
// acaoIgual
// ---------------------------------------------------------------------------
describe("acaoIgual", () => {
  it("null com texto oficial -> false", () => {
    assert.equal(acaoIgual(null, TEXTOS_MP.DENTRO_PRAZO), false);
  });
  it("undefined com texto oficial -> false", () => {
    assert.equal(acaoIgual(undefined, TEXTOS_MP.DENTRO_PRAZO), false);
  });
  it("texto exato -> true", () => {
    assert.equal(acaoIgual("Pedido dentro do prazo", TEXTOS_MP.DENTRO_PRAZO), true);
  });
  it("texto com espaços extras -> true", () => {
    assert.equal(acaoIgual("  Pedido dentro do prazo  ", TEXTOS_MP.DENTRO_PRAZO), true);
  });
  it("texto diferente -> false", () => {
    assert.equal(acaoIgual("outro texto", TEXTOS_MP.DENTRO_PRAZO), false);
  });
  it("Superior há 60 Dias comparação exata", () => {
    assert.equal(acaoIgual("Superior há 60 Dias", TEXTOS_MP.SUPERIOR_SESSENTA), true);
  });
  it("Pedidos dentre 20 há 30 dias comparação exata", () => {
    assert.equal(acaoIgual("Pedidos dentre 20 há 30 dias", TEXTOS_MP.VINTE_TRINTA), true);
  });
  it("Pedido dentre 30 há 60 Dias comparação exata", () => {
    assert.equal(acaoIgual("Pedido dentre 30 há 60 Dias", TEXTOS_MP.TRINTA_SESSENTA), true);
  });
});

// ---------------------------------------------------------------------------
// normalizarAcao
// ---------------------------------------------------------------------------
describe("normalizarAcao", () => {
  it("null -> vazio", () => {
    assert.equal(normalizarAcao(null), "");
  });
  it("undefined -> vazio", () => {
    assert.equal(normalizarAcao(undefined), "");
  });
  it("trim espacos", () => {
    assert.equal(normalizarAcao("  texto  "), "texto");
  });
});

// ---------------------------------------------------------------------------
// textoAcaoMp
// ---------------------------------------------------------------------------
describe("textoAcaoMp", () => {
  it("null -> Sem ação definida", () => {
    assert.equal(textoAcaoMp(null), "Sem ação definida");
  });
  it("undefined -> Sem ação definida", () => {
    assert.equal(textoAcaoMp(undefined), "Sem ação definida");
  });
  it("texto real -> mantém", () => {
    assert.equal(textoAcaoMp("Pedido dentro do prazo"), "Pedido dentro do prazo");
  });
});

// ---------------------------------------------------------------------------
// badgeMedioPrazo
// ---------------------------------------------------------------------------
describe("badgeMedioPrazo", () => {
  it("Pedido dentro do prazo -> 'Dentro do prazo'", () => {
    assert.equal(badgeMedioPrazo("Pedido dentro do prazo"), "Dentro do prazo");
  });
  it("Pedidos dentre 20 há 30 dias -> '20–30 dias'", () => {
    assert.equal(badgeMedioPrazo("Pedidos dentre 20 há 30 dias"), "20–30 dias");
  });
  it("Pedido dentre 30 há 60 Dias -> '30–60 dias'", () => {
    assert.equal(badgeMedioPrazo("Pedido dentre 30 há 60 Dias"), "30–60 dias");
  });
  it("Superior há 60 Dias -> 'Superior a 60 dias'", () => {
    assert.equal(badgeMedioPrazo("Superior há 60 Dias"), "Superior a 60 dias");
  });
  it("null -> Sem ação definida", () => {
    assert.equal(badgeMedioPrazo(null), "Sem ação definida");
  });
  it("undefined -> Sem ação definida", () => {
    assert.equal(badgeMedioPrazo(undefined), "Sem ação definida");
  });
  it("texto desconhecido -> mantém", () => {
    assert.equal(badgeMedioPrazo("Ação desconhecida"), "Ação desconhecida");
  });
});

// ---------------------------------------------------------------------------
// prioridadeVisualMp
// ---------------------------------------------------------------------------
describe("prioridadeVisualMp", () => {
  it("Superior a 60 -> critica", () => {
    assert.equal(prioridadeVisualMp("Superior há 60 Dias"), "critica");
  });
  it("30-60 -> alerta_alta", () => {
    assert.equal(prioridadeVisualMp("Pedido dentre 30 há 60 Dias"), "alerta_alta");
  });
  it("20-30 -> alerta", () => {
    assert.equal(prioridadeVisualMp("Pedidos dentre 20 há 30 dias"), "alerta");
  });
  it("Pedido dentro do prazo -> ok", () => {
    assert.equal(prioridadeVisualMp("Pedido dentro do prazo"), "ok");
  });
  it("null -> neutra", () => {
    assert.equal(prioridadeVisualMp(null), "neutra");
  });
  it("undefined -> neutra", () => {
    assert.equal(prioridadeVisualMp(undefined), "neutra");
  });
  it("texto desconhecido -> neutra", () => {
    assert.equal(prioridadeVisualMp("texto desconhecido"), "neutra");
  });
});

// ---------------------------------------------------------------------------
// contarCardsPorAcaoMp
// ---------------------------------------------------------------------------
describe("contarCardsPorAcaoMp", () => {
  it("total = quantidade de itens", () => {
    const r = contarCardsPorAcaoMp(["Pedido dentro do prazo", "Pedido dentro do prazo", "Pedidos dentre 20 há 30 dias"]);
    assert.equal(r.total_medio_prazo, 3);
  });
  it("Pedido dentro do prazo conta corretamente", () => {
    const r = contarCardsPorAcaoMp(["Pedido dentro do prazo", "Pedido dentro do prazo", "Pedidos dentre 20 há 30 dias"]);
    assert.equal(r.pedido_dentro_prazo, 2);
    assert.equal(r.avaliar_pedido, 1);
    assert.equal(r.superior_60_dias, 0);
  });
  it("20-30 + 30-60 = Avaliar Pedido", () => {
    const r = contarCardsPorAcaoMp([
      "Pedidos dentre 20 há 30 dias",
      "Pedido dentre 30 há 60 Dias",
      "Pedido dentro do prazo",
    ]);
    assert.equal(r.avaliar_pedido, 2);
    assert.equal(r.pedido_dentro_prazo, 1);
  });
  it("Superior a 60 conta corretamente", () => {
    const r = contarCardsPorAcaoMp(["Superior há 60 Dias", "Pedido dentro do prazo"]);
    assert.equal(r.superior_60_dias, 1);
    assert.equal(r.pedido_dentro_prazo, 1);
    assert.equal(r.avaliar_pedido, 0);
  });
  it("soma dos cards = total (excluindo null)", () => {
    const r = contarCardsPorAcaoMp([
      "Pedido dentro do prazo",
      "Pedidos dentre 20 há 30 dias",
      "Pedido dentre 30 há 60 Dias",
      "Superior há 60 Dias",
      null,
    ]);
    const soma = r.pedido_dentro_prazo + r.avaliar_pedido + r.superior_60_dias;
    assert.equal(soma, 4);
    assert.equal(r.total_medio_prazo, 5); // null entra no total
  });
  it("nenhuma dupla contagem (cada item em UM card)", () => {
    const r = contarCardsPorAcaoMp([
      "Pedido dentro do prazo",
      "Pedidos dentre 20 há 30 dias",
      "Pedido dentre 30 há 60 Dias",
      "Superior há 60 Dias",
      null,
      "Pedido dentro do prazo",
      "Pedido dentro do prazo",
    ]);
    const soma = r.pedido_dentro_prazo + r.avaliar_pedido + r.superior_60_dias;
    assert.equal(soma, 6);
    assert.equal(r.total_medio_prazo, 7);
  });
  it("simula Loja 73 completa (580 itens) — números V8 homologados", () => {
    const acoes: string[] = [];
    for (let i = 0; i < 462; i++) acoes.push("Pedido dentro do prazo");
    for (let i = 0; i < 67; i++) acoes.push("Pedidos dentre 20 há 30 dias");
    for (let i = 0; i < 50; i++) acoes.push("Pedido dentre 30 há 60 Dias");
    for (let i = 0; i < 1; i++) acoes.push("Superior há 60 Dias");
    assert.equal(acoes.length, 580);
    const r = contarCardsPorAcaoMp(acoes);
    assert.equal(r.total_medio_prazo, 580);
    assert.equal(r.pedido_dentro_prazo, 462);
    assert.equal(r.avaliar_pedido, 117); // 67 + 50
    assert.equal(r.superior_60_dias, 1);
    // Verificar que não há dupla contagem
    const somaCards = r.pedido_dentro_prazo + r.avaliar_pedido + r.superior_60_dias;
    assert.equal(somaCards, 580);
  });
  it("array vazio -> todos zeros exceto total", () => {
    const r = contarCardsPorAcaoMp([]);
    assert.equal(r.total_medio_prazo, 0);
    assert.equal(r.pedido_dentro_prazo, 0);
    assert.equal(r.avaliar_pedido, 0);
    assert.equal(r.superior_60_dias, 0);
  });
  it("acao desconhecida -> não entra em card específico", () => {
    const r = contarCardsPorAcaoMp(["ação desconhecida"]);
    assert.equal(r.total_medio_prazo, 1);
    assert.equal(r.pedido_dentro_prazo, 0);
    assert.equal(r.avaliar_pedido, 0);
    assert.equal(r.superior_60_dias, 0);
  });
  it("apenas null -> total conta, cards zero", () => {
    const r = contarCardsPorAcaoMp([null, null, null]);
    assert.equal(r.total_medio_prazo, 3);
    assert.equal(r.pedido_dentro_prazo, 0);
    assert.equal(r.avaliar_pedido, 0);
    assert.equal(r.superior_60_dias, 0);
  });
});

// ---------------------------------------------------------------------------
// explicarMedioPrazo
// ---------------------------------------------------------------------------
describe("explicarMedioPrazo", () => {
  it("Pedido dentro do prazo", () => {
    const txt = explicarMedioPrazo("Pedido dentro do prazo");
    assert.ok(txt.includes("prazo esperado"));
  });
  it("20-30 dias", () => {
    const txt = explicarMedioPrazo("Pedidos dentre 20 há 30 dias");
    assert.ok(txt.includes("30 dias"));
  });
  it("30-60 dias", () => {
    const txt = explicarMedioPrazo("Pedido dentre 30 há 60 Dias");
    assert.ok(txt.includes("30 dias"));
  });
  it("Superior a 60", () => {
    const txt = explicarMedioPrazo("Superior há 60 Dias");
    assert.ok(txt.includes("antigo"));
  });
  it("null -> fallback", () => {
    assert.ok(explicarMedioPrazo(null).includes("Motor"));
  });
  it("undefined -> fallback", () => {
    assert.ok(explicarMedioPrazo(undefined).includes("Motor"));
  });
  it("texto desconhecido -> fallback", () => {
    assert.ok(explicarMedioPrazo("texto desconhecido").includes("Motor"));
  });
});

// ---------------------------------------------------------------------------
// formatarModalidade
// ---------------------------------------------------------------------------
describe("formatarModalidade", () => {
  it("mantem valor oficial", () => {
    assert.equal(formatarModalidade("CD Armazenagem"), "CD Armazenagem");
  });
  it("null -> ED Direto Loja", () => {
    assert.equal(formatarModalidade(null), "ED Direto Loja");
  });
  it("undefined -> ED Direto Loja", () => {
    assert.equal(formatarModalidade(undefined), "ED Direto Loja");
  });
});

// ---------------------------------------------------------------------------
// extrairAcoesUnicasMp
// ---------------------------------------------------------------------------
describe("extrairAcoesUnicasMp", () => {
  it("array vazio -> vazio", () => {
    assert.deepEqual(extrairAcoesUnicasMp([]), []);
  });
  it("extrai acoes unicas ordenadas (dentro prazo primeiro)", () => {
    const produtos = [
      { acao_medio_prazo: "Superior há 60 Dias" },
      { acao_medio_prazo: "Pedido dentro do prazo" },
      { acao_medio_prazo: "Pedidos dentre 20 há 30 dias" },
      { acao_medio_prazo: "Pedido dentre 30 há 60 Dias" },
    ];
    const acoes = extrairAcoesUnicasMp(produtos);
    assert.equal(acoes.length, 4);
    // Ordem oficial: dentro prazo, 20-30, 30-60, superior
    assert.ok(acaoIgual(acoes[0]!, TEXTOS_MP.DENTRO_PRAZO));
    assert.ok(acaoIgual(acoes[1]!, TEXTOS_MP.VINTE_TRINTA));
    assert.ok(acaoIgual(acoes[2]!, TEXTOS_MP.TRINTA_SESSENTA));
    assert.ok(acaoIgual(acoes[3]!, TEXTOS_MP.SUPERIOR_SESSENTA));
  });
  it("ignora null/undefined", () => {
    const produtos = [
      { acao_medio_prazo: null },
      { acao_medio_prazo: "Pedido dentro do prazo" },
      { acao_medio_prazo: undefined },
    ];
    assert.equal(extrairAcoesUnicasMp(produtos).length, 1);
  });
  it("deduplica acoes iguais", () => {
    const produtos = [
      { acao_medio_prazo: "Pedido dentro do prazo" },
      { acao_medio_prazo: "Pedido dentro do prazo" },
      { acao_medio_prazo: "Pedidos dentre 20 há 30 dias" },
    ];
    assert.equal(extrairAcoesUnicasMp(produtos).length, 2);
  });
});

// ---------------------------------------------------------------------------
// PRIORIDADE_TONE_MP
// ---------------------------------------------------------------------------
describe("PRIORIDADE_TONE_MP", () => {
  it("critica -> danger", () => {
    assert.equal(PRIORIDADE_TONE_MP["critica"], "danger");
  });
  it("ok -> ok", () => {
    assert.equal(PRIORIDADE_TONE_MP["ok"], "ok");
  });
  it("neutra -> neutral", () => {
    assert.equal(PRIORIDADE_TONE_MP["neutra"], "neutral");
  });
  it("alerta -> warn", () => {
    assert.equal(PRIORIDADE_TONE_MP["alerta"], "warn");
  });
  it("alerta_alta -> warn", () => {
    assert.equal(PRIORIDADE_TONE_MP["alerta_alta"], "warn");
  });
});
