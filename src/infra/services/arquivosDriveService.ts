import fs from "fs";
import { sha256Hex } from "../../ruptura/utils/hash";
import type { ArquivoDriveInsert, ModuloDrive, UploadDriveResult } from "../types/arquivosDrive";
import { createInfraDb } from "../db/infraDb";
import { loadDriveCredentials } from "../drive/driveConfig";
import {
  ensureFolderPath,
  findFileByHashInFolder,
  uploadLocalFile,
} from "../drive/driveClient";
import { buildFolderPath } from "../drive/drivePaths";

export type UploadArquivoOpts = {
  modulo: ModuloDrive;
  tipo_arquivo: string;
  filePath: string;
  regional: string;
  data_referencia: string;
  folderSegments: string[];
  criado_por?: string | null;
  skipDb?: boolean;
};

async function findDuplicateInDb(opts: UploadArquivoOpts, hash: string) {
  if (opts.skipDb) return null;
  try {
    const db = createInfraDb();
    const { data, error } = await db
      .from("arquivos_drive")
      .select("id, drive_file_id, drive_folder_id, status")
      .eq("modulo", opts.modulo)
      .eq("tipo_arquivo", opts.tipo_arquivo)
      .eq("hash_sha256", hash)
      .eq("regional", opts.regional)
      .eq("data_referencia", opts.data_referencia)
      .maybeSingle();
    if (error) {
      if (error.message?.includes("schema cache") || error.code === "PGRST205" || error.code === "42P01") {
        return null;
      }
      throw error;
    }
    return data;
  } catch {
    return null;
  }
}

async function insertMetadata(row: ArquivoDriveInsert): Promise<string | undefined> {
  try {
    const db = createInfraDb();
    const { data, error } = await db.from("arquivos_drive").insert(row).select("id").single();
    if (error) {
      if (error.code === "23505") return undefined;
      if (error.message?.includes("schema cache") || error.code === "PGRST205" || error.code === "42P01") {
        console.warn("AVISO: infra_v7.arquivos_drive indisponivel. Metadados apenas no Drive. Aplique a migration.");
        return undefined;
      }
      throw error;
    }
    return data.id as string;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("schema cache") || msg.includes("503")) {
      console.warn("AVISO: Supabase indisponivel. Metadados registrados somente no Drive.");
      return undefined;
    }
    throw e;
  }
}

export async function uploadArquivoParaDrive(opts: UploadArquivoOpts): Promise<UploadDriveResult> {
  if (!fs.existsSync(opts.filePath)) {
    throw new Error(`Arquivo nao encontrado: ${opts.filePath}`);
  }

  const creds = loadDriveCredentials();
  const buffer = fs.readFileSync(opts.filePath);
  const hash_sha256 = sha256Hex(buffer);

  const dupDb = await findDuplicateInDb(opts, hash_sha256);
  if (dupDb?.drive_file_id) {
    return {
      duplicado: true,
      drive_file_id: dupDb.drive_file_id,
      drive_folder_id: dupDb.drive_folder_id,
      hash_sha256,
      nome_original: opts.filePath.split(/[/\\]/).pop()!,
      tamanho_bytes: buffer.length,
      mime_type: "application/octet-stream",
      registro_id: dupDb.id,
      mensagem: "Arquivo ja registrado (idempotencia DB). Upload ignorado.",
    };
  }

  const folderId = await ensureFolderPath(creds, opts.folderSegments);
  const dupDrive = await findFileByHashInFolder(creds, folderId, hash_sha256);
  if (dupDrive) {
    const result: UploadDriveResult = {
      duplicado: true,
      drive_file_id: dupDrive,
      drive_folder_id: folderId,
      hash_sha256,
      nome_original: opts.filePath.split(/[/\\]/).pop()!,
      tamanho_bytes: buffer.length,
      mime_type: "application/octet-stream",
      mensagem: "Arquivo ja existe no Drive (hash). Upload ignorado.",
    };
    await insertMetadata({
      modulo: opts.modulo,
      tipo_arquivo: opts.tipo_arquivo,
      nome_original: result.nome_original,
      mime_type: result.mime_type,
      tamanho_bytes: result.tamanho_bytes,
      hash_sha256,
      drive_file_id: dupDrive,
      drive_folder_id: folderId,
      regional: opts.regional,
      data_referencia: opts.data_referencia,
      status: "duplicado",
      criado_por: opts.criado_por ?? null,
    });
    return result;
  }

  const uploaded = await uploadLocalFile(creds, {
    filePath: opts.filePath,
    folderId,
    appProperties: {
      hash_sha256,
      modulo: opts.modulo,
      tipo_arquivo: opts.tipo_arquivo,
      regional: opts.regional,
      data_referencia: opts.data_referencia,
    },
  });

  const registro_id = await insertMetadata({
    modulo: opts.modulo,
    tipo_arquivo: opts.tipo_arquivo,
    nome_original: uploaded.nome_original,
    mime_type: uploaded.mime_type,
    tamanho_bytes: uploaded.tamanho_bytes,
    hash_sha256,
    drive_file_id: uploaded.drive_file_id,
    drive_folder_id: folderId,
    regional: opts.regional,
    data_referencia: opts.data_referencia,
    status: "uploaded",
    criado_por: opts.criado_por ?? null,
  });

  return {
    duplicado: false,
    drive_file_id: uploaded.drive_file_id,
    drive_folder_id: folderId,
    hash_sha256,
    nome_original: uploaded.nome_original,
    tamanho_bytes: uploaded.tamanho_bytes,
    mime_type: uploaded.mime_type,
    registro_id,
    mensagem: `Upload concluido em ${buildFolderPath(opts.folderSegments)}`,
  };
}
