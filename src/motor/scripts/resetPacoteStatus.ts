import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const pacoteId = process.argv[2] ?? "2b072138-7da5-4c21-b244-c973ea329e3f";
const status = process.argv[3] ?? "pronto_motor";

async function main() {
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "infra_v7" },
  });
  const { error } = await db
    .from("pacote_motor_drive")
    .update({ status, erro_resumo: null, execucao_motor_id: null })
    .eq("id", pacoteId);
  if (error) throw error;
  console.log(`Pacote ${pacoteId} → ${status}`);
}

main();
