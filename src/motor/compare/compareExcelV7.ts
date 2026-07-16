import type {
  CompareFieldConfig,
  CompareFieldResult,
  CompareResult,
  CompareRowInput,
  CompareRowResult,
  CompareStatus,
  CompareSummary,
} from "./compareTypes.ts";

function isNullish(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function valoresIguais(
  excel: string | number | boolean | null,
  v7: string | number | boolean | null,
  tolerancia?: number,
): { igual: boolean; status: CompareStatus } {
  if (isNullish(excel) && isNullish(v7)) return { igual: true, status: "igual" };
  if (isNullish(excel)) return { igual: false, status: "ausente_no_excel" };
  if (isNullish(v7)) return { igual: false, status: "ausente_no_v7" };

  if (typeof excel === "number" && typeof v7 === "number" && tolerancia != null) {
    const diff = Math.abs(excel - v7);
    if (diff <= tolerancia) return { igual: true, status: "tolerancia_decimal" };
  }

  const normExcel = String(excel).trim().toLowerCase();
  const normV7 = String(v7).trim().toLowerCase();
  if (normExcel === normV7) return { igual: true, status: "igual" };
  return { igual: false, status: "divergente" };
}

export function compararCampo(
  campo: string,
  excel: string | number | boolean | null | undefined,
  v7: string | number | boolean | null | undefined,
  config?: CompareFieldConfig,
): CompareFieldResult {
  if (config?.comparavelNestaEtapa === false) {
    return {
      campo,
      status: "nao_comparavel",
      valorExcel: excel ?? null,
      valorV7: v7 ?? null,
      motivo: "Campo bloqueado nesta etapa (Fase 2B.1)",
    };
  }

  const excelVal = excel ?? null;
  const v7Val = v7 ?? null;
  const { status } = valoresIguais(excelVal, v7Val, config?.toleranciaDecimal);

  return {
    campo,
    status,
    valorExcel: excelVal,
    valorV7: v7Val,
    motivo:
      status === "igual"
        ? "Valores equivalentes"
        : status === "tolerancia_decimal"
          ? `Diferença dentro da tolerância (${config?.toleranciaDecimal})`
          : status === "ausente_no_v7"
            ? "V7 ainda não produz este campo"
            : status === "ausente_no_excel"
              ? "Excel sem valor para o campo"
              : status === "nao_comparavel"
                ? "Campo não comparável"
                : "Valores divergentes",
  };
}

export function compararLinha(
  input: CompareRowInput,
  campos: CompareFieldConfig[],
): CompareRowResult {
  const resultados = campos.map((cfg) =>
    compararCampo(cfg.campo, input.excel[cfg.campo], input.v7[cfg.campo], cfg),
  );

  return {
    chave: `${input.loja}|${input.produto}`,
    loja: input.loja,
    produto: input.produto,
    campos: resultados,
    divergencias: resultados.filter((c) => c.status === "divergente").length,
  };
}

export function compararExcelV7(
  linhas: CompareRowInput[],
  campos: CompareFieldConfig[] = [],
): CompareResult {
  const campoConfigs = campos.length > 0 ? campos : [];
  const resultados = linhas.map((linha) => compararLinha(linha, campoConfigs));

  const resumo: CompareSummary = {
    totalLinhas: resultados.length,
    totalCampos: resultados.reduce((acc, r) => acc + r.campos.length, 0),
    iguais: 0,
    divergentes: 0,
    ausentesNoV7: 0,
    ausentesNoExcel: 0,
    naoComparaveis: 0,
    toleranciaDecimal: 0,
  };

  for (const linha of resultados) {
    for (const campo of linha.campos) {
      switch (campo.status) {
        case "igual":
          resumo.iguais++;
          break;
        case "divergente":
          resumo.divergentes++;
          break;
        case "ausente_no_v7":
          resumo.ausentesNoV7++;
          break;
        case "ausente_no_excel":
          resumo.ausentesNoExcel++;
          break;
        case "nao_comparavel":
          resumo.naoComparaveis++;
          break;
        case "tolerancia_decimal":
          resumo.toleranciaDecimal++;
          break;
      }
    }
  }

  return { linhas: resultados, resumo };
}
