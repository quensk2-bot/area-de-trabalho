import type { MotorErroValidacao } from "../types/motorTypes.ts";

export function parseDecimalBr(
  value: string | null | undefined,
  campo: string,
  numeroLinha: number | null = null,
): { valor: number | null; erro: MotorErroValidacao | null } {
  const text = value?.trim() ?? "";
  if (text === "") return { valor: null, erro: null };

  const normalized = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return {
      valor: null,
      erro: {
        numeroLinha,
        campo,
        valorOriginal: value ?? null,
        codigoErro: "DECIMAL_INVALIDO",
        mensagem: `Valor decimal inválido: ${text}`,
        severidade: "erro",
      },
    };
  }
  return { valor: parsed, erro: null };
}

export function parseInteiro(
  value: string | null | undefined,
  campo: string,
  numeroLinha: number | null = null,
): { valor: number | null; erro: MotorErroValidacao | null } {
  const text = value?.trim() ?? "";
  if (text === "") return { valor: null, erro: null };

  const normalized = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return {
      valor: null,
      erro: {
        numeroLinha,
        campo,
        valorOriginal: value ?? null,
        codigoErro: "INTEIRO_INVALIDO",
        mensagem: `Valor inteiro inválido: ${text}`,
        severidade: "erro",
      },
    };
  }
  return { valor: parsed, erro: null };
}

export function parseNumeroFlexivel(value: string | null | undefined): number | null {
  const text = value?.trim() ?? "";
  if (text === "") return null;
  const normalized = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
