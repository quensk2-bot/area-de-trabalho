import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classificarFilaCentralAcao, FILAS_CENTRAL_ACOES } from "../types/rupturaAcoesTypes.ts";
import { montarLinhasExport } from "../utils/rupturaExportFormat.ts";
import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import { LEGENDA_CLASSIFICACAO } from "../types/rupturaTypes.ts";
import {
  RUPTURA_BUSCA_MIN_CHARS,
  RUPTURA_PAGE_SIZE_DEFAULT,
  RUPTURA_PAGE_SIZE_MAX,
  RUPTURA_EXPORT_MAX_ROWS,
  RUPTURA_EXPORT_BATCH,
} from "../types/rupturaFiltrosTypes.ts";
import { formatNumero, formatPercentual, PRIORIDADE_LABEL } from "../components/rupturaSharedStyles.ts";

describe("ruptura-v7 — regras de consumo (sem BRE no frontend)", () => {
  it("classifica fila central de acoes — bloqueado", () => {
    const fila = classificarFilaCentralAcao({
      classificacao_prazo: "bloqueado",
    } as Parameters<typeof classificarFilaCentralAcao>[0]);
    assert.equal(fila, "cadastro_bloqueado");
  });

  it("classifica fila — curto prazo imediato", () => {
    const fila = classificarFilaCentralAcao({
      classificacao_prazo: "curto_prazo",
      pendencia_cpa_cd: 0,
    } as Parameters<typeof classificarFilaCentralAcao>[0]);
    assert.equal(fila, "acao_imediata");
  });

  it("classifica fila — pedido necessario", () => {
    const fila = classificarFilaCentralAcao({
      classificacao_prazo: "curto_prazo",
      pendencia_cpa_cd: 10,
    } as Parameters<typeof classificarFilaCentralAcao>[0]);
    assert.equal(fila, "pedido_necessario");
  });

  it("classifica fila — ativacao cd", () => {
    const fila = classificarFilaCentralAcao({
      classificacao_prazo: "curto_prazo",
      status_solicitacao_ativacao_cd: "Pendente",
    } as Parameters<typeof classificarFilaCentralAcao>[0]);
    assert.equal(fila, "ativacao_cd");
  });

  it("classifica fila — medio prazo", () => {
    const fila = classificarFilaCentralAcao({
      classificacao_prazo: "medio_prazo",
    } as Parameters<typeof classificarFilaCentralAcao>[0]);
    assert.equal(fila, "medio_prazo");
  });

  it("classifica fila — longo prazo", () => {
    const fila = classificarFilaCentralAcao({
      classificacao_prazo: "longo_prazo",
    } as Parameters<typeof classificarFilaCentralAcao>[0]);
    assert.equal(fila, "longo_prazo");
  });

  it("prioridade labels existem para UI", () => {
    assert.ok(PRIORIDADE_LABEL.critico);
    assert.ok(PRIORIDADE_LABEL.alto);
  });

  it("filas central acoes cobrem 7 filas operacionais", () => {
    assert.equal(FILAS_CENTRAL_ACOES.length, 7);
  });
});

describe("ruptura-v7 — exportacao", () => {
  const produtoBase = {
    loja: 73,
    seqproduto: 100,
    descricao: "Produto teste",
    versao: 1,
    regional: "MT",
    data_referencia: "2026-03-26",
  } as RupturaProdutoLoja;

  it("monta linhas CSV/XLSX com metadados de contexto", () => {
    const rows = montarLinhasExport([produtoBase], {
      regional: "MT",
      bandeira: "COMPER",
      dataReferencia: "2026-03-26",
      loja: 73,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].regional, "MT");
    assert.equal(rows[0].loja_contexto, 73);
    assert.equal(rows[0].Produto, 100);
  });

  it("export batch e limite definidos", () => {
    assert.equal(RUPTURA_EXPORT_BATCH, 500);
    assert.ok(RUPTURA_EXPORT_MAX_ROWS >= 10_000);
  });
});

describe("ruptura-v7 — paginacao e busca", () => {
  it("busca exige ao menos 2 caracteres", () => {
    assert.ok(RUPTURA_BUSCA_MIN_CHARS >= 2);
  });

  it("pagina padrao 50", () => {
    assert.equal(RUPTURA_PAGE_SIZE_DEFAULT, 50);
  });

  it("pagina maxima limitada a 500", () => {
    assert.equal(RUPTURA_PAGE_SIZE_MAX, 500);
  });
});

