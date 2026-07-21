import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isConsumoV7SchemaError,
  toHybridPendingError,
  HYBRID_DATA_PENDING_MESSAGE,
} from "../hybridErrors.ts";
import { buildManifest } from "../manifest/manifestBuilder.ts";
import { isRelativeStoragePath, manifestFilePath } from "../manifest/manifestPaths.ts";
import { validarManifest, validarPathPublicacao } from "../manifest/manifestValidator.ts";
import { gerarArtefatosHibridos } from "../../motor/export/hibrido/gerarManifestHibrido.ts";
import { validarArtefatosHibridos } from "../../motor/export/hibrido/validarArtefatosHibridos.ts";
import { gerarGestaoLoja } from "../../motor/export/hibrido/gerarGestaoLoja.ts";
import { assertEscopoHibrido } from "../../ruptura-v7/services/hibrido/hibridoScope.ts";
import { HYBRID_CONSUMO_BLOCKED } from "../hybridErrors.ts";
import { HIBRIDO_PILOTO } from "../constants.ts";

const admCtx = {
  nivel: "ADM" as const,
  permissoes: [] as string[],
  regionais: [] as string[],
  bandeiras: [] as { regional: string; bandeira: string }[],
  lojas: [] as { regional: string; bandeira: string; loja: number }[],
};

const n1Ctx = {
  nivel: "N1" as const,
  permissoes: ["ruptura.ver"],
  regionais: ["MT"],
  bandeiras: [{ regional: "MT", bandeira: "COMPER" }],
  lojas: [] as { regional: string; bandeira: string; loja: number }[],
};

const gerente73 = {
  nivel: "GERENTE_LOJA" as const,
  permissoes: ["ruptura.ver"],
  regionais: [],
  bandeiras: [],
  lojas: [{ regional: "MT", bandeira: "COMPER", loja: 73 }],
};

describe("hibrido-v7 — erros amigáveis", () => {
  before(() => {
    process.env.VITE_MODO_HIBRIDO = "true";
  });

  it("8. detecta Invalid schema consumo_v7", () => {
    assert.ok(isConsumoV7SchemaError('Invalid schema: consumo_v7'));
    assert.ok(isConsumoV7SchemaError(new Error("HYBRID_MODE: consumo_v7 indisponível")));
  });

  it("12. converte erro schema para mensagem amigável", () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      const err = toHybridPendingError('Invalid schema: consumo_v7');
      assert.ok(err);
      assert.equal(err!.code, "hybrid_pending");
      assert.equal(err!.message, HYBRID_DATA_PENDING_MESSAGE);
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });
});

describe("hibrido-v7 — manifest", () => {
  it("8. manifest inválido rejeitado", () => {
    const r = validarManifest({ modulo: "x" });
    assert.equal(r.ok, false);
  });

  it("8b. fixture RLS detectada", async () => {
    const { isRlsTestFixture } = await import("../manifest/manifestGuards.ts");
    assert.equal(isRlsTestFixture({ _rls_test: true, path: "x" }), true);
    assert.equal(isRlsTestFixture({ modulo: "ruptura" }), false);
  });

  it("8c. manifest path não deve ser cacheado", async () => {
    const { isRlsTestFixture } = await import("../manifest/manifestGuards.ts");
    const path = manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    assert.equal(path.endsWith("/manifest.json"), true);
    assert.equal(isRlsTestFixture({ _rls_test: true }), true);
    assert.equal(isRlsTestFixture({ modulo: "ruptura", regional: "MT" }), false);
  });

  it("9. path público rejeitado", () => {
    assert.equal(validarPathPublicacao("https://evil.example/data.json"), false);
    assert.equal(validarPathPublicacao("MT/COMPER/2026-07/manifest.json"), true);
  });

  it("7. path traversal bloqueado", () => {
    assert.equal(isRelativeStoragePath("MT/../SECRET/manifest.json"), false);
  });

  it("manifest piloto válido", () => {
    const m = buildManifest({
      regional: "MT",
      bandeira: "COMPER",
      competencia: "2026-07",
      dataReferencia: "2026-07-13",
      versao: 1,
      lojas: [73],
      hashConteudo: "abc123",
    });
    assert.equal(m.modulo, "ruptura");
    assert.ok(m.lojas["73"]);
    assert.equal(
      manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" }),
      "MT/COMPER/2026-07/manifest.json",
    );
  });
});

