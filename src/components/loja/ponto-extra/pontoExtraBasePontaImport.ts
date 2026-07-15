import { normalizeCodigoProduto, normalizeLojaKey, TIPO_PONTA_PADRAO } from "./pontoExtraSharedUtils";

/** Cabeçalhos normalizados (normalizeHeader) para Nº PONTA EQF e equivalentes. */
export const PONTA_EQF_HEADER_KEYS = [
  "NO_PONTA_EQF",
  "N_PONTA_EQF",
  "NUMERO_PONTA_EQF",
  "PONTA_EQF",
  "SEQPONTOEXTRA",
] as const;

const COD_HEADER_KEYS = ["COD", "CODIGO", "CODIGOS", "CODIGOS_PRODUTOS"];
const LOJA_HEADER_KEYS = ["LOJA", "MAPEAMENTO", "LOJA_FISCAL", "CODIGO_LOJA"];
const SECAO_HEADER_KEYS = ["SECAO", "SETOR", "DEPARTAMENTO"];

export type BasePontaLinhaErro = {
  linha: number;
  mensagem: string;
};

export type BasePontaImportResumo = {
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  codigosEncontrados: number;
  codigosUnicos: number;
  duplicidadesRemovidas: number;
  lojas: number;
  pontas: number;
  errosPorLinha: BasePontaLinhaErro[];
};

export type BasePontaBaseRow = {
  loja: string;
  numeroPontaEqf: number;
  quantidade: number;
  tipo_ponta: string;
  secao: string;
  categoria: string;
  codigos_raw: string;
  linhasOrigem: number[];
};

export type BasePontaProdutoRow = {
  loja: string;
  numero_ponta: number;
  quantidade: number;
  tipo_ponta: string;
  secao: string;
  categoria: string;
  codigo_produto: string;
};

export type BasePontaParseResult = {
  resumo: BasePontaImportResumo;
  baseRows: BasePontaBaseRow[];
  produtoRows: BasePontaProdutoRow[];
  podeGravar: boolean;
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function getRowValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}

function parseLoja(value: unknown): string | null {
  const loja = normalizeLojaKey(value);
  if (!loja) return null;
  const num = Number(loja);
  if (!Number.isFinite(num) || num <= 0) return null;
  return String(Math.trunc(num));
}

function parseNumeroPontaEqf(row: Record<string, unknown>, headers: Set<string>): number | null {
  const hasPontaEqfCol = PONTA_EQF_HEADER_KEYS.some((key) => headers.has(key));
  if (hasPontaEqfCol) {
    const raw = getRowValue(row, [...PONTA_EQF_HEADER_KEYS]);
    const text = String(raw ?? "").trim();
    if (!text) return null;
    const num = Number(text.replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) return null;
    return Math.trunc(num);
  }
  return null;
}

