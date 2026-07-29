import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PACOTE_ID = process.argv[2] ?? "2b072138-7da5-4c21-b244-c973ea329e3f";
const OUT = process.argv[3] ?? path.join(process.cwd(), "src/motor/.tmp/aceite-pre-reset-v5.json");

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const infra = createClient(url, key, { db: { schema: "infra_v7" } });
  const motor = createClient(url, key, { db: { schema: "motor_v7" } });
  const consumo = createClient(url, key, { db: { schema: "consumo_v7" } });

  const { data: pacote, error: pErr } = await infra
    .from("pacote_motor_drive")
    .select("*")
    .eq("id", PACOTE_ID)
    .single();
  if (pErr) throw pErr;

  const { data: arquivos } = await infra
    .from("pacote_motor_drive_arquivo")
    .select("id, tipo_arquivo, nome_original, status, hash_validado, padronizacao_status")
    .eq("pacote_id", PACOTE_ID)
    .order("ordem_processamento");

  const { data: solicitacoes } = await infra
    .from("worker_solicitacao")
    .select("*")
    .eq("pacote_id", PACOTE_ID)
    .order("solicitado_em", { ascending: false });

  const { data: versaoAtiva } = await consumo
    .from("vw_versao_motor_ativa")
    .select("*")
    .eq("regional", pacote.regional)
    .maybeSingle();

  let produtosAtivos = 0;
  let cdsAtivos = 0;
  if (versaoAtiva?.execucao_id) {
    const { count: pc } = await motor
      .from("dm_produto_loja")
      .select("*", { count: "exact", head: true })
      .eq("execucao_motor_id", versaoAtiva.execucao_id);
    const { count: cc } = await motor
      .from("dm_produto_loja_cd")
      .select("*", { count: "exact", head: true })
      .eq("execucao_motor_id", versaoAtiva.execucao_id);
    produtosAtivos = pc ?? 0;
    cdsAtivos = cc ?? 0;
  }

  const stagingBase = path.join(process.cwd(), "src/motor/.tmp/worker", PACOTE_ID);
  const staging = {
    existe: fs.existsSync(stagingBase),
    originais: fs.existsSync(path.join(stagingBase, "originais"))
      ? fs.readdirSync(path.join(stagingBase, "originais")).length
      : 0,
    padronizados: fs.existsSync(path.join(stagingBase, "padronizados"))
      ? fs.readdirSync(path.join(stagingBase, "padronizados")).length
      : 0,
  };

  const snapshot = {
    registradoEm: new Date().toISOString(),
    pacoteId: PACOTE_ID,
    pacote,
    arquivos: arquivos ?? [],
    arquivosReconhecidos: (arquivos ?? []).filter((a) => a.status === "reconhecido").length,
    solicitacoes: solicitacoes ?? [],
    solicitacaoEmExecucao: (solicitacoes ?? []).find((s) => s.status === "em_execucao" && s.tipo === "processamento_motor"),
    versaoAtivaMt: versaoAtiva ?? null,
    produtosAtivosVersaoAnterior: produtosAtivos,
    cdsAtivosVersaoAnterior: cdsAtivos,
    staging,
    hashConteudo: pacote.hash_conteudo_pacote,
    hashMetadados: pacote.hash_metadados_pacote,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, out: OUT, status: pacote.status, versaoAtiva: versaoAtiva?.versao ?? null, produtosAtivos, cdsAtivos, staging }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
