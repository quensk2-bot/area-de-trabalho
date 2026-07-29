import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contarCardsLp,
  acaoVisualLp,
  contarAcaoExclusiva,
  extrairAcoesVisuaisUnicasLp,
  formatarCdAbastecimento,
  formatarSituacaoAtivacao,
  explicarAcaoVisualLp,
  ACAO_VISUAL_LABEL,
} from "../utils/longoPrazoPresentation.ts";

// =========================================================================
// Dados REAIS da V8 — Loja 73 (70 produtos Longo Prazo)
// Fonte: Storage V8, extraído em 28/07/2026
//
// Distribuição ultimoPedidoLojaPq:
//   null:  0   (não existe null na V8 para Loja 73)
//   999:  11   (6 com ativação, 5 sem ativação)
//   1-30: 23
//   31-60:13
//   61-998:23
//
// Cards (podem se sobrepor):
//   Total LP:        70
//   Ativação >30:    23
//   Sem pedido:      11  (todos 999, zero null)
//   Último >60:      23
//
// Exclusiva:
//   revisar_ativ_cd: 23
//   sem_pedido:       5
//   pedido_antigo:    8
//   ruptura_antiga:   8
//   sem_acao:        26
//   Soma:            70 ✅
// =========================================================================

function p(overrides: {
  ativacaoRuptura30SemPedido?: number | boolean | null;
  ultimoPedidoLojaPq?: number | null;
  diasRuptura?: number | null;
} = {}) {
  return {
    ativacaoRuptura30SemPedido: overrides.ativacaoRuptura30SemPedido ?? null,
    ultimoPedidoLojaPq: overrides.ultimoPedidoLojaPq ?? null,
    diasRuptura: overrides.diasRuptura ?? null,
  };
}

function pComPedido(pedido: number, ruptura?: number | null) {
  return p({ ultimoPedidoLojaPq: pedido, diasRuptura: ruptura ?? null });
}

// ---- Ação: revisar_ativacao_cd (23) ----
// Produtos com ativacaoRuptura30SemPedido = 1
// Alguns também têm 999 — a ação visual dá prioridade à ativação
const revisarAtivacao = [
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 }), // 348457
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 }), // 874850
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 }), // 1611054
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 }), // 2779668
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 }), // 2819929
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 }), // 2819945
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 134 }), // 562530
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 213 }), // 562548
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 134 }), // 562556
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 122 }), // 930938
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 122 }), // 1083589
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 154 }), // 1322524
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 106 }), // 1423460
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 106 }), // 1674455
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 106 }), // 1674480
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 205 }), // 2698404
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 329 }), // 2807394
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 218 }), // 2896940
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 524 }), // 2899396
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 210 }), // 2906163
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 696 }), // 2918196
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 38 }),  // 2948400
  p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 36 }),  // 2963841
]; // 23

// ---- Ação: sem_pedido (5) ----
// Produtos com 999 e SEM ativação
const semPedido = [
  p({ ultimoPedidoLojaPq: 999 }), // 3104079
  p({ ultimoPedidoLojaPq: 999 }), // 3131130
  p({ ultimoPedidoLojaPq: 999 }), // 3137902
  p({ ultimoPedidoLojaPq: 999 }), // 3137929
  p({ ultimoPedidoLojaPq: 999 }), // 3139999
]; // 5

// ---- Ação: pedido_antigo (8) ----
// Produtos com >60, SEM ativação e SEM 999
const pedidoAntigo = [
  pComPedido(77),  // 473650
  pComPedido(147), // 595519
  pComPedido(137), // 802174
  pComPedido(147), // 829153
  pComPedido(66),  // 2167832
  pComPedido(558), // 2926598
  pComPedido(559), // 2926610
  pComPedido(98),  // 3104320
]; // 8

// ---- Ação: ruptura_antiga (8) ----
// Produtos com diasRuptura > 30, pedido válido (não null, não 999, <=60)
// e sem ativação
const rupturaAntiga = [
  pComPedido(17, 31),  // 577138
  pComPedido(16, 31),  // 706175
  pComPedido(15, 31),  // 928356
  pComPedido(15, 31),  // 928500
  pComPedido(15, 31),  // 1859390
  pComPedido(9, 31),   // 2170833
  pComPedido(15, 31),  // 2510146
  pComPedido(13, 31),  // 2913011
]; // 8

// ---- Ação: sem_acao (26) ----
// Produtos que não se encaixam nas prioridades 1-4
const semAcao = [
  pComPedido(50),  pComPedido(15),  pComPedido(17),  pComPedido(21),
  pComPedido(53),  pComPedido(28),  pComPedido(39),  pComPedido(39),
  pComPedido(38),  pComPedido(4),   pComPedido(39),  pComPedido(21),
  pComPedido(56),  pComPedido(15),  pComPedido(21),  pComPedido(24),
  pComPedido(13),  pComPedido(7),   pComPedido(48),  pComPedido(38),
  pComPedido(45),  pComPedido(25),  pComPedido(17),  pComPedido(24),
  pComPedido(15),  pComPedido(17),
]; // 26

