import { HEADER_GRUPO_RUPTURA_57 } from "../constants/headers.ts";
import type { MotorResultadoParser } from "../types/motorTypes.ts";
import type { MotorLinhaGrupoRuptura } from "../types/motorLinhaTypes.ts";
import { parseCategoriaHierarquia } from "../transform/parseCategoria.ts";
import { emptyToNull } from "../transform/parseText.ts";
import { validateHeaderSet } from "../validators/validateHeader.ts";
import { mapRowToObject } from "../validators/validateRow.ts";
import { parseTxtStream } from "./parseTxtStream.ts";

const COLS = HEADER_GRUPO_RUPTURA_57.length;

function mapGrupoRuptura(numeroLinha: number, payload: Record<string, string>): MotorLinhaGrupoRuptura {
  const categoriaOriginal = emptyToNull(payload.CATEGORIA);
  return {
    numeroLinha,
    divisao: emptyToNull(payload.DIVISAO),
    loja: emptyToNull(payload.LOJA),
    seqproduto: emptyToNull(payload.SEQPRODUTO),
    descricao: emptyToNull(payload.DESCCOMPLETA),
    codFornecedor: emptyToNull(payload.CODFORN),
    fornecedor: emptyToNull(payload.RAZAO),
    status: emptyToNull(payload.STATUS),
    mediaVendaUnDia: emptyToNull(payload.MEDIAVENDAUNDIA),
    mediaVendaGp: emptyToNull(payload.MEDIAVENDAGP),
    estoque: emptyToNull(payload.ESTOQUE),
    parMin: emptyToNull(payload.PARMIN),
    parMax: emptyToNull(payload.PARMAX),
    pendencia: emptyToNull(payload.PENDCPA),
    embalagemCompra: emptyToNull(payload.EMBCPA),
    categoriaOriginal,
    statusCompraCd1: emptyToNull(payload.STATUS_COMPRA_CD1),
    statusCompraCd2: emptyToNull(payload.STATUS_COMPRA_CD2),
    statusCompraCd3: emptyToNull(payload.STATUS_COMPRA_CD3),
    statusCompraCd4: emptyToNull(payload.STATUS_COMPRA_CD4),
    estoqueCd1: emptyToNull(payload.ESTQ_CD1),
    estoqueCd2: emptyToNull(payload.ESTQ_CD2),
    estoqueCd3: emptyToNull(payload.ESTQ_CD3),
    estoqueCd4: emptyToNull(payload.ESTQ_CD4),
    pendenciaCd1: emptyToNull(payload.PENDCD_CD1),
    pendenciaCd2: emptyToNull(payload.PENDCD_CD2),
    pendenciaCd3: emptyToNull(payload.PENDCD_CD3),
    pendenciaCd4: emptyToNull(payload.PENDCD_CD4),
    diasAtivacaoGeral: emptyToNull(payload.DIAS_ATIVACAOGERAL),
    dataAtivacaoGeral: emptyToNull(payload.DATA_ATIVACAOGERAL),
    dtaUltAtivacao: emptyToNull(payload.DTA_ULTATIVACAO),
    ultimaEntradaLoja: emptyToNull(payload.ULTIMA_ENTRADALOJA),
    ultimaSaidaLoja: emptyToNull(payload.ULTIMA_SAIDALOJA),
    diasCompraLj: emptyToNull(payload.DIAS_DA_COMPRALJ),
    diasCompraCd1: emptyToNull(payload.DIAS_DA_COMPRACD1),
    diasCompraCd2: emptyToNull(payload.DIAS_DA_COMPRACD2),
    diasCompraCd3: emptyToNull(payload.DIAS_DA_COMPRACD3),
    diasCompraCd4: emptyToNull(payload.DIAS_DA_COMPRACD4),
    diasRecebtoCd1: emptyToNull(payload.DIAS_RECEBTO_CD1),
    diasRecebtoCd2: emptyToNull(payload.DIAS_RECEBTO_CD2),
    diasRecebtoCd3: emptyToNull(payload.DIAS_RECEBTO_CD3),
    diasRecebtoCd4: emptyToNull(payload.DIAS_RECEBTO_CD4),
    diasRuptura: emptyToNull(payload.DIAS_RUPTURA),
    ultimaCpaLoja: emptyToNull(payload.ULTIMACPALOJA),
    ultimaCpaCd1: emptyToNull(payload.ULTIMACPACD1),
    ultimaCpaCd2: emptyToNull(payload.ULTIMACPACD2),
    ultimaCpaCd3: emptyToNull(payload.ULTIMACPACD3),
    ultimaCpaCd4: emptyToNull(payload.ULTIMACPACD4),
    familia: emptyToNull(payload.FAMILIA),
    custoLiquido: emptyToNull(payload.CUSTO_LIQUIDO),
    estSelecInvCd1: emptyToNull(payload.EST_SELECINV_CD1),
    estSelecInvCd2: emptyToNull(payload.EST_SELECINV_CD2),
    estSelecInvCd3: emptyToNull(payload.EST_SELECINV_CD3),
    estSelecInvCd4: emptyToNull(payload.EST_SELECINV_CD4),
    dtaUltEntradaCd1: emptyToNull(payload.DTA_ULTENTRADA_CD1),
    dtaUltEntradaCd2: emptyToNull(payload.DTA_ULTENTRADA_CD2),
    dtaUltEntradaCd3: emptyToNull(payload.DTA_ULTENTRADA_CD3),
    dtaUltEntradaCd4: emptyToNull(payload.DTA_ULTENTRADA_CD4),
    hierarquia: parseCategoriaHierarquia(categoriaOriginal),
  };
}

export async function parseGrupoRuptura1(
  filePath: string,
  limiteLinhas?: number,
): Promise<MotorResultadoParser<MotorLinhaGrupoRuptura>> {
  const linhas: MotorLinhaGrupoRuptura[] = [];

  const streamResult = await parseTxtStream(filePath, {
    limiteLinhas,
    colunasEsperadas: COLS,
    onLinha: (cabecalhos, numeroLinha, colunas) => {
      const payload = mapRowToObject(cabecalhos, colunas);
      linhas.push(mapGrupoRuptura(numeroLinha, payload));
    },
  });

  const cabecalhos = streamResult.cabecalhos;
  const headerValidation = validateHeaderSet(cabecalhos, HEADER_GRUPO_RUPTURA_57);

  return {
    tipo: "grupo_ruptura_1",
    cabecalhoOk: headerValidation.ok,
    cabecalhos: headerValidation.cabecalhos,
    linhas,
    erros: [...headerValidation.erros, ...streamResult.erros],
    metricas: streamResult.metricas,
  };
}
