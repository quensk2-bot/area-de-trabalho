import type { MotorStandardizeAbaContrato, MotorStandardizeColunaContrato } from "./standardizeTypes.ts";
import { detectarLinhaCabecalho, linhaEstaVazia, normalizarNomeColuna } from "./workbookInspector.ts";

export type LinhaLimpa = Record<string, string | number | null>;

export type ResultadoLimpezaAba = {
  linhas: LinhaLimpa[];
  cabecalhosNormalizados: Record<string, string>;
  linhasVaziasRemovidas: number;
  colunasVaziasRemovidas: number;
  linhasRejeitadas: { numeroLinha: number; motivo: string }[];
  duplicidadesRemovidas: number;
  linhasLidas: number;
};

function todosNomesColuna(col: MotorStandardizeColunaContrato): string[] {
  return [col.nome, ...(col.aliases ?? [])].map((n) => normalizarNomeColuna(n).toLowerCase());
}

function resolverIndiceColuna(headers: string[], col: MotorStandardizeColunaContrato): number {
  const nomes = todosNomesColuna(col);
  for (let i = 0; i < headers.length; i++) {
    if (nomes.includes(normalizarNomeColuna(headers[i]).toLowerCase())) return i;
  }
  return -1;
}

function normalizarValor(
  raw: unknown,
  tipo: MotorStandardizeColunaContrato["tipo"],
): string | number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const str = String(raw).trim();

  if (tipo === "text") {
    return str;
  }
  if (tipo === "int") {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  if (tipo === "decimal") {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (tipo === "date") {
    return str;
  }
  return str;
}

function chaveDedup(linha: LinhaLimpa, campos: string[]): string {
  return campos.map((c) => String(linha[c] ?? "")).join("|");
}

export function limparAba(
  rows: unknown[][],
  contratoAba: MotorStandardizeAbaContrato,
): ResultadoLimpezaAba {
  const aliases = contratoAba.colunas.flatMap((c) => c.aliases ?? []);
  const headerIdx =
    contratoAba.cabecalhoEstrategia === "linha_1"
      ? 0
      : detectarLinhaCabecalho(
          rows,
          contratoAba.colunas.map((c) => c.nome),
          aliases,
        );

  const headerRow = rows[headerIdx] ?? [];
  const headersRaw = headerRow.map((c) => (c == null ? "" : normalizarNomeColuna(String(c))));
  const cabecalhosNormalizados: Record<string, string> = {};

  for (const col of contratoAba.colunas) {
    const idx = resolverIndiceColuna(headersRaw, col);
    if (idx >= 0) {
      cabecalhosNormalizados[col.nome] = headersRaw[idx];
    }
  }

  const linhasRejeitadas: { numeroLinha: number; motivo: string }[] = [];
  const linhasBrutas = rows.slice(headerIdx + 1);
  let linhasVaziasRemovidas = 0;
  const linhasLimpas: LinhaLimpa[] = [];

  for (let i = 0; i < linhasBrutas.length; i++) {
    const row = linhasBrutas[i];
    if (!Array.isArray(row) || linhaEstaVazia(row)) {
      linhasVaziasRemovidas++;
      continue;
    }

    const obj: LinhaLimpa = {};
    let obrigatoriaAusente = false;

    for (const col of contratoAba.colunas) {
      const idx = resolverIndiceColuna(headersRaw, col);
      const raw = idx >= 0 ? row[idx] : null;
      const valor = normalizarValor(raw, col.tipo);
      obj[col.nome] = valor;
      if (col.obrigatoria && valor == null) {
        obrigatoriaAusente = true;
      }
    }

    if (obrigatoriaAusente) {
      linhasRejeitadas.push({
        numeroLinha: headerIdx + 2 + i,
        motivo: "Coluna obrigatória ausente ou inválida",
      });
      continue;
    }

    if (contratoAba.chaveDedup.some((campo) => String(obj[campo] ?? "").includes("FILTRAR"))) {
      linhasRejeitadas.push({
        numeroLinha: headerIdx + 2 + i,
        motivo: "Linha placeholder (template Excel)",
      });
      continue;
    }

    linhasLimpas.push(obj);
  }

  const vistos = new Set<string>();
  const deduped: LinhaLimpa[] = [];
  let duplicidadesRemovidas = 0;

  for (const linha of linhasLimpas) {
    const chave = chaveDedup(linha, contratoAba.chaveDedup);
    if (vistos.has(chave)) {
      duplicidadesRemovidas++;
      continue;
    }
    vistos.add(chave);
    deduped.push(linha);
  }

  return {
    linhas: deduped,
    cabecalhosNormalizados,
    linhasVaziasRemovidas,
    colunasVaziasRemovidas: 0,
    linhasRejeitadas,
    duplicidadesRemovidas,
    linhasLidas: linhasBrutas.length,
  };
}

export function linhasParaSheet(linhas: LinhaLimpa[], colunas: string[]): Record<string, unknown>[] {
  return linhas.map((l) => {
    const row: Record<string, unknown> = {};
    for (const col of colunas) {
      row[col] = l[col] ?? null;
    }
    return row;
  });
}
