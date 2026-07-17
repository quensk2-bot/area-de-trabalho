import type { MotorCdComparacaoEstado, MotorCdConfiguracaoVigente, MotorComparacaoCdResultado, MotorV7CdContexto } from "./cdNormalizationTypes.ts";
import { posicaoParaCodigo } from "./buildCdMapping.ts";
import { conjuntosCodigosEquivalentes, extrairCodigosFisicos, normalizarTextoCdBasico } from "./normalizeCdText.ts";

function estado(
  campo: string,
  estadoResultado: MotorCdComparacaoEstado,
  excel: string | null,
  v7: string | null,
  alertas: string[],
  excelNorm = normalizarTextoCdBasico(excel),
  v7Norm = normalizarTextoCdBasico(v7),
): MotorComparacaoCdResultado {
  return { campo, estado: estadoResultado, valorExcel: excel, valorV7: v7, excelNormalizado: excelNorm, v7Normalizado: v7Norm, alertas };
}

export function normalizeProdutoCentralizado(
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: MotorV7CdContexto,
): MotorComparacaoCdResultado {
  const campo = "Produto Centralizado";
  const alertas = [...config.alertas];
  const excel = excelTexto?.trim() || null;
  const v7Texto = v7.textoProdutoCentralizado?.trim() || null;

  if (!excel && !v7Texto) {
    return estado(campo, "nao_comparavel", excel, v7Texto, alertas);
  }
  if (!excel) {
    return estado(campo, "nao_comparavel", excel, v7Texto, [...alertas, "dado_ausente_excel"]);
  }
  if (!v7Texto) {
    return estado(campo, "nao_comparavel", excel, v7Texto, [...alertas, "dado_ausente_v7"]);
  }

  const exNorm = normalizarTextoCdBasico(excel, config);
  const v7Norm = normalizarTextoCdBasico(v7Texto, config);

  if (excel.toLowerCase() === v7Texto.toLowerCase()) {
    return estado(campo, "igual_exato", excel, v7Texto, alertas, exNorm, v7Norm);
  }

  if (exNorm.naoCentralizado && v7Norm.naoCentralizado) {
    return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);
  }

  if (v7.posicaoCdSelecionada && v7.codigoCdSelecionado != null) {
    const codigoEsperado = posicaoParaCodigo(config, v7.posicaoCdSelecionada);
    if (exNorm.codigoFisico === v7.codigoCdSelecionado || exNorm.codigoFisico === codigoEsperado) {
      return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);
    }
  }

  if (config.mapeamentos.length === 0) {
    return estado(campo, "cadastro_ausente", excel, v7Texto, [...alertas, "cadastro_cd_ausente"]);
  }

  if (exNorm.codigosFisicos.length && v7Norm.codigosFisicos.length) {
    if (conjuntosCodigosEquivalentes(exNorm.codigosFisicos, v7Norm.codigosFisicos)) {
      return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);
    }
    return estado(campo, "divergente_codigo", excel, v7Texto, alertas, exNorm, v7Norm);
  }

  return estado(campo, "divergente_texto", excel, v7Texto, alertas, exNorm, v7Norm);
}

