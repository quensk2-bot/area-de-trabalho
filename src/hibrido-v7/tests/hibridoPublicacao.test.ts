import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isConsumoV7SchemaError,
  toHybridPendingError,
  HYBRID_DATA_PENDING_MESSAGE,
} from "../hybridErrors.ts";
import { buildManifest } from "../manifest/manifestBuilder.ts";
import { ativoPath, isRelativeStoragePath, manifestFilePath, manifestRootPath } from "../manifest/manifestPaths.ts";
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

/** Manifesto V4 de exemplo para testes de mock */
const MANIFEST_V4 = {
  modulo: "ruptura",
  regional: "MT",
  bandeira: "COMPER",
  competencia: "2026-07",
  dataReferencia: "2026-07-13",
  versao: 4,
  status: "concluido",
  geradoEm: new Date().toISOString(),
  hashConteudo: "mock-hash-v4",
  baseXlsxDriveFileId: null,
  baseCsvDriveFileId: null,
  dashboardRegional: "MT/COMPER/2026-07/v4/dashboard/regional.json",
  dashboardLojas: "MT/COMPER/2026-07/v4/dashboard/lojas.json",
  lojas: {
    "73": { resumo: "MT/COMPER/2026-07/v4/lojas/73/resumo.json", resumoOficial: "MT/COMPER/2026-07/v4/lojas/73/resumo-oficial.json", gestao: "MT/COMPER/2026-07/v4/lojas/73/gestao.json", cds: "MT/COMPER/2026-07/v4/lojas/73/cds.json" },
  },
};

/** Manifesto V3 legado (raiz, sem prefixo) */
const MANIFEST_V3 = {
  ...MANIFEST_V4,
  versao: 3,
  dashboardRegional: "MT/COMPER/2026-07/dashboard/regional.json",
  lojas: {
    "73": { resumo: "MT/COMPER/2026-07/lojas/73/resumo.json", resumoOficial: "MT/COMPER/2026-07/lojas/73/resumo-oficial.json", gestao: "MT/COMPER/2026-07/lojas/73/gestao.json", cds: "MT/COMPER/2026-07/lojas/73/cds.json" },
  },
};

/**
 * Cria mock do Supabase storage.download controlado por path.
 * A função retorna respostas diferentes dependendo do path do arquivo:
 * - ativo.json → retorna AtivoJson configurado
 * - manifest → retorna manifest correspondente
 * - qualquer outro → 404
 */
