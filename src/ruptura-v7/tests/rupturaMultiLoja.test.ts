import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FILTRO_BANDEIRA_TODAS, FILTRO_LOJA_TODAS } from "../../auth-v7/catalogoLojasTypes.ts";
import type { CatalogoLoja } from "../../auth-v7/catalogoLojasTypes.ts";
import {
  formatLojasSelecionadasLabel,
  migrarContextoLojas,
  resolverLojasEfetivas,
  todasLojasSelecionadas,
} from "../services/lojasFiltroUtils.ts";
import { listarLojasPublicadasManifest } from "../../hibrido-v7/manifest/manifestLojas.ts";
import { aggregateResumos, mapResumosAgregadosToDashboard } from "../services/hibrido/mapResumoDashboard.ts";
import { assertEscopoHibrido, assertLojasSelecionadas } from "../services/hibrido/hibridoScope.ts";
import { toPermissionContext } from "../../auth-v7/authProfileUtils.ts";
import type { ResumoLojaJson, RupturaManifest } from "../../hibrido-v7/manifest/manifestTypes.ts";
import { RUPTURA_CONTEXTO_DEFAULT } from "../types/rupturaFiltrosTypes.ts";

const CATALOGO_MT: CatalogoLoja[] = [
  { regional: "MT", bandeira: "COMPER", loja: 73, nome: "COMPER CPA I" },
  { regional: "MT", bandeira: "COMPER", loja: 82, nome: "COMPER CENTRO" },
  { regional: "MT", bandeira: "FORT", loja: 90, nome: "FORT LOJA 90" },
];

const LOJAS_COMPER_MT = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173] as const;

function resumoLoja(loja: number, ruptura: number): ResumoLojaJson {
  return {
    loja,
    regional: "MT",
    bandeira: "COMPER",
    dataReferencia: "2026-07-13",
    totalProdutos: 1000,
    ruptura,
    totalRupturaGeral: ruptura,
    totalRupturaClassificada: ruptura - 10,
    curtoPrazo: 40,
    medioPrazo: 30,
    longoPrazo: 20,
    semRuptura: 1000 - ruptura,
    bloqueados: 10,
    totalBaseLimpaElegivel: 1000,
    percentualRuptura: 10,
    percentualRupturaGeral: 10,
    percentualRupturaClassificada: 9,
    comEstoqueCd: 50,
    semEstoqueCd: ruptura - 50,
    totalCentralizados: 20,
    totalNaoCentralizados: ruptura - 20,
    atualizadoEm: "2026-07-13T12:00:00Z",
    setores: [{ setor: "MERCEARIA", totalRuptura: ruptura }],
    fornecedores: [{ fornecedor: "FORN A", comprador: "COMP", totalRuptura: ruptura }],
    compradores: [{ comprador: "COMP", totalRuptura: ruptura }],
    estoquePorCd: [{ codigoFisico: 464, posicaoLogica: 1, totalEstoque: 100 }],
  };
}

describe("lojasFiltroUtils — seleção múltipla", () => {
  it("lojas vazias resolve todas do escopo COMPER", () => {
    const efetivas = resolverLojasEfetivas(CATALOGO_MT, {
      regional: "MT",
      bandeira: "COMPER",
      loja: FILTRO_LOJA_TODAS,
      lojas: [],
    });
    assert.deepEqual(efetivas, [73, 82]);
  });

  it("lojas explícitas filtra interseção", () => {
    const efetivas = resolverLojasEfetivas(CATALOGO_MT, {
      regional: "MT",
      bandeira: "COMPER",
      loja: 0,
      lojas: [73, 90],
    });
    assert.deepEqual(efetivas, [73]);
  });

  it("formatLojasSelecionadasLabel", () => {
    assert.equal(formatLojasSelecionadasLabel([], 15), "Todas as lojas");
    assert.equal(formatLojasSelecionadasLabel([73], 15), "1 loja");
    assert.equal(formatLojasSelecionadasLabel([73, 82, 88], 15), "3 lojas");
    assert.equal(formatLojasSelecionadasLabel(LOJAS_COMPER_MT as unknown as number[], 15), "15 de 15");
  });

  it("todasLojasSelecionadas", () => {
    assert.equal(todasLojasSelecionadas([], 15), true);
    assert.equal(todasLojasSelecionadas([73, 82], 2), true);
    assert.equal(todasLojasSelecionadas([73], 15), false);
  });

  it("migrarContextoLojas legado loja 0", () => {
    const ctx = migrarContextoLojas({ loja: 0 }, RUPTURA_CONTEXTO_DEFAULT);
    assert.deepEqual(ctx.lojas, []);
    assert.equal(ctx.loja, FILTRO_LOJA_TODAS);
  });

  it("migrarContextoLojas legado loja única", () => {
    const ctx = migrarContextoLojas({ loja: 73 }, RUPTURA_CONTEXTO_DEFAULT);
    assert.deepEqual(ctx.lojas, [73]);
    assert.equal(ctx.loja, 73);
  });
});

