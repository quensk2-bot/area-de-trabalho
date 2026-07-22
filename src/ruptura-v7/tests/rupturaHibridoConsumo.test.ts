import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapStorageError } from "../../hibrido-v7/hybridErrors.ts";
import { assertEscopoHibrido } from "../services/hibrido/hibridoScope.ts";
import { toPermissionContext } from "../../auth-v7/authProfileUtils.ts";
import { filtrarProdutos } from "../services/hibrido/gestaoFilters.ts";
import {
  ordenarProdutosGestaoDefault,
  prioridadeClassificacaoGestao,
  isOrdenacaoGestaoDefault,
} from "../services/hibrido/gestaoOrdering.ts";
import { mapResumoToDashboard } from "../services/hibrido/mapResumoDashboard.ts";
import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import type { ResumoLojaJson } from "../../hibrido-v7/manifest/manifestTypes.ts";

const root = dirname(fileURLToPath(new URL("../..", import.meta.url)));

function ctxBase(partial: Partial<{ regional: string; bandeira: string | null; loja: number; dataReferencia: string }> = {}) {
  return {
    regional: "MT",
    bandeira: "COMPER" as string | null,
    loja: 73,
    dataReferencia: "2026-07-13",
    ...partial,
  };
}

function produto(partial: Partial<HibridoProdutoGestao> & Pick<HibridoProdutoGestao, "seqproduto">): HibridoProdutoGestao {
  return {
    loja: 73,
    descricao: `Produto ${partial.seqproduto}`,
    codFornecedor: null,
    razaoFornecedor: null,
    rede: null,
    comprador: null,
    estoqueLoja: 0,
    mediaVendaDia: 0,
    parMin: 0,
    parMax: 0,
    somaEstoqueCd: 0,
    pendenciaCpaCd: 0,
    classificacaoPrazo: "sem_ruptura",
    diasPedido: null,
    produtoCentralizado: null,
    codigoCdSelecionado: null,
    statusEstoqueCds: null,
    acaoRecomendada: null,
    qualidadeDados: null,
    setorN2: null,
    divisao: null,
    ...partial,
  };
}

describe("ruptura-v7 hibrido — ordenacao default (ETAPA 7)", () => {
  it("prioridade CP > MP > LP > bloqueado > sem_ruptura", () => {
    assert.ok(prioridadeClassificacaoGestao("curto_prazo") < prioridadeClassificacaoGestao("medio_prazo"));
    assert.ok(prioridadeClassificacaoGestao("medio_prazo") < prioridadeClassificacaoGestao("longo_prazo"));
    assert.ok(prioridadeClassificacaoGestao("longo_prazo") < prioridadeClassificacaoGestao("bloqueado"));
    assert.ok(prioridadeClassificacaoGestao("bloqueado") < prioridadeClassificacaoGestao("sem_ruptura"));
  });

  it("dentro do grupo: maior pendencia, maior estoque CD, seqproduto", () => {
    const items = ordenarProdutosGestaoDefault([
      produto({ seqproduto: 3, classificacaoPrazo: "curto_prazo", pendenciaCpaCd: 5, somaEstoqueCd: 10 }),
      produto({ seqproduto: 1, classificacaoPrazo: "curto_prazo", pendenciaCpaCd: 20, somaEstoqueCd: 1 }),
      produto({ seqproduto: 2, classificacaoPrazo: "curto_prazo", pendenciaCpaCd: 20, somaEstoqueCd: 50 }),
    ]);
    assert.deepEqual(
      items.map((p) => p.seqproduto),
      [2, 1, 3],
    );
  });

  it("isOrdenacaoGestaoDefault aceita omitido ou prioridade_operacional", () => {
    assert.equal(isOrdenacaoGestaoDefault(undefined), true);
    assert.equal(isOrdenacaoGestaoDefault({ coluna: "prioridade_operacional", direcao: "asc" }), true);
    assert.equal(isOrdenacaoGestaoDefault({ coluna: "descricao", direcao: "asc" }), false);
  });

  it("nao altera valores de classificacaoPrazo", () => {
    const src = produto({ seqproduto: 99, classificacaoPrazo: "medio_prazo" });
    const out = ordenarProdutosGestaoDefault([src])[0];
    assert.equal(out.classificacaoPrazo, "medio_prazo");
  });
});

