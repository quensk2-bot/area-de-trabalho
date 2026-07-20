/**
 * Vínculos piloto H16 — ADM | N1_MT | GERENTE_73
 *
 * Uso:
 *   npx tsx src/scripts/hibridoVincularPiloto.ts --user-id <uuid> --perfil ADM
 *   npx tsx src/scripts/hibridoVincularPiloto.ts --user-id <uuid> --perfil N1_MT
 *   npx tsx src/scripts/hibridoVincularPiloto.ts --user-id <uuid> --perfil GERENTE_73
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

type PerfilPiloto = "ADM" | "N1_MT" | "GERENTE_73";

const PERMISSOES = {
  ADM: ["usuarios.admin", "ruptura.ver", "ruptura.processar", "ruptura.admin", "drive.ver", "drive.validar", "drive.processar", "auditoria.ver"],
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

async function grantPermissoes(
  db: ReturnType<ReturnType<typeof createClient>["schema"]>,
  userId: string,
  codigos: readonly string[],
) {
  const { data: permissoes, error } = await db.from("permissoes").select("id, codigo").in("codigo", [...codigos]);
  if (error) throw error;

  for (const p of permissoes ?? []) {
    const { error: upErr } = await db.from("usuario_permissoes").upsert(
      { user_id: userId, permissao_id: p.id, permitido: true },
      { onConflict: "user_id,permissao_id" },
    );
    if (upErr) throw upErr;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userId = args["user-id"];
  const perfil = (args.perfil ?? "").toUpperCase() as PerfilPiloto;

  if (!userId || !["ADM", "N1_MT", "GERENTE_73"].includes(perfil)) {
    console.error("Uso: --user-id <uuid> --perfil ADM|N1_MT|GERENTE_73");
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

  if (perfil === "ADM") {
    await grantPermissoes(db, userId, PERMISSOES.ADM);
    console.log("ADM: todas permissões piloto concedidas (escopo global via RLS ADM).");
    return;
  }

  if (perfil === "N1_MT") {
    await db.from("usuario_regionais").upsert(
      { user_id: userId, regional: "MT", ativo: true },
      { onConflict: "user_id,regional" },
    );
    await db.from("usuario_bandeiras").upsert(
      { user_id: userId, regional: "MT", bandeira: "COMPER", ativo: true },
      { onConflict: "user_id,regional,bandeira" },
    );
    await grantPermissoes(db, userId, PERMISSOES.N1_MT);
    console.log("N1_MT: regional MT, bandeira COMPER, permissões ruptura/drive.");
    return;
  }

  if (perfil === "GERENTE_73") {
    await db.from("usuario_lojas").upsert(
      { user_id: userId, regional: "MT", bandeira: "COMPER", loja: 73, ativo: true },
      { onConflict: "user_id,regional,bandeira,loja" },
    );
    await grantPermissoes(db, userId, PERMISSOES.GERENTE_73);
    console.log("GERENTE_73: loja 73 MT/COMPER, somente ruptura.ver.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
