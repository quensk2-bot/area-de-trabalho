/**
 * CLI: upload de arquivos brutos da Ruptura para Google Drive.
 * Nao importa dados para ruptura_v7 — apenas upload + metadados.
 *
 * Uso:
 *   npm run ruptura:drive-upload -- --file path --tipo grupo_ruptura_1 --regional MT --data 2026-07-14
 */
import "dotenv/config";
import { uploadArquivoParaDrive } from "../infra/services/arquivosDriveService";
import { rupturaFolderSegments } from "../infra/drive/drivePaths";

const TIPOS_VALIDOS = [
  "grupo_ruptura_1",
  "grupo_cds_2",
  "validacao_ruptura",
  "inventario_lojas",
] as const;

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const file = arg("--file");
const tipo = arg("--tipo");
const regional = arg("--regional") ?? "MT";
const data = arg("--data") ?? new Date().toISOString().slice(0, 10);

if (!file) {
  console.error("Uso: --file <caminho> --tipo <grupo_ruptura_1|grupo_cds_2|validacao_ruptura|inventario_lojas> [--regional MT] [--data YYYY-MM-DD]");
  process.exit(1);
}

if (!tipo || !TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
  console.error(`--tipo invalido. Use: ${TIPOS_VALIDOS.join(", ")}`);
  process.exit(1);
}

uploadArquivoParaDrive({
  modulo: "ruptura",
  tipo_arquivo: tipo,
  filePath: file,
  regional,
  data_referencia: data,
  folderSegments: rupturaFolderSegments(regional, data),
})
  .then((r) => {
    console.log("OK", JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    process.exit(1);
  });
