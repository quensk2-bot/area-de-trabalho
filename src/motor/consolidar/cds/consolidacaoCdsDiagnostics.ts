import type { MotorAlerta } from "../../bre/breTypes.ts";

export const ALERTAS_CDS_CRITICOS = new Set([
  "cd_posicao_duplicada",
  "cd_bloco_sobreposto",
  "cd_colecao_invalida",
  "cd_origem_repetida",
]);

export const ALERTAS_CDS_OPCIONAIS = new Set([
  "cd_bloco_ausente",
  "cd_codigo_fisico_ausente",
  "cd_posicao_nao_contigua",
  "cd_posicao_fora_de_ordem",
]);

export function alertaCd(
  codigo: string,
  mensagem: string,
  severidade: MotorAlerta["severidade"] = "aviso",
): MotorAlerta {
  return { codigo, mensagem, severidade };
}

export function alertasPosicaoDuplicada(
  posicao: number,
  blocos: number[],
  origens: string[],
): MotorAlerta {
  return alertaCd(
    "cd_posicao_duplicada",
    `Posição lógica ${posicao} duplicada entre blocos [${blocos.join(", ")}] — origens: ${origens.join("; ")}`,
    "erro",
  );
}

export function alertaBlocoSobreposto(
  blocoA: number,
  blocoB: number,
  posicoes: number[],
): MotorAlerta {
  return alertaCd(
    "cd_bloco_sobreposto",
    `Sobreposição de intervalo entre blocos ${blocoA} e ${blocoB} nas posições [${posicoes.join(", ")}]`,
    "erro",
  );
}

export function alertaOrigemRepetida(numeroBloco: number, origemArquivo: string, posicao: number): MotorAlerta {
  return alertaCd(
    "cd_origem_repetida",
    `Repetição idêntica de origem bloco ${numeroBloco} (${origemArquivo}) na posição ${posicao}`,
    "erro",
  );
}

export function alertaBlocoAusente(numeroBloco: number): MotorAlerta {
  return alertaCd("cd_bloco_ausente", `Bloco complementar ${numeroBloco} ausente para produto`, "aviso");
}

export function alertaCodigoFisicoAusente(posicao: number): MotorAlerta {
  return alertaCd(
    "cd_codigo_fisico_ausente",
    `Código físico ausente na posição lógica ${posicao}`,
    "aviso",
  );
}

export function alertaPosicaoNaoContigua(posicoes: number[]): MotorAlerta {
  return alertaCd(
    "cd_posicao_nao_contigua",
    `Posições não contíguas na coleção: [${posicoes.join(", ")}]`,
    "aviso",
  );
}

export function temAlertaCdCritico(alertas: readonly MotorAlerta[]): boolean {
  return alertas.some((a) => ALERTAS_CDS_CRITICOS.has(a.codigo));
}

export function temCodigoFisicoAusente(alertas: readonly MotorAlerta[]): boolean {
  return alertas.some((a) => a.codigo === "cd_codigo_fisico_ausente");
}
