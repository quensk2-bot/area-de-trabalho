import fs from "fs";
import iconv from "iconv-lite";
import type { MotorErroValidacao, MotorMetricasProcessamento } from "../types/motorTypes.ts";
import { splitTxtLine } from "../utils/chunkIterator.ts";
import { criarMetricas } from "../utils/progress.ts";
import { validateRowColumnCount } from "../validators/validateRow.ts";

export type TxtStreamOptions = {
  limiteLinhas?: number;
  colunasEsperadas?: number;
  onLinha?: (cabecalhos: string[], numeroLinha: number, colunas: string[]) => void;
};

export type TxtStreamResult = {
  cabecalhos: string[];
  linhasLidas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  erros: MotorErroValidacao[];
  metricas: MotorMetricasProcessamento;
};

const CHUNK_SIZE = 64 * 1024;

function splitLinesPreserveLast(buffer: string): { lines: string[]; rest: string } {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() ?? "";
  return { lines, rest };
}

export async function parseTxtStream(
  filePath: string,
  options: TxtStreamOptions = {},
): Promise<TxtStreamResult> {
  const inicio = Date.now();
  const erros: MotorErroValidacao[] = [];
  let cabecalhos: string[] = [];
  let linhasLidas = 0;
  let linhasValidas = 0;
  let linhasInvalidas = 0;
  let isHeader = true;
  let buffer = "";
  let numeroLinha = 0;

  const limite = options.limiteLinhas;
  const colunasEsperadas = options.colunasEsperadas;

  const stream = fs.createReadStream(filePath);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const content = iconv.decode(Buffer.concat(chunks), "win1252");
  let rest = content;

  while (rest.length > 0) {
    const take = rest.length > CHUNK_SIZE ? rest.slice(0, CHUNK_SIZE) : rest;
    rest = rest.length > CHUNK_SIZE ? rest.slice(CHUNK_SIZE) : "";
    buffer += take;

    const { lines, rest: lineRest } = splitLinesPreserveLast(buffer);
    buffer = lineRest;

    for (const line of lines) {
      if (line.trim() === "") continue;

      numeroLinha++;
      if (isHeader) {
        cabecalhos = splitTxtLine(line).map((h) => h.trim());
        isHeader = false;
        continue;
      }

      if (limite != null && linhasLidas >= limite) break;

      linhasLidas++;
      const colunas = splitTxtLine(line);

      if (colunasEsperadas != null) {
        const validacao = validateRowColumnCount(numeroLinha, colunas.length, colunasEsperadas);
        if (!validacao.ok) {
          linhasInvalidas++;
          erros.push(...validacao.erros);
          continue;
        }
      }

      linhasValidas++;
      options.onLinha?.(cabecalhos, numeroLinha, colunas);
    }

    if (limite != null && linhasLidas >= limite) break;
  }

  if (buffer.trim() !== "" && (limite == null || linhasLidas < limite)) {
    numeroLinha++;
    if (isHeader) {
      cabecalhos = splitTxtLine(buffer).map((h) => h.trim());
    } else {
      linhasLidas++;
      const colunas = splitTxtLine(buffer);
      if (colunasEsperadas != null) {
        const validacao = validateRowColumnCount(numeroLinha, colunas.length, colunasEsperadas);
        if (!validacao.ok) {
          linhasInvalidas++;
          erros.push(...validacao.erros);
        } else {
          linhasValidas++;
          options.onLinha?.(cabecalhos, numeroLinha, colunas);
        }
      } else {
        linhasValidas++;
        options.onLinha?.(cabecalhos, numeroLinha, colunas);
      }
    }
  }

  return {
    cabecalhos,
    linhasLidas,
    linhasValidas,
    linhasInvalidas,
    erros,
    metricas: criarMetricas(inicio, linhasLidas, linhasValidas, linhasInvalidas),
  };
}

export function readTxtWin1252(filePath: string): string {
  return iconv.decode(fs.readFileSync(filePath), "win1252");
}

export function splitTxtContent(content: string): string[] {
  if (content.endsWith("\n") || content.endsWith("\r")) {
    return content.split(/\r?\n/).filter((l) => l.length > 0 || l.includes(";"));
  }
  const parts = content.split(/\r?\n/);
  return parts.filter((l, idx) => l.length > 0 || idx < parts.length);
}
