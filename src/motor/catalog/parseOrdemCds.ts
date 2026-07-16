import XLSX from "xlsx";
import fs from "fs";
import type {
  CatalogoBandeiraLoja,
  CatalogoLoadResult,
  CatalogoModalidadeLoja,
  CatalogoOrdemCd,
  CatalogoSequenciaCd,
} from "./catalogTypes.ts";
import { deduplicar, parseNumero, parseTxtSemicolon, readTxtWin1252 } from "./catalogUtils.ts";

type SheetRow = Record<string, unknown>;

function readSheet(filePath: string, sheetNames: string[]): SheetRow[] {
  const workbook = XLSX.readFile(filePath);
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) return XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null });
  }
  return [];
}

export function parseBandeiraFromXlsx(filePath: string): CatalogoLoadResult<CatalogoBandeiraLoja> {
  const rows = readSheet(filePath, ["Bandeira", "BANDEIRA_LOJA"]);
  const itens = rows
    .map((r) => ({
      loja: Number(r.LOJA),
      bandeira: String(r.BANDEIRA ?? "").trim(),
      tipoLoja: r["TIPO LOJA"] != null ? String(r["TIPO LOJA"]).trim() : null,
    }))
    .filter((i) => Number.isFinite(i.loja) && i.bandeira !== "");

  const dedup = deduplicar(itens, (i) => String(i.loja));
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [],
  };
}

export function parseBandeiraFromCsv(filePath: string): CatalogoLoadResult<CatalogoBandeiraLoja> {
  const content = readTxtWin1252(filePath).replace(/;/g, ";");
  const { headers, rows } = parseTxtSemicolon(content);
  const lojaIdx = headers.indexOf("LOJA");
  const bandeiraIdx = headers.indexOf("BANDEIRA");
  const tipoIdx = headers.indexOf("TIPO LOJA");

  const itens = rows
    .map((row) => ({
      loja: parseNumero(row[lojaIdx]) ?? 0,
      bandeira: row[bandeiraIdx]?.trim() ?? "",
      tipoLoja: row[tipoIdx]?.trim() ?? null,
    }))
    .filter((i) => i.loja > 0 && i.bandeira !== "");

  const dedup = deduplicar(itens, (i) => String(i.loja));
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [],
  };
}

export function parseOrdemCd(filePath: string): CatalogoLoadResult<CatalogoOrdemCd> {
  const rows = readSheet(filePath, ["Ordem", "ORDEM_CDS"]);
  const itens = rows
    .map((r) => ({
      divisao: String(r.DIVISÃO ?? r.DIVISAO ?? "").trim(),
      bandeira: String(r.BANDEIRA ?? "").trim(),
      uf: r.UF != null ? String(r.UF).trim() : null,
      cd1: Number(r["1º"] ?? 0),
      cd2: Number(r["2º"] ?? 0),
      cd3: Number(r["3º"] ?? 0),
      cd4: Number(r["4º"] ?? 0),
      cd5: Number(r["5º"] ?? 0),
    }))
    .filter((i) => i.bandeira !== "");

  const dedup = deduplicar(itens, (i) => `${i.divisao}|${i.bandeira}|${i.uf ?? ""}`);
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [],
  };
}

export function parseSequenciaCd(filePath: string): CatalogoLoadResult<CatalogoSequenciaCd> {
  const rows = readSheet(filePath, ["Sequência", "Sequencia", "SEQUENCIA"]);
  const itens = rows
    .map((r) => ({
      divisao: String(r.DIVISÃO ?? r.DIVISAO ?? "").trim(),
      bandeira: String(r.BANDEIRA ?? "").trim().toUpperCase(),
      uf: r.UF != null ? String(r.UF).trim() : null,
      cd: Number(r.CD ?? 0),
      ordem: String(r.ORDEM ?? "").trim(),
    }))
    .filter((i) => i.bandeira !== "" && Number.isFinite(i.cd));

  const dedup = deduplicar(itens, (i) => `${i.divisao}|${i.bandeira}|${i.cd}|${i.ordem}`);
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [],
  };
}

export function parseModalidade(filePath: string): CatalogoLoadResult<CatalogoModalidadeLoja> {
  const rows = readSheet(filePath, ["Modalidade", "MODALIDADE"]);
  const itens = rows
    .map((r) => ({
      modalidade: String(r.Modalide ?? r.Modalidade ?? "").trim(),
      tipoLoja: String(r["Tipo Loja"] ?? "").trim(),
    }))
    .filter((i) => i.modalidade !== "" && i.tipoLoja !== "");

  const dedup = deduplicar(itens, (i) => `${i.modalidade}|${i.tipoLoja}`);
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [],
  };
}

export function fileExists(path: string): boolean {
  return fs.existsSync(path);
}
