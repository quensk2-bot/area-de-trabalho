/**
 * Cria usuário Auth + perfil + vínculos piloto (N1_MT | GERENTE_73).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const PERMISSOES = {
  N1_MT: ["ruptura.ver", "drive.ver", "drive.validar", "ruptura.processar"],
  GERENTE_73: ["ruptura.ver"],
} as const;

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        out[key] = val;
        i++;
      }
    }
  }
  return out;
}

async function ensureAuthUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  nome: string,
): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found.id;

  const tempPassword = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !data.user) throw new Error(error?.message ?? "falha createUser");
  return data.user.id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const nome = args.nome ?? "Usuário Piloto";
  const perfil = args.perfil as "N1_MT" | "GERENTE_73";

  if (!email || !["N1_MT", "GERENTE_73"].includes(perfil)) {
    console.error("Uso: --email x@y.com --nome \"Nome\" --perfil N1_MT|GERENTE_73");
    process.exit(1);
  }

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) process.exit(1);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const db = admin.schema("app_v7");

  const userId = await ensureAuthUser(admin, email, nome);
  const nivel = perfil === "GERENTE_73" ? "GERENTE_LOJA" : "N1";

  await db.from("usuarios_perfil").upsert(
    { user_id: userId, nome, email, nivel, ativo: true },
    { onConflict: "user_id" },
  );

  if (perfil === "N1_MT") {
    await db.from("usuario_regionais").upsert(
      { user_id: userId, regional: "MT", ativo: true },
      { onConflict: "user_id,regional" },
    );
    await db.from("usuario_bandeiras").upsert(
      { user_id: userId, regional: "MT", bandeira: "COMPER", ativo: true },
      { onConflict: "user_id,regional,bandeira" },
    );
  } else {
    await db.from("usuario_lojas").upsert(
      { user_id: userId, regional: "MT", bandeira: "COMPER", loja: 73, ativo: true },
      { onConflict: "user_id,regional,bandeira,loja" },
    );
  }

  const codigos = PERMISSOES[perfil];
  const { data: permissoes } = await db.from("permissoes").select("id, codigo").in("codigo", [...codigos]);
  for (const p of permissoes ?? []) {
    await db.from("usuario_permissoes").upsert(
      { user_id: userId, permissao_id: p.id, permitido: true },
      { onConflict: "user_id,permissao_id" },
    );
  }

  console.log(`OK ${perfil} user_id=${userId} email=${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
