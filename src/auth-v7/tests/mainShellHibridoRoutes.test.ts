import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  MENU_ROUTE,
  menuFromPathname,
  routeFromMenu,
} from "../../components/mainShellHibridoRoutes.ts";

describe("MainShellHibrido — rotas independentes", () => {
  it("mantém uma URL exclusiva para cada tela de Ruptura", () => {
    const menus = [
      "ruptura-dashboard",
      "ruptura-loja",
      "ruptura-comprador",
      "ruptura-base-comprador",
      "ruptura-gestao",
      "ruptura-importacao",
    ] as const;
    const routes = menus.map((menu) => routeFromMenu(menu));

    assert.equal(new Set(routes).size, menus.length);
    assert.deepEqual(routes, [
      "/loja/ruptura/dashboard-capa",
      "/loja/ruptura/dashboard-loja",
      "/loja/ruptura/dashboard-comprador",
      "/loja/ruptura/base-comprador",
      "/loja/ruptura/gestao",
      "/loja/ruptura/importacao-drive",
    ]);
  });

  it("restaura a tela correta ao recarregar a URL", () => {
    for (const [menu, route] of Object.entries(MENU_ROUTE)) {
      assert.equal(menuFromPathname(route), menu);
      assert.equal(menuFromPathname(`${route}/`), menu);
    }
  });

  it("rota desconhecida volta para Início", () => {
    assert.equal(menuFromPathname("/rota-inexistente"), "inicio");
  });

  it("mantém o agrupamento Loja > Ruptura e as seis telas", async () => {
    const source = await readFile(
      new URL("../../components/MainShellHibrido.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /<span>Loja<\/span>/);
    assert.match(source, /<span>Ruptura<\/span>/);
    assert.match(source, /\["ruptura-dashboard", "Dashboard Capa", showRuptura\]/);
    assert.match(source, /\["ruptura-loja", "Dashboard Loja", showRuptura\]/);
    assert.match(source, /\["ruptura-comprador", "Dashboard Comprador", showRuptura\]/);
    assert.match(source, /\["ruptura-base-comprador", "Base Comprador", showRuptura\]/);
    assert.match(source, /\["ruptura-gestao", "Gestão", showGestao\]/);
    assert.match(source, /\["ruptura-importacao", "Importação Drive", showDrive\]/);
  });
});
