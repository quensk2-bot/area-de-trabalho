import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filtrarCatalogoPorPermissoes,
  formatLojaLabel,
  listarBandeirasDoCatalogo,
  listarLojasDoCatalogo,
  listarRegionaisDoCatalogo,
  normalizarFiltroCascade,
} from "../catalogoLojasService.ts";
import { toPermissionContext } from "../authProfileUtils.ts";
import { FILTRO_BANDEIRA_TODAS, FILTRO_LOJA_TODAS } from "../catalogoLojasTypes.ts";
import type { CatalogoLoja } from "../catalogoLojasTypes.ts";

const CATALOGO_MT: CatalogoLoja[] = [
  { regional: "MT", bandeira: "COMPER", loja: 73, nome: "COMPER CPA I" },
  { regional: "MT", bandeira: "COMPER", loja: 82, nome: "COMPER CENTRO" },
  { regional: "MT", bandeira: "FORT", loja: 90, nome: "FORT LOJA 90" },
  { regional: "SP", bandeira: "COMPER", loja: 10, nome: "COMPER SP 10" },
];

const LOJAS_COMPER_MT = [73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173] as const;
const LOJAS_FORT_MT = [90, 95, 120, 415, 495] as const;

const CATALOGO_MT_20: CatalogoLoja[] = [
  ...LOJAS_COMPER_MT.map((loja) => ({
    regional: "MT",
    bandeira: "COMPER",
    loja,
    nome: loja === 73 ? "COMPER CPA I" : loja === 82 ? "COMPER CENTRO" : `COMPER LOJA ${loja}`,
  })),
  ...LOJAS_FORT_MT.map((loja) => ({
    regional: "MT",
    bandeira: "FORT",
    loja,
    nome: `FORT LOJA ${loja}`,
  })),
];

