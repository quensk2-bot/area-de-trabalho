import { supabase } from "../../../lib/supabaseClient.ts";
import { HIBRIDO_BUCKET } from "../../../hibrido-v7/constants.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";

type DriveDownloadResponse = {
  ok?: boolean;
  signedUrl?: string;
  downloadUrl?: string;
  filename?: string;
  base64?: string;
  contentType?: string;
  message?: string;
};

export async function baixarBaseRupturaDrive(input: {
  driveFileId: string;
  filename: string;
}): Promise<{ ok: true; blob: Blob } | { ok: false; erro: HybridServiceError }> {
  const { data, error } = await supabase.functions.invoke<DriveDownloadResponse>("listar-arquivos-motor-drive", {
    body: { acao: "baixar", driveFileId: input.driveFileId },
  });

  if (error) {
    return { ok: false, erro: { code: "network", message: error.message } };
  }

  const url = data?.signedUrl ?? data?.downloadUrl;
  if (data?.ok && url) {
    const resp = await fetch(url);
    if (!resp.ok) {
      return { ok: false, erro: { code: "network", message: `Falha ao baixar arquivo (${resp.status})` } };
    }
    const blob = await resp.blob();
    return { ok: true, blob };
  }

  if (data?.ok && data.base64) {
    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: data.contentType ?? "application/octet-stream",
    });
    return { ok: true, blob };
  }

  return {
    ok: false,
    erro: { code: "network", message: data?.message ?? "Download Drive indisponível para este arquivo." },
  };
}

export async function baixarBaseRupturaStorage(input: {
  path: string;
  filename: string;
}): Promise<{ ok: true; blob: Blob } | { ok: false; erro: HybridServiceError }> {
  const { data, error } = await supabase.storage.from(HIBRIDO_BUCKET).createSignedUrl(input.path, 120);
  if (error || !data?.signedUrl) {
    return { ok: false, erro: { code: "network", message: error?.message ?? "URL assinada indisponível." } };
  }
  const resp = await fetch(data.signedUrl);
  if (!resp.ok) {
    return { ok: false, erro: { code: "network", message: `Falha ao baixar Storage (${resp.status})` } };
  }
  return { ok: true, blob: await resp.blob() };
}

export function dispararDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