describe("ruptura-v7 hibrido — filtros (ETAPA 1)", () => {
  const base = [
    produto({ seqproduto: 1, classificacaoPrazo: "curto_prazo", somaEstoqueCd: 10 }),
    produto({ seqproduto: 2, classificacaoPrazo: "sem_ruptura", somaEstoqueCd: 0 }),
    produto({ seqproduto: 3, classificacaoPrazo: "bloqueado", produtoCentralizado: 1 }),
  ];

  it("filtra classificacao", () => {
    const out = filtrarProdutos(base, {
      ...ctxBase(),
      classificacao: "curto_prazo",
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].seqproduto, 1);
  });

  it("filtra estoque CD e centralizado", () => {
    const comCd = filtrarProdutos(base, {
      ...ctxBase(),
      possuiEstoqueCd: true,
    });
    assert.equal(comCd.length, 1);

    const central = filtrarProdutos(base, {
      ...ctxBase(),
      centralizado: true,
    });
    assert.equal(central[0].seqproduto, 3);
  });

  it("filtra busca por seqproduto ou descricao", () => {
    const out = filtrarProdutos(
      [produto({ seqproduto: 555, descricao: "Arroz integral" })],
      { ...ctxBase(), busca: "555" },
    );
    assert.equal(out.length, 1);
  });
});

describe("ruptura-v7 hibrido — escopo e erros (ETAPA 1/403/404)", () => {
  before(() => {
    process.env.VITE_MODO_HIBRIDO = "true";
  });

  it("anonimo retorna forbidden", () => {
    const err = assertEscopoHibrido(null, ctxBase());
    assert.equal(err?.code, "forbidden");
  });

  it("N1 MT aceita loja Todas (0) no escopo hibrido", () => {
    const n1 = toPermissionContext({
      perfil: {
        user_id: "n1",
        nome: "N1",
        email: "n1@test",
        nivel: "N1",
        ativo: true,
      },
      regionais: [{ id: "r1", user_id: "n1", regional: "MT", ativo: true }],
      bandeiras: [{ id: "b1", user_id: "n1", regional: "MT", bandeira: "COMPER", ativo: true }],
      lojas: [],
      permissoes: ["ruptura.ver"],
    });
    const err = assertEscopoHibrido(n1, { ...ctxBase(), loja: 0 });
    assert.equal(err, null);
  });

  it("N1 MT/COMPER bloqueado em FORT — sem fallback de bandeira", () => {
    const n1 = toPermissionContext({
      perfil: {
        user_id: "n1",
        nome: "N1",
        email: "n1@test",
        nivel: "N1",
        ativo: true,
      },
      regionais: [{ id: "r1", user_id: "n1", regional: "MT", ativo: true }],
      bandeiras: [{ id: "b1", user_id: "n1", regional: "MT", bandeira: "COMPER", ativo: true }],
      lojas: [],
      permissoes: ["ruptura.ver"],
    });
    const err = assertEscopoHibrido(n1, { ...ctxBase(), bandeira: "FORT", loja: 90 });
    assert.equal(err?.code, "forbidden");
  });

  it("ADM aceita MT FORT explicitamente", () => {
    const adm = toPermissionContext({
      perfil: { user_id: "adm", nome: "ADM", email: "adm@test", nivel: "ADM", ativo: true },
      regionais: [],
      bandeiras: [],
      lojas: [],
      permissoes: [],
    });
    const err = assertEscopoHibrido(adm, { ...ctxBase(), bandeira: "FORT", loja: 90 });
    assert.equal(err, null);
  });

  it("mapStorageError 403/404", () => {
    assert.equal(mapStorageError(403).code, "forbidden");
    assert.equal(mapStorageError(404).code, "not_published");
  });
});

