import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const PACOTE_ID = process.argv[2] ?? "2b072138-7da5-4c21-b244-c973ea329e3f";

async function main() {
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "infra_v7" },
  });

  const { data: sols } = await db
    .from("worker_solicitacao")
    .select("id, tipo, status, tentativa, worker_id, iniciado_em")
    .eq("pacote_id", PACOTE_ID)
    .eq("tipo", "processamento_motor")
    .in("status", ["pendente", "em_execucao"]);

  if (!sols?.length) {
    console.log(JSON.stringify({ ok: true, canceladas: 0, message: "Nenhuma solicitação ativa" }));
    return;
  }

  for (const s of sols) {
    await db
      .from("worker_solicitacao")
      .update({
        status: "cancelada",
        finalizado_em: new Date().toISOString(),
        erro_resumo: "Cancelada para aceite v5",
      })
      .eq("id", s.id);
  }

  console.log(JSON.stringify({ ok: true, canceladas: sols.length, ids: sols.map((s) => s.id) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
