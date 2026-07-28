export type MenuKey =
  | "inicio"
  | "ruptura-dashboard"
  | "ruptura-loja"
  | "ruptura-comprador"
  | "ruptura-base-comprador"
  | "ruptura-curto-prazo"
  | "ruptura-gestao"
  | "ruptura-importacao"
  | "admin-usuarios"
  | "meu-perfil";

export const MENU_ROUTE: Record<MenuKey, string> = {
  inicio: "/",
  "ruptura-dashboard": "/loja/ruptura/dashboard-capa",
  "ruptura-loja": "/loja/ruptura/dashboard-loja",
  "ruptura-comprador": "/loja/ruptura/dashboard-comprador",
  "ruptura-base-comprador": "/loja/ruptura/base-comprador",
  "ruptura-curto-prazo": "/loja/ruptura/curto-prazo",
  "ruptura-gestao": "/loja/ruptura/gestao",
  "ruptura-importacao": "/loja/ruptura/importacao-drive",
  "admin-usuarios": "/administracao/usuarios",
  "meu-perfil": "/meu-perfil",
};

const ROUTE_MENU = new Map(
  Object.entries(MENU_ROUTE).map(([menu, route]) => [route, menu as MenuKey]),
);

export function normalizarRotaHibrida(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function menuFromPathname(pathname: string): MenuKey {
  return ROUTE_MENU.get(normalizarRotaHibrida(pathname)) ?? "inicio";
}

export function routeFromMenu(menu: MenuKey): string {
  return MENU_ROUTE[menu];
}
