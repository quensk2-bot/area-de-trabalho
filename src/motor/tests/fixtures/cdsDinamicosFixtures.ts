import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";
import type { MotorBlocoCdsEntrada } from "../../cds/blocoCdsTypes.ts";

export function cdBase(
  posicaoLogica: number,
  overrides: Partial<MotorProdutoCdNormalizado> = {},
): MotorProdutoCdNormalizado {
  return {
    posicaoLogica,
    codigoFisico: null,
    estoque: null,
    pendencia: null,
    statusCompra: null,
    diasCompra: null,
    diasRecebimento: null,
    ultimaCompra: null,
    ultimaEntrada: null,
    estoqueSelecionadoInventario: null,
    origemArquivo: "fixture.txt",
    numeroBloco: 1,
    posicaoNoArquivo: posicaoLogica,
    alertas: [],
    ...overrides,
  };
}

export function blocoBase(overrides: Partial<MotorBlocoCdsEntrada> = {}): MotorBlocoCdsEntrada {
  return {
    arquivo: "1º Grupo de Ruptura.txt",
    regional: "MT",
    dataReferencia: "2026-03-26",
    numeroBloco: 1,
    posicaoInicial: 1,
    quantidadePosicoes: 4,
    hash: "",
    origem: "erp_relatorio_ruptura",
    ...overrides,
  };
}

export function colecaoN(n: number, regional = "MT"): MotorProdutoCdNormalizado[] {
  return Array.from({ length: n }, (_, i) =>
    cdBase(i + 1, {
      estoque: (i + 1) * 10,
      pendencia: i,
      statusCompra: "COMPRAR",
      diasCompra: i + 1,
      diasRecebimento: i + 2,
      origemArquivo: `${regional}-bloco.txt`,
      numeroBloco: Math.floor(i / 4) + 1,
      posicaoNoArquivo: (i % 4) + 1,
    }),
  );
}

export function payloadBlocoCompleto(): Record<string, string> {
  return {
    ESTQ_CD1: "100",
    ESTQ_CD2: "200",
    ESTQ_CD3: "300",
    ESTQ_CD4: "400",
    PENDCD_CD1: "1",
    PENDCD_CD2: "2",
    PENDCD_CD3: "3",
    PENDCD_CD4: "4",
    STATUS_COMPRA_CD1: "A",
    STATUS_COMPRA_CD2: "B",
    STATUS_COMPRA_CD3: "C",
    STATUS_COMPRA_CD4: "D",
    DIAS_DA_COMPRACD1: "5",
    DIAS_DA_COMPRACD2: "6",
    DIAS_DA_COMPRACD3: "7",
    DIAS_DA_COMPRACD4: "8",
    DIAS_RECEBTO_CD1: "1",
    DIAS_RECEBTO_CD2: "2",
    DIAS_RECEBTO_CD3: "3",
    DIAS_RECEBTO_CD4: "4",
  };
}
