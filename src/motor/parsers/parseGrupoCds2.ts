import { HEADER_GRUPO_RUPTURA_57 } from "../constants/headers.ts";
import type { MotorResultadoParser } from "../types/motorTypes.ts";
import type { MotorLinhaGrupoCds } from "../types/motorLinhaTypes.ts";
import { emptyToNull } from "../transform/parseText.ts";
import { validateHeaderSet } from "../validators/validateHeader.ts";
import { mapRowToObject } from "../validators/validateRow.ts";
import { parseTxtStream } from "./parseTxtStream.ts";
import type { ParserStreamOptions } from "./parserStreamOptions.ts";
import { streamOptionsToTxt } from "./parserStreamOptions.ts";

const COLS = HEADER_GRUPO_RUPTURA_57.length;

function mapGrupoCds(numeroLinha: number, payload: Record<string, string>): MotorLinhaGrupoCds {
  return {
    numeroLinha,
    seqproduto: emptyToNull(payload.SEQPRODUTO),
    statusCompraCd5: emptyToNull(payload.STATUS_COMPRA_CD1),
    estoqueCd5: emptyToNull(payload.ESTQ_CD1),
    pendenciaCd5: emptyToNull(payload.PENDCD_CD1),
    diasCompraCd5: emptyToNull(payload.DIAS_DA_COMPRACD1),
    diasRecebtoCd5: emptyToNull(payload.DIAS_RECEBTO_CD1),
    ultimaCpaCd5: emptyToNull(payload.ULTIMACPACD1),
  };
}

export async function parseGrupoCds2(
  filePath: string,
  limiteLinhas?: number,
  streamOptions?: ParserStreamOptions,
): Promise<MotorResultadoParser<MotorLinhaGrupoCds>> {
  const linhas: MotorLinhaGrupoCds[] = [];

  const streamResult = await parseTxtStream(filePath, {
    ...streamOptionsToTxt(streamOptions),
    limiteLinhas,
    colunasEsperadas: COLS,
    onLinha: (cabecalhos, numeroLinha, colunas) => {
      const payload = mapRowToObject(cabecalhos, colunas);
      const mapped = mapGrupoCds(numeroLinha, payload);
      if (!streamOptions?.semRetencao) {
        linhas.push(mapped);
      }
    },
  });

  const cabecalhos = streamResult.cabecalhos;
  const headerValidation = validateHeaderSet(cabecalhos, HEADER_GRUPO_RUPTURA_57);

  return {
    tipo: "grupo_cds_2",
    cabecalhoOk: headerValidation.ok,
    cabecalhos: headerValidation.cabecalhos,
    linhas,
    erros: [...headerValidation.erros, ...streamResult.erros],
    metricas: streamResult.metricas,
  };
}