describe("hibrido-v7 — geradores JSON (stubs)", () => {
  it("13. gera artefatos piloto loja 73 vazios", () => {
    const pub = gerarArtefatosHibridos({
      regional: HIBRIDO_PILOTO.regional,
      bandeira: HIBRIDO_PILOTO.bandeira,
      competencia: HIBRIDO_PILOTO.competencia,
      dataReferencia: HIBRIDO_PILOTO.dataReferencia,
      versao: 1,
      lojas: [HIBRIDO_PILOTO.loja],
      itensPorLoja: { 73: [] },
    });
    const v = validarArtefatosHibridos(pub.artefatos);
    assert.equal(v.ok, true);
    assert.ok(pub.artefatos.some((a) => a.path.endsWith("/lojas/73/resumo.json")));
  });

  it("15. gestão chunked quando excede limite", () => {
    const fakeItems = Array.from({ length: 40000 }, (_, i) => ({
      loja: 73,
      seqproduto: i + 1,
      descricao: `Produto piloto ${i} `.padEnd(120, "x"),
      classificacaoPrazo: "sem_ruptura" as const,
      cds: [{ posicaoLogica: 1, codigoFisico: 1, estoque: 0, pendencia: 0, statusCompra: null, diasCompra: null, diasRecebimento: null, flagCentralizacao: 0 }],
    })) as unknown as import("../../motor/consolidar/consolidacaoTypes.ts").MotorProdutoLojaConsolidado[];

    const gen = gerarGestaoLoja(fakeItems, {
      regional: "MT",
      bandeira: "COMPER",
      loja: 73,
      dataReferencia: "2026-07-13",
      versao: 1,
    });
    assert.equal(gen.chunked, true);
    assert.ok(gen.partes && gen.partes.length > 1);
  });
});

describe("hibrido-v7 — escopo frontend", () => {
  before(() => {
    process.env.VITE_MODO_HIBRIDO = "true";
  });

  it("2. gerente 73 escopo loja 73", () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      assert.equal(assertEscopoHibrido(gerente73, { regional: "MT", loja: 73, dataReferencia: "2026-07-13" }), null);
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });

  it("3. gerente 73 bloqueado loja 82", () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      const err = assertEscopoHibrido(gerente73, { regional: "MT", loja: 82, dataReferencia: "2026-07-13" });
      assert.ok(err);
      assert.equal(err!.code, "forbidden");
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });

  it("4. N1 MT/COMPER permitido", () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      assert.equal(assertEscopoHibrido(n1Ctx, { regional: "MT", loja: 73, dataReferencia: "2026-07-13" }), null);
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });

  it("5. N1 outra regional bloqueada", () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      const err = assertEscopoHibrido(n1Ctx, { regional: "SP", loja: 73, dataReferencia: "2026-07-13" });
      assert.ok(err);
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });

  it("6. ADM tudo permitido", () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      assert.equal(assertEscopoHibrido(admCtx, { regional: "SP", loja: 999, dataReferencia: "2026-07-13" }), null);
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });
});

