import type { MotorAlerta } from "../../bre/breTypes.ts";
import type { MotorOrdemCdsResolvida, PosicaoLogicaCd } from "../../bre/centralizacao/centralizacaoTypes.ts";
import {
  TEXTO_NAO_CENTRALIZADO,
  diasIguais,
  obterCodigoFisicoPorPosicao,
} from "../../bre/centralizacao/centralizacaoUtils.ts";
import type { MenorRecebimentoDinamico } from "./calcularMenorRecebimentoCds.ts";
import { ordenarCdsPorPosicao } from "../validarColecaoCds.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";

export type ProdutoCentralizadoDinamico = {
  produtoCentralizado: number | null;
  textoProdutoCentralizado: string;
  posicaoCdSelecionada: number | null;
  codigoCdSelecionado: number | null;
  menorDiasRecebimento: number;
  motivo: string;
  alertas: MotorAlerta[];
  statusRegra: "aplicada" | "nao_aplicavel" | "ambigua";
};

function alerta(codigo: string, mensagem: string): MotorAlerta {
  return { codigo, mensagem, severidade: "aviso" };
}

function codigoFisicoPorPosicao(ordem: MotorOrdemCdsResolvida, posicao: number): number | null {
  if (posicao < 1 || posicao > 5) return null;
  return obterCodigoFisicoPorPosicao(ordem, posicao as PosicaoLogicaCd);
}

export function selecionarCdCentralizado(
  cds: readonly MotorProdutoCdNormalizado[],
  ordem: MotorOrdemCdsResolvida,
  menor: MenorRecebimentoDinamico,
): ProdutoCentralizadoDinamico {
  const alertas: MotorAlerta[] = [...ordem.alertas];
  const menorValor = menor.menorDiasRecebimentoNormalizado;

  if (!ordem.bandeira || ordem.primeiroCd == null) {
    return {
      produtoCentralizado: null,
      textoProdutoCentralizado: TEXTO_NAO_CENTRALIZADO,
      posicaoCdSelecionada: null,
      codigoCdSelecionado: null,
      menorDiasRecebimento: menorValor,
      motivo: "Ordem de CDs indisponível",
      alertas,
      statusRegra: "nao_aplicavel",
    };
  }

  const ordenados = ordenarCdsPorPosicao(cds);

  for (const cd of ordenados) {
    const diasPos = menor.diasRecebtoPorPosicao.get(cd.posicaoLogica) ?? null;
    if (!diasIguais(diasPos, menorValor)) continue;

    const codigo = codigoFisicoPorPosicao(ordem, cd.posicaoLogica);
    if (codigo == null) {
      alertas.push(alerta("CODIGO_FISICO_AUSENTE", `Posição lógica CD${cd.posicaoLogica} sem código físico na ordem`));
      continue;
    }

    return {
      produtoCentralizado: codigo,
      textoProdutoCentralizado: `CD ${codigo}`,
      posicaoCdSelecionada: cd.posicaoLogica,
      codigoCdSelecionado: codigo,
      menorDiasRecebimento: menorValor,
      motivo: `Menor recebimento na posição lógica CD${cd.posicaoLogica}`,
      alertas,
      statusRegra: "aplicada",
    };
  }

  return {
    produtoCentralizado: null,
    textoProdutoCentralizado: TEXTO_NAO_CENTRALIZADO,
    posicaoCdSelecionada: null,
    codigoCdSelecionado: null,
    menorDiasRecebimento: menorValor,
    motivo: "Nenhuma posição lógica coincide com o menor recebimento",
    alertas,
    statusRegra: "aplicada",
  };
}
