import type { MotorLinhaGrupoCds, MotorLinhaGrupoRuptura } from "../types/motorLinhaTypes.ts";
import type { MapearBlocoCdsOpcoes, MotorBlocoCdsEntrada } from "./blocoCdsTypes.ts";
import type { MotorProdutoCdNormalizado } from "./cdTypes.ts";
import { mapearCdsDoBloco, type ValoresCdParseados } from "./mapearCdsDoBloco.ts";

function parseDataIsoOrBr(value: string | null): Date | null {
  if (value == null) return null;
  const t = value.trim();
  if (t === "") return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = Date.parse(t);
  return Number.isNaN(iso) ? null : new Date(iso);
}

function posicaoRuptura(
  linha: MotorLinhaGrupoRuptura,
  n: 1 | 2 | 3 | 4,
  parsed: {
    estoque: number | null;
    pendencia: number | null;
    diasCompra: number | null;
    diasRecebimento: number | null;
  },
): ValoresCdParseados {
  const ultimaCompraKey = `ultimaCpaCd${n}` as keyof MotorLinhaGrupoRuptura;
  const ultimaEntradaKey = `dtaUltEntradaCd${n}` as keyof MotorLinhaGrupoRuptura;
  const estSelecKey = `estSelecInvCd${n}` as keyof MotorLinhaGrupoRuptura;
  const statusKey = `statusCompraCd${n}` as keyof MotorLinhaGrupoRuptura;

  return {
    estoque: parsed.estoque,
    pendencia: parsed.pendencia,
    statusCompra: (linha[statusKey] as string | null) ?? null,
    diasCompra: parsed.diasCompra,
    diasRecebimento: parsed.diasRecebimento,
    ultimaCompra: parseDataIsoOrBr(linha[ultimaCompraKey] as string | null),
    ultimaEntrada: parseDataIsoOrBr(linha[ultimaEntradaKey] as string | null),
    estoqueSelecionadoInventario: null,
  };
}

export function construirCdsDaLinhaRuptura(
  linha: MotorLinhaGrupoRuptura,
  bloco: MotorBlocoCdsEntrada,
  parsed: {
    estCd1: number | null;
    estCd2: number | null;
    estCd3: number | null;
    estCd4: number | null;
    pendCd1: number | null;
    pendCd2: number | null;
    pendCd3: number | null;
    pendCd4: number | null;
    diasCompraCd1: number | null;
    diasCompraCd2: number | null;
    diasCompraCd3: number | null;
    diasCompraCd4: number | null;
    diasRecebtoCd1: number | null;
    diasRecebtoCd2: number | null;
    diasRecebtoCd3: number | null;
    diasRecebtoCd4: number | null;
  },
): MotorProdutoCdNormalizado[] {
  return mapearCdsDoBloco(bloco, [
    {
      posicaoNoArquivo: 1,
      valores: posicaoRuptura(linha, 1, {
        estoque: parsed.estCd1,
        pendencia: parsed.pendCd1,
        diasCompra: parsed.diasCompraCd1,
        diasRecebimento: parsed.diasRecebtoCd1,
      }),
    },
    {
      posicaoNoArquivo: 2,
      valores: posicaoRuptura(linha, 2, {
        estoque: parsed.estCd2,
        pendencia: parsed.pendCd2,
        diasCompra: parsed.diasCompraCd2,
        diasRecebimento: parsed.diasRecebtoCd2,
      }),
    },
    {
      posicaoNoArquivo: 3,
      valores: posicaoRuptura(linha, 3, {
        estoque: parsed.estCd3,
        pendencia: parsed.pendCd3,
        diasCompra: parsed.diasCompraCd3,
        diasRecebimento: parsed.diasRecebtoCd3,
      }),
    },
    {
      posicaoNoArquivo: 4,
      valores: posicaoRuptura(linha, 4, {
        estoque: parsed.estCd4,
        pendencia: parsed.pendCd4,
        diasCompra: parsed.diasCompraCd4,
        diasRecebimento: parsed.diasRecebtoCd4,
      }),
    },
  ], { incluirPosicoesVazias: true });
}

export function construirCdsDaLinhaGrupo2(
  bloco: MotorBlocoCdsEntrada,
  parsed: {
    statusCompra: string | null;
    estoque: number | null;
    pendencia: number | null;
    diasCompra: number | null;
    diasRecebimento: number | null;
    ultimaCompra: string | null;
  },
  opcoes?: MapearBlocoCdsOpcoes,
): MotorProdutoCdNormalizado[] {
  return mapearCdsDoBloco(
    bloco,
    [
      {
        posicaoNoArquivo: 1,
        valores: {
          estoque: parsed.estoque,
          pendencia: parsed.pendencia,
          statusCompra: parsed.statusCompra,
          diasCompra: parsed.diasCompra,
          diasRecebimento: parsed.diasRecebimento,
          ultimaCompra: parseDataIsoOrBr(parsed.ultimaCompra),
          ultimaEntrada: null,
          estoqueSelecionadoInventario: null,
        },
      },
    ],
    opcoes,
  );
}

export function construirCdsDaLinhaGrupo2Completo(
  linha: MotorLinhaGrupoCds,
  bloco: MotorBlocoCdsEntrada,
  parsed: {
    estoque: number | null;
    pendencia: number | null;
    diasCompra: number | null;
    diasRecebimento: number | null;
    ultimaCompra: string | null;
  },
  opcoes?: MapearBlocoCdsOpcoes,
): MotorProdutoCdNormalizado[] {
  return construirCdsDaLinhaGrupo2(
    bloco,
    {
      statusCompra: linha.statusCompraCd5,
      estoque: parsed.estoque,
      pendencia: parsed.pendencia,
      diasCompra: parsed.diasCompra,
      diasRecebimento: parsed.diasRecebimento,
      ultimaCompra: parsed.ultimaCompra,
    },
    opcoes,
  );
}
