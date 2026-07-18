import type { MotorCdConfiguracaoVigente } from "../cdNormalization/cdNormalizationTypes.ts";
import type { MotorCdComparacaoItem } from "./motorCdComparacaoTypes.ts";

export type MotorColunaExcelCdDetectada = {
  coluna: string;
  campo: "estoque" | "pendencia" | "statusCompra" | "diasCompra" | "diasRecebimento";
  posicaoLogica: number | null;
  codigoFisico: number | null;
  tipoCabecalho: "logico" | "fisico" | "misto" | "nao_reconhecido";
};

const RE_LOGICO = /^(ESTQ|PENDCD|STATUS_COMPRA|DIAS_DA_COMPRA|DIAS_RECEBTO)_CD(\d+)$/i;
const RE_FISICO = /^(ESTQ|PENDCD|STATUS_COMPRA|DIAS_DA_COMPRA|DIAS_RECEBTO)[_\s(]*(\d{2,4})[\)]?$/i;
const RE_MISTO = /^(ESTQ|PENDCD|STATUS_COMPRA|DIAS_DA_COMPRA|DIAS_RECEBTO)_CD(\d+)_(\d{2,4})$/i;

const CAMPO_POR_PREFIXO: Record<string, MotorColunaExcelCdDetectada["campo"]> = {
  ESTQ: "estoque",
  PENDCD: "pendencia",
  STATUS_COMPRA: "statusCompra",
  DIAS_DA_COMPRA: "diasCompra",
  DIAS_RECEBTO: "diasRecebimento",
};

function parseNumero(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : Number(String(val).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseTexto(val: unknown): string | null {
  if (val == null || val === "") return null;
  return String(val).trim();
}

export function detectarColunasCdsExcel(headers: readonly string[]): MotorColunaExcelCdDetectada[] {
  const detectadas: MotorColunaExcelCdDetectada[] = [];

  for (const coluna of headers) {
    const t = coluna.trim();
    const misto = RE_MISTO.exec(t);
    if (misto) {
      const prefixo = misto[1].toUpperCase();
      detectadas.push({
        coluna: t,
        campo: CAMPO_POR_PREFIXO[prefixo] ?? "estoque",
        posicaoLogica: Number(misto[2]),
        codigoFisico: Number(misto[3]),
        tipoCabecalho: "misto",
      });
      continue;
    }

    const logico = RE_LOGICO.exec(t);
    if (logico) {
      const prefixo = logico[1].toUpperCase();
      detectadas.push({
        coluna: t,
        campo: CAMPO_POR_PREFIXO[prefixo] ?? "estoque",
        posicaoLogica: Number(logico[2]),
        codigoFisico: null,
        tipoCabecalho: "logico",
      });
      continue;
    }

    const fisico = RE_FISICO.exec(t.replace(/\s+/g, "_"));
    if (fisico) {
      const prefixo = fisico[1].toUpperCase();
      detectadas.push({
        coluna: t,
        campo: CAMPO_POR_PREFIXO[prefixo] ?? "estoque",
        posicaoLogica: null,
        codigoFisico: Number(fisico[2]),
        tipoCabecalho: "fisico",
      });
      continue;
    }

    if (/^ESTQ|^PENDCD|^STATUS_COMPRA|^DIAS_/i.test(t)) {
      detectadas.push({
        coluna: t,
        campo: "estoque",
        posicaoLogica: null,
        codigoFisico: null,
        tipoCabecalho: "nao_reconhecido",
      });
    }
  }

  return detectadas;
}

export function resolverPosicaoLogicaColuna(
  col: MotorColunaExcelCdDetectada,
  config: MotorCdConfiguracaoVigente,
): { posicaoLogica: number | null; alertas: string[] } {
  const alertas: string[] = [];
  if (col.posicaoLogica != null) return { posicaoLogica: col.posicaoLogica, alertas };

  if (col.codigoFisico != null) {
    const pos = config.porCodigoNumerico.get(col.codigoFisico) ?? null;
    if (pos == null) {
      alertas.push("cadastro_ausente");
      return { posicaoLogica: null, alertas };
    }
    return { posicaoLogica: pos, alertas };
  }

  alertas.push("coluna_nao_reconhecida");
  return { posicaoLogica: null, alertas };
}

export function normalizarLinhaExcelCds(
  linha: Record<string, unknown>,
  colunas: readonly MotorColunaExcelCdDetectada[],
  config: MotorCdConfiguracaoVigente,
): MotorCdComparacaoItem[] {
  const porPosicao = new Map<number, MotorCdComparacaoItem>();

  for (const col of colunas) {
    const valor = linha[col.coluna];
    const { posicaoLogica, alertas: alertasCol } = resolverPosicaoLogicaColuna(col, config);
    if (posicaoLogica == null) continue;

    const existente =
      porPosicao.get(posicaoLogica) ??
      ({
        posicaoLogica,
        codigoFisico: config.porPosicaoNumerico.get(posicaoLogica) ?? col.codigoFisico,
        estoque: null,
        pendencia: null,
        statusCompra: null,
        diasCompra: null,
        diasRecebimento: null,
        flagCentralizacao: null,
        origem: "excel" as const,
        alertas: [...alertasCol],
      } satisfies MotorCdComparacaoItem);

    switch (col.campo) {
      case "estoque":
        existente.estoque = parseNumero(valor);
        break;
      case "pendencia":
        existente.pendencia = parseNumero(valor);
        break;
      case "statusCompra":
        existente.statusCompra = parseTexto(valor);
        break;
      case "diasCompra":
        existente.diasCompra = parseNumero(valor);
        break;
      case "diasRecebimento":
        existente.diasRecebimento = parseNumero(valor);
        break;
    }

    porPosicao.set(posicaoLogica, existente);
  }

  return [...porPosicao.values()].sort((a, b) => a.posicaoLogica - b.posicaoLogica);
}

export function normalizarExcelCdsDeLinha(
  linha: Record<string, unknown>,
  headers: readonly string[],
  config: MotorCdConfiguracaoVigente,
): MotorCdComparacaoItem[] {
  const colunas = detectarColunasCdsExcel(headers);
  return normalizarLinhaExcelCds(linha, colunas, config);
}

export function maxPosicaoDetectadaExcel(headers: readonly string[]): number {
  let max = 0;
  for (const col of detectarColunasCdsExcel(headers)) {
    if (col.posicaoLogica != null) max = Math.max(max, col.posicaoLogica);
  }
  return max;
}
