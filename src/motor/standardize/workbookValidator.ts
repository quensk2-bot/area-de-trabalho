import type { MotorStandardizeAbaContrato, MotorStandardizeContrato } from "./standardizeTypes.ts";
import type { ResultadoLimpezaAba } from "./workbookCleaner.ts";

export type ResultadoValidacaoContrato = {
  valido: boolean;
  erros: string[];
  avisos: string[];
  abasAusentes: string[];
  colunasAusentes: Record<string, string[]>;
};

export function validarContratoAba(
  contratoAba: MotorStandardizeAbaContrato,
  resultado: ResultadoLimpezaAba | null,
  abaOrigem: string | null,
): ResultadoValidacaoContrato {
  const erros: string[] = [];
  const avisos: string[] = [];
  const colunasAusentes: Record<string, string[]> = {};

  if (!abaOrigem && !contratoAba.opcional) {
    erros.push(`Aba oficial ausente: ${contratoAba.nomeOficial} (origens: ${contratoAba.nomesOrigem.join(", ")})`);
    return { valido: false, erros, avisos, abasAusentes: [contratoAba.nomeOficial], colunasAusentes };
  }

  if (!abaOrigem && contratoAba.opcional) {
    avisos.push(`Aba opcional ausente: ${contratoAba.nomeOficial}`);
    return { valido: true, erros, avisos, abasAusentes: [], colunasAusentes };
  }

  if (!resultado) {
    erros.push(`Sem dados para aba ${contratoAba.nomeOficial}`);
    return { valido: false, erros, avisos, abasAusentes: [], colunasAusentes };
  }

  const ausentes = contratoAba.colunas
    .filter((c) => c.obrigatoria)
    .filter((c) => !(c.nome in resultado.cabecalhosNormalizados))
    .map((c) => c.nome);

  if (ausentes.length > 0) {
    colunasAusentes[contratoAba.nomeOficial] = ausentes;
    erros.push(`Colunas obrigatórias ausentes em ${contratoAba.nomeOficial}: ${ausentes.join(", ")}`);
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    abasAusentes: [],
    colunasAusentes,
  };
}

export function validarContratoCompleto(
  contrato: MotorStandardizeContrato,
  resultados: Map<string, { resultado: ResultadoLimpezaAba | null; abaOrigem: string | null }>,
): ResultadoValidacaoContrato {
  const erros: string[] = [];
  const avisos: string[] = [];
  const abasAusentes: string[] = [];
  const colunasAusentes: Record<string, string[]> = {};

  if (contrato.statusValidacao === "preliminar_aguardando_arquivo_real") {
    avisos.push("Contrato preliminar — aguardando validação com arquivo real (Fase 2C.2.3).");
  }

  for (const aba of contrato.abas) {
    const entry = resultados.get(aba.nomeOficial);
    const parcial = validarContratoAba(aba, entry?.resultado ?? null, entry?.abaOrigem ?? null);
    erros.push(...parcial.erros);
    avisos.push(...parcial.avisos);
    abasAusentes.push(...parcial.abasAusentes);
    Object.assign(colunasAusentes, parcial.colunasAusentes);
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    abasAusentes,
    colunasAusentes,
  };
}
