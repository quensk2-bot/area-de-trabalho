import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PACOTE_ID = process.argv[2] ?? "2b072138-7da5-4c21-b244-c973ea329e3f";
const MOTIVO = process.argv[3] ?? "Processo encerrado durante gerando_datamart (provável OOM)";

async function main() {
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "infra_v7" },
  });
  const { error } = await db
    .from("pacote_motor_drive")
    .update({ status: "falhou", erro_resumo: MOTIVO.slice(0, 500) })
    .eq("id", PACOTE_ID);
  if (error) throw error;

  const diag = {
    pacoteId: PACOTE_ID,
    marcadoEm: new Date().toISOString(),
    motivo: MOTIVO,
    heartbeat: fs.existsSync(path.join(process.cwd(), "src/motor/.tmp/worker", PACOTE_ID, "heartbeat.json"))
      ? JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/motor/.tmp/worker", PACOTE_ID, "heartbeat.json"), "utf8"))
      : null,
  };
  const out = path.join(process.cwd(), "src/motor/.tmp/aceite-diagnostico-v5.json");
  fs.writeFileSync(out, JSON.stringify(diag, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, status: "falhou", out: diag }, null, 2));
}

main();
