import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import {
  INVENTARIO_COL_EMPRESA,
  INVENTARIO_COL_PRODUTO,
} from "../../constants/headers.ts";
import { obterContratoPorTipo } from "../../standardize/standards/standardContracts.ts";
import type { MotorStandardizeTipo } from "../../standardize/standardizeTypes.ts";
import { abrirWorkbook, inspecionarWorkbook } from "../../standardize/workbookInspector.ts";
import type { WorkerArquivoDb } from "./workerTypes.ts";

export type ValidacaoConteudoResultado = {
  status: "valido" | "invalido" | "ignorado";
  erro: string | null;
  detalhes?: Record<string, unknown>;
};

const TIPO_PADRONIZACAO: Record<string, MotorStandardizeTipo> = {
  regras_definidas: "regras",
  validacao_ruptura: "validacao_ruptura",
  ordem_cds: "ordem_cds",
  compradores: "compradores",
  estrutura_fake: "estrutura_fake",
};

const COLUNAS_MIN_TXT: Record<string, string[]> = {
  rede: ["SEQPESSOA", "RAZAO"],
  inventario_lojas: [INVENTARIO_COL_PRODUTO, INVENTARIO_COL_EMPRESA],
  plan_6_cd: ["CD"],
  grupo_ruptura_1: ["LOJA"],
  grupo_ruptura_2: ["LOJA"],
};

function normalizarCabecalhoTxt(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function lerAmostraTxt(caminho: string, maxBytes = 65536, maxLinhas = 20): string[] {
  const fd = fs.openSync(caminho, "r");
  const buf = Buffer.alloc(maxBytes);
  const lidos = fs.readSync(fd, buf, 0, maxBytes, 0);
  fs.closeSync(fd);
  const texto = iconv.decode(buf.subarray(0, lidos), "win1252");
  return texto
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, maxLinhas);
}

async function amostrarLinhasTxt(caminho: string, maxLinhas = 5): Promise<string[]> {
  return lerAmostraTxt(caminho, 65536, maxLinhas);
}

async function validarTxt(caminho: string, tipo: string | null): Promise<ValidacaoConteudoResultado> {
  const stat = fs.statSync(caminho);
  if (stat.size === 0) return { status: "invalido", erro: "Arquivo TXT vazio" };

  const linhas = await amostrarLinhasTxt(caminho, 20);
  if (!linhas.length) return { status: "invalido", erro: "Nenhuma linha legível" };

  const separador = linhas[0]?.includes(";") ? ";" : linhas[0]?.includes("\t") ? "\t" : null;
  if (!separador) return { status: "invalido", erro: "Separador não identificado (; ou tab)" };

  const cabecalho = linhas[0]!.split(separador).map((c) => normalizarCabecalhoTxt(c));
  if (cabecalho.length < 2) return { status: "invalido", erro: "Cabeçalho com colunas insuficientes" };

  const minCols = tipo ? COLUNAS_MIN_TXT[tipo] : null;
  if (minCols?.length) {
    const faltando = minCols.filter((c) => !cabecalho.includes(normalizarCabecalhoTxt(c)));
    if (faltando.length) {
      return { status: "invalido", erro: `Colunas mínimas ausentes: ${faltando.join(", ")}` };
    }
  }

  const amostra = linhas.slice(1, 4);
  if (!amostra.some((l) => l.trim().length > 0)) {
    return { status: "invalido", erro: "Sem linhas de dados na amostra" };
  }

  return { status: "valido", erro: null, detalhes: { separador, colunas: cabecalho.length, amostraLinhas: amostra.length } };
}

async function validarCsv(caminho: string): Promise<ValidacaoConteudoResultado> {
  const stat = fs.statSync(caminho);
  if (stat.size === 0) return { status: "invalido", erro: "CSV vazio" };
  const linhas = await amostrarLinhasTxt(caminho, 10);
  if (!linhas.length) return { status: "invalido", erro: "CSV sem linhas" };
  const sep = linhas[0]!.includes(";") ? ";" : ",";
  const cols = linhas[0]!.split(sep);
  if (cols.length < 2) return { status: "invalido", erro: "Cabeçalho CSV insuficiente" };
  return { status: "valido", erro: null, detalhes: { separador: sep, colunas: cols.length } };
}

function validarXlsx(caminho: string, tipo: string | null): ValidacaoConteudoResultado {
  try {
    const aberto = abrirWorkbook(caminho);
    const inspecao = inspecionarWorkbook(aberto);
    if (!inspecao.abas.length) return { status: "invalido", erro: "Workbook sem abas" };

    const tipoPad = tipo ? TIPO_PADRONIZACAO[tipo] : null;
    if (tipoPad) {
      const contrato = obterContratoPorTipo(tipoPad);
      const nomesAbas = inspecao.abas.map((a) => a.nome);
      const algumaOrigem = contrato.abas.some((aba) =>
        aba.nomesOrigem.some((n) => nomesAbas.some((na) => na.toLowerCase().includes(n.toLowerCase()))),
      );
      if (!algumaOrigem && !contrato.abas.every((a) => a.opcional)) {
        return { status: "invalido", erro: "Nenhuma aba de origem do contrato encontrada" };
      }
    }

    return { status: "valido", erro: null, detalhes: { abas: inspecao.abas.map((a) => a.nome) } };
  } catch (err) {
    return { status: "invalido", erro: err instanceof Error ? err.message : String(err) };
  }
}

export async function validarConteudoArquivo(
  arquivo: WorkerArquivoDb,
  caminhoLocal: string,
): Promise<ValidacaoConteudoResultado> {
  if (!fs.existsSync(caminhoLocal)) {
    return { status: "invalido", erro: "Arquivo local não encontrado após download" };
  }

  const ext = path.extname(caminhoLocal).toLowerCase();
  if (ext === ".txt") return validarTxt(caminhoLocal, arquivo.tipo_arquivo);
  if (ext === ".csv") return validarCsv(caminhoLocal);
  if (ext === ".xlsx" || ext === ".xls") return validarXlsx(caminhoLocal, arquivo.tipo_arquivo);
  return { status: "invalido", erro: `Extensão não suportada: ${ext}` };
}

export { TIPO_PADRONIZACAO };
