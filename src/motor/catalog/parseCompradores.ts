import XLSX from "xlsx";
import type {
  CatalogoComprador,
  CatalogoCompradorConflito,
  CatalogoLoadResult,
  CatalogoRedeFornecedor,
} from "./catalogTypes.ts";
import { deduplicar } from "./catalogUtils.ts";

type SheetRow = Record<string, unknown>;

function chaveComprador(c: { rede: string; secao: string; nivel2: string; nivel3: string }): string {
  return `${c.rede}|${c.secao}|${c.nivel2}|${c.nivel3}`;
}

function texto(row: SheetRow, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = row[chave];
    if (valor != null && String(valor).trim() !== "") return String(valor).trim();
  }
  return "";
}

function parseCompradoresPrincipal(
  rows: SheetRow[],
  redeFornecedores: readonly CatalogoRedeFornecedor[],
): CatalogoComprador[] {
  const redePorFornecedor = new Map(redeFornecedores.map((item) => [item.seqPessoa, item]));
  return rows
    .map((r) => {
      const codFornecedor = Number(texto(r, "CODFORNEC"));
      const cadastroRede = Number.isFinite(codFornecedor) ? redePorFornecedor.get(codFornecedor) : undefined;
      const rede =
        texto(r, "REDE") ||
        cadastroRede?.nomeRede?.trim() ||
        texto(r, "RAZÃO", "RAZAO") ||
        cadastroRede?.razao?.trim() ||
        "";
      return {
        rede,
        secao: texto(r, "SEÇÃO", "SECAO"),
        nivel2: texto(r, "NIVEL 2"),
        nivel3: texto(r, "NIVEL 3"),
        comprador: texto(r, "COMPRADOR"),
        origem: "principal" as const,
      };
    })
    .filter((c) => c.rede !== "" && c.comprador !== "");
}

function parseCompradoresCorrecao(rows: SheetRow[]): CatalogoComprador[] {
  return rows
    .map((r) => ({
      rede: texto(r, "Rede", "REDE"),
      secao: texto(r, "SETOR", "SEÇÃO", "SECAO"),
      nivel2: texto(r, "SETOR2", "NIVEL 2"),
      nivel3: texto(r, "CATEGORIA", "NIVEL 3"),
      comprador: texto(r, "COMPRADOR"),
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

export function parseCompradores(
  filePath: string,
  redeFornecedores: readonly CatalogoRedeFornecedor[] = [],
): CatalogoLoadResult<CatalogoComprador> & {
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

  const merged = mergeCompradores(
    parseCompradoresPrincipal(principalRows, redeFornecedores),
    parseCompradoresCorrecao(correcaoRows),
  );
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
): {
  comprador: string | null;
  origemComprador: "hierarquia_exata" | "correcao_exata" | "rede_unica" | null;
  chaveComprador: string;
  fallbackComprador: boolean;
  alertas: string[];
} {
  const hierarquiaCompleta = Boolean(secao && nivel2 && nivel3);
  const chaveHierarquia = `${rede}|${secao ?? ""}|${nivel2 ?? ""}|${nivel3 ?? ""}`;
  const found = hierarquiaCompleta
    ? catalogo.find(
        (c) => c.rede === rede && c.secao === secao && c.nivel2 === nivel2 && c.nivel3 === nivel3,
      )
    : undefined;

  if (found) {
    return {
      comprador: found.comprador,
      origemComprador: found.origem === "correcao" ? "correcao_exata" : "hierarquia_exata",
      chaveComprador: chaveHierarquia,
      fallbackComprador: false,
      alertas: [],
    };
  }

  const motivo = hierarquiaCompleta
    ? "Comprador não encontrado para hierarquia informada"
    : "Hierarquia incompleta para resolução de comprador";
  return {
    comprador: null,
    origemComprador: null,
    chaveComprador: chaveHierarquia,
    fallbackComprador: false,
    alertas: [motivo],
  };
}