describe("manifestService — lojas publicadas", () => {
  it("listarLojasPublicadasManifest ignora sentinel 0", () => {
    const manifest: RupturaManifest = {
      modulo: "ruptura",
      regional: "MT",
      bandeira: "COMPER",
      competencia: "2026-07",
      dataReferencia: "2026-07-13",
      versao: 1,
      status: "concluido",
      geradoEm: "",
      hashConteudo: "",
      dashboardRegional: "",
      dashboardLojas: "",
      lojas: {
        "73": { resumo: "r73", gestao: "g73", cds: "c73" },
        "82": { resumo: "r82", gestao: "g82", cds: "c82" },
      },
    };
    assert.deepEqual(listarLojasPublicadasManifest(manifest), [73, 82]);
    assert.equal(listarLojasPublicadasManifest(manifest).length, 2);
  });
});

describe("mapResumoDashboard — agregação multi-loja", () => {
  it("soma numeradores e recalcula percentuais", () => {
    const agregado = aggregateResumos(
      [resumoLoja(73, 100), resumoLoja(82, 200)],
      { regional: "MT", bandeira: "COMPER", dataReferencia: "2026-07-13" },
    );
    assert.ok(agregado);
    assert.equal(agregado!.totalRupturaGeral, 300);
    assert.equal(agregado!.totalProdutos, 2000);
    assert.equal(agregado!.curtoPrazo, 80);
    assert.equal(agregado!.loja, 0);
    assert.equal(agregado!.percentualRupturaGeral, 15);
    assert.equal(agregado!.setores?.[0]?.totalRuptura, 300);
  });

  it("mapResumosAgregadosToDashboard preserva totais", () => {
    const dash = mapResumosAgregadosToDashboard([resumoLoja(73, 100), resumoLoja(82, 50)], {
      regional: "MT",
      bandeira: "COMPER",
      dataReferencia: "2026-07-13",
    });
    assert.ok(dash);
    assert.equal(dash!.total_ruptura_geral, 150);
    assert.equal(dash!.loja, 0);
  });
});

describe("hibridoScope — lojas múltiplas", () => {
  it("assertLojasSelecionadas bloqueia vazio", () => {
    const err = assertLojasSelecionadas([]);
    assert.equal(err?.code, "no_loja_selected");
  });

  it("N1 aceita lojas múltiplas COMPER", () => {
    process.env.VITE_MODO_HIBRIDO = "true";
    const n1 = toPermissionContext({
      perfil: { user_id: "n1", nome: "N1", email: "n1@test", nivel: "N1", ativo: true },
      regionais: [{ id: "r1", user_id: "n1", regional: "MT", ativo: true }],
      bandeiras: [{ id: "b1", user_id: "n1", regional: "MT", bandeira: "COMPER", ativo: true }],
      lojas: [],
      permissoes: ["ruptura.ver"],
    });
    const err = assertEscopoHibrido(n1, {
      regional: "MT",
      bandeira: "COMPER",
      loja: 0,
      lojas: [73, 82],
      dataReferencia: "2026-07-13",
    });
    assert.equal(err, null);
  });

  it("Gerente bloqueia multi-loja", () => {
    process.env.VITE_MODO_HIBRIDO = "true";
    const gerente = toPermissionContext({
      perfil: { user_id: "g", nome: "G", email: "g@test", nivel: "GERENTE_LOJA", ativo: true },
      regionais: [],
      bandeiras: [],
      lojas: [{ id: "l1", user_id: "g", regional: "MT", bandeira: "COMPER", loja: 73, ativo: true }],
      permissoes: [],
    });
    const err = assertEscopoHibrido(gerente, {
      regional: "MT",
      bandeira: "COMPER",
      loja: 0,
      lojas: [73, 82],
      dataReferencia: "2026-07-13",
    });
    assert.equal(err?.code, "forbidden");
  });
});

describe("FiltroLojasMultiplo — contrato UI", () => {
  it("componente exporta FiltroLojasMultiplo", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../components/filtros/FiltroLojasMultiplo.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /Selecionar todas/);
    assert.match(src, /lojas selecionadas/);
    assert.match(src, /Limpar/);
    assert.match(src, /Aplicar/);
    assert.match(src, /formatLojasSelecionadasLabel/);
    assert.match(src, /role="listbox"/);
  });
});
