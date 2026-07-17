import type { MotorAlerta } from "../breTypes.ts";
import type {
  MotorCentralizacaoEntrada,
  MotorFlagsOrdemCdResultado,
  MotorOrdemCdsResolvida,
  MotorStatusAtivacaoCdResultado,
} from "./centralizacaoTypes.ts";
import {
  TEXTO_NAO_CENTRALIZADO,
  obterCodigoFisicoPorPosicao,
  obterStatusCompraPorPosicao,
  statusCompraEhInativo,
} from "./centralizacaoUtils.ts";
import { POSICOES_LOGICAS } from "./centralizacaoUtils.ts";
import { calcularStatusAtivacaoCdsDinamico } from "../../cds/rules/calcularStatusAtivacaoCdsDinamico.ts";
import { obterFlagPorPosicao } from "../../cds/rules/flagsCentralizacaoDinamico.ts";
import { cdsFromCentralizacaoEntrada } from "../../cds/unificarCdsBre.ts";

function trechoInativo(codigo: number, statusRaw: string | null): string {
  const sufixo = statusRaw === "" || statusRaw == null ? " D)" : ") ";
  return `(${codigo}${sufixo}`;
}

function obterFlagPorPosicaoLegado(flags: MotorFlagsOrdemCdResultado, posicao: number): number {
  return obterFlagPorPosicao(flags, posicao);
}

export function calcularStatusAtivacaoCdLegado(
  entrada: MotorCentralizacaoEntrada,
  ordem: MotorOrdemCdsResolvida,
  flags: MotorFlagsOrdemCdResultado,
): MotorStatusAtivacaoCdResultado {
  const dependenciasBloqueadas: string[] = [];
  const alertas: MotorAlerta[] = [];

  const somaFlags =
    flags.flagPrimeiroCd +
    flags.flagSegundoCd +
    flags.flagTerceiroCd +
    flags.flagQuartoCd +
    flags.flagQuintoCd;

  if (somaFlags === 0) {
    return {
      texto: TEXTO_NAO_CENTRALIZADO,
      statusRegra: "aplicada",
      alertas,
      dependenciasBloqueadas,
    };
  }

  if (!ordem.bandeira) {
    return {
      texto: null,
      statusRegra: "bloqueada_dependencia",
      alertas: [{ codigo: "ORDEM_AUSENTE", mensagem: "Status Ativação CD bloqueado — ordem ausente", severidade: "aviso" }],
      dependenciasBloqueadas: ["status_solicitacao_ativacao_cd"],
    };
  }

  let inativos = 0;
  const trechos: string[] = [];

  for (const pos of POSICOES_LOGICAS) {
    const flag = obterFlagPorPosicaoLegado(flags, pos);
    const statusRaw = obterStatusCompraPorPosicao(entrada, pos);
    const codigo = obterCodigoFisicoPorPosicao(ordem, pos);
    if (flag > 0 && statusCompraEhInativo(statusRaw) && codigo != null) {
      inativos += 1;
      trechos.push(trechoInativo(codigo, statusRaw));
    }
  }

  if (inativos === 0) {
    return {
      texto: "Ativo no CD",
      statusRegra: "aplicada",
      alertas,
      dependenciasBloqueadas,
    };
  }

  return {
    texto: `Inativo CD: ${trechos.join("")}`,
    statusRegra: "aplicada",
    alertas,
    dependenciasBloqueadas,
  };
}

export function calcularStatusAtivacaoCd(
  entrada: MotorCentralizacaoEntrada,
  ordem: MotorOrdemCdsResolvida,
  flags: MotorFlagsOrdemCdResultado,
): MotorStatusAtivacaoCdResultado {
  const cds = cdsFromCentralizacaoEntrada(entrada);
  return calcularStatusAtivacaoCdsDinamico(cds, ordem, flags);
}