const loja73Produtos = [
  ...revisarAtivacao,
  ...semPedido,
  ...pedidoAntigo,
  ...rupturaAntiga,
  ...semAcao,
];

const TOTAL_LOJA73 = 70;

// =========================================================================
// Testes
// =========================================================================

describe("contarCardsLp", () => {
  it("deve retornar zero para array vazio", () => {
    const r = contarCardsLp([]);
    assert.strictEqual(r.total_longo_prazo, 0);
    assert.strictEqual(r.ativacao_30_sem_pedido, 0);
    assert.strictEqual(r.sem_pedido, 0);
    assert.strictEqual(r.ultimo_pedido_acima_60, 0);
  });

  it("cards podem se sobrepor — ativação + sem pedido devem contar nos 2", () => {
    const r = contarCardsLp([p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 })]);
    assert.strictEqual(r.total_longo_prazo, 1);
    assert.strictEqual(r.ativacao_30_sem_pedido, 1, "ativação ativa");
    assert.strictEqual(r.sem_pedido, 1, "sem pedido ativo");
  });

  it("Loja 73 V8: 70 LP, 23 ativação, 11 sem pedido, 23 >60", () => {
    const cards = contarCardsLp(loja73Produtos);
    assert.strictEqual(cards.total_longo_prazo, TOTAL_LOJA73, "Total LP = 70");
    assert.strictEqual(cards.ativacao_30_sem_pedido, 23, "Ativação >30 = 23");
    assert.strictEqual(cards.sem_pedido, 11, "Sem pedido = 11");
    assert.strictEqual(cards.ultimo_pedido_acima_60, 23, ">60 = 23");
    // Soma (57) != total (70) porque 6 produtos estão em ativação E sem pedido
    const soma = cards.ativacao_30_sem_pedido + cards.sem_pedido + cards.ultimo_pedido_acima_60;
    assert.ok(soma !== TOTAL_LOJA73, "Soma != total — sobreposição");
  });
});

describe("acaoVisualLp (exclusiva)", () => {
  it("prioridade 1: ativação >30", () => {
    assert.strictEqual(acaoVisualLp(p({ ativacaoRuptura30SemPedido: 1 })), "revisar_ativacao_cd");
    assert.strictEqual(acaoVisualLp(p({ ativacaoRuptura30SemPedido: true })), "revisar_ativacao_cd");
    // Mesmo com 999, ativação vence
    assert.strictEqual(
      acaoVisualLp(p({ ativacaoRuptura30SemPedido: 1, ultimoPedidoLojaPq: 999 })),
      "revisar_ativacao_cd",
    );
  });

  it("prioridade 2: 999 → sem pedido (sem ativação)", () => {
    assert.strictEqual(acaoVisualLp(p({ ultimoPedidoLojaPq: 999 })), "produto_sem_pedido");
  });

  it("prioridade 2: null → sem pedido", () => {
    assert.strictEqual(acaoVisualLp(p({ ultimoPedidoLojaPq: null })), "produto_sem_pedido");
  });

  it("prioridade 3: >60 → pedido antigo", () => {
    assert.strictEqual(acaoVisualLp(pComPedido(61)), "ultimo_pedido_antigo");
    assert.strictEqual(acaoVisualLp(pComPedido(200)), "ultimo_pedido_antigo");
  });

  it("prioridade 4: diasRuptura > 30 → ruptura antiga", () => {
    assert.strictEqual(acaoVisualLp(pComPedido(10, 31)), "ruptura_antiga");
    assert.strictEqual(acaoVisualLp(pComPedido(10, 100)), "ruptura_antiga");
    // 30 não é > 30
    assert.strictEqual(acaoVisualLp(pComPedido(10, 30)), "sem_acao_definida");
  });

  it("prioridade 5: fallback → sem ação", () => {
    assert.strictEqual(acaoVisualLp(pComPedido(10, 1)), "sem_acao_definida");
    assert.strictEqual(acaoVisualLp(pComPedido(30, 5)), "sem_acao_definida");
  });
});

describe("contarAcaoExclusiva", () => {
  it("array vazio → zeros", () => {
    const r = contarAcaoExclusiva([]);
    for (const val of Object.values(r)) assert.strictEqual(val, 0);
  });

  it("cada produto cai em exatamente 1 ação", () => {
    const r = contarAcaoExclusiva(loja73Produtos);
    assert.strictEqual(Object.values(r).reduce((a, b) => a + b, 0), TOTAL_LOJA73);
  });

  it("Loja 73 V8: 23 / 5 / 8 / 8 / 26 = 70", () => {
    const r = contarAcaoExclusiva(loja73Produtos);
    assert.strictEqual(r.revisar_ativacao_cd, 23, "revisar ativação CD");
    assert.strictEqual(r.produto_sem_pedido, 5, "sem pedido (999 sem ativação)");
    assert.strictEqual(r.ultimo_pedido_antigo, 8, "pedido antigo (>60)");
    assert.strictEqual(r.ruptura_antiga, 8, "ruptura antiga (>30)");
    assert.strictEqual(r.sem_acao_definida, 26, "sem ação definida");
  });
});