/** Aceita separadores: espaço, vírgula, ;, /, tab, quebra de linha. Somente códigos numéricos. */
export function parseCodigosComercial(raw: unknown): { codigos: string[]; duplicidadesNaCelula: number } {
  const partes = String(raw ?? "")
    .split(/[\n\r\t\s/,;/]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const vistos = new Set<string>();
  const codigos: string[] = [];
  let duplicidadesNaCelula = 0;

  for (const parte of partes) {
    const codigo = normalizeCodigoProduto(parte);
    if (!codigo || !/^\d+$/.test(codigo)) continue;
    if (vistos.has(codigo)) {
      duplicidadesNaCelula += 1;
      continue;
    }
    vistos.add(codigo);
    codigos.push(codigo);
  }

  return { codigos, duplicidadesNaCelula };
}

export function buildBasePontaRowsFromMatrix(matrix: unknown[][]): Record<string, unknown>[] {
  const headerIndex = matrix.findIndex((line) => {
    const headers = line.map(normalizeHeader);
    const set = new Set(headers);
    const temLoja = LOJA_HEADER_KEYS.some((k) => set.has(k));
    const temCod = COD_HEADER_KEYS.some((k) => set.has(k));
    const temPonta = PONTA_EQF_HEADER_KEYS.some((k) => set.has(k));
    return temLoja && (temCod || temPonta);
  });

  if (headerIndex < 0) return [];

  const headers = (matrix[headerIndex] ?? []).map(normalizeHeader);
  return matrix
    .slice(headerIndex + 1)
    .map((line) => {
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (header) row[header] = line[index] ?? "";
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

export function parseBasePontaComercial(rows: Record<string, unknown>[]): BasePontaParseResult {
  const errosPorLinha: BasePontaLinhaErro[] = [];
  const headerSet = new Set(Object.keys(rows[0] ?? {}));
  const hasPontaEqfColumn = PONTA_EQF_HEADER_KEYS.some((key) => headerSet.has(key));

  if (!hasPontaEqfColumn) {
    return {
      resumo: {
        linhasLidas: rows.length,
        linhasValidas: 0,
        linhasInvalidas: rows.length,
        codigosEncontrados: 0,
        codigosUnicos: 0,
        duplicidadesRemovidas: 0,
        lojas: 0,
        pontas: 0,
        errosPorLinha: [{ linha: 1, mensagem: "Arquivo sem coluna Nº PONTA EQF (ou equivalente)." }],
      },
      baseRows: [],
      produtoRows: [],
      podeGravar: false,
    };
  }

  let linhasValidas = 0;
  let linhasInvalidas = 0;
  let codigosEncontrados = 0;
  let duplicidadesRemovidas = 0;

  const baseMap = new Map<string, BasePontaBaseRow>();
  const produtoMap = new Map<string, BasePontaProdutoRow>();

  rows.forEach((row, index) => {
    const linha = index + 2;
    const loja = parseLoja(getRowValue(row, LOJA_HEADER_KEYS));
    const numeroPonta = parseNumeroPontaEqf(row, headerSet);
    const codRaw = getRowValue(row, COD_HEADER_KEYS);
    const { codigos, duplicidadesNaCelula } = parseCodigosComercial(codRaw);
    duplicidadesRemovidas += duplicidadesNaCelula;

    const erros: string[] = [];
    if (!loja) erros.push("LOJA invalida ou ausente");
    if (numeroPonta == null) erros.push("Nº PONTA EQF invalido ou ausente");
    if (codigos.length === 0) erros.push("COD sem codigo numerico valido");

    if (erros.length > 0) {
      linhasInvalidas += 1;
      errosPorLinha.push({ linha, mensagem: erros.join("; ") });
      return;
    }

    linhasValidas += 1;
    codigosEncontrados += codigos.length;

    const secaoAux = String(getRowValue(row, SECAO_HEADER_KEYS)).trim().toUpperCase();
    const baseKey = `${loja}|${numeroPonta}`;
    const existente = baseMap.get(baseKey);
    if (existente) {
      existente.linhasOrigem.push(linha);
      const merged = new Set([
        ...parseCodigosComercial(existente.codigos_raw).codigos,
        ...codigos,
      ]);
      existente.codigos_raw = [...merged].join(" ");
      if (secaoAux && !existente.secao) existente.secao = secaoAux;
    } else {
      baseMap.set(baseKey, {
        loja: loja!,
        numeroPontaEqf: numeroPonta!,
        quantidade: numeroPonta!,
        tipo_ponta: TIPO_PONTA_PADRAO,
        secao: secaoAux,
        categoria: "",
        codigos_raw: codigos.join(" "),
        linhasOrigem: [linha],
      });
    }

    for (const codigo of codigos) {
      const prodKey = `${loja}|${numeroPonta}|${codigo}`;
      if (produtoMap.has(prodKey)) {
        duplicidadesRemovidas += 1;
        continue;
      }
      produtoMap.set(prodKey, {
        loja: loja!,
        numero_ponta: numeroPonta!,
        quantidade: numeroPonta!,
        tipo_ponta: TIPO_PONTA_PADRAO,
        secao: secaoAux,
        categoria: "",
        codigo_produto: codigo,
      });
    }
  });

  const baseRows = Array.from(baseMap.values());
  const produtoRows = Array.from(produtoMap.values());
  const lojas = new Set(produtoRows.map((p) => p.loja)).size;
  const pontas = baseRows.length;

  return {
    resumo: {
      linhasLidas: rows.length,
      linhasValidas,
      linhasInvalidas,
      codigosEncontrados,
      codigosUnicos: produtoRows.length,
      duplicidadesRemovidas,
      lojas,
      pontas,
      errosPorLinha,
    },
    baseRows,
    produtoRows,
    podeGravar: linhasValidas > 0 && produtoRows.length > 0,
  };
}

export function formatResumoBasePonta(resumo: BasePontaImportResumo) {
  return [
    `Linhas lidas: ${resumo.linhasLidas}`,
    `Validas: ${resumo.linhasValidas} | Invalidas: ${resumo.linhasInvalidas}`,
    `Codigos encontrados: ${resumo.codigosEncontrados} | Unicos: ${resumo.codigosUnicos}`,
    `Duplicidades removidas: ${resumo.duplicidadesRemovidas}`,
    `Lojas: ${resumo.lojas} | Pontas: ${resumo.pontas}`,
  ].join("\n");
}
