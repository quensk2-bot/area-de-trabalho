import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import {
  VALIDACAO_COL_ITEM,
  VALIDACAO_COL_LOJA,
  VALIDACAO_COL_RUPTURA,
  VALIDACAO_COL_RUPTURA_MIX,
  VALIDACAO_SHEET_NAME,
} from "../../constants/headers.ts";

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.join(FIXTURES_DIR, "validacao_ruptura_sample.xlsx");

export function ensureValidacaoXlsxFixture(): string {
  if (!fs.existsSync(XLSX_PATH)) {
    const rows = [
      {
        [VALIDACAO_COL_LOJA]: 103,
        [VALIDACAO_COL_ITEM]: 2505088,
        [VALIDACAO_COL_RUPTURA_MIX]: 1,
        [VALIDACAO_COL_RUPTURA]: 0,
      },
      {
        [VALIDACAO_COL_LOJA]: 104,
        [VALIDACAO_COL_ITEM]: 2451050,
        [VALIDACAO_COL_RUPTURA_MIX]: 0,
        [VALIDACAO_COL_RUPTURA]: 1,
      },
      {
        [VALIDACAO_COL_LOJA]: 105,
        [VALIDACAO_COL_ITEM]: 2051915,
        [VALIDACAO_COL_RUPTURA_MIX]: 0,
        [VALIDACAO_COL_RUPTURA]: 0,
      },
    ];
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, VALIDACAO_SHEET_NAME);
    XLSX.writeFile(workbook, XLSX_PATH);
  }
  return XLSX_PATH;
}

export function fixturePath(name: string): string {
  return path.join(FIXTURES_DIR, name);
}
