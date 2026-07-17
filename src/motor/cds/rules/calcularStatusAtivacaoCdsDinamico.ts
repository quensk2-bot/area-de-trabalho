import type { MotorAlerta } from "../../bre/breTypes.ts";
import type { MotorFlagsOrdemCdResultado, MotorOrdemCdsResolvida, PosicaoLogicaCd } from "../../bre/centralizacao/centralizacaoTypes.ts";
import {
  TEXTO_NAO_CENTRALIZADO,
  obterStatusCompraPorPosicao,
  statusCompraEhInativo,
} from "../../bre/centralizacao/centralizacaoUtils.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";
import { flagsOrdemParaColecao, obterFlagPorPosicao } from "./flagsCentralizacaoDinamico.ts";
import { ordenarCdsPorPosicao } from "../validarColecaoCds.ts";

function trechoInativo(codigo: number, statusRaw: string | null): string {
  const sufixo = statusRaw === "" || statusRaw == null ? " D)" : ") ";
  return `(${codigo}${sufixo}`;
}

function statusPorPosicaoCds(cds: readonly MotorProdutoCdNormalizado[], posicao: number): string | null {
  return cds.find((c) => c.posicaoLogica === posicao)?.statusCompra ?? null;
}

export type StatusAtivacaoCdsDinamico = {
  texto: string | null;
  statusRegra: "aplicada" | "bloqueada_dependencia";
  alertas: MotorAlerta[];
  dependenciasBloqueadas: string[];
};

export function calcularStatusAtivacaoCdsDinamico(
  cds: readonly MotorProdutoCdNormalizado[],
  ordem: MotorOrdemCdsResolvida,
  flags: MotorFlagsOrdemCdResultado,
): StatusAtivacaoCdsDinamico {
  const dependenciasBloqueadas: string[] = [];
  const alertas: MotorAlerta[] = [];
  const flagsColecao = flagsOrdemParaColecao(flags, ordem);

  const somaFlags = flagsColecao.reduce((acc, f) => acc + f.valorOriginal, 0);
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

  for (const flag of flagsColecao.sort((a, b) => a.posicaoLogica - b.posicaoLogica)) {
    if (flag.valorOriginal <= 0) continue;
    const statusRaw =
      flag.posicaoLogica <= 5
        ? obterStatusCompraPorPosicao(
            {
              statusCompraCd1: statusPorPosicaoCds(cds, 1),
              statusCompraCd2: statusPorPosicaoCds(cds, 2),
              statusCompraCd3: statusPorPosicaoCds(cds, 3),
              statusCompraCd4: statusPorPosicaoCds(cds, 4),
              statusCompraCd5: statusPorPosicaoCds(cds, 5),
            },
            flag.posicaoLogica as PosicaoLogicaCd,
          )
        : statusPorPosicaoCds(cds, flag.posicaoLogica);
    const codigo = flag.codigoFisico;
    if (statusCompraEhInativo(statusRaw) && codigo != null) {
      inativos += 1;
      trechos.push(trechoInativo(codigo, statusRaw));
    }
  }

  for (const cd of ordenarCdsPorPosicao(cds)) {
    if (cd.posicaoLogica <= 5) continue;
    const flagValor = obterFlagPorPosicao(flags, cd.posicaoLogica);
    if (flagValor > 0 && statusCompraEhInativo(cd.statusCompra) && cd.codigoFisico != null) {
      inativos += 1;
      trechos.push(trechoInativo(cd.codigoFisico, cd.statusCompra));
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
