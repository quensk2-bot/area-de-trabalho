/**
 * Valida grants RLS — anon/authenticated sem escrita; service_role CRUD.
 * Nao imprime tokens.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Variaveis Supabase incompletas para teste de seguranca.");
  process.exit(1);
}

const service = createClient(url, serviceKey, { db: { schema: "motor_v7" } });
const anon = createClient(url, anonKey, { db: { schema: "motor_v7" } });

async function main(): Promise<void> {
  const insertPayload = {
    data_referencia: "2099-01-15",
    regional: "TESTE_SEG",
    versao: 1,
    hash_pacote: "seg-check",
    quantidade_arquivos: 0,
    quantidade_registros: 0,
    quantidade_erros: 0,
    status: "criada",
    versao_ativa: false,
  };

  const anonSelect = await anon.from("execucao_motor").select("id").limit(1);
  const anonInsert = await anon.from("execucao_motor").insert(insertPayload);
  const serviceInsert = await service.from("execucao_motor").insert(insertPayload).select("id").single();

  console.log("anon SELECT bloqueado:", anonSelect.error != null);
  console.log("anon INSERT bloqueado:", anonInsert.error != null);
  console.log("service_role INSERT permitido:", serviceInsert.error == null);

  if (serviceInsert.data?.id) {
    await service.from("execucao_motor").delete().eq("id", serviceInsert.data.id);
  }

  if (anonSelect.error == null) throw new Error("anon SELECT deveria falhar");
  if (anonInsert.error == null) throw new Error("anon INSERT deveria falhar");
  if (serviceInsert.error != null) throw new Error("service INSERT deveria funcionar");

  console.log("=== SEGURANCA OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
