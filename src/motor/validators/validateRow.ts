import type { MotorErroValidacao } from "../types/motorTypes.ts";

export type RowValidationResult = {
  ok: boolean;
  erros: MotorErroValidacao[];
};

export function validateRowColumnCount(
  numeroLinha: number,
  colunasEncontradas: number,
  colunasEsperadas: number,
): RowValidationResult {
  if (colunasEncontradas === colunasEsperadas) {
    return { ok: true, erros: [] };
  }

  const codigo =
    colunasEncontradas < colunasEsperadas ? "COLUNAS_FALTANTES" : "COLUNAS_EXCEDENTES";

  return {
    ok: false,
    erros: [
      {
        numeroLinha,
        campo: null,
        valorOriginal: String(colunasEncontradas),
        codigoErro: codigo,
        mensagem: `Linha ${numeroLinha}: ${colunasEncontradas} colunas (esperado ${colunasEsperadas})`,
        severidade: "erro",
      },
    ],
  };
}

export function mapRowToObject(
  cabecalhos: string[],
  colunas: string[],
): Record<string, string> {
  const payload: Record<string, string> = {};
  for (let i = 0; i < cabecalhos.length; i++) {
    payload[cabecalhos[i]] = colunas[i] ?? "";
  }
  return payload;
}
