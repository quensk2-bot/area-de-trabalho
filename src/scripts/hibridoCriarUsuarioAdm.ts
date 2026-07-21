/**
 * Cria usuário ADM piloto: Auth + app_v7.usuarios_perfil + permissões.
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env local.
 *
 * Uso:
 *   npx tsx src/scripts/hibridoCriarUsuarioAdm.ts --email seu@email.com --nome "Seu Nome"
 *   npx tsx src/scripts/hibridoCriarUsuarioAdm.ts --email seu@email.com --invite
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val && !val.startsWith("--")) {
      out[key] = val;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email ?? "").trim().toLowerCase();
  const nome = String(args.nome ?? "Administrador V7").trim();
  const useInvite = Boolean(args.invite);

  if (!email || !email.includes("@")) {
    console.error("Obrigatório: --email seu@email.com");
    process.exit(1);
  }

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env local.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const db = admin.schema("app_v7");

  const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === email);

  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`Usuário Auth já existe: ${userId}`);
  } else if (useInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome },
    });
    if (error || !data.user) {
      console.error("Erro ao convidar:", error?.message ?? "sem user");
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`Convite enviado. user_id=${userId}`);
  } else {
    const tempPassword = randomBytes(18).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error || !data.user) {
      console.error("Erro ao criar Auth:", error?.message ?? "sem user");
      process.exit(1);
    }
    userId = data.user.id;
    const redirectTo = "https://quensk2-bot.github.io/area-de-trabalho/";
    await admin.auth.resetPasswordForEmail(email, { redirectTo });
    console.log(`Usuário Auth criado: ${userId}`);
    console.log("E-mail de redefinição de senha enviado (defina sua senha pelo link).");
  }

  const { error: perfilErr } = await db.from("usuarios_perfil").upsert(
    { user_id: userId, nome, email, nivel: "ADM", ativo: true },
    { onConflict: "user_id" },
  );
  if (perfilErr) {
    console.error("Erro perfil:", perfilErr.message);
    process.exit(1);
  }

  const { data: permissoes } = await db.from("permissoes").select("id, codigo");
  for (const p of permissoes ?? []) {
    await db.from("usuario_permissoes").upsert(
      { user_id: userId, permissao_id: p.id, permitido: true },
      { onConflict: "user_id,permissao_id" },
    );
  }

  console.log("Perfil ADM vinculado com todas permissões piloto.");
  console.log(`Login: ${email}`);
  console.log("Ambiente: https://quensk2-bot.github.io/area-de-trabalho/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
