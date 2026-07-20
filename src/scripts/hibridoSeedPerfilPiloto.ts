/**
 * Vincula perfil piloto em app_v7 (service_role local — nunca no frontend).
 *
 * Uso:
 *   npx tsx src/scripts/hibridoSeedPerfilPiloto.ts --user-id <uuid> --nivel ADM
 *   npx tsx src/scripts/hibridoSeedPerfilPiloto.ts --user-id <uuid> --nivel N1 --nome "Nome" --email user@dominio
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

type Nivel = "ADM" | "N1" | "GERENTE_LOJA";

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
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userId = args["user-id"];
  const nivel = (args.nivel ?? "ADM").toUpperCase() as Nivel;
  const nome = args.nome ?? "Usuário Piloto";
  const email = args.email ?? `piloto-${userId?.slice(0, 8)}@local.invalid`;

  if (!userId) {
    console.error("Obrigatório: --user-id <uuid do Supabase Auth>");
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

  const { error: perfilErr } = await db.from("usuarios_perfil").upsert(
    {
      user_id: userId,
      nome,
      email,
      nivel,
      ativo: true,
    },
    { onConflict: "user_id" },
  );

  if (perfilErr) {
    console.error("Erro ao upsert perfil:", perfilErr.message);
    process.exit(1);
  }

  console.log(`Perfil ${nivel} vinculado para user_id=${userId}`);
  console.log("Use hibridoVincularPiloto.ts para regionais/bandeiras/lojas/permissões.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
