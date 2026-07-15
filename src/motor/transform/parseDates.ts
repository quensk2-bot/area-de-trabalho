import type { MotorErroValidacao } from "../types/motorTypes.ts";

const BR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ERP_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})\.(\d{2})\.(\d{2})\.(\d{6})$/;

export function parseDataBrasileira(
  value: string | null | undefined,
  campo: string,
  numeroLinha: number | null = null,
): { valor: string | null; erro: MotorErroValidacao | null } {
  const text = value?.trim() ?? "";
  if (text === "") return { valor: null, erro: null };

  const match = BR_DATE.exec(text);
  if (!match) {
    return {
      valor: null,
      erro: {
        numeroLinha,
        campo,
        valorOriginal: value ?? null,
        codigoErro: "DATA_INVALIDA",
        mensagem: `Data brasileira inválida: ${text}`,
        severidade: "erro",
      },
    };
  }

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
    return {
      valor: null,
      erro: {
        numeroLinha,
        campo,
        valorOriginal: value ?? null,
        codigoErro: "DATA_INVALIDA",
        mensagem: `Data brasileira inválida: ${text}`,
        severidade: "erro",
      },
    };
  }

  return { valor: `${yyyy}-${mm}-${dd}`, erro: null };
}

export function parseTimestampErp(
  value: string | null | undefined,
  campo: string,
  numeroLinha: number | null = null,
): { valor: string | null; erro: MotorErroValidacao | null } {
  const text = value?.trim() ?? "";
  if (text === "") return { valor: null, erro: null };

  const match = ERP_TIMESTAMP.exec(text);
  if (!match) {
    return {
      valor: null,
      erro: {
        numeroLinha,
        campo,
        valorOriginal: value ?? null,
        codigoErro: "TIMESTAMP_ERP_INVALIDO",
        mensagem: `Timestamp ERP inválido: ${text}`,
        severidade: "erro",
      },
    };
  }

  const [, yyyy, mm, dd] = match;
  return { valor: `${yyyy}-${mm}-${dd}`, erro: null };
}

export function isTimestampErp(value: string): boolean {
  return ERP_TIMESTAMP.test(value.trim());
}

export function isDataBrasileira(value: string): boolean {
  return BR_DATE.test(value.trim());
}
