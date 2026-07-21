import type { SupabaseClient } from "@supabase/supabase-js";
import type { RupturaManifest } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import { manifestStoragePath } from "../../../hibrido-v7/manifest/manifestBuilder.ts";

export type RegistrarPacoteLeveInput = {
  supabase: SupabaseClient;
  manifest: RupturaManifest;
  totalArquivos: number;
  totalProdutos?: number | null;
  totalCds?: number | null;
  solicitadoPor?: string | null;
  baseXlsxDriveFileId?: string | null;
  baseCsvDriveFileId?: string | null;
  relatorioPath?: string | null;
  status?: string;
};

export type RegistrarPacoteLeveResultado = {
  ok: boolean;
  pacoteId?: string;
  erro?: string;
};

/** Registro resumido em app_v7.pacotes_processamento — sem produtos/CDs. */
export async function registrarPacoteLeve(input: RegistrarPacoteLeveInput): Promise<RegistrarPacoteLeveResultado> {
  const manifestPath = manifestStoragePath(input.manifest);
  const { data, error } = await input.supabase
    .schema("app_v7")
    .from("pacotes_processamento")
    .insert({
      modulo: "ruptura",
      regional: input.manifest.regional,
      bandeira: input.manifest.bandeira,
      competencia: `${input.manifest.competencia}-01`,
      data_referencia: input.manifest.dataReferencia,
      status: input.status ?? input.manifest.status,
      hash_conteudo: input.manifest.hashConteudo,
      total_arquivos: input.totalArquivos,
      total_produtos: input.totalProdutos ?? null,
      total_cds: input.totalCds ?? null,
      versao: input.manifest.versao,
      manifest_url: manifestPath,
      base_xlsx_url: input.baseXlsxDriveFileId ?? input.manifest.baseXlsxDriveFileId ?? null,
      base_csv_url: input.baseCsvDriveFileId ?? input.manifest.baseCsvDriveFileId ?? null,
      relatorio_url: input.relatorioPath ?? null,
      solicitado_por: input.solicitadoPor ?? null,
      iniciado_em: new Date().toISOString(),
      finalizado_em: input.manifest.status === "concluido" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  return { ok: true, pacoteId: data?.id as string | undefined };
}
