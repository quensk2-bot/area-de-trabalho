import {
  INVENTARIO_COL_EMPRESA,
  INVENTARIO_COL_PRODUTO,
  INVENTARIO_COL_QTD_SAIDA,
} from "../constants/headers.ts";
import type { MotorResultadoParser } from "../types/motorTypes.ts";
import type { MotorLinhaInventario } from "../types/motorLinhaTypes.ts";
import { emptyToNull } from "../transform/parseText.ts";
import { validateHeaderDinamico } from "../validators/validateHeader.ts";
import { mapRowToObject } from "../validators/validateRow.ts";
import { parseTxtStream } from "./parseTxtStream.ts";
import type { ParserStreamOptions } from "./parserStreamOptions.ts";
import { streamOptionsToTxt } from "./parserStreamOptions.ts";

const COLUNAS_OBRIGATORIAS = [
  INVENTARIO_COL_EMPRESA,
  INVENTARIO_COL_PRODUTO,
  INVENTARIO_COL_QTD_SAIDA,
];

function mapInventario(numeroLinha: number, payload: Record<string, string>): MotorLinhaInventario {
  return {
    numeroLinha,
    loja: emptyToNull(payload[INVENTARIO_COL_EMPRESA]),
    produto: emptyToNull(payload[INVENTARIO_COL_PRODUTO]),
    qtdSaidaOutras: emptyToNull(payload[INVENTARIO_COL_QTD_SAIDA]),
  };
}

export async function parseInventarioLojas(
  filePath: string,
  limiteLinhas?: number,
  streamOptions?: ParserStreamOptions,
): Promise<MotorResultadoParser<MotorLinhaInventario>> {
  const linhas: MotorLinhaInventario[] = [];

  const streamResult = await parseTxtStream(filePath, {
    ...streamOptionsToTxt(streamOptions),
    limiteLinhas,
    onLinha: (cabecalhos, numeroLinha, colunas) => {
      const payload = mapRowToObject(cabecalhos, colunas);
      if (streamOptions?.filtroLinha && !streamOptions.filtroLinha(payload)) return;
      const mapped = mapInventario(numeroLinha, payload);
      if (!streamOptions?.semRetencao) {
        linhas.push(mapped);
      }
    },
  });

  const cabecalhos = streamResult.cabecalhos;
  const headerValidation = validateHeaderDinamico(cabecalhos, COLUNAS_OBRIGATORIAS);

  return {
    tipo: "inventario_lojas",
    cabecalhoOk: headerValidation.ok,
    cabecalhos: headerValidation.cabecalhos,
    linhas,
    erros: [...headerValidation.erros, ...streamResult.erros],
    metricas: streamResult.metricas,
  };
}
