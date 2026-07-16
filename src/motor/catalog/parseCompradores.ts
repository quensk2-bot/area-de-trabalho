import XLSX from "xlsx";
import type { CatalogoComprador, CatalogoCompradorConflito, CatalogoLoadResult } from "./catalogTypes.ts";
import { deduplicar } from "./catalogUtils.ts";

type SheetRow = Record<string, unknown>;

function chaveComprador(c: { rede: string; secao: string; nivel2: string; nivel3: string }): string {
  return `${c.rede}|${c.secao}|${c.nivel2}|${c.nivel3}`;
}

function parseCompradoresPrincipal(rows: SheetRow[]): CatalogoComprador[] {
  return rows
    .map((r) => ({
      rede: String(r.REDE ?? "").trim(),
      secao: String(r["SEÇÃO"] ?? r.SECAO ?? "").trim(),
      nivel2: String(r["NIVEL 2"] ?? "").trim(),
      nivel3: String(r["NIVEL 3"] ?? "").trim(),
      comprador: String(r.COMPRADOR ?? "").trim(),
      origem: "principal" as const,
    }))
    .filter((c) => c.rede !== "" && c.comprador !== "");
}

function parseCompradoresCorrecao(rows: SheetRow[]): CatalogoComprador[] {
  return rows
    .map((r) => ({
      rede: String(r.Rede ?? r.REDE ?? "").trim(),
      secao: String(r.SETOR ?? r["SEÇÃO"] ?? "").trim(),
      nivel2: String(r.SETOR2 ?? r["NIVEL 2"] ?? "").trim(),
      nivel3: String(r.CATEGORIA ?? r["NIVEL 3"] ?? "").trim(),
      comprador: String(r.COMPRADOR ?? "").trim(),
      origem: "correcao" as const,
    }))
    .filter((c) => c.rede !== "" && c.comprador !== "");
}

export function mergeCompradores(
  principal: CatalogoComprador[],
  correcao: CatalogoComprador[],
): { itens: CatalogoComprador[]; conflitos: CatalogoCompradorConflito[]; alertas: string[] } {
  const mapaPrincipal = new Map<string, CatalogoComprador>();
  const mapaCorrecao = new Map<string, CatalogoComprador>();
  const conflitos: CatalogoCompradorConflito[] = [];
  const alertas: string[] = [];

  for (const c of principal) mapaPrincipal.set(chaveComprador(c), c);
  for (const c of correcao) mapaCorrecao.set(chaveComprador(c), c);

  const chaves = new Set([...mapaPrincipal.keys(), ...mapaCorrecao.keys()]);
  const itens: CatalogoComprador[] = [];

  for (const chave of chaves) {
    const p = mapaPrincipal.get(chave);
    const k = mapaCorrecao.get(chave);

    if (p && k && p.comprador !== k.comprador) {
      conflitos.push({
        chave,
        rede: p.rede,
        secao: p.secao,
        nivel2: p.nivel2,
        nivel3: p.nivel3,
        compradorPrincipal: p.comprador,
        compradorCorrecao: k.comprador,
      });
      alertas.push(`Conflito comprador ${chave}: principal="${p.comprador}" vs correcao="${k.comprador}" — correção prevalece`);
      itens.push(k);
    } else if (k) {
      itens.push(k);
    } else if (p) {
      itens.push(p);
    }
  }

  return { itens, conflitos, alertas };
}

export function parseCompradores(filePath: string): CatalogoLoadResult<CatalogoComprador> & {
  conflitos: CatalogoCompradorConflito[];
} {
  const workbook = XLSX.readFile(filePath);
  const principalSheet = ["Compradores", "COMPRADORES"].find((n) => workbook.SheetNames.includes(n));
  const correcaoSheet = ["Compradores Rede", "CORRECAO", "Correção"].find((n) => workbook.SheetNames.includes(n));

  const principalRows = principalSheet
    ? XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[principalSheet], { defval: null })
    : [];
  const correcaoRows = correcaoSheet
    ? XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[correcaoSheet], { defval: null })
    : [];

  const merged = mergeCompradores(parseCompradoresPrincipal(principalRows), parseCompradoresCorrecao(correcaoRows));
  const dedup = deduplicar(merged.itens, chaveComprador);

  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas: [...merged.alertas, ...(dedup.removidas > 0 ? [`${dedup.removidas} duplicata(s) comprador removida(s)`] : [])],
    conflitos: merged.conflitos,
  };
}

export function resolverComprador(
  catalogo: CatalogoComprador[],
  rede: string,
  secao: string | null,
  nivel2: string | null,
  nivel3: string | null,
): { comprador: string | null; alertas: string[] } {
  if (!secao || !nivel2 || !nivel3) {
    return { comprador: null, alertas: ["Hierarquia incompleta para resolução de comprador"] };
  }
  const found = catalogo.find(
    (c) => c.rede === rede && c.secao === secao && c.nivel2 === nivel2 && c.nivel3 === nivel3,
  );
  return {
    comprador: found?.comprador ?? null,
    alertas: found ? [] : ["Comprador não encontrado para hierarquia informada"],
  };
}