export function normalizeStatusEstoqueCds(
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: MotorV7CdContexto,
): MotorComparacaoCdResultado {
  const campo = "Status Estoque CDs";
  const alertas = [...config.alertas];
  const excel = excelTexto?.trim() || null;
  const v7Texto = v7.statusEstoqueCds?.trim() || null;

  if (!excel && !v7Texto) return estado(campo, "nao_comparavel", excel, v7Texto, alertas);
  if (!excel) return estado(campo, "nao_comparavel", excel, v7Texto, [...alertas, "dado_ausente_excel"]);
  if (!v7Texto) return estado(campo, "nao_comparavel", excel, v7Texto, [...alertas, "dado_ausente_v7"]);

  const exNorm = normalizarTextoCdBasico(excel, config);
  const v7Norm = normalizarTextoCdBasico(v7Texto, config);

  if (excel === v7Texto) return estado(campo, "igual_exato", excel, v7Texto, alertas, exNorm, v7Norm);
  if (exNorm.rupturaCd && v7Norm.rupturaCd) return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);

  const codigosV7Estruturados = Object.entries(v7.flags)
    .filter(([, flag]) => (flag ?? 0) > 0)
    .map(([pos]) => v7.codigosFisicos[pos as keyof typeof v7.codigosFisicos])
    .filter((c): c is number => c != null && c > 0);

  const codigosExcel = exNorm.codigosFisicos;
  const codigosV7Texto = extrairCodigosFisicos(v7Texto);

  if (codigosExcel.length && codigosV7Texto.length && conjuntosCodigosEquivalentes(codigosExcel, codigosV7Texto)) {
    return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);
  }

  if (codigosExcel.length && codigosV7Estruturados.length && conjuntosCodigosEquivalentes(codigosExcel, codigosV7Estruturados)) {
    return estado(campo, "igual_semantico", excel, v7Texto, [...alertas, "formato_texto_v7_sem_parenteses"], exNorm, v7Norm);
  }

  if (codigosExcel.length && !codigosV7Texto.length && v7Texto.startsWith("Estoque no CD:")) {
    return estado(campo, "igual_semantico", excel, v7Texto, [...alertas, "formato_texto_v7_sem_codigo"], exNorm, v7Norm);
  }

  if (config.mapeamentos.length === 0) {
    return estado(campo, "cadastro_ausente", excel, v7Texto, [...alertas, "cadastro_cd_ausente"]);
  }

  return estado(campo, "divergente_texto", excel, v7Texto, alertas, exNorm, v7Norm);
}

export function normalizeStatusAtivacaoCd(
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: MotorV7CdContexto,
): MotorComparacaoCdResultado {
  const campo = "Status Solicitação Ativação CD";
  const alertas = [...config.alertas];
  const excel = excelTexto?.trim() || null;
  const v7Texto = v7.statusSolicitacaoAtivacaoCd?.trim() || null;

  if (!excel && !v7Texto) return estado(campo, "nao_comparavel", excel, v7Texto, alertas);
  if (!excel) return estado(campo, "nao_comparavel", excel, v7Texto, [...alertas, "dado_ausente_excel"]);
  if (!v7Texto) return estado(campo, "nao_comparavel", excel, v7Texto, [...alertas, "dado_ausente_v7"]);

  const exNorm = normalizarTextoCdBasico(excel, config);
  const v7Norm = normalizarTextoCdBasico(v7Texto, config);

  if (excel === v7Texto) return estado(campo, "igual_exato", excel, v7Texto, alertas, exNorm, v7Norm);
  if (exNorm.naoCentralizado && v7Norm.naoCentralizado) return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);
  if (exNorm.ativoNoCd && v7Norm.ativoNoCd) return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);

  if (exNorm.ativoNoCd && v7Norm.naoCentralizado) {
    return estado(campo, "divergente_texto", excel, v7Texto, alertas, exNorm, v7Norm);
  }
  if (exNorm.naoCentralizado && v7Norm.ativoNoCd) {
    return estado(campo, "divergente_texto", excel, v7Texto, alertas, exNorm, v7Norm);
  }

  if (
    exNorm.inativos.length > 0 &&
    v7Norm.inativos.length > 0 &&
    conjuntosCodigosEquivalentes(exNorm.codigosFisicos, v7Norm.codigosFisicos)
  ) {
    return estado(campo, "igual_semantico", excel, v7Texto, alertas, exNorm, v7Norm);
  }

  if (config.mapeamentos.length === 0) {
    return estado(campo, "cadastro_ausente", excel, v7Texto, [...alertas, "cadastro_cd_ausente"]);
  }

  return estado(campo, "divergente_texto", excel, v7Texto, alertas, exNorm, v7Norm);
}

export function compararCampoCd(
  campo: string,
  config: MotorCdConfiguracaoVigente,
  excelTexto: string | null | undefined,
  v7: MotorV7CdContexto,
): MotorComparacaoCdResultado {
  switch (campo) {
    case "Produto Centralizado":
      return normalizeProdutoCentralizado(config, excelTexto, v7);
    case "Status Estoque CDs":
      return normalizeStatusEstoqueCds(config, excelTexto, v7);
    case "Status Solicitação Ativação CD":
      return normalizeStatusAtivacaoCd(config, excelTexto, v7);
    default:
      return {
        campo,
        estado: "nao_comparavel",
        valorExcel: excelTexto ?? null,
        valorV7: null,
        alertas: ["campo_nao_suportado_normalizador"],
      };
  }
}
