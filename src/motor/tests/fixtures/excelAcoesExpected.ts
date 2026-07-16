import type { CompareRowInput } from "../../compare/compareTypes.ts";
import { calcularAcoesOperacionais, calcularAuxiliaresPedido } from "../../bre/index.ts";
import type { MotorAuxiliaresPedidoEntrada } from "../../bre/breTypes.ts";

function linhaAcoes(
  loja: number,
  produto: number,
  acao: { parMin: number | null; curtoPrazo: 0 | 1; medioPrazo: 0 | 1; diasCompraLj: number | null; diasPedido: number | null },
  aux: Partial<MotorAuxiliaresPedidoEntrada>,
): CompareRowInput {
  const auxEntrada: MotorAuxiliaresPedidoEntrada = {
    parMin: acao.parMin,
    curtoPrazo: acao.curtoPrazo,
    medioPrazo: acao.medioPrazo,
    menorQueTres: 1,
    modCurtoPrazo: null,
    diasPedido: acao.diasPedido,
    pendenciaLoja: 0,
    pendenciaCpaCd: 0,
    pendenciaCd1: 0,
    pendenciaCd2: 0,
    pendenciaCd3: 0,
    pendenciaCd4: 0,
    pendenciaCd5: 0,
    estoqueLoja: 0,
    ultimaEntradaLoja: "2026-01-01",
    estoqueCd1: 0,
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
    estoqueCd5: 0,
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    ...aux,
  };
  const auxiliares = calcularAuxiliaresPedido(auxEntrada);
  const r = calcularAcoesOperacionais({
    parMin: acao.parMin,
    curtoPrazo: acao.curtoPrazo,
    medioPrazo: acao.medioPrazo,
    diasCompraLj: acao.diasCompraLj,
    diasPedido: acao.diasPedido,
    auxiliares,
  });

  const row = {
    "Ação Curto Prazo": r.acaoCurtoPrazo,
    "Ação Médio Prazo": r.acaoMedioPrazo,
    "Avaliar Pedido": auxiliares.avaliarPedido,
    "Pendência Indevida": auxiliares.pendenciaIndevida,
  };

  return { loja, produto, excel: row, v7: row };
}

export const EXCEL_ACOES_FIXTURE: CompareRowInput[] = [
  linhaAcoes(
    103,
    3001,
    { parMin: 1, curtoPrazo: 1, medioPrazo: 0, diasCompraLj: 3, diasPedido: 3 },
    { estoqueCd1: 1, diasRecebtoCd1: 2 },
  ),
  linhaAcoes(
    103,
    3002,
    { parMin: 1, curtoPrazo: 1, medioPrazo: 0, diasCompraLj: null, diasPedido: 10 },
    { estoqueCd1: 1, diasRecebtoCd1: 2, pendenciaCd1: 1, pendenciaCpaCd: 1 },
  ),
  linhaAcoes(
    103,
    3003,
    { parMin: 1, curtoPrazo: 0, medioPrazo: 1, diasCompraLj: null, diasPedido: 10 },
    { pendenciaLoja: 1, pendenciaCpaCd: 1 },
  ),
  linhaAcoes(
    103,
    3004,
    { parMin: 1, curtoPrazo: 0, medioPrazo: 1, diasCompraLj: null, diasPedido: 25 },
    { pendenciaCpaCd: 1 },
  ),
  linhaAcoes(
    103,
    3005,
    { parMin: 1, curtoPrazo: 0, medioPrazo: 1, diasCompraLj: null, diasPedido: 45 },
    { pendenciaCpaCd: 1 },
  ),
  linhaAcoes(
    103,
    3006,
    { parMin: 1, curtoPrazo: 0, medioPrazo: 1, diasCompraLj: null, diasPedido: 65 },
    { pendenciaCpaCd: 1 },
  ),
];

export const EXCEL_ACOES_DIVERGENTE: CompareRowInput[] = [
  {
    loja: 103,
    produto: 3099,
    excel: {
      "Ação Curto Prazo": "Recebimento Próximo/ Pedido dentro do Prazo",
      "Ação Médio Prazo": "Não é Ruptura Médio Prazo",
      "Avaliar Pedido": 0,
      "Pendência Indevida": 0,
    },
    v7: {
      "Ação Curto Prazo": "Havia estoque no CD/ Pedido dentro do Prazo",
      "Ação Médio Prazo": "Não é Ruptura Médio Prazo",
      "Avaliar Pedido": 0,
      "Pendência Indevida": 0,
    },
  },
];
