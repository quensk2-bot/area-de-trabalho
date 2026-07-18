import type { MotorCdCampoExportacao, MotorFormatoCabecalhoCd } from "./exportTypes.ts";
import { PREFIXOS_EXPORT } from "./perfisExportacaoCd.ts";

export function gerarNomeColunaCd(
  campo: MotorCdCampoExportacao,
  posicaoLogica: number,
  codigoFisico: number | null,
  formato: MotorFormatoCabecalhoCd,
  usarCodigoFisico: boolean,
): string {
  const prefixo = PREFIXOS_EXPORT[campo];

  if ((formato === "fisico" || usarCodigoFisico) && codigoFisico != null) {
    return `${prefixo}_${codigoFisico}`;
  }

  if (formato === "misto" && codigoFisico != null) {
    return `${prefixo}_CD${posicaoLogica}_${codigoFisico}`;
  }

  if (formato === "descricao" && codigoFisico != null) {
    return `${prefixo}_CD${posicaoLogica}_${codigoFisico}`;
  }

  return `${prefixo}_CD${posicaoLogica}`;
}

export function gerarCabecalhosCds(
  quantidadePosicoes: number,
  campos: readonly MotorCdCampoExportacao[],
  formato: MotorFormatoCabecalhoCd,
  catalogoPorPosicao?: ReadonlyMap<number, number | null>,
): string[] {
  const headers: string[] = [];
  for (let pos = 1; pos <= quantidadePosicoes; pos++) {
    const codigo = catalogoPorPosicao?.get(pos) ?? null;
    for (const campo of campos) {
      headers.push(gerarNomeColunaCd(campo, pos, codigo, formato, false));
    }
  }
  return headers;
}
