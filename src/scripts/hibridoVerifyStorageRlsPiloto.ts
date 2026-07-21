/**
 * Verificação RLS Storage ruptura-v7 — piloto H6/H9.
 * Requer .env com URL, anon, service_role. Não imprime segredos.
 */
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "ruptura-v7";
const PASSWORD = "V7Piloto2026!";

type Perfil = "ANON" | "ADM" | "N1_MT" | "GERENTE_73" | "SERVICE_ROLE";

type Caso = {
  perfil: Perfil;
  caminho: string;
  acao: "read" | "upload";
  esperado: "OK" | "BLOCKED";
};

/** Fixtures isolados — nunca sobrescrever artefatos operacionais publicados. */
const RLS_FIXTURE_PREFIX = "_rls-test/2026-07";

const PATHS_MT = [
  `${RLS_FIXTURE_PREFIX}/MT/COMPER/manifest.json`,
  `${RLS_FIXTURE_PREFIX}/MT/COMPER/dashboard/regional.json`,
  `${RLS_FIXTURE_PREFIX}/MT/COMPER/dashboard/lojas.json`,
  `${RLS_FIXTURE_PREFIX}/MT/COMPER/lojas/73/resumo.json`,
  `${RLS_FIXTURE_PREFIX}/MT/COMPER/lojas/82/resumo.json`,
] as const;

const PATH_SP = `${RLS_FIXTURE_PREFIX}/SP/COMPER/manifest.json`;

const CASOS: Caso[] = [
  ...PATHS_MT.flatMap((c) => [
    { perfil: "ANON" as const, caminho: c, acao: "read" as const, esperado: "BLOCKED" as const },
    { perfil: "ADM" as const, caminho: c, acao: "read" as const, esperado: "OK" as const },
  ]),
  ...PATHS_MT.map((c) => ({
    perfil: "N1_MT" as const,
    caminho: c,
    acao: "read" as const,
    esperado: "OK" as const,
  })),
  { perfil: "N1_MT", caminho: PATH_SP, acao: "read", esperado: "BLOCKED" },
  { perfil: "GERENTE_73", caminho: "MT/COMPER/2026-07/manifest.json", acao: "read", esperado: "OK" },
  { perfil: "GERENTE_73", caminho: "MT/COMPER/2026-07/dashboard/regional.json", acao: "read", esperado: "OK" },
  { perfil: "GERENTE_73", caminho: "MT/COMPER/2026-07/dashboard/lojas.json", acao: "read", esperado: "OK" },
  { perfil: "GERENTE_73", caminho: "MT/COMPER/2026-07/lojas/73/resumo.json", acao: "read", esperado: "OK" },
  { perfil: "GERENTE_73", caminho: "MT/COMPER/2026-07/lojas/82/resumo.json", acao: "read", esperado: "BLOCKED" },
  { perfil: "GERENTE_73", caminho: PATHS_MT[0], acao: "read", esperado: "BLOCKED" },
  { perfil: "GERENTE_73", caminho: PATH_SP, acao: "read", esperado: "BLOCKED" },
];

async function seedFixtures(admin: SupabaseClient): Promise<void> {
  const allPaths = [...PATHS_MT, PATH_SP];
  for (const path of allPaths) {
    const body = JSON.stringify({ _rls_test: true, path, ts: new Date().toISOString() });
    const { error } = await admin.storage.from(BUCKET).upload(path, body, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) throw new Error(`seed ${path}: ${error.message}`);
  }
}

async function clientForPerfil(
  url: string,
  anon: string,
  service: string,
  perfil: Perfil,
): Promise<SupabaseClient> {
  if (perfil === "SERVICE_ROLE") {
    return createClient(url, service, { auth: { persistSession: false } });
  }
  if (perfil === "ANON") {
    return createClient(url, anon, { auth: { persistSession: false } });
  }
  const email =
    perfil === "ADM"
      ? "adm@teste.com"
      : perfil === "N1_MT"
        ? "nivel1@teste.com"
        : "gerencia73@teste.com";
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return client;
}

async function tryRead(client: SupabaseClient, path: string): Promise<"OK" | "BLOCKED"> {
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error || !data) return "BLOCKED";
  return data.size > 0 ? "OK" : "BLOCKED";
}

async function tryUpload(client: SupabaseClient, path: string): Promise<"OK" | "BLOCKED"> {
  const body = JSON.stringify({ _upload_test: true });
  const { error } = await client.storage.from(BUCKET).upload(`${path}.upload-test`, body, {
    contentType: "application/json",
    upsert: true,
  });
  return error ? "BLOCKED" : "OK";
}

async function main(): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    console.error("Configure URL, anon e service_role no .env local.");
    process.exit(1);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  console.log("Seeding fixtures via service_role...");
  await seedFixtures(admin);

  const uploadRes = await tryUpload(admin, "MT/COMPER/2026-07/_service_role_probe");
  console.log(`SERVICE_ROLE upload probe: ${uploadRes}`);

  console.log("\nperfil | caminho | acao | esperado | obtido | match");
  console.log("---|---|---|---|---|---");

  let failed = 0;
  const clients = new Map<Perfil, SupabaseClient>();

  for (const caso of CASOS) {
    if (!clients.has(caso.perfil)) {
      clients.set(caso.perfil, await clientForPerfil(url, anon, service, caso.perfil));
    }
    const client = clients.get(caso.perfil)!;
    const obtido = caso.acao === "read" ? await tryRead(client, caso.caminho) : await tryUpload(client, caso.caminho);
    const match = obtido === caso.esperado ? "PASS" : "FAIL";
    if (match === "FAIL") failed++;
    console.log(`${caso.perfil} | ${caso.caminho} | ${caso.acao} | ${caso.esperado} | ${obtido} | ${match}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
