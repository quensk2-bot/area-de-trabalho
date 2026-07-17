import type { MotorErroValidacao } from "../types/motorTypes.ts";
import type { MotorLinhaGrupoCds } from "../types/motorLinhaTypes.ts";
import { construirCdsDaLinhaGrupo2Completo, criarBlocoGrupo2 } from "../cds/index.ts";
import type { MotorCd5Normalizado } from "../types/motorProdutoLojaNormalizado.ts";
import { parseDataBrasileira, parseTimestampErp, isDataBrasileira, isTimestampErp } from "./parseDates.ts";
import { parseDecimalBr } from "./parseNumbers.ts";
import { emptyToNull, normalizeCodigoNumerico } from "./parseText.ts";
import { deduplicarPorChave } from "./transformGrupoRuptura1.ts";

function parseDataFlex(
  value: string | null,
  campo: string,
  numeroLinha: number,
): { valor: string | null; erro: MotorErroValidacao | null } {
  if (value == null) return { valor: null, erro: null };
  if (isTimestampErp(value)) return parseTimestampErp(value, campo, numeroLinha);
  if (isDataBrasileira(value)) return parseDataBrasileira(value, campo, numeroLinha);
  return { valor: emptyToNull(value), erro: null };
}

export function mapearCd1ParaCd5(linha: MotorLinhaGrupoCds): MotorLinhaGrupoCds {
  return {
    ...linha,
    statusCompraCd5: linha.statusCompraCd5 ?? linha.statusCompraCd5,
    estoqueCd5: linha.estoqueCd5,
    pendenciaCd5: linha.pendenciaCd5,
    diasCompraCd5: linha.diasCompraCd5,
    diasRecebtoCd5: linha.diasRecebtoCd5,
    ultimaCpaCd5: linha.ultimaCpaCd5,
  };
}

export function transformGrupoCds2(
  linhas: MotorLinhaGrupoCds[],
  regional = "MT",
  dataReferencia = "",
): { itens: MotorCd5Normalizado[]; erros: MotorErroValidacao[]; alertas: string[] } {
  const erros: MotorErroValidacao[] = [];
  const alertas: string[] = [];
  const itens: MotorCd5Normalizado[] = [];

  for (const linha of linhas) {
    const seqproduto = normalizeCodigoNumerico(linha.seqproduto);
    if (seqproduto == null) {
      alertas.push(`SEQPRODUTO ausente na linha ${linha.numeroLinha}`);
      continue;
    }

    const estoque = parseDecimalBr(linha.estoqueCd5, "ESTQ_CD5", linha.numeroLinha);
    if (estoque.erro) erros.push(estoque.erro);

    const pendencia = parseDecimalBr(linha.pendenciaCd5, "PENDCD_CD5", linha.numeroLinha);
    if (pendencia.erro) erros.push(pendencia.erro);

    const diasCompra = parseDecimalBr(linha.diasCompraCd5, "DIAS_DA_COMPRACD5", linha.numeroLinha);
    if (diasCompra.erro) erros.push(diasCompra.erro);

    const diasRecebto = parseDecimalBr(linha.diasRecebtoCd5, "DIAS_RECEBTO_CD5", linha.numeroLinha);
    if (diasRecebto.erro) erros.push(diasRecebto.erro);

    const ultimaCpa = parseDataFlex(linha.ultimaCpaCd5, "ULTIMACPACD5", linha.numeroLinha);
    if (ultimaCpa.erro) erros.push(ultimaCpa.erro);

    const bloco = criarBlocoGrupo2(regional, dataReferencia, 5);
    const cds = construirCdsDaLinhaGrupo2Completo(
      linha,
      bloco,
      {
        estoque: estoque.valor,
        pendencia: pendencia.valor,
        diasCompra: diasCompra.valor,
        diasRecebimento: diasRecebto.valor,
        ultimaCompra: ultimaCpa.valor,
      },
      { mtPilotoSomentePosicao5: true },
    );

    itens.push({
      seqproduto,
      statusCompraCd5: emptyToNull(linha.statusCompraCd5),
      estoqueCd5: estoque.valor,
      pendenciaCd5: pendencia.valor,
      diasCompraCd5: diasCompra.valor,
      diasRecebtoCd5: diasRecebto.valor,
      ultimaCpaCd5: ultimaCpa.valor,
      cds,
    });
  }

  const dedup = deduplicarPorChave(itens, (i) => String(i.seqproduto));
  if (dedup.duplicatasRemovidas > 0) {
    alertas.push(`${dedup.duplicatasRemovidas} duplicata(s) de SEQPRODUTO removida(s) no grupo CDs`);
  }

  return { itens: dedup.itens, erros, alertas };
}