const n1Mt = toPermissionContext({
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

const gerente73 = toPermissionContext({
  perfil: {
    user_id: "g73",
    nome: "Gerente",
    email: "g73@test",
    nivel: "GERENTE_LOJA",
    ativo: true,
  },
  regionais: [],
  bandeiras: [],
  lojas: [{ id: "l1", user_id: "g73", regional: "MT", bandeira: "COMPER", loja: 73, ativo: true }],
  permissoes: ["ruptura.ver"],
});

describe("catalogoLojas — exibição e cascata", () => {
  it("formatLojaLabel usa codigo e nome", () => {
    assert.equal(formatLojaLabel({ loja: 73, nome: "COMPER CPA I" }), "73 - COMPER CPA I");
    assert.equal(formatLojaLabel({ loja: 82, nome: "COMPER CENTRO" }), "82 - COMPER CENTRO");
  });

  it("listarBandeiras filtra por regional", () => {
    const bandeiras = listarBandeirasDoCatalogo(CATALOGO_MT, "MT");
    assert.deepEqual(
      bandeiras.map((b) => b.bandeira).sort(),
      ["COMPER", "FORT"],
    );
  });

  it("listarLojas respeita bandeira ou todas", () => {
    const comper = listarLojasDoCatalogo(CATALOGO_MT, "MT", "COMPER");
    assert.deepEqual(
      comper.map((l) => l.loja),
      [73, 82],
    );
    const todas = listarLojasDoCatalogo(CATALOGO_MT, "MT", FILTRO_BANDEIRA_TODAS);
    assert.equal(todas.length, 3);
  });

  it("cascata reseta bandeira/loja ao trocar regional", () => {
    const next = normalizarFiltroCascade(
      CATALOGO_MT,
      { regional: "MT", bandeira: "COMPER", loja: 73 },
      { regional: "SP" },
    );
    assert.equal(next.regional, "SP");
    assert.equal(next.bandeira, FILTRO_BANDEIRA_TODAS);
    assert.equal(next.loja, FILTRO_LOJA_TODAS);
  });

  it("cascata reseta loja ao trocar bandeira", () => {
    const next = normalizarFiltroCascade(
      CATALOGO_MT,
      { regional: "MT", bandeira: "COMPER", loja: 73 },
      { bandeira: "FORT" },
    );
    assert.equal(next.bandeira, "FORT");
    assert.equal(next.loja, FILTRO_LOJA_TODAS);
  });
});

const CATALOGO_MT_COMPLETO = CATALOGO_MT_20;

describe("catalogoLojas — MT COMPER e FORT", () => {
  it("MT COMPER lista 15 lojas esperadas no catálogo piloto", () => {
    const comper = listarLojasDoCatalogo(CATALOGO_MT_COMPLETO, "MT", "COMPER");
    assert.equal(comper.length, 15);
    assert.deepEqual(
      comper.map((l) => l.loja).sort((a, b) => a - b),
      [...LOJAS_COMPER_MT],
    );
  });

  it("MT FORT lista 90, 95, 120, 415, 495", () => {
    const fort = listarLojasDoCatalogo(CATALOGO_MT_COMPLETO, "MT", "FORT");
    assert.deepEqual(
      fort.map((l) => l.loja).sort((a, b) => a - b),
      [...LOJAS_FORT_MT],
    );
  });

  it("Todas bandeiras em MT retorna COMPER + FORT", () => {
    const todas = listarLojasDoCatalogo(CATALOGO_MT_COMPLETO, "MT", FILTRO_BANDEIRA_TODAS);
    assert.equal(todas.length, 20);
  });

  it("COMPER → FORT limpa loja anterior na cascata", () => {
    const next = normalizarFiltroCascade(
      CATALOGO_MT_COMPLETO,
      { regional: "MT", bandeira: "COMPER", loja: 73 },
      { bandeira: "FORT" },
    );
    assert.equal(next.bandeira, "FORT");
    assert.equal(next.loja, FILTRO_LOJA_TODAS);
    assert.ok(!listarLojasDoCatalogo(CATALOGO_MT_COMPLETO, "MT", "FORT").some((l) => l.loja === 73));
  });

  it("regional sem bandeiras conhecidas zera escopo de lojas", () => {
    assert.equal(listarBandeirasDoCatalogo(CATALOGO_MT, "XX").length, 0);
    assert.equal(listarLojasDoCatalogo(CATALOGO_MT, "XX", "COMPER").length, 0);
  });

  it("bandeira sem lojas retorna lista vazia", () => {
    assert.equal(listarLojasDoCatalogo(CATALOGO_MT, "SP", "FORT").length, 0);
  });

  it("loja inválida após cascata cai em Todas ou primeira válida", () => {
    const next = normalizarFiltroCascade(
      CATALOGO_MT,
      { regional: "MT", bandeira: "COMPER", loja: 9999 },
      {},
    );
    assert.notEqual(next.loja, 9999);
  });

  it("ADM enxerga catálogo MT completo", () => {
    const admCtx = toPermissionContext({
      perfil: { user_id: "adm", nome: "ADM", email: "adm@test", nivel: "ADM", ativo: true },
      regionais: [],
      bandeiras: [],
      lojas: [],
      permissoes: [],
    });
    const scoped = filtrarCatalogoPorPermissoes(CATALOGO_MT_COMPLETO, admCtx);
    assert.equal(scoped.length, 20);
  });

  it("Gerente 73 sem opção Todas — catálogo unitário", () => {
    const scoped = filtrarCatalogoPorPermissoes(CATALOGO_MT_COMPLETO, gerente73);
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]?.loja, 73);
  });
});

describe("catalogoLojas — permissões", () => {
  it("N1 MT/COMPER enxerga somente lojas COMPER em MT", () => {
    const scoped = filtrarCatalogoPorPermissoes(CATALOGO_MT, n1Mt);
    assert.ok(scoped.every((l) => l.regional === "MT" && l.bandeira === "COMPER"));
    assert.equal(scoped.length, 2);
  });

  it("GERENTE_73 enxerga apenas loja 73", () => {
    const scoped = filtrarCatalogoPorPermissoes(CATALOGO_MT, gerente73);
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]?.loja, 73);
  });

  it("regionais derivadas do catálogo filtrado", () => {
    assert.deepEqual(listarRegionaisDoCatalogo(filtrarCatalogoPorPermissoes(CATALOGO_MT, gerente73)), ["MT"]);
    assert.deepEqual(listarRegionaisDoCatalogo(CATALOGO_MT).sort(), ["MT", "SP"]);
  });
});
