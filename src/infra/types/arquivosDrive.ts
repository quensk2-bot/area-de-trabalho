export type ModuloDrive = "ruptura" | "recebimento" | "ponta_extra" | "backups";

export type StatusArquivoDrive =
  | "uploaded"
  | "duplicado"
  | "processando"
  | "processado"
  | "erro";

export type ArquivoDriveInsert = {
  modulo: ModuloDrive;
  tipo_arquivo: string;
  nome_original: string;
  mime_type: string | null;
  tamanho_bytes: number;
  hash_sha256: string;
  drive_file_id: string;
  drive_folder_id: string;
  regional: string;
  data_referencia: string;
  status: StatusArquivoDrive;
  erro?: string | null;
  criado_por?: string | null;
};

export type UploadDriveResult = {
  duplicado: boolean;
  drive_file_id: string;
  drive_folder_id: string;
  hash_sha256: string;
  nome_original: string;
  tamanho_bytes: number;
  mime_type: string;
  registro_id?: string;
  mensagem?: string;
};
