import type { MotorErroValidacao } from "../types/motorTypes.ts";
import type { MotorLinhaGrupoRuptura } from "../types/motorLinhaTypes.ts";
import { construirCdsDaLinhaRuptura, criarBlocoRuptura } from "../cds/index.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import { parseCategoriaHierarquia } from "./parseCategoria.ts";
import { parseDataBrasileira, parseTimestampErp, isDataBrasileira, isTimestampErp } from "./parseDates.ts";
import { parseDecimalBr, parseInteiro } from "./parseNumbers.ts";
import { emptyToNull, normalizeCodigoNumerico } from "./parseText.ts";

function parseDataFlex(
  value: string | null,
  campo: string,
  numeroLinha: number,
): { valor: string | null; erro: MotorErroValidacao | null } {
  if (value == null) return { valor: null, erro: null };
  if (isTimestampErp(value)) return parseTimestampErp(value, campo, numeroLinha);
  if (isDataBrasileira(value)) return parseDataBrasileira(value, campo, numeroLinha);
  return {
    valor: null,
    erro: {
      numeroLinha,
      campo,
      valorOriginal: value,
      codigoErro: "DATA_INVALIDA",
      mensagem: `Formato de data não reconhecido: ${value}`,
      severidade: "erro",
    },
  };
}

