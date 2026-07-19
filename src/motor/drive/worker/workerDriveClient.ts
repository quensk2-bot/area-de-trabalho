import { google } from "googleapis";
import type { WorkerDriveCredentials } from "./workerConfig.ts";

const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export function criarDriveClient(creds: WorkerDriveCredentials) {
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [DRIVE_READONLY_SCOPE],
  });
  return google.drive({ version: "v3", auth });
}

export type DriveDownloadStream = {
  stream: NodeJS.ReadableStream;
  mimeType?: string | null;
};

export async function abrirDownloadStream(
  drive: ReturnType<typeof criarDriveClient>,
  fileId: string,
): Promise<DriveDownloadStream> {
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );
  return { stream: res.data as NodeJS.ReadableStream };
}
