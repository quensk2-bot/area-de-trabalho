import type { MotorComparacaoCdResultado, MotorDivergenciaClassificacao, MotorDivergenciaReclassificada } from "./cdNormalization/cdNormalizationTypes.ts";

const COLUNAS_AUSENTES_RESULTADO = new Set([
  "Base Limpa",
  "Menor Recebto CD",
  "Produto Centralizado",
  "1ºCD",
  "2ºCD",
  "3ºCD",
  "4ºCD",
  "5ºCD",
  "Status Recebto",
]);

const COLUNAS_INTERMEDIARIAS = new Set([
  "Pendência Cpa CD",
  "Cross Docking",
  "Mod_CurtoPrazo",
  "NCurtoPrazo",
  "Avaliar Pedido",
  "Estrura Real",
  "Flag Ruptura 104c",
  "Soma_EstoqueCD",
]);

const CAMPOS_CD_NORMALIZADOS = new Set([
  "Produto Centralizado",
  "Status Estoque CDs",
  "Status Solicitação Ativação CD",
]);

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function valoresIguais(
  a: string | number | boolean | null,
  b: string | number | boolean | null,
  tolerancia?: number,
): boolean {
  if (isNullish(a) && isNullish(b)) return true;
  if (typeof a === "number" && typeof b === "number" && tolerancia != null) {
    return Math.abs(a - b) <= tolerancia;
  }
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

export function classificarCampoGenerico(input: {
  campo: string;
  valorExcel: string | number | boolean | null;
  valorV7: string | number | boolean | null;
  toleranciaDecimal?: number;
  colunasExcelPresentes?: Set<string>;
}): MotorDivergenciaClassificacao {
  const { campo, valorExcel, valorV7, toleranciaDecimal, colunasExcelPresentes } = input;

  if (colunasExcelPresentes && !colunasExcelPresentes.has(campo) && COLUNAS_AUSENTES_RESULTADO.has(campo)) {
    return isNullish(valorExcel) ? "dado_ausente_excel" : "cadastro_cd_ausente";
  }

  if (COLUNAS_INTERMEDIARIAS.has(campo)) return "coluna_excel_intermediaria";
  if (isNullish(valorExcel) && !isNullish(valorV7)) return "dado_ausente_excel";
  if (!isNullish(valorExcel) && isNullish(valorV7)) return "dado_ausente_v7";
  if (valoresIguais(valorExcel, valorV7, toleranciaDecimal)) return "igual_exato";

  if (/COMPRADOR/i.test(campo)) return "comprador";
  if (/Rede/i.test(campo)) return "join";
  if (/Curto|Médio|Longo|Dias Pedido|Ação|Menor que|Ruptura|Inventário|Base Limpa/i.test(campo)) return "bre";
  if (CAMPOS_CD_NORMALIZADOS.has(campo)) return "centralizacao";
  return "transformacao";
}

export function severidadeDaClassificacao(
  classificacao: MotorDivergenciaClassificacao,
  estadoCd?: MotorComparacaoCdResultado["estado"],
): "critica" | "informativa" | "tolerada" {
  if (classificacao === "igual_exato" || classificacao === "igual_semantico") return "informativa";
  if (classificacao === "dado_ausente_excel" || classificacao === "dado_ausente_v7") return "informativa";
  if (classificacao === "coluna_excel_intermediaria") return "informativa";
  if (classificacao === "formato") return "informativa";
  if (classificacao === "cadastro_cd_ausente" || classificacao === "vigencia_cd_ausente") return "informativa";
  if (classificacao === "nao_comparavel") return "informativa";
  if (estadoCd === "igual_semantico" || estadoCd === "igual_exato") return "informativa";
  if (estadoCd === "cadastro_ausente" || estadoCd === "vigencia_ausente") return "informativa";
  if (classificacao === "texto_fisico_vs_logico") return "informativa";
  if (classificacao === "erro_real") return "critica";
  if (classificacao === "bre" || classificacao === "comprador" || classificacao === "join") return "critica";
  if (classificacao === "centralizacao" && estadoCd === "divergente_texto") return "critica";
  return "informativa";
}

export function mapearEstadoCdParaClassificacao(
  estado: MotorComparacaoCdResultado["estado"],
  campo?: string,
): MotorDivergenciaClassificacao {
  switch (estado) {
    case "igual_exato":
      return "igual_exato";
    case "igual_semantico":
      return "igual_semantico";
    case "cadastro_ausente":
      return "cadastro_cd_ausente";
    case "vigencia_ausente":
      return "vigencia_cd_ausente";
    case "divergente_codigo":
    case "divergente_posicao":
      return "texto_fisico_vs_logico";
    case "divergente_valor":
      return "transformacao";
    case "posicao_ausente_excel":
      return "dado_ausente_excel";
    case "posicao_ausente_v7":
      return "dado_ausente_v7";
    case "codigo_fisico_ausente":
      return "cadastro_cd_ausente";
    case "coluna_nao_reconhecida":
      return "formato";
    case "divergente_texto":
      if (campo === "Status Solicitação Ativação CD" || campo === "Status Estoque CDs") {
        return "texto_fisico_vs_logico";
      }
      return "centralizacao";
    default:
      return "nao_comparavel";
  }
}

export function reclassificarComparacaoCampo(input: {
  loja: number;
  seqproduto: number;
  descricao: string | null;
  fornecedor: string | null;
  campo: string;
  valorExcel: string | number | boolean | null;
  valorV7: string | number | boolean | null;
  toleranciaDecimal?: number;
  colunasExcelPresentes?: Set<string>;
  resultadoCd?: MotorComparacaoCdResultado;
}): MotorDivergenciaReclassificada | null {
  let classificacao: MotorDivergenciaClassificacao;
  let estadoCd = input.resultadoCd?.estado;

  if (input.resultadoCd) {
    classificacao = mapearEstadoCdParaClassificacao(input.resultadoCd.estado, input.campo);
    if (input.resultadoCd.alertas.some((a) => a.startsWith("formato_"))) {
      classificacao = "formato";
    }
  } else {
    classificacao = classificarCampoGenerico(input);
  }

  if (classificacao === "igual_exato" || classificacao === "igual_semantico") {
    return null;
  }

  const severidade = severidadeDaClassificacao(classificacao, estadoCd);

  return {
    loja: input.loja,
    seqproduto: input.seqproduto,
    descricao: input.descricao,
    fornecedor: input.fornecedor,
    campo: input.campo,
    valorExcel: input.valorExcel,
    valorV7: input.valorV7,
    classificacao,
    severidade,
    estadoCd,
    observacao: input.resultadoCd
      ? `${input.resultadoCd.estado}:${input.resultadoCd.alertas.join(",")}`
      : classificacao,
  };
}

export function resumirReclassificacao(divs: MotorDivergenciaReclassificada[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of divs) {
    counts[d.classificacao] = (counts[d.classificacao] ?? 0) + 1;
  }
  return counts;
}
