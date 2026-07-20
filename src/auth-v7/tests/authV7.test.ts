import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateProfileGate,
  buildPermissionHelpers,
  mapNivelToLegacyMenu,
  perfilV7ToLegacyUsuario,
  toPermissionContext,
} from "../authProfileUtils.ts";
import {
  hasPermission,
  canAccessRegional,
  canAccessBandeira,
  canAccessLoja,
  canViewRuptura,
  canProcessRuptura,
  canAdminUsuarios,
  canViewDrive,
  isGerenteLoja,
} from "../permissionService.ts";
import { AUTH_V7_MESSAGES } from "../authV7Types.ts";
import { isProjetoHibridoUrl, PROJETO_ANTIGO_REF, PROJETO_HIBRIDO_REF } from "../../lib/env.ts";

const admBundle = {
  perfil: {
    user_id: "adm-1",
    nome: "Admin",
    email: "adm@test.local",
    nivel: "ADM" as const,
    ativo: true,
  },
  regionais: [],
  bandeiras: [],
  lojas: [],
  permissoes: [],
};

const n1MtBundle = {
  perfil: {
    user_id: "n1-1",
    nome: "N1 MT",
    email: "n1@test.local",
    nivel: "N1" as const,
    ativo: true,
  },
  regionais: [{ id: "r1", user_id: "n1-1", regional: "MT", ativo: true }],
  bandeiras: [{ id: "b1", user_id: "n1-1", regional: "MT", bandeira: "COMPER", ativo: true }],
  lojas: [],
  permissoes: ["ruptura.ver", "drive.ver", "drive.validar", "ruptura.processar"],
};

const gerente73Bundle = {
  perfil: {
    user_id: "g73",
    nome: "Gerente 73",
    email: "g73@test.local",
    nivel: "GERENTE_LOJA" as const,
    ativo: true,
  },
  regionais: [],
  bandeiras: [],
  lojas: [{ id: "l1", user_id: "g73", regional: "MT", bandeira: "COMPER", loja: 73, ativo: true }],
  permissoes: ["ruptura.ver"],
};

describe("auth-v7 — sessão e perfil", () => {
  it("1. sessão ausente — gate reprova perfil ausente", () => {
    const gate = evaluateProfileGate(null);
    assert.equal(gate.ok, false);
    assert.match(gate.error ?? "", /cadastrado/);
  });

  it("4. perfil ausente", () => {
    const gate = evaluateProfileGate(null);
    assert.equal(gate.ok, false);
  });

  it("5. perfil inativo", () => {
    const gate = evaluateProfileGate({
      ...admBundle,
      perfil: { ...admBundle.perfil, ativo: false },
    });
    assert.equal(gate.ok, false);
    assert.equal(gate.error, "Usuário inativo.");
  });

  it("3. login inválido — mensagem definida", () => {
    assert.equal(AUTH_V7_MESSAGES.invalidCredentials, "E-mail ou senha inválidos.");
  });
});

describe("auth-v7 — perfis piloto", () => {
  it("6. ADM — todas permissões implícitas", () => {
    const ctx = toPermissionContext(admBundle);
    assert.equal(hasPermission(ctx, "usuarios.admin"), true);
    assert.equal(canAccessRegional(ctx, "SP"), true);
    assert.equal(canAccessLoja(ctx, "MT", "COMPER", 82), true);
  });

  it("7. N1 MT — regional MT e COMPER", () => {
    const ctx = toPermissionContext(n1MtBundle);
    assert.equal(canAccessRegional(ctx, "MT"), true);
    assert.equal(canAccessRegional(ctx, "SP"), false);
    assert.equal(canAccessBandeira(ctx, "MT", "COMPER"), true);
    assert.equal(canProcessRuptura(ctx), true);
  });

  it("8. gerente loja 73 — só loja 73", () => {
    const ctx = toPermissionContext(gerente73Bundle);
    assert.equal(isGerenteLoja(ctx), true);
    assert.equal(canAccessLoja(ctx, "MT", "COMPER", 73), true);
    assert.equal(canAccessLoja(ctx, "MT", "COMPER", 82), false);
    assert.equal(canProcessRuptura(ctx), false);
    assert.equal(canAdminUsuarios(ctx), false);
  });
});

describe("auth-v7 — escopo e permissões", () => {
  it("9. carregar regional", () => {
    assert.equal(n1MtBundle.regionais[0]?.regional, "MT");
  });

  it("10. carregar bandeira", () => {
    assert.equal(n1MtBundle.bandeiras[0]?.bandeira, "COMPER");
  });

  it("11. carregar loja", () => {
    assert.equal(gerente73Bundle.lojas[0]?.loja, 73);
  });

  it("12. permissão concedida", () => {
    const ctx = toPermissionContext(n1MtBundle);
    assert.equal(hasPermission(ctx, "ruptura.ver"), true);
  });

  it("13. permissão negada", () => {
    const ctx = toPermissionContext(gerente73Bundle);
    assert.equal(hasPermission(ctx, "usuarios.admin"), false);
  });
});

describe("auth-v7 — helpers de contexto", () => {
  it("buildPermissionHelpers expõe funções", () => {
    const h = buildPermissionHelpers(n1MtBundle);
    assert.equal(typeof h.hasPermission, "function");
    assert.equal(h.canAccessRegional("MT"), true);
  });

  it("mapNivelToLegacyMenu — GERENTE_LOJA", () => {
    assert.equal(mapNivelToLegacyMenu("GERENTE_LOJA"), "N2");
  });

  it("perfilV7ToLegacyUsuario", () => {
    const u = perfilV7ToLegacyUsuario(gerente73Bundle);
    assert.equal(u.id, "g73");
    assert.equal(u.nivel, "N2");
  });
});

describe("auth-v7 — menus híbridos", () => {
  it("ADM vê ruptura e drive", () => {
    const ctx = toPermissionContext(admBundle);
    assert.equal(canViewRuptura(ctx), true);
    assert.equal(canViewDrive(ctx), true);
    assert.equal(canAdminUsuarios(ctx), true);
  });

  it("N1 com ruptura.ver", () => {
    const ctx = toPermissionContext(n1MtBundle);
    assert.equal(canViewRuptura(ctx), true);
    assert.equal(canViewDrive(ctx), true);
  });

  it("gerente sem processar", () => {
    const ctx = toPermissionContext(gerente73Bundle);
    assert.equal(canViewRuptura(ctx), true);
    assert.equal(canProcessRuptura(ctx), false);
  });
});

describe("auth-v7 — ambiente híbrido", () => {
  it("19. projeto híbrido ref conhecido", () => {
    assert.equal(PROJETO_HIBRIDO_REF, "kdlhztpzedanwirifzsb");
    assert.ok(isProjetoHibridoUrl(`https://${PROJETO_HIBRIDO_REF}.supabase.co`));
  });

  it("19b. projeto antigo não é híbrido", () => {
    assert.equal(PROJETO_ANTIGO_REF, "lghcztadxobrotyoqpbq");
    assert.equal(isProjetoHibridoUrl(`https://${PROJETO_ANTIGO_REF}.supabase.co`), false);
  });
});

describe("auth-v7 — mensagens", () => {
  it("mensagens de gate definidas", () => {
    assert.ok(AUTH_V7_MESSAGES.profileMissing);
    assert.ok(AUTH_V7_MESSAGES.hybridLoadFailed);
    assert.ok(AUTH_V7_MESSAGES.sessionExpired);
    assert.ok(AUTH_V7_MESSAGES.permissionDenied);
  });
});
