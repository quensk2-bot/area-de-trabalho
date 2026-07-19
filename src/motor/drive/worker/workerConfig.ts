import fs from "node:fs";
import path from "node:path";

export type WorkerDriveCredentials = {
  clientEmail: string;
  privateKey: string;
  rootFolderId?: string;
};

export type WorkerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  drive: WorkerDriveCredentials;
  workerId: string;
  pollIntervalMs: number;
  maxRetries: number;
  keepFiles: boolean;
  dryRun: boolean;
  packageId: string | null;
  /** Diagnóstico: processar somente este tipo_arquivo (ex.: bandeira, rede). */
  onlyFileType: string | null;
  /** Diagnóstico: limitar quantidade de arquivos na ordem de download. */
  maxFiles: number | null;
};

export type WorkerConfigStatus = {
  supabaseUrl: "configurado" | "ausente";
  supabaseServiceRoleKey: "configurado" | "ausente";
  googleDrive: "configurado" | "ausente";
  fonteDrive: "env" | "json" | "ausente";
};

const SECRET_KEYS = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_DRIVE_PRIVATE_KEY",
  "GOOGLE_DRIVE_CLIENT_EMAIL",
  "GOOGLE_DRIVE_CREDENTIALS_JSON",
]);

export function sanitizarLogValor(chave: string, valor: unknown): string {
  if (SECRET_KEYS.has(chave) || /key|secret|token|password|private/i.test(chave)) {
    return valor ? "configurado" : "ausente";
  }
  if (typeof valor === "string" && valor.length > 80) return `${valor.slice(0, 20)}…`;
  return String(valor ?? "ausente");
}

function lerJsonCredenciais(caminho: string): WorkerDriveCredentials | null {
  if (!fs.existsSync(caminho)) return null;
  const raw = JSON.parse(fs.readFileSync(caminho, "utf8")) as Record<string, unknown>;
  const clientEmail = String(raw.client_email ?? raw.clientEmail ?? "");
  const privateKey = String(raw.private_key ?? raw.privateKey ?? "").replace(/\\n/g, "\n");
  const rootFolderId = raw.root_folder_id ?? raw.rootFolderId;
  if (!clientEmail || !privateKey) return null;
  return {
    clientEmail,
    privateKey,
    rootFolderId: rootFolderId ? String(rootFolderId) : undefined,
  };
}

export function carregarCredenciaisDrive(): { creds: WorkerDriveCredentials | null; fonte: WorkerConfigStatus["fonteDrive"] } {
  const jsonPath = process.env.GOOGLE_DRIVE_CREDENTIALS_JSON;
  if (jsonPath) {
    const resolved = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(process.cwd(), jsonPath);
    const creds = lerJsonCredenciais(resolved);
    if (creds) return { creds, fonte: "json" };
  }

  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (clientEmail && privateKey) {
    return {
      creds: { clientEmail, privateKey, rootFolderId },
      fonte: "env",
    };
  }

  return { creds: null, fonte: "ausente" };
}

export function obterStatusConfig(): WorkerConfigStatus {
  const { creds, fonte } = carregarCredenciaisDrive();
  return {
    supabaseUrl: process.env.SUPABASE_URL ? "configurado" : "ausente",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configurado" : "ausente",
    googleDrive: creds ? "configurado" : "ausente",
    fonteDrive: fonte,
  };
}

export function carregarWorkerConfig(overrides: Partial<WorkerConfig> = {}): WorkerConfig {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para o Worker.");
  }

  const { creds } = carregarCredenciaisDrive();
  if (!creds) {
    throw new Error(
      "Credenciais Google Drive ausentes. Configure GOOGLE_DRIVE_CLIENT_EMAIL + GOOGLE_DRIVE_PRIVATE_KEY ou GOOGLE_DRIVE_CREDENTIALS_JSON.",
    );
  }

  const hostname = process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? "worker";
  const defaultWorkerId = `drive-worker-${hostname}-${process.pid}`;

  return {
    supabaseUrl: url,
    supabaseServiceRoleKey: key,
    drive: creds,
    workerId: overrides.workerId ?? defaultWorkerId,
    pollIntervalMs: overrides.pollIntervalMs ?? 10_000,
    maxRetries: overrides.maxRetries ?? 3,
    keepFiles: overrides.keepFiles ?? false,
    dryRun: overrides.dryRun ?? false,
    packageId: overrides.packageId ?? null,
    onlyFileType: overrides.onlyFileType ?? null,
    maxFiles: overrides.maxFiles ?? null,
  };
}

export function isWorkerConfigCompleto(): boolean {
  const s = obterStatusConfig();
  return s.supabaseUrl === "configurado" && s.supabaseServiceRoleKey === "configurado" && s.googleDrive === "configurado";
}
