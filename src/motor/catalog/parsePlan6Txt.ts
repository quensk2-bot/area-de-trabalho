/**
 * Parser INDEPENDENTE do Plan 6 CD.txt.
 *
 * Lê o arquivo TSV do zero e retorna um Map<CODIGO, MODALIDADECD>.
 * Não compartilha código, tipos ou estado com a implementação existente (parsePlan6Produtos).
 *
 * Uso:
 *   const mapa = parsePlan6Txt("C:/.../Plan 6 CD.txt");
 *   const modalidade = mapa.get(seqproduto) ?? "ED Direto Loja";
 */

import fs from "node:fs";
import iconv from "iconv-lite";

export type Plan6TxtEntry = {
  codigo: number;
  modalidadeCd: string;
};

export type Plan6TxtResult = {
  mapa: Map<number, string>;
  totalLinhas: number;
  modalidadesUnicas: string[];
  erros: string[];
};

/**
 * Lê o Plan 6 CD.txt e retorna um Map<CODIGO, MODALIDADECD>.
 *
 * O arquivo usa:
 * - Delimitador ponto-e-vírgula (;)
 * - Encoding Windows-1252
 * - Cabeçalho na primeira linha
 *
 * Regras:
 * - CODIGO vazio ou inválido → ignora a linha
 * - MODALIDADECD vazia → usa "ED Direto Loja"
 * - Duplicidade de CODIGO → última prevalece (com alerta)
 * - Se o arquivo não existir → retorna mapa vazio
 */
export function parsePlan6Txt(filePath: string): Plan6TxtResult {
  const resultado: Plan6TxtResult = {
    mapa: new Map(),
    totalLinhas: 0,
    modalidadesUnicas: [],
    erros: [],
  };

  if (!fs.existsSync(filePath)) {
    resultado.erros.push(`Arquivo não encontrado: ${filePath}`);
    return resultado;
  }

  let linhas: string[];
  try {
    const buf = fs.readFileSync(filePath);
    const txt = iconv.decode(buf, "win1252");
    linhas = txt.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    resultado.erros.push(`Erro ao ler arquivo: ${(e as Error).message}`);
    return resultado;
  }

  if (linhas.length === 0) {
    resultado.erros.push("Arquivo vazio");
    return resultado;
  }

  // Parse cabeçalho
  const headers = linhas[0]!.split(";").map((h) => h.trim());
  const codIdx = headers.indexOf("CODIGO");
  const modIdx = headers.indexOf("MODALIDADECD");

  if (codIdx === -1) {
    resultado.erros.push("Coluna CODIGO não encontrada no cabeçalho");
    return resultado;
  }
  if (modIdx === -1) {
    resultado.erros.push("Coluna MODALIDADECD não encontrada no cabeçalho");
    return resultado;
  }

  const modalidadesSet = new Set<string>();
  let duplicatas = 0;

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i]!.split(";");
    const codStr = cols[codIdx]?.trim();
    if (!codStr || codStr === "") continue;

    const codigo = Number(codStr);
    if (!Number.isFinite(codigo)) continue;

    const modalidade = cols[modIdx]?.trim() || "ED Direto Loja";
    resultado.totalLinhas++;
    modalidadesSet.add(modalidade);

    if (resultado.mapa.has(codigo)) {
      duplicatas++;
    }
    resultado.mapa.set(codigo, modalidade);
  }

  resultado.modalidadesUnicas = [...modalidadesSet].sort();
  if (duplicatas > 0) {
    resultado.erros.push(`${duplicatas} códigos duplicados no Plan 6 CD.txt (último valor prevaleceu)`);
  }

  return resultado;
}

/**
 * Função pura: busca a modalidade de um produto pelo seqproduto.
 * Se não encontrado, retorna "ED Direto Loja".
 */
export function buscarModalidadePlan6(
  mapa: Map<number, string>,
  seqproduto: number,
): string {
  return mapa.get(seqproduto) ?? "ED Direto Loja";
}
