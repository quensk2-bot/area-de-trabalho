import "dotenv/config";
import { importarPacoteRuptura } from "./services/rupturaImportService";

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

importarPacoteRuptura({
  regional: arg("--regional") ?? "MT",
  bandeira: arg("--bandeira") ?? "COMPER",
  dataReferencia: arg("--data") ?? new Date().toISOString().slice(0, 10),
  paths: {
    grupo_ruptura_1: arg("--grupo1"),
    grupo_cds_2: arg("--grupo2"),
    validacao_ruptura: arg("--validacao"),
    inventario_lojas: arg("--inventario"),
  },
})
  .then((r) => { console.log("OK", JSON.stringify(r, null, 2)); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
