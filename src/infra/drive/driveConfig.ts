export type DriveCredentials = {
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
};

const REQUIRED = [
  "GOOGLE_DRIVE_CLIENT_EMAIL",
  "GOOGLE_DRIVE_PRIVATE_KEY",
  "GOOGLE_DRIVE_ROOT_FOLDER_ID",
] as const;

export function loadDriveCredentials(): DriveCredentials {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `Credenciais Google Drive ausentes: ${missing.join(", ")}. ` +
        "Configure no .env local ou secrets do CI. Nunca versionar o JSON da Service Account."
    );
  }

  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  return {
    clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL!.trim(),
    privateKey,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!.trim(),
  };
}