describe("extrairAcoesVisuaisUnicasLp", () => {
  it("5 ações ordenadas", () => {
    const acoes = extrairAcoesVisuaisUnicasLp(loja73Produtos);
    assert.strictEqual(acoes.length, 5);
    assert.strictEqual(acoes[0]!.key, "revisar_ativacao_cd");
    assert.strictEqual(acoes[1]!.key, "produto_sem_pedido");
    assert.strictEqual(acoes[2]!.key, "ultimo_pedido_antigo");
    assert.strictEqual(acoes[3]!.key, "ruptura_antiga");
    assert.strictEqual(acoes[4]!.key, "sem_acao_definida");
  });

  it("apenas ações presentes", () => {
    const acoes = extrairAcoesVisuaisUnicasLp([pComPedido(10, 100)]);
    assert.strictEqual(acoes.length, 1);
    assert.strictEqual(acoes[0]!.key, "ruptura_antiga");
  });
});

describe("formatarCdAbastecimento", () => {
  it("CD 464 com ED Direto Loja → CD 464", () => assert.strictEqual(formatarCdAbastecimento(464, "ED Direto Loja"), "CD 464"));
  it("CD 468 com CD Armazenagem → CD 468", () => assert.strictEqual(formatarCdAbastecimento(468, "CD Armazenagem"), "CD 468"));
  it("null + ED Direto Loja → Direto Loja", () => assert.strictEqual(formatarCdAbastecimento(null, "ED Direto Loja"), "Direto Loja"));
  it("null + CD Armazenagem → CD não definido", () => assert.strictEqual(formatarCdAbastecimento(null, "CD Armazenagem"), "CD não definido"));
  it("null + null → CD não definido", () => assert.strictEqual(formatarCdAbastecimento(null, null), "CD não definido"));
  it("undefined + undefined → CD não definido", () => assert.strictEqual(formatarCdAbastecimento(undefined, undefined), "CD não definido"));
  it("0 + CD Cross Docking → CD não definido", () => assert.strictEqual(formatarCdAbastecimento(0, "CD Cross Docking"), "CD não definido"));
});

describe("formatarSituacaoAtivacao", () => {
  it("Ativo no CD + 464 → Ativo", () => assert.strictEqual(formatarSituacaoAtivacao("Ativo no CD", 464, "CD Armazenagem"), "Ativo"));
  it("Não Centralizado + 464 → Sem solicitação", () => assert.strictEqual(formatarSituacaoAtivacao("Não Centralizado", 464, "CD Armazenagem"), "Sem solicitação de ativação"));
  it("Não Centralizado + null + ED Direto → Não se aplica", () => assert.strictEqual(formatarSituacaoAtivacao("Não Centralizado", null, "ED Direto Loja"), "Não se aplica"));
  it("null + qualquer → Não informado", () => assert.strictEqual(formatarSituacaoAtivacao(null, 464, "CD Armazenagem"), "Não informado"));
  it("undefined → Não informado", () => assert.strictEqual(formatarSituacaoAtivacao(undefined, null, null), "Não informado"));
});

describe("explicarAcaoVisualLp", () => {
  it("todas as 5 ações possuem explicação", () => {
    for (const acao of ["revisar_ativacao_cd", "produto_sem_pedido", "ultimo_pedido_antigo", "ruptura_antiga", "sem_acao_definida"] as const) {
      const texto = explicarAcaoVisualLp(acao);
      assert.ok(texto.length > 10, `Ação ${acao}`);
    }
  });
});

describe("ACAO_VISUAL_LABEL", () => {
  it("todas as ações possuem label", () => {
    const keys = Object.keys(ACAO_VISUAL_LABEL);
    assert.ok(keys.length >= 5);
    for (const key of keys) {
      assert.ok(ACAO_VISUAL_LABEL[key as keyof typeof ACAO_VISUAL_LABEL].length > 0);
    }
  });
});

describe("null/zero", () => {
  it("ativacao null → não entra no card ativação", () => {
    assert.strictEqual(contarCardsLp([p()]).ativacao_30_sem_pedido, 0);
  });
  it("ultimoPedidoLojaPq null → sem pedido", () => {
    assert.strictEqual(contarCardsLp([p({ ultimoPedidoLojaPq: null })]).sem_pedido, 1);
  });
  it("999 → sem pedido", () => {
    assert.strictEqual(contarCardsLp([p({ ultimoPedidoLojaPq: 999 })]).sem_pedido, 1);
  });
  it("null → não conta como >60", () => {
    assert.strictEqual(contarCardsLp([p({ ultimoPedidoLojaPq: null })]).ultimo_pedido_acima_60, 0);
  });
  it("999 → não conta como >60", () => {
    assert.strictEqual(contarCardsLp([p({ ultimoPedidoLojaPq: 999 })]).ultimo_pedido_acima_60, 0);
  });
  it("100 → conta como >60", () => {
    assert.strictEqual(contarCardsLp([pComPedido(100)]).ultimo_pedido_acima_60, 1);
  });
});