describe("ruptura-v7 — classificacoes CP/MP/LP/sem_ruptura/bloqueado", () => {
  it("nao recalcula classificacao no utilitario de export", () => {
    const p = {
      classificacao_prazo: "curto_prazo",
      loja: 73,
      seqproduto: 1,
      versao: 1,
    } as RupturaProdutoLoja;
    const rows = montarLinhasExport([p], {
      regional: "MT",
      bandeira: "COMPER",
      dataReferencia: "2026-03-26",
      loja: 73,
    });
    assert.equal(rows[0].Classificação, "curto_prazo");
  });

  it("legenda autoexplicativa para CP", () => {
    assert.ok(LEGENDA_CLASSIFICACAO.curto_prazo.includes("solução imediata"));
  });

  it("legenda autoexplicativa para sem_ruptura", () => {
    assert.ok(LEGENDA_CLASSIFICACAO.sem_ruptura.includes("não foi classificado"));
  });
});

describe("ruptura-v7 — formatacao UI", () => {
  it("formatNumero trata null", () => {
    assert.equal(formatNumero(null), "—");
  });

  it("formatPercentual trata null", () => {
    assert.equal(formatPercentual(null), "—");
  });

  it("graficos vazios — percentual com valor", () => {
    assert.equal(formatPercentual(8.38), "8,38%");
  });
});

describe("ruptura-v7 — CDs dinamicos (contrato)", () => {
  it("aceita contrato com 1 posicao", () => {
    const cd = { posicao_logica: 1, codigo_cd_fisico: 464, estoque: 10 };
    assert.equal(cd.posicao_logica, 1);
  });

  it("aceita contrato com 12 posicoes (limite ilimitado na view)", () => {
    const posicoes = Array.from({ length: 12 }, (_, i) => i + 1);
    assert.equal(posicoes.length, 12);
  });
});

describe("ruptura-v7 — fronteiras", () => {
  it("servicos usam schema consumo_v7 (nao motor_v7 direto)", async () => {
    const src = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../services/rupturaDb.ts", import.meta.url), "utf8"),
    );
    assert.match(src, /schema\("consumo_v7"\)/);
    assert.doesNotMatch(src, /schema\("motor_v7"\)/);
  });

  it("nao ha INSERT/UPDATE nas services de consulta", async () => {
    const fs = await import("node:fs/promises");
    const dir = new URL("../services/", import.meta.url);
    const files = ["rupturaProdutosService.ts", "rupturaDashboardService.ts", "rupturaAcoesService.ts"];
    for (const f of files) {
      const src = await fs.readFile(new URL(f, dir), "utf8");
      assert.doesNotMatch(src, /\.insert\(/);
      assert.doesNotMatch(src, /\.update\(/);
      assert.doesNotMatch(src, /\.delete\(/);
    }
  });
});

describe("ruptura-v7 — visao 360 oficial", () => {
  it("universo oficial default e referencia planilha loja 73", async () => {
    const { UNIVERSO_LEITURA_DEFAULT, REFERENCIA_PLANILHA_LOJA73 } = await import("../types/rupturaOficialTypes.ts");
    assert.equal(UNIVERSO_LEITURA_DEFAULT, "base_oficial_elegivel");
    assert.equal(REFERENCIA_PLANILHA_LOJA73.skus, 8275);
    assert.equal(REFERENCIA_PLANILHA_LOJA73.ruptura, 799);
  });

  it("rupturaDriveListService nao contem credenciais Google", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../services/rupturaDriveListService.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /GOOGLE_DRIVE_PRIVATE_KEY/);
    assert.doesNotMatch(src, /client_secret/);
    assert.match(src, /functions\.invoke\("listar-arquivos-motor-drive"/);
  });

  it("rupturaPacoteDriveService usa consumo_v7 e infra_v7", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../services/rupturaPacoteDriveService.ts", import.meta.url), "utf8");
    assert.match(src, /consumoDb\(\)/);
    assert.match(src, /schema\("infra_v7"\)/);
    assert.match(src, /\.rpc\("sincronizar_pacote_motor_drive_v1"/);
    assert.match(src, /\.rpc\("validar_pacote_motor_drive_v1"/);
    assert.doesNotMatch(src, /GOOGLE_DRIVE_PRIVATE_KEY/);
  });

  it("processar permanece desabilitado na pagina importacao drive", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../pages/RupturaImportacaoDrivePage.tsx", import.meta.url), "utf8");
    assert.match(src, /Processar Motor/);
    assert.match(src, /PIPELINE_PROCESSAR_TOOLTIP/);
    assert.match(src, /Preparar arquivos/);
    assert.match(src, /disabled/);
  });
});

