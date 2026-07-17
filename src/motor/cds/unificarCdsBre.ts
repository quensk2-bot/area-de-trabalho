import type { MotorBreItemInput } from "../../bre/breTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../../types/motorProdutoLojaNormalizado.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";
import { mergeBlocosCds } from "./mergeBlocosCds.ts";
import { ordenarCdsPorPosicao } from "./validarColecaoCds.ts";

function cdFromFlat(
  posicaoLogica: number,
  valores: {
    estoque: number | null;
    pendencia: number | null;
    statusCompra: string | null;
    diasCompra: number | null;
    diasRecebimento: number | null;
    estoqueSelecionadoInventario?: number | null;
  },
  origemArquivo: string,
): MotorProdutoCdNormalizado {
  return {
    posicaoLogica,
    codigoFisico: null,
    estoque: valores.estoque,
    pendencia: valores.pendencia,
    statusCompra: valores.statusCompra,
    diasCompra: valores.diasCompra,
    diasRecebimento: valores.diasRecebimento,
    ultimaCompra: null,
    ultimaEntrada: null,
    estoqueSelecionadoInventario: valores.estoqueSelecionadoInventario ?? null,
    origemArquivo,
    numeroBloco: posicaoLogica <= 4 ? 1 : 2,
    posicaoNoArquivo: posicaoLogica <= 4 ? posicaoLogica : 1,
    alertas: [],
  };
}

export function construirCdsDeCamposFlat(
  produto: MotorProdutoLojaNormalizado,
  cd5: MotorCd5Normalizado | null | undefined,
  estSelecInv?: {
    estSelecInvCd1: number | null;
    estSelecInvCd2: number | null;
    estSelecInvCd3: number | null;
    estSelecInvCd4: number | null;
  },
): MotorProdutoCdNormalizado[] {
  const inv = estSelecInv;
  const cds: MotorProdutoCdNormalizado[] = [
    cdFromFlat(1, {
      estoque: produto.estoqueCd1,
      pendencia: produto.pendenciaCd1,
      statusCompra: produto.statusCompraCd1,
      diasCompra: produto.diasCompraCd1,
      diasRecebimento: produto.diasRecebtoCd1,
      estoqueSelecionadoInventario: inv?.estSelecInvCd1 ?? null,
    }, "flat-produto"),
    cdFromFlat(2, {
      estoque: produto.estoqueCd2,
      pendencia: produto.pendenciaCd2,
      statusCompra: produto.statusCompraCd2,
      diasCompra: produto.diasCompraCd2,
      diasRecebimento: produto.diasRecebtoCd2,
      estoqueSelecionadoInventario: inv?.estSelecInvCd2 ?? null,
    }, "flat-produto"),
    cdFromFlat(3, {
      estoque: produto.estoqueCd3,
      pendencia: produto.pendenciaCd3,
      statusCompra: produto.statusCompraCd3,
      diasCompra: produto.diasCompraCd3,
      diasRecebimento: produto.diasRecebtoCd3,
      estoqueSelecionadoInventario: inv?.estSelecInvCd3 ?? null,
    }, "flat-produto"),
    cdFromFlat(4, {
      estoque: produto.estoqueCd4,
      pendencia: produto.pendenciaCd4,
      statusCompra: produto.statusCompraCd4,
      diasCompra: produto.diasCompraCd4,
      diasRecebimento: produto.diasRecebtoCd4,
      estoqueSelecionadoInventario: inv?.estSelecInvCd4 ?? null,
    }, "flat-produto"),
  ];

  if (cd5) {
    cds.push(
      cdFromFlat(5, {
        estoque: cd5.estoqueCd5,
        pendencia: cd5.pendenciaCd5,
        statusCompra: cd5.statusCompraCd5,
        diasCompra: cd5.diasCompraCd5,
        diasRecebimento: cd5.diasRecebtoCd5,
      }, "flat-cd5"),
    );
  }

  return ordenarCdsPorPosicao(cds);
}

export function unificarCdsBre(input: MotorBreItemInput): MotorProdutoCdNormalizado[] {
  const blocos: MotorProdutoCdNormalizado[][] = [];
  if (input.produto.cds?.length) blocos.push([...input.produto.cds]);
  if (input.cd5?.cds?.length) blocos.push([...input.cd5.cds]);

  if (blocos.length > 0) {
    const merged = mergeBlocosCds(blocos);
    if (merged.cds.length > 0) return merged.cds;
  }

  return construirCdsDeCamposFlat(input.produto, input.cd5, input.estSelecInv ?? undefined);
}

export function cdsFromCentralizacaoEntrada(entrada: {
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  estoqueCd5: number | null;
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  statusCompraCd5: string | null;
}): MotorProdutoCdNormalizado[] {
  return construirCdsDeCamposFlat(
    {
      regional: "",
      dataReferencia: "",
      loja: 0,
      seqproduto: 0,
      descricao: null,
      codFornecedor: null,
      fornecedor: null,
      statusProduto: null,
      familia: null,
      mediaVendaUnDia: null,
      mediaVendaGp: null,
      estoqueLoja: null,
      parMin: null,
      parMax: null,
      pendenciaLoja: null,
      diasCompraLj: null,
      diasCompraCd1: null,
      diasCompraCd2: null,
      diasCompraCd3: null,
      diasCompraCd4: null,
      diasRecebtoCd1: entrada.diasRecebtoCd1,
      diasRecebtoCd2: entrada.diasRecebtoCd2,
      diasRecebtoCd3: entrada.diasRecebtoCd3,
      diasRecebtoCd4: entrada.diasRecebtoCd4,
      estoqueCd1: entrada.estoqueCd1,
      estoqueCd2: entrada.estoqueCd2,
      estoqueCd3: entrada.estoqueCd3,
      estoqueCd4: entrada.estoqueCd4,
      pendenciaCd1: null,
      pendenciaCd2: null,
      pendenciaCd3: null,
      pendenciaCd4: null,
      statusCompraCd1: entrada.statusCompraCd1,
      statusCompraCd2: entrada.statusCompraCd2,
      statusCompraCd3: entrada.statusCompraCd3,
      statusCompraCd4: entrada.statusCompraCd4,
      embalagemCompra: null,
      hierarquia: {
        categoriaOriginal: null,
        divisao: null,
        setorN2: null,
        grupoN3: null,
        subgrupoN4: null,
        tipoN5: null,
        niveisEncontrados: 0,
        ambiguidade: null,
      },
      diasRuptura: null,
      ultimaEntradaLoja: null,
      ultimaSaidaLoja: null,
      custoLiquido: null,
      cds: [],
      alertas: [],
    },
    {
      seqproduto: 0,
      statusCompraCd5: entrada.statusCompraCd5,
      estoqueCd5: entrada.estoqueCd5,
      pendenciaCd5: null,
      diasCompraCd5: null,
      diasRecebtoCd5: entrada.diasRecebtoCd5,
      ultimaCpaCd5: null,
      cds: [],
    },
  );
}