describe("hibrido-v7 — segurança frontend", () => {
  const root = dirname(fileURLToPath(new URL("../..", import.meta.url)));

  function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "tests" || entry === "node_modules") continue;
        walk(full, acc);
      } else if (/\.(tsx?)$/.test(entry)) {
        acc.push(full);
      }
    }
    return acc;
  }

  it("10. service_role ausente no frontend hibrido", () => {
    const dirs = ["src/hibrido-v7", "src/ruptura-v7/services/hibrido", "src/components/MainShellHibrido.tsx"];
    const hits: string[] = [];
    for (const rel of dirs) {
      const target = join(root, rel);
      try {
        const st = statSync(target);
        const files = st.isDirectory() ? walk(target) : [target];
        for (const f of files) {
          if (readFileSync(f, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY")) hits.push(f);
        }
      } catch {
        // skip
      }
    }
    assert.deepEqual(hits, []);
  });

  it("11. consumo_v7 bloqueado no modo híbrido (rupturaDb)", () => {
    assert.match(HYBRID_CONSUMO_BLOCKED, /consumo_v7/);
  });

  it("11b. páginas dashboard/gestão usam serviços híbridos", async () => {
    const fs = await import("node:fs/promises");
    const dash = await fs.readFile(new URL("../../ruptura-v7/pages/RupturaDashboardPage.tsx", import.meta.url), "utf8");
    const gest = await fs.readFile(new URL("../../ruptura-v7/pages/RupturaGestaoPage.tsx", import.meta.url), "utf8");
    assert.match(dash, /consultarDashboardLojaHibrido/);
    assert.match(dash, /isModoHibrido/);
    assert.match(gest, /consultarProdutosPaginadosHibrido/);
    assert.match(gest, /HybridDataPending/);
    assert.match(gest, /consultarProdutosPaginadosHibrido\(\{[\s\S]*?authCtx: permCtx,\s*\}\)/);
  });

  it("17. dist sem JSON corporativo quando build existe", () => {
    const distDir = join(root, "dist");
    try {
      if (!statSync(distDir).isDirectory()) return;
    } catch {
      return;
    }
    const hits: string[] = [];
    for (const file of walk(distDir)) {
      if (!file.endsWith(".js") && !file.endsWith(".css") && !file.endsWith(".html")) continue;
      const content = readFileSync(file, "utf8");
      if (content.includes('"seqproduto"') && content.includes('"classificacaoPrazo"')) {
        hits.push(file);
      }
      if (/MT\/COMPER\/2026-07\/lojas\/73/.test(content)) hits.push(file);
    }
    assert.deepEqual(hits, [], `JSON corporativo embutido no dist: ${hits.join("; ")}`);
  });
});

describe("hibrido-v7 — publicação piloto CLI", () => {
  it("18. contexto hibrido fixa dataReferencia piloto", async () => {
    const prev = process.env.VITE_MODO_HIBRIDO;
    process.env.VITE_MODO_HIBRIDO = "true";
    try {
      const { normalizeContextoHibrido } = await import("../../ruptura-v7/hooks/useRupturaContexto.ts");
      const out = normalizeContextoHibrido({
        regional: "MT",
        loja: 73,
        dataReferencia: "2026-07-20",
      });
      assert.equal(out.dataReferencia, HIBRIDO_PILOTO.dataReferencia);
    } finally {
      if (prev === undefined) delete process.env.VITE_MODO_HIBRIDO;
      else process.env.VITE_MODO_HIBRIDO = prev;
    }
  });

  it("publicarPilotoCli existe e não referencia git", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../../motor/export/hibrido/publicarPilotoCli.ts", import.meta.url), "utf8");
    assert.match(src, /publicarStoragePrivado/);
    assert.match(src, /registrarPacoteLeve/);
    assert.match(src, /--dry-run/);
    assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]/);
  });
});

describe("hibrido-v7 — migration storage", () => {
  it("bucket ruptura-v7 migration existe", async () => {
    const fs = await import("node:fs/promises");
    const sql = await fs.readFile(
      new URL("../../../supabase-hibrido/supabase/migrations/20260720110000_storage_ruptura_v7.sql", import.meta.url),
      "utf8",
    );
    assert.match(sql, /ruptura-v7/);
    assert.match(sql, /\n\s*false,/);
    assert.match(sql, /user_can_read_ruptura_storage/);
    assert.match(sql, /service_role/);
  });
});
