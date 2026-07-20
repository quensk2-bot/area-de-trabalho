/**
 * Verificação RLS piloto — requer service_role e usuários de teste no Auth.
 * Não imprime segredos.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    console.error("Configure URL, anon e service_role no .env local.");
    process.exit(1);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });

  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  // anon: zero linhas em usuarios_perfil
  const anonRes = await anonClient.schema("app_v7").from("usuarios_perfil").select("user_id").limit(1);
  checks.push({
    name: "anon sem acesso usuarios_perfil",
    ok: Boolean(anonRes.error) || (anonRes.data?.length ?? 0) === 0,
    detail: anonRes.error?.message,
  });

  // service_role: consegue ler catálogo permissoes
  const permRes = await admin.schema("app_v7").from("permissoes").select("codigo").limit(20);
  const codigos = (permRes.data ?? []).map((p) => p.codigo);
  const expected = ["ruptura.ver", "usuarios.admin", "drive.ver", "drive.validar", "drive.processar"];
  checks.push({
    name: "permissoes seed (service_role)",
    ok: expected.every((c) => codigos.includes(c)),
    detail: codigos.join(", "),
  });

  // tabelas pesadas ausentes
  for (const tbl of ["motor_v7", "dm_produto_loja", "dm_produto_loja_cd"]) {
    const r = await admin.from(tbl).select("*").limit(1);
    checks.push({
      name: `ausente ${tbl}`,
      ok: Boolean(r.error),
      detail: r.error?.message,
    });
  }

  let failed = 0;
  for (const c of checks) {
    const status = c.ok ? "OK" : "FAIL";
    if (!c.ok) failed++;
    console.log(`${status} — ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
