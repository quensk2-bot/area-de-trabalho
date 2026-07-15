import type { MotorErroValidacao } from "../types/motorTypes.ts";

export type HeaderValidationResult = {
  ok: boolean;
  cabecalhos: string[];
  erros: MotorErroValidacao[];
};

export function validateHeader(
  cabecalhos: string[],
  esperados: readonly string[],
  numeroLinha = 1,
): HeaderValidationResult {
  const erros: MotorErroValidacao[] = [];
  const normalizados = cabecalhos.map((h) => h.trim());

  if (normalizados.length !== esperados.length) {
    erros.push({
      numeroLinha,
      campo: "CABECALHO",
      valorOriginal: String(normalizados.length),
      codigoErro: "CABECALHO_COLUNAS",
      mensagem: `Esperado ${esperados.length} colunas, encontrado ${normalizados.length}`,
      severidade: "critico",
    });
  }

  for (let i = 0; i < esperados.length; i++) {
    const esperado = esperados[i];
    const encontrado = normalizados[i];
    if (encontrado !== esperado) {
      erros.push({
        numeroLinha,
        campo: esperado,
        valorOriginal: encontrado ?? null,
        codigoErro: "CABECALHO_COLUNA",
        mensagem: `Coluna ${i + 1}: esperado "${esperado}", encontrado "${encontrado ?? ""}"`,
        severidade: "critico",
      });
    }
  }

  return { ok: erros.length === 0, cabecalhos: normalizados, erros };
}

export function validateHeaderSet(
  cabecalhos: string[],
  esperados: readonly string[],
  numeroLinha = 1,
): HeaderValidationResult {
  const erros: MotorErroValidacao[] = [];
  const normalizados = cabecalhos.map((h) => h.trim());
  const presentes = new Set(normalizados);

  if (normalizados.length !== esperados.length) {
    erros.push({
      numeroLinha,
      campo: "CABECALHO",
      valorOriginal: String(normalizados.length),
      codigoErro: "CABECALHO_COLUNAS",
      mensagem: `Esperado ${esperados.length} colunas, encontrado ${normalizados.length}`,
      severidade: "critico",
    });
  }

  for (const col of esperados) {
    if (!presentes.has(col)) {
      erros.push({
        numeroLinha,
        campo: col,
        valorOriginal: null,
        codigoErro: "CABECALHO_COLUNA_AUSENTE",
        mensagem: `Coluna obrigatória ausente: ${col}`,
        severidade: "critico",
      });
    }
  }

  const extras = normalizados.filter((c) => !(esperados as readonly string[]).includes(c));
  for (const extra of extras) {
    erros.push({
      numeroLinha,
      campo: extra,
      valorOriginal: extra,
      codigoErro: "CABECALHO_COLUNA_EXTRA",
      mensagem: `Coluna não oficial encontrada: ${extra}`,
      severidade: "aviso",
    });
  }

  const errosCriticos = erros.filter((e) => e.severidade === "critico");
  return { ok: errosCriticos.length === 0, cabecalhos: normalizados, erros };
}

export function validateHeaderDinamico(
  cabecalhos: string[],
  colunasObrigatorias: string[],
  numeroLinha = 1,
): HeaderValidationResult {
  const erros: MotorErroValidacao[] = [];
  const normalizados = cabecalhos.map((h) => h.trim());

  for (const col of colunasObrigatorias) {
    if (!normalizados.includes(col)) {
      erros.push({
        numeroLinha,
        campo: col,
        valorOriginal: null,
        codigoErro: "CABECALHO_COLUNA_AUSENTE",
        mensagem: `Coluna obrigatória ausente: ${col}`,
        severidade: "critico",
      });
    }
  }

  return { ok: erros.length === 0, cabecalhos: normalizados, erros };
}