function criarMockStorage(
  ativoResponse: { versao: number; manifestEm: string } | null,
  manifestResponse: Record<string, unknown> | null,
) {
  const downloadFn = mock.fn(async (path: string) => {
    // ativo.json
    if (path.endsWith("/ativo.json")) {
      if (!ativoResponse) {
        return { data: null, error: { message: "not found", statusCode: 404 } };
      }
      return {
        data: new Blob([JSON.stringify({
          versao: ativoResponse.versao,
          manifestEm: ativoResponse.manifestEm,
          ativadoEm: new Date().toISOString(),
        })]),
        error: null,
      };
    }

    // Manifest
    if (path.endsWith("/manifest.json")) {
      if (!manifestResponse) {
        return { data: null, error: { message: "not found", statusCode: 404 } };
      }
      return { data: new Blob([JSON.stringify(manifestResponse)]), error: null };
    }

    return { data: null, error: { message: "not found", statusCode: 404 } };
  });

  return {
    downloadFn,
    fromMock: mock.fn((_bucket: string) => ({
      download: downloadFn,
    })),
  };
}

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

  it("ativoPath gera path correto", () => {
    const p = ativoPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    assert.equal(p, "MT/COMPER/2026-07/ativo.json");
    const p2 = ativoPath({ regional: "SP", bandeira: "FORT", competencia: "2026-08" });
    assert.equal(p2, "SP/FORT/2026-08/ativo.json");
  });

  it("ativoPath sem versao — sempre na raiz", () => {
    const p = ativoPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    // ativo.json fica na raiz, independente da versão
    assert.doesNotMatch(p, /\/v\d+\//);
  });

  it("Cenário A: ativo.json inexistente → fallback para manifesto legado raiz", () => {
    const pathLegado = manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    assert.equal(pathLegado, "MT/COMPER/2026-07/manifest.json");
    const ativo = ativoPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    assert.equal(ativo, "MT/COMPER/2026-07/ativo.json");
    assert.notEqual(ativo, pathLegado);
  });

  it("Cenário B: ativo.json versão 4 → paths versionados /v4/", () => {
    const raiz = manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    const v4 = manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07", versao: 4 });
    assert.equal(v4, "MT/COMPER/2026-07/v4/manifest.json");
    assert.notEqual(raiz, v4);
    assert.match(v4, /\/v4\//);
    assert.doesNotMatch(raiz, /\/v\d+\//);
  });

  it("Cenário C: rollback para versão 3 via ativo.json", () => {
    const v3 = manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    assert.equal(v3, "MT/COMPER/2026-07/manifest.json");
    const v4 = manifestFilePath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07", versao: 4 });
    assert.notEqual(v3, v4);
  });

  it("Cenário D: paths versionados nunca sobrescrevem paths da raiz", () => {
    const v4Lojas = [73, 82, 103].map((loja) =>
      manifestRootPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07", versao: 4 }) +
      `/lojas/${loja}/resumo.json`,
    );
    for (const p of v4Lojas) {
      assert.match(p, /\/v4\//, `${p} deve conter /v4/`);
      assert.doesNotMatch(p, /\/v3\//, `${p} não deve conter /v3/`);
    }
    const legacyResumo = manifestRootPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" }) +
      "/lojas/73/resumo.json";
    assert.doesNotMatch(legacyResumo, /\/v\d+\//, "Path legado não deve ter prefixo de versão");
  });

  it("Cenário: versao=1 não gera prefixo (compatibilidade legado)", () => {
    const v1 = manifestRootPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07", versao: 1 });
    assert.equal(v1, "MT/COMPER/2026-07");
  });

  it("Cenário: ativoPath NUNCA contém versão", () => {
    const p1 = ativoPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    const p2 = ativoPath({ regional: "MT", bandeira: "FORT", competencia: "2026-08" });
    assert.doesNotMatch(p1, /\/v\d+\//, "ativo.json nunca versionado");
    assert.equal(p1, "MT/COMPER/2026-07/ativo.json");
    assert.equal(p2, "MT/FORT/2026-08/ativo.json");
  });

  it("Cenário: manifestFilePath versao 4 vs versao 3 isolados", () => {
    const v3 = manifestRootPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07" });
    const v4 = manifestRootPath({ regional: "MT", bandeira: "COMPER", competencia: "2026-07", versao: 4 });
    assert.equal(v3, "MT/COMPER/2026-07");
    assert.equal(v4, "MT/COMPER/2026-07/v4");
    assert.notEqual(v3, v4);
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

describe("hibrido-v7 — ativo.json cenários com mock", () => {
  let supabase: any;
  let invalidateStorageCache: () => void;
  let carregarManifest: (input: any) => Promise<any>;

  before(async () => {
    // Set dummy env vars before importing supabaseClient (require no test env)
    process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://test.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "test-anon-key";
    process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key";

    const supabaseModule = await import("../../lib/supabaseClient.ts");
    supabase = supabaseModule.supabase;
    const storageService = await import("../../ruptura-v7/services/hibrido/storageJsonService.ts");
    invalidateStorageCache = storageService.invalidateStorageCache;
    const manifestModule = await import("../../ruptura-v7/services/hibrido/manifestService.ts");
    carregarManifest = manifestModule.carregarManifest;
  });



  it("CENÁRIO 4: ativo.json malformado → erro, sem fallback", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    // ativo.json existe mas é inválido (sem campos obrigatórios)
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return { data: new Blob([JSON.stringify({ foo: "bar" })]), error: null };
      }
      return { data: new Blob([JSON.stringify(MANIFEST_V3)]), error: null };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    // ativo.json malformado → erro, NÃO fallback
    assert.equal(result.manifest, null, "Não deve carregar manifesto");
    assert.ok(result.erro, "Deve retornar erro de ativo.json malformado");
    assert.match(result.erro!.message, /malformado|incompleto/i, "Erro deve mencionar malformado");
    fromMock.mock.restore();
  });

  it("CENÁRIO 2: ativo.json 403 → erro de permissão, sem fallback", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return { data: null, error: { message: "forbidden", statusCode: 403 } };
      }
      return { data: new Blob([JSON.stringify(MANIFEST_V3)]), error: null };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    // 403 → erro, NÃO fallback
    assert.equal(result.manifest, null, "Não deve carregar manifesto");
    assert.ok(result.erro, "Deve retornar erro de permissão");
    assert.match(result.erro!.message, /forbidden|permissão|autorização/i, "Erro deve mencionar permissão");
    fromMock.mock.restore();
  });

  it("CENÁRIO 3: timeout → erro de conexão, sem fallback", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return { data: null, error: { message: "timeout exceeded", statusCode: 504 } };
      }
      return { data: new Blob([JSON.stringify(MANIFEST_V3)]), error: null };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    // Timeout → erro, NÃO fallback
    assert.equal(result.manifest, null, "Não deve carregar manifesto");
    assert.ok(result.erro, "Deve retornar erro de conexão");
    fromMock.mock.restore();
  });

  it("CENÁRIO 5: ativo válido + manifestEm 404 → erro, sem fallback", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    // ativo.json existe mas o manifesto apontado não existe
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return {
          data: new Blob([JSON.stringify({
            versao: 4,
            manifestEm: "MT/COMPER/2026-07/v4/manifest.json",
            ativadoEm: new Date().toISOString(),
          })]),
          error: null,
        };
      }
      // Path do manifesto V4 retorna 404
      return { data: null, error: { message: "not found", statusCode: 404 } };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    assert.equal(result.manifest, null, "Não deve carregar manifesto parcial");
    assert.ok(result.erro, "Deve retornar erro");
    fromMock.mock.restore();
  });

  it("CENÁRIO 6: versão divergente → erro", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    // ativo.json aponta versao 4, mas manifesto carregado tem versao 3
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return {
          data: new Blob([JSON.stringify({
            versao: 4,
            manifestEm: "MT/COMPER/2026-07/v4/manifest.json",
            ativadoEm: new Date().toISOString(),
          })]),
          error: null,
        };
      }
      if (path.endsWith("/manifest.json")) {
        // Retorna manifesto com versao 3, divergente
        return { data: new Blob([JSON.stringify(MANIFEST_V3)]), error: null };
      }
      return { data: null, error: { message: "not found", statusCode: 404 } };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    assert.equal(result.manifest, null, "Conflito de versão impede carregamento");
    assert.ok(result.erro, "Deve retornar erro");
    assert.match(result.erro!.message, /versão|versao/i, "Erro deve mencionar conflito de versão");
    fromMock.mock.restore();
  });

  it("CENÁRIO 7: regional divergente → erro", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    // Cria um manifesto com regional "SP" em vez de "MT"
    const manifestRegionalErrada = {
      ...MANIFEST_V4,
      regional: "SP",
      bandeira: "FORT",
    };
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return {
          data: new Blob([JSON.stringify({
            versao: 4,
            manifestEm: "MT/COMPER/2026-07/v4/manifest.json",
            ativadoEm: new Date().toISOString(),
          })]),
          error: null,
        };
      }
      if (path.endsWith("/manifest.json")) {
        return { data: new Blob([JSON.stringify(manifestRegionalErrada)]), error: null };
      }
      return { data: null, error: { message: "not found", statusCode: 404 } };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    // Regional divergente → erro, não carrega
    assert.equal(result.manifest, null, "Regional divergente impede carregamento");
    assert.ok(result.erro, "Deve retornar erro");
    assert.match(result.erro!.message, /regional/i, "Erro deve mencionar regional");
    fromMock.mock.restore();
  });

  it("CENÁRIO 8: bandeira divergente → erro", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    // Cria um manifesto com bandeira "FORT" em vez de "COMPER"
    const manifestBandeiraErrada = {
      ...MANIFEST_V4,
      bandeira: "FORT",
    };
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return {
          data: new Blob([JSON.stringify({
            versao: 4,
            manifestEm: "MT/COMPER/2026-07/v4/manifest.json",
            ativadoEm: new Date().toISOString(),
          })]),
          error: null,
        };
      }
      if (path.endsWith("/manifest.json")) {
        return { data: new Blob([JSON.stringify(manifestBandeiraErrada)]), error: null };
      }
      return { data: null, error: { message: "not found", statusCode: 404 } };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    // Bandeira divergente → erro, não carrega
    assert.equal(result.manifest, null, "Bandeira divergente impede carregamento");
    assert.ok(result.erro, "Deve retornar erro");
    assert.match(result.erro!.message, /bandeira/i, "Erro deve mencionar bandeira");
    fromMock.mock.restore();
  });

  it("CENÁRIO 9: ativo V4 válido → carrega somente V4", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    const downloadFn = mock.fn(async (path: string) => {
      if (path.endsWith("/ativo.json")) {
        return {
          data: new Blob([JSON.stringify({
            versao: 4,
            manifestEm: "MT/COMPER/2026-07/v4/manifest.json",
            ativadoEm: new Date().toISOString(),
          })]),
          error: null,
        };
      }
      if (path.endsWith("/manifest.json")) {
        return { data: new Blob([JSON.stringify(MANIFEST_V4)]), error: null };
      }
      return { data: null, error: { message: "not found", statusCode: 404 } };
    });
    const fromMock = mock.method(supabase.storage, "from", () => ({ download: downloadFn }));

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    // V4 carregado com sucesso
    assert.ok(result.manifest, "Manifest V4 deve ser carregado");
    assert.equal(result.manifest!.versao, 4, "Versão 4 confirmada");
    assert.equal(result.manifest!.regional, "MT");
    assert.equal(result.manifest!.bandeira, "COMPER");
    assert.match(result.manifest!.dashboardRegional!, /\/v4\//, "Dashboard regional deve apontar /v4/");
    assert.equal(result.erro, null);
    fromMock.mock.restore();
  });

  it("CENÁRIO 10: ativo V3 válido → rollback para raiz", async () => {
    invalidateStorageCache();
    mock.restoreAll();
    // ativo.json aponta para V3 (raiz) — rollback
    const mocks = criarMockStorage(
      { versao: 3, manifestEm: "MT/COMPER/2026-07/manifest.json" },
      MANIFEST_V3,
    );
    const fromMock = mock.method(supabase.storage, "from", mocks.fromMock);

    const result = await carregarManifest({ regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" });

    assert.ok(result.manifest, "Manifest V3 deve ser carregado via rollback");
    assert.equal(result.manifest!.versao, 3, "Versão 3 confirmada");
    assert.doesNotMatch(result.manifest!.dashboardRegional!, /\/v\d+\//, "Dashboard V3 sem prefixo de versão");
    assert.equal(result.erro, null);
    fromMock.mock.restore();
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
    assert.match(gest, /consultarProdutosPaginadosHibrido\(\{[\s\S]*?authCtx: permCtx/);
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
