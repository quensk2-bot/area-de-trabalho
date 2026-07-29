import fs from "fs";
import path from "path";
import { google } from "googleapis";
import type { DriveCredentials } from "./driveConfig";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export type DriveFileMetadata = {
  hash_sha256: string;
  modulo: string;
  tipo_arquivo: string;
  regional: string;
  data_referencia: string;
};

function driveClient(creds: DriveCredentials) {
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [DRIVE_SCOPE],
  });
  return google.drive({ version: "v3", auth });
}

async function findChildFolder(
  drive: ReturnType<typeof driveClient>,
  parentId: string,
  name: string
): Promise<string | null> {
  const q = [
    `'${parentId}' in parents`,
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return res.data.files?.[0]?.id ?? null;
}

async function createFolder(
  drive: ReturnType<typeof driveClient>,
  parentId: string,
  name: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  const id = res.data.id;
  if (!id) throw new Error(`Falha ao criar pasta: ${name}`);
  return id;
}

export async function ensureFolderPath(
  creds: DriveCredentials,
  segments: string[]
): Promise<string> {
  const drive = driveClient(creds);
  let currentId = creds.rootFolderId;

  for (const segment of segments) {
    const existing = await findChildFolder(drive, currentId, segment);
    currentId = existing ?? (await createFolder(drive, currentId, segment));
  }

  return currentId;
}

export async function findFileByHashInFolder(
  creds: DriveCredentials,
  folderId: string,
  hash: string
): Promise<string | null> {
  const drive = driveClient(creds);
  const q = [
    `'${folderId}' in parents`,
    `appProperties has { key='hash_sha256' and value='${hash}' }`,
    "trashed = false",
  ].join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return res.data.files?.[0]?.id ?? null;
}

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt" || ext === ".csv") return "text/plain";
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

export async function uploadLocalFile(
  creds: DriveCredentials,
  opts: {
    filePath: string;
    folderId: string;
    appProperties: DriveFileMetadata;
  }
): Promise<{ drive_file_id: string; mime_type: string; tamanho_bytes: number; nome_original: string }> {
  const drive = driveClient(creds);
  const nome_original = path.basename(opts.filePath);
  const mime_type = guessMimeType(opts.filePath);
  const tamanho_bytes = fs.statSync(opts.filePath).size;

  const res = await drive.files.create({
    requestBody: {
      name: nome_original,
      parents: [opts.folderId],
      appProperties: opts.appProperties,
    },
    media: {
      mimeType: mime_type,
      body: fs.createReadStream(opts.filePath),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const drive_file_id = res.data.id;
  if (!drive_file_id) throw new Error(`Upload falhou para ${nome_original}`);

  return { drive_file_id, mime_type, tamanho_bytes, nome_original };
}
