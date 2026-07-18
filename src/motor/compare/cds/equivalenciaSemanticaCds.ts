import type { MotorCdConfiguracaoVigente } from "../cdNormalization/cdNormalizationTypes.ts";
import { buildV7CdContexto } from "../cdNormalization/buildV7CdContexto.ts";
import {
  compararCampoCd,
  normalizeProdutoCentralizado,
  normalizeStatusAtivacaoCd,
  normalizeStatusEstoqueCds,
} from "../cdNormalization/normalizeProdutoCentralizado.ts";
import type { MotorCdComparacaoEstado } from "./motorCdComparacaoTypes.ts";

export type MotorEquivalenciaSemanticaResultado = {
  campo: string;
  estado: MotorCdComparacaoEstado;
  valorExcel: string | null;
  valorV7: string | null;
  alertas: string[];
};

export function compararProdutoCentralizadoSemantico(
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7Texto: string | null | undefined,
  v7Posicao: number | null,
  v7Codigo: number | null,
): MotorEquivalenciaSemanticaResultado {
  const v7Ctx = {
    posicaoCdSelecionada: v7Posicao != null ? (`CD${v7Posicao}` as import("../cdNormalization/cdNormalizationTypes.ts").MotorCdPosicaoLogica) : null,
    codigoCdSelecionado: v7Codigo,
    flags: { CD1: null, CD2: null, CD3: null, CD4: null, CD5: null },
    codigosFisicos: { CD1: null, CD2: null, CD3: null, CD4: null, CD5: null },
    textoProdutoCentralizado: v7Texto,
    statusEstoqueCds: null,
    statusSolicitacaoAtivacaoCd: null,
  };
  const r = normalizeProdutoCentralizado(config, excelTexto, v7Ctx);
  return {
    campo: "Produto Centralizado",
    estado: r.estado as MotorCdComparacaoEstado,
    valorExcel: r.valorExcel,
    valorV7: r.valorV7,
    alertas: r.alertas,
  };
}

export function compararStatusEstoqueSemantico(
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: ReturnType<typeof buildV7CdContexto>,
): MotorEquivalenciaSemanticaResultado {
  const r = normalizeStatusEstoqueCds(config, excelTexto, v7);
  return {
    campo: "Status Estoque CDs",
    estado: r.estado as MotorCdComparacaoEstado,
    valorExcel: r.valorExcel,
    valorV7: r.valorV7,
    alertas: r.alertas,
  };
}

export function compararStatusAtivacaoSemantico(
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: ReturnType<typeof buildV7CdContexto>,
): MotorEquivalenciaSemanticaResultado {
  const r = normalizeStatusAtivacaoCd(config, excelTexto, v7);
  return {
    campo: "Status Solicitação Ativação CD",
    estado: r.estado as MotorCdComparacaoEstado,
    valorExcel: r.valorExcel,
    valorV7: r.valorV7,
    alertas: r.alertas,
  };
}

export function compararCampoTextoCdSemantico(
  campo: string,
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: ReturnType<typeof buildV7CdContexto>,
): MotorEquivalenciaSemanticaResultado {
  const r = compararCampoCd(campo, config, excelTexto, v7);
  return {
    campo,
    estado: r.estado as MotorCdComparacaoEstado,
    valorExcel: r.valorExcel,
    valorV7: r.valorV7,
    alertas: r.alertas,
  };
}
