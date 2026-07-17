import type { MotorAlerta } from "../breTypes.ts";
import type {
  MotorCentralizacaoEntrada,
  MotorMenorRecebimentoResultado,
  MotorOrdemCdsResolvida,
  MotorProdutoCentralizadoResultado,
  PosicaoLogicaCd,
} from "./centralizacaoTypes.ts";
import {
  TEXTO_NAO_CENTRALIZADO,
  diasIguais,
  obterCodigoFisicoPorPosicao,
  obterDiasRecebtoPorPosicao,
} from "./centralizacaoUtils.ts";

function alerta(codigo: string, mensagem: string): MotorAlerta {
  return { codigo, mensagem, severidade: "aviso" };
}

export function calcularProdutoCentralizado(
  entrada: MotorCentralizacaoEntrada,
  ordem: MotorOrdemCdsResolvida,
  menor: MotorMenorRecebimentoResultado,
): MotorProdutoCentralizadoResultado {
  const alertas: MotorAlerta[] = [...ordem.alertas];
  const menorValor = menor.menorDiasRecebimentoNormalizado;
  const dias = {
    diasRecebtoCd1: menor.diasRecebtoCd1,
    diasRecebtoCd2: menor.diasRecebtoCd2,
    diasRecebtoCd3: menor.diasRecebtoCd3,
    diasRecebtoCd4: menor.diasRecebtoCd4,
    diasRecebtoCd5: menor.diasRecebtoCd5,
  };

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

  for (const posicao of [1, 2, 3, 4, 5] as PosicaoLogicaCd[]) {
    const diasPos = obterDiasRecebtoPorPosicao(dias, posicao);
    if (!diasIguais(diasPos, menorValor)) continue;

    const codigo = obterCodigoFisicoPorPosicao(ordem, posicao);
    if (codigo == null) {
      alertas.push(alerta("CODIGO_FISICO_AUSENTE", `Posição lógica CD${posicao} sem código físico na ordem`));
      continue;
    }

    return {
      produtoCentralizado: codigo,
      textoProdutoCentralizado: `CD ${codigo}`,
      posicaoCdSelecionada: posicao,
      codigoCdSelecionado: codigo,
      menorDiasRecebimento: menorValor,
      motivo: `Menor recebimento na posição lógica CD${posicao}`,
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