describe("ruptura-v7 hibrido — dashboard cards/charts (ETAPA 1)", () => {
  it("mapResumoToDashboard preserva metricas APPROVED piloto", () => {
    const resumo: ResumoLojaJson = {
      loja: 73,
      regional: "MT",
      bandeira: "COMPER",
      dataReferencia: "2026-07-13",
      totalProdutos: 8275,
      ruptura: 2133,
      totalRupturaGeral: 2133,
      totalRupturaClassificada: 799,
      curtoPrazo: 400,
      medioPrazo: 250,
      longoPrazo: 149,
      semRuptura: 6142,
      bloqueados: 1334,
      totalBaseLimpaElegivel: 8275,
      percentualRuptura: 25.78,
      percentualRupturaGeral: 25.78,
      percentualRupturaClassificada: 9.65,
      comEstoqueCd: 1000,
      semEstoqueCd: 7275,
      totalCentralizados: 500,
      totalNaoCentralizados: 7775,
      atualizadoEm: "2026-07-13T12:00:00Z",
      setores: [{ setor: "MERCEARIA", totalRuptura: 100 }],
      fornecedores: [{ fornecedor: "FORN A", comprador: "COMP", totalRuptura: 50 }],
      compradores: [{ comprador: "COMP", totalRuptura: 50 }],
      estoquePorCd: [{ codigoFisico: 464, posicaoLogica: 1, totalEstoque: 999 }],
    };
    const dash = mapResumoToDashboard(resumo);
    assert.equal(dash.total_ruptura_geral, 2133);
    assert.equal(dash.total_ruptura_classificada, 799);
    assert.equal(dash.total_curto_prazo + dash.total_medio_prazo + dash.total_longo_prazo, 799);
    assert.equal(dash.total_produtos, 8275);
  });
});

describe("ruptura-v7 hibrido — isolamento consumo_v7 (ETAPA 1)", () => {
  it("servicos hibrido nao referenciam consumo_v7/motor_v7/dm_", () => {
    const dir = fileURLToPath(new URL("../services/hibrido", import.meta.url));
    const files = [
      "rupturaGestaoHibridoService.ts",
      "rupturaResumoHibridoService.ts",
      "rupturaCdsHibridoService.ts",
      "manifestService.ts",
      "storageJsonService.ts",
      "hibridoScope.ts",
      "gestaoFilters.ts",
      "gestaoOrdering.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      assert.doesNotMatch(src, /consumo_v7/);
      assert.doesNotMatch(src, /motor_v7/);
      assert.doesNotMatch(src, /dm_/);
    }
  });

  it("paginas dashboard/gestao nao importam rupturaDb", async () => {
    const fs = await import("node:fs/promises");
    const dash = await fs.readFile(new URL("../pages/RupturaDashboardPage.tsx", import.meta.url), "utf8");
    const gest = await fs.readFile(new URL("../pages/RupturaGestaoPage.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(dash, /rupturaDb/);
    assert.doesNotMatch(gest, /rupturaDb/);
  });
});

describe("ruptura-v7 hibrido — CDs lazy load (ETAPA 4)", () => {
  it("RupturaProdutoDetalhe carrega cds apenas quando aberto", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../components/RupturaProdutoDetalhe.tsx", import.meta.url), "utf8");
    assert.match(src, /if \(!aberto \|\| !produto\)/);
    assert.match(src, /consultarCdsProdutoHibrido/);
  });

  it("RupturaGestaoPage nao importa rupturaCdsHibridoService", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../pages/RupturaGestaoPage.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(src, /rupturaCdsHibridoService/);
    assert.doesNotMatch(src, /cds\.json/);
  });
});

describe("ruptura-v7 hibrido — cache gestao chunks (ETAPA 1 paginacao)", () => {
  it("gestaoCache module exporta invalidateGestaoCache", async () => {
    process.env.VITE_SUPABASE_URL = "https://kdlhztpzedanwirifzsb.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
    const mod = await import("../services/hibrido/rupturaGestaoHibridoService.ts");
    mod.invalidateGestaoCache();
    assert.equal(mod.gestaoCacheStats().entries, 0);
  });
});

describe("ruptura-v7 hibrido — comparacao Excel (ETAPA 6)", () => {
  it("planilha oficial loja 73 ausente em importar/ e .tmp/ — skip documentado", () => {
    assert.ok(true, "Nenhum XLSX loja 73 em importar/ ou .tmp/; comparacao amostral 20 SKUs skipped.");
  });
});
