import type {
  MotorCdCampoComparavel,
  MotorCdComparacaoEstado,
  MotorCdComparacaoItem,
  MotorComparacaoCdCampoDetalhe,
  MotorComparacaoCdPosicaoResultado,
  MotorComparacaoCdsProdutoResultado,
} from "./motorCdComparacaoTypes.ts";
import { ESTADOS_CD_IGUAIS } from "./motorCdComparacaoTypes.ts";

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function compararValorCampo(
  excel: string | number | null,
  v7: string | number | null,
): MotorCdComparacaoEstado {
  if (isNullish(excel) && isNullish(v7)) return "igual_exato";
  if (isNullish(excel)) return "posicao_ausente_excel";
  if (isNullish(v7)) return "posicao_ausente_v7";
  if (typeof excel === "number" && typeof v7 === "number") {
    return excel === v7 ? "igual_exato" : "divergente_valor";
  }
  const a = String(excel).trim().toLowerCase();
  const b = String(v7).trim().toLowerCase();
  return a === b ? "igual_exato" : "divergente_valor";
}

function valorCampo(item: MotorCdComparacaoItem, campo: MotorCdCampoComparavel): string | number | null {
  switch (campo) {
    case "estoque":
      return item.estoque;
    case "pendencia":
      return item.pendencia;
    case "statusCompra":
      return item.statusCompra;
    case "diasCompra":
      return item.diasCompra;
    case "diasRecebimento":
      return item.diasRecebimento;
    case "flagCentralizacao":
      return item.flagCentralizacao;
  }
}

function piorEstado(estados: MotorCdComparacaoEstado[]): MotorCdComparacaoEstado {
  const prioridade: MotorCdComparacaoEstado[] = [
    "divergente_codigo",
    "divergente_posicao",
    "divergente_valor",
    "posicao_ausente_excel",
    "posicao_ausente_v7",
    "codigo_fisico_ausente",
    "cadastro_ausente",
    "nao_comparavel",
    "igual_semantico",
    "igual_exato",
  ];
  for (const p of prioridade) {
    if (estados.includes(p)) return p;
  }
  return "nao_comparavel";
}

export type CompararCdsPorPosicaoOpcoes = {
  compararCodigoFisico?: boolean;
  campos?: MotorCdCampoComparavel[];
};

export function compararCdsPorPosicao(
  excelCds: readonly MotorCdComparacaoItem[],
  v7Cds: readonly MotorCdComparacaoItem[],
  opcoes: CompararCdsPorPosicaoOpcoes = {},
): MotorComparacaoCdPosicaoResultado[] {
  const compararCodigoFisico = opcoes.compararCodigoFisico ?? true;
  const campos = opcoes.campos ?? ["estoque", "pendencia", "statusCompra", "diasCompra", "diasRecebimento"];

  const excelMap = new Map<number, MotorCdComparacaoItem>();
  const v7Map = new Map<number, MotorCdComparacaoItem>();
  for (const c of excelCds) excelMap.set(c.posicaoLogica, c);
  for (const c of v7Cds) v7Map.set(c.posicaoLogica, c);

  const posicoes = [...new Set([...excelMap.keys(), ...v7Map.keys()])].sort((a, b) => a - b);
  const resultados: MotorComparacaoCdPosicaoResultado[] = [];

  for (const posicao of posicoes) {
    const ex = excelMap.get(posicao);
    const v7 = v7Map.get(posicao);
    const alertas: string[] = [];
    const detalhes: MotorComparacaoCdCampoDetalhe[] = [];
    const camposIguais: MotorCdCampoComparavel[] = [];
    const camposDivergentes: MotorCdCampoComparavel[] = [];
    const estados: MotorCdComparacaoEstado[] = [];

    if (!ex) {
      resultados.push({
        posicaoLogica: posicao,
        estado: "posicao_ausente_excel",
        codigoExcel: null,
        codigoV7: v7?.codigoFisico ?? null,
        camposIguais: [],
        camposDivergentes: campos,
        alertas: ["posicao_ausente_excel"],
        detalhes: [],
      });
      continue;
    }
    if (!v7) {
      resultados.push({
        posicaoLogica: posicao,
        estado: "posicao_ausente_v7",
        codigoExcel: ex.codigoFisico,
        codigoV7: null,
        camposIguais: [],
        camposDivergentes: campos,
        alertas: ["posicao_ausente_v7"],
        detalhes: [],
      });
      continue;
    }

    const codigoExcel = ex.codigoFisico;
    const codigoV7 = v7.codigoFisico;

    if (compararCodigoFisico && codigoExcel != null && codigoV7 != null && codigoExcel !== codigoV7) {
      estados.push("divergente_codigo");
    } else if (
      compararCodigoFisico &&
      ((codigoExcel != null && codigoV7 == null) || (codigoExcel == null && codigoV7 != null))
    ) {
      estados.push("codigo_fisico_ausente");
    }

    for (const campo of campos) {
      const valorExcel = valorCampo(ex, campo);
      const valorV7 = valorCampo(v7, campo);
      const estadoCampo = compararValorCampo(valorExcel, valorV7);
      detalhes.push({ campo, valorExcel, valorV7, estado: estadoCampo });
      estados.push(estadoCampo);
      if (ESTADOS_CD_IGUAIS.has(estadoCampo)) camposIguais.push(campo);
      else camposDivergentes.push(campo);
    }

    resultados.push({
      posicaoLogica: posicao,
      estado: piorEstado(estados),
      codigoExcel,
      codigoV7,
      camposIguais,
      camposDivergentes,
      alertas,
      detalhes,
    });
  }

  return resultados;
}

export function compararCdsProduto(
  loja: number,
  seqproduto: number,
  excelCds: readonly MotorCdComparacaoItem[],
  v7Cds: readonly MotorCdComparacaoItem[],
  opcoes?: CompararCdsPorPosicaoOpcoes,
): MotorComparacaoCdsProdutoResultado {
  const posicoes = compararCdsPorPosicao(excelCds, v7Cds, opcoes);
  const divergencias = posicoes.filter((p) => !ESTADOS_CD_IGUAIS.has(p.estado)).length;
  return {
    loja,
    seqproduto,
    posicoes,
    divergencias,
    alertas: posicoes.flatMap((p) => p.alertas),
  };
}
