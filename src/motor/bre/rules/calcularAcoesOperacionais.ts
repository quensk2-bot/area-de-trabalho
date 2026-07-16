import type {
  MotorAcoesOperacionaisEntrada,
  MotorAcoesOperacionaisResultado,
  MotorAuxiliaresPedidoResultado,
  MotorRegraStatus,
} from "../breTypes.ts";
import type { MotorBreItemInput } from "../breTypes.ts";
import { calcularAuxiliaresPedido, type MotorAuxiliaresPedidoEntrada } from "./calcularAuxiliaresPedido.ts";

export type { MotorAcoesOperacionaisEntrada, MotorAcoesOperacionaisResultado };

const TEXTO_NAO_CP = "Nâo é Ruptura Curto Prazo";
const TEXTO_NAO_MP = "Não é Ruptura Médio Prazo";

function sufixoPedidoCurtoPrazoFinal(diasCompraLj: number | null): string {
  if (diasCompraLj != null && diasCompraLj > 4) {
    return "Pedido Antigo (Avaliar Cancelamento)";
  }
  if (diasCompraLj != null && diasCompraLj <= 4) {
    return "Pedido dentro do Prazo";
  }
  return "Não Existe Pedido";
}

export function calcularAcaoCurtoPrazo(entrada: MotorAcoesOperacionaisEntrada): string {
  const { parMin, curtoPrazo, auxiliares, diasCompraLj } = entrada;

  if (parMin === 0 || parMin == null) {
    return "Sem parâmetro";
  }

  if (curtoPrazo === 1 && auxiliares.curtoPrazoRebtoProximo === 1) {
    return `Recebimento Próximo/ ${sufixoPedidoCurtoPrazoFinal(diasCompraLj)}`;
  }

  if (curtoPrazo === 1 && auxiliares.curtoPrazoNaoRebtoProximo === 1) {
    return `Havia estoque no CD/ ${sufixoPedidoCurtoPrazoFinal(diasCompraLj)}`;
  }

  return TEXTO_NAO_CP;
}

export function calcularAcaoMedioPrazo(entrada: MotorAcoesOperacionaisEntrada): string {
  const { medioPrazo, diasPedido, auxiliares } = entrada;

  if (medioPrazo === 1 && auxiliares.avaliarPedido === 1) {
    return "Pedido dentre 30 há 60 Dias";
  }

  if (medioPrazo === 1 && auxiliares.pendenciaIndevida === 1) {
    return "Superior há 60 Dias";
  }

  if (medioPrazo === 1 && diasPedido != null && diasPedido >= 20 && diasPedido < 30) {
    return "Pedidos dentre 20 há 30 dias";
  }

  if (medioPrazo === 1) {
    return "Pedido dentro do prazo";
  }

  return TEXTO_NAO_MP;
}

export function calcularAcoesOperacionais(
  entrada: MotorAcoesOperacionaisEntrada,
): MotorAcoesOperacionaisResultado {
  const acaoCurtoPrazo = calcularAcaoCurtoPrazo(entrada);
  const acaoMedioPrazo = calcularAcaoMedioPrazo(entrada);

  const statusRegra: MotorRegraStatus =
    entrada.auxiliares.statusRegra === "bloqueada_dependencia" ? "bloqueada_dependencia" : "aplicada";

  return {
    auxiliares: entrada.auxiliares,
    acaoCurtoPrazo,
    acaoMedioPrazo,
    alertas: [...entrada.auxiliares.alertas],
    statusRegra,
  };
}

export function montarAuxiliaresPedidoEntrada(
  input: MotorBreItemInput,
  params: {
    curtoPrazo: 0 | 1;
    medioPrazo: 0 | 1;
    menorQueTres: 0 | 1;
    modCurtoPrazo: "LJ_Exclusiva" | null;
    diasPedido: number | null;
    pendenciaCpaCd: number | null;
    centralizacaoDisponivel?: boolean;
  },
): MotorAuxiliaresPedidoEntrada {
  const p = input.produto;
  const cd5 = input.cd5;

  return {
    parMin: p.parMin,
    curtoPrazo: params.curtoPrazo,
    medioPrazo: params.medioPrazo,
    menorQueTres: params.menorQueTres,
    modCurtoPrazo: params.modCurtoPrazo,
    diasPedido: params.diasPedido,
    pendenciaLoja: p.pendenciaLoja,
    pendenciaCpaCd: params.pendenciaCpaCd,
    pendenciaCd1: p.pendenciaCd1,
    pendenciaCd2: p.pendenciaCd2,
    pendenciaCd3: p.pendenciaCd3,
    pendenciaCd4: p.pendenciaCd4,
    pendenciaCd5: cd5?.pendenciaCd5 ?? null,
    estoqueLoja: p.estoqueLoja,
    ultimaEntradaLoja: p.ultimaEntradaLoja,
    estoqueCd1: p.estoqueCd1,
    estoqueCd2: p.estoqueCd2,
    estoqueCd3: p.estoqueCd3,
    estoqueCd4: p.estoqueCd4,
    estoqueCd5: cd5?.estoqueCd5 ?? null,
    diasRecebtoCd1: p.diasRecebtoCd1,
    diasRecebtoCd2: p.diasRecebtoCd2,
    diasRecebtoCd3: p.diasRecebtoCd3,
    diasRecebtoCd4: p.diasRecebtoCd4,
    diasRecebtoCd5: cd5?.diasRecebtoCd5 ?? null,
    centralizacaoDisponivel: params.centralizacaoDisponivel ?? false,
  };
}

export function aplicarAcoesOperacionais(
  input: MotorBreItemInput,
  params: {
    curtoPrazo: 0 | 1;
    medioPrazo: 0 | 1;
    menorQueTres: 0 | 1;
    modCurtoPrazo: "LJ_Exclusiva" | null;
    diasPedido: number | null;
    pendenciaCpaCd: number | null;
  },
): MotorAcoesOperacionaisResultado {
  const auxEntrada = montarAuxiliaresPedidoEntrada(input, params);
  const auxiliares = calcularAuxiliaresPedido(auxEntrada);

  return calcularAcoesOperacionais({
    parMin: input.produto.parMin,
    curtoPrazo: params.curtoPrazo,
    medioPrazo: params.medioPrazo,
    diasCompraLj: input.produto.diasCompraLj,
    diasPedido: params.diasPedido,
    auxiliares,
  });
}
