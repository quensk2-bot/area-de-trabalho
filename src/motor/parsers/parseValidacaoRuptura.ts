import XLSX from "xlsx";
import {
  VALIDACAO_COL_ITEM,
  VALIDACAO_COL_LOJA,
  VALIDACAO_COL_RUPTURA,
  VALIDACAO_COL_RUPTURA_MIX,
  VALIDACAO_SHEET_NAME,
} from "../constants/headers.ts";
import type { MotorResultadoParser } from "../types/motorTypes.ts";
import type { MotorLinhaValidacao } from "../types/motorLinhaTypes.ts";
import { criarMetricas } from "../utils/progress.ts";
import { parseNumeroFlexivel } from "../transform/parseNumbers.ts";

type XlsxRow = Record<string, unknown>;

function pickNumero(row: XlsxRow, col: string): number | null {
  const raw = row[col];
  if (raw == null) return null;
  return parseNumeroFlexivel(String(raw));
}

function mapValidacao(numeroLinha: number, row: XlsxRow): MotorLinhaValidacao {
  const qtdMix = pickNumero(row, VALIDACAO_COL_RUPTURA_MIX);
  const qtdRuptura = pickNumero(row, VALIDACAO_COL_RUPTURA);

  return {
    numeroLinha,
    loja: pickNumero(row, VALIDACAO_COL_LOJA),
    produto: pickNumero(row, VALIDACAO_COL_ITEM),
    qtdItemRupturaNoMix: qtdMix,
    qtdItemRuptura: qtdRuptura,
    geraRuptura: qtdMix === 1,
    ruptura104c: qtdRuptura === 1,
  };
}

export async function parseValidacaoRuptura(
  filePath: string,
  limiteLinhas?: number,
): Promise<MotorResultadoParser<MotorLinhaValidacao>> {
  const inicio = Date.now();
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.includes(VALIDACAO_SHEET_NAME)
    ? VALIDACAO_SHEET_NAME
    : workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<XlsxRow>(sheet, { defval: null });

  const cabecalhos = rows.length > 0 ? Object.keys(rows[0]) : [];
  const colunasObrigatorias = [
    VALIDACAO_COL_LOJA,
    VALIDACAO_COL_ITEM,
    VALIDACAO_COL_RUPTURA_MIX,
    VALIDACAO_COL_RUPTURA,
  ];

  const erros = colunasObrigatorias
    .filter((col) => !cabecalhos.includes(col))
    .map((col) => ({
      numeroLinha: 1,
      campo: col,
      valorOriginal: null,
      codigoErro: "CABECALHO_COLUNA_AUSENTE",
      mensagem: `Coluna obrigatória ausente: ${col}`,
      severidade: "critico" as const,
    }));

  const limite = limiteLinhas ?? rows.length;
  const linhas: MotorLinhaValidacao[] = [];

  for (let i = 0; i < Math.min(limite, rows.length); i++) {
    linhas.push(mapValidacao(i + 2, rows[i]));
  }

  return {
    tipo: "validacao_ruptura",
    cabecalhoOk: erros.length === 0,
    cabecalhos,
    linhas,
    erros,
    metricas: criarMetricas(inicio, linhas.length, linhas.length, 0),
  };
}
