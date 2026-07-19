import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient.ts";

async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
        return body.message;
      }
    } catch {
      // ignore
    }
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export type ListarDriveRequest = {
  regional: string;
  ano: number;
  mes: number;
  tipoPasta?: string;
  folderId?: string;
};

export type ArquivoDriveRemoto = {
  driveFileId: string;
  nome: string;
  mimeType: string | null;
  tamanhoBytes: number | null;
  modifiedTime: string | null;
  md5Checksum: string | null;
  webViewLink: string | null;
  tipoArquivoReconhecido: string | null;
  statusReconhecimento: string;
  avisos: string[];
};

export type ListarDriveResponse = {
  ok: boolean;
  step?: string;
  message?: string;
  regional?: string;
  ano?: number;
  mes?: number;
  pastaDriveId?: string;
  caminhoConceitual?: string;
  listadoEm?: string;
  quantidadeArquivos?: number;
  quantidadeEsperada?: number;
  pacoteCompleto?: boolean;
  faltantes?: string[];
  arquivos?: ArquivoDriveRemoto[];
  aviso?: string;
};

export type PermissaoDriveResponse = {
  ok: boolean;
  podeListarDrive?: boolean;
  podeProcessar?: boolean;
  nivel?: string;
  message?: string;
};

export async function testarPermissaoDriveImportacao(): Promise<PermissaoDriveResponse> {
  const { data, error } = await supabase.functions.invoke("listar-arquivos-motor-drive", {
    body: { acao: "testar_permissao" },
  });
  if (error) return { ok: false, message: await parseFunctionError(error) };
  return data as PermissaoDriveResponse;
}

export async function listarArquivosMotorDrive(req: ListarDriveRequest): Promise<ListarDriveResponse> {
  const { data, error } = await supabase.functions.invoke("listar-arquivos-motor-drive", {
    body: { acao: "listar", ...req, tipoPasta: req.tipoPasta ?? "originais" },
  });
  if (error) {
    const message = await parseFunctionError(error);
    const parsed = (data ?? {}) as ListarDriveResponse;
    return { ok: false, message: parsed.message ?? message, step: parsed.step ?? "invoke", ...parsed };
  }
  return data as ListarDriveResponse;
}