export function transformGrupoRuptura1(
  linhas: MotorLinhaGrupoRuptura[],
  regional: string,
  dataReferencia: string,
): { itens: MotorProdutoLojaNormalizado[]; erros: MotorErroValidacao[]; alertas: string[] } {
  const erros: MotorErroValidacao[] = [];
  const alertas: string[] = [];
  const itens: MotorProdutoLojaNormalizado[] = [];

  for (const linha of linhas) {
    const itemAlertas: string[] = [];
    const loja = normalizeCodigoNumerico(linha.loja);
    const seqproduto = normalizeCodigoNumerico(linha.seqproduto);

    if (loja == null) itemAlertas.push(`LOJA ausente na linha ${linha.numeroLinha}`);
    if (seqproduto == null) itemAlertas.push(`SEQPRODUTO ausente na linha ${linha.numeroLinha}`);

    const mediaVenda = parseDecimalBr(linha.mediaVendaUnDia, "MEDIAVENDAUNDIA", linha.numeroLinha);
    if (mediaVenda.erro) erros.push(mediaVenda.erro);

    const mediaGp = parseDecimalBr(linha.mediaVendaGp, "MEDIAVENDAGP", linha.numeroLinha);
    if (mediaGp.erro) erros.push(mediaGp.erro);

    const estoque = parseDecimalBr(linha.estoque, "ESTOQUE", linha.numeroLinha);
    if (estoque.erro) erros.push(estoque.erro);

    const parMin = parseDecimalBr(linha.parMin, "PARMIN", linha.numeroLinha);
    if (parMin.erro) erros.push(parMin.erro);

    const parMax = parseDecimalBr(linha.parMax, "PARMAX", linha.numeroLinha);
    if (parMax.erro) erros.push(parMax.erro);

    const pendencia = parseDecimalBr(linha.pendencia, "PENDCPA", linha.numeroLinha);
    if (pendencia.erro) erros.push(pendencia.erro);

    const custo = parseDecimalBr(linha.custoLiquido, "CUSTO_LIQUIDO", linha.numeroLinha);
    if (custo.erro) erros.push(custo.erro);

    const diasRuptura = parseDecimalBr(linha.diasRuptura, "DIAS_RUPTURA", linha.numeroLinha);
    if (diasRuptura.erro) erros.push(diasRuptura.erro);

    const estCd1 = parseDecimalBr(linha.estoqueCd1, "ESTQ_CD1", linha.numeroLinha);
    if (estCd1.erro) erros.push(estCd1.erro);
    const estCd2 = parseDecimalBr(linha.estoqueCd2, "ESTQ_CD2", linha.numeroLinha);
    if (estCd2.erro) erros.push(estCd2.erro);
    const estCd3 = parseDecimalBr(linha.estoqueCd3, "ESTQ_CD3", linha.numeroLinha);
    if (estCd3.erro) erros.push(estCd3.erro);
    const estCd4 = parseDecimalBr(linha.estoqueCd4, "ESTQ_CD4", linha.numeroLinha);
    if (estCd4.erro) erros.push(estCd4.erro);

    const pendCd1 = parseDecimalBr(linha.pendenciaCd1, "PENDCD_CD1", linha.numeroLinha);
    if (pendCd1.erro) erros.push(pendCd1.erro);
    const pendCd2 = parseDecimalBr(linha.pendenciaCd2, "PENDCD_CD2", linha.numeroLinha);
    if (pendCd2.erro) erros.push(pendCd2.erro);
    const pendCd3 = parseDecimalBr(linha.pendenciaCd3, "PENDCD_CD3", linha.numeroLinha);
    if (pendCd3.erro) erros.push(pendCd3.erro);
    const pendCd4 = parseDecimalBr(linha.pendenciaCd4, "PENDCD_CD4", linha.numeroLinha);
    if (pendCd4.erro) erros.push(pendCd4.erro);

    const diasCompraLj = parseDecimalBr(linha.diasCompraLj, "DIAS_DA_COMPRALJ", linha.numeroLinha);
    if (diasCompraLj.erro) erros.push(diasCompraLj.erro);
    const diasCompraCd1 = parseDecimalBr(linha.diasCompraCd1, "DIAS_DA_COMPRACD1", linha.numeroLinha);
    if (diasCompraCd1.erro) erros.push(diasCompraCd1.erro);
    const diasCompraCd2 = parseDecimalBr(linha.diasCompraCd2, "DIAS_DA_COMPRACD2", linha.numeroLinha);
    if (diasCompraCd2.erro) erros.push(diasCompraCd2.erro);
    const diasCompraCd3 = parseDecimalBr(linha.diasCompraCd3, "DIAS_DA_COMPRACD3", linha.numeroLinha);
    if (diasCompraCd3.erro) erros.push(diasCompraCd3.erro);
    const diasCompraCd4 = parseDecimalBr(linha.diasCompraCd4, "DIAS_DA_COMPRACD4", linha.numeroLinha);
    if (diasCompraCd4.erro) erros.push(diasCompraCd4.erro);

    const diasRecebtoCd1 = parseDecimalBr(linha.diasRecebtoCd1, "DIAS_RECEBTO_CD1", linha.numeroLinha);
    if (diasRecebtoCd1.erro) erros.push(diasRecebtoCd1.erro);
    const diasRecebtoCd2 = parseDecimalBr(linha.diasRecebtoCd2, "DIAS_RECEBTO_CD2", linha.numeroLinha);
    if (diasRecebtoCd2.erro) erros.push(diasRecebtoCd2.erro);
    const diasRecebtoCd3 = parseDecimalBr(linha.diasRecebtoCd3, "DIAS_RECEBTO_CD3", linha.numeroLinha);
    if (diasRecebtoCd3.erro) erros.push(diasRecebtoCd3.erro);
    const diasRecebtoCd4 = parseDecimalBr(linha.diasRecebtoCd4, "DIAS_RECEBTO_CD4", linha.numeroLinha);
    if (diasRecebtoCd4.erro) erros.push(diasRecebtoCd4.erro);

    const ultEntrada = parseDataFlex(linha.ultimaEntradaLoja, "ULTIMA_ENTRADALOJA", linha.numeroLinha);
    if (ultEntrada.erro) erros.push(ultEntrada.erro);
    const ultSaida = parseDataFlex(linha.ultimaSaidaLoja, "ULTIMA_SAIDALOJA", linha.numeroLinha);
    if (ultSaida.erro) erros.push(ultSaida.erro);

    const familia = parseInteiro(linha.familia, "FAMILIA", linha.numeroLinha);
    if (familia.erro) erros.push(familia.erro);

    const hierarquia = linha.hierarquia ?? parseCategoriaHierarquia(linha.categoriaOriginal);
    if (hierarquia.ambiguidade) {
      alertas.push(`Linha ${linha.numeroLinha}: ${hierarquia.ambiguidade}`);
    }

    const bloco = criarBlocoRuptura(regional, dataReferencia, 1, 1, "1º Grupo de Ruptura.txt");
    const cds = construirCdsDaLinhaRuptura(linha, bloco, {
      estCd1: estCd1.valor,
      estCd2: estCd2.valor,
      estCd3: estCd3.valor,
      estCd4: estCd4.valor,
      pendCd1: pendCd1.valor,
      pendCd2: pendCd2.valor,
      pendCd3: pendCd3.valor,
      pendCd4: pendCd4.valor,
      diasCompraCd1: diasCompraCd1.valor,
      diasCompraCd2: diasCompraCd2.valor,
      diasCompraCd3: diasCompraCd3.valor,
      diasCompraCd4: diasCompraCd4.valor,
      diasRecebtoCd1: diasRecebtoCd1.valor,
      diasRecebtoCd2: diasRecebtoCd2.valor,
      diasRecebtoCd3: diasRecebtoCd3.valor,
      diasRecebtoCd4: diasRecebtoCd4.valor,
    });

    itens.push({
      regional,
      dataReferencia,
      loja: loja ?? 0,
      seqproduto: seqproduto ?? 0,
      descricao: emptyToNull(linha.descricao),
      codFornecedor: normalizeCodigoNumerico(linha.codFornecedor),
      fornecedor: emptyToNull(linha.fornecedor),
      statusProduto: emptyToNull(linha.status),
      familia: familia.valor,
      mediaVendaUnDia: mediaVenda.valor,
      mediaVendaGp: mediaGp.valor,
      estoqueLoja: estoque.valor,
      parMin: parMin.valor,
      parMax: parMax.valor,
      pendenciaLoja: pendencia.valor,
      diasCompraLj: diasCompraLj.valor,
      diasCompraCd1: diasCompraCd1.valor,
      diasCompraCd2: diasCompraCd2.valor,
      diasCompraCd3: diasCompraCd3.valor,
      diasCompraCd4: diasCompraCd4.valor,
      diasRecebtoCd1: diasRecebtoCd1.valor,
      diasRecebtoCd2: diasRecebtoCd2.valor,
      diasRecebtoCd3: diasRecebtoCd3.valor,
      diasRecebtoCd4: diasRecebtoCd4.valor,
      embalagemCompra: emptyToNull(linha.embalagemCompra),
      hierarquia,
      estoqueCd1: estCd1.valor,
      estoqueCd2: estCd2.valor,
      estoqueCd3: estCd3.valor,
      estoqueCd4: estCd4.valor,
      pendenciaCd1: pendCd1.valor,
      pendenciaCd2: pendCd2.valor,
      pendenciaCd3: pendCd3.valor,
      pendenciaCd4: pendCd4.valor,
      statusCompraCd1: emptyToNull(linha.statusCompraCd1),
      statusCompraCd2: emptyToNull(linha.statusCompraCd2),
      statusCompraCd3: emptyToNull(linha.statusCompraCd3),
      statusCompraCd4: emptyToNull(linha.statusCompraCd4),
      diasRuptura: diasRuptura.valor,
      ultimaEntradaLoja: ultEntrada.valor,
      ultimaSaidaLoja: ultSaida.valor,
      custoLiquido: custo.valor,
      cds,
      alertas: itemAlertas,
    });
  }

  return { itens, erros, alertas };
}

export function deduplicarPorChave<T>(
  itens: T[],
  chaveFn: (item: T) => string,
): { itens: T[]; duplicatasRemovidas: number } {
  const vistos = new Set<string>();
  const resultado: T[] = [];
  let duplicatasRemovidas = 0;

  for (const item of itens) {
    const chave = chaveFn(item);
    if (vistos.has(chave)) {
      duplicatasRemovidas++;
      continue;
    }
    vistos.add(chave);
    resultado.push(item);
  }

  return { itens: resultado, duplicatasRemovidas };
}
