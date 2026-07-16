import type {
  MotorAlerta,
  MotorAuxiliaresPedidoEntrada,
  MotorAuxiliaresPedidoResultado,
  MotorRegraStatus,
} from "../breTypes.ts";

export type { MotorAuxiliaresPedidoEntrada, MotorAuxiliaresPedidoResultado };

function normalizarDiasRecebto(valor: number | string | null | undefined): number | null {
  if (valor == null) return null;
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (trimmed === "") return null;
    if (trimmed === "0") return 0;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return Number.isFinite(valor) ? valor : null;
}

function calcularRupDiasRecebtoCd(estoqueCd: number | null, diasRecebto: number | string | null): number {
  if (estoqueCd !== 1) return 0;
  const dias = normalizarDiasRecebto(diasRecebto);
  if (dias === 0) return 1;
  if (dias == null) return 0;
  return dias;
}

function calcularMaiorDiasRecebto(entrada: MotorAuxiliaresPedidoEntrada): number {
  const valores = [
    calcularRupDiasRecebtoCd(entrada.estoqueCd1, entrada.diasRecebtoCd1),
    calcularRupDiasRecebtoCd(entrada.estoqueCd2, entrada.diasRecebtoCd2),
    calcularRupDiasRecebtoCd(entrada.estoqueCd3, entrada.diasRecebtoCd3),
    calcularRupDiasRecebtoCd(entrada.estoqueCd4, entrada.diasRecebtoCd4),
    calcularRupDiasRecebtoCd(entrada.estoqueCd5, entrada.diasRecebtoCd5),
  ];
  return Math.max(...valores);
}

function isUltimaEntradaZero(ultimaEntradaLoja: string | null): boolean {
  return ultimaEntradaLoja == null || ultimaEntradaLoja === "" || ultimaEntradaLoja === "0";
}

function pendenciaCdIgualZero(valor: number | null): boolean {
  return valor == null || valor === 0;
}

export function calcularAuxiliaresPedido(entrada: MotorAuxiliaresPedidoEntrada): MotorAuxiliaresPedidoResultado {
  const alertas: MotorAlerta[] = [];
  const dependenciasBloqueadas: string[] = [];

  const rupDiasRecebtoMaiorData = calcularMaiorDiasRecebto(entrada);

  const curtoPrazoRebtoProximo =
    rupDiasRecebtoMaiorData > 0 &&
    rupDiasRecebtoMaiorData < 5 &&
    entrada.menorQueTres === 1 &&
    entrada.modCurtoPrazo !== "LJ_Exclusiva"
      ? 1
      : 0;

  const curtoPrazoNaoRebtoProximo =
    rupDiasRecebtoMaiorData > 4 &&
    entrada.menorQueTres === 1 &&
    entrada.modCurtoPrazo !== "LJ_Exclusiva"
      ? 1
      : 0;

  const diasPedido = entrada.diasPedido;
  const medioPrazo = entrada.medioPrazo;

  const pedidoSuperior30Dias =
    diasPedido == null || medioPrazo == null
      ? 0
      : medioPrazo === 1 && diasPedido > 30
        ? 1
        : 0;

  const avaliarPedido =
    diasPedido == null || medioPrazo == null
      ? 0
      : medioPrazo === 1 && diasPedido >= 30 && diasPedido < 60
        ? 1
        : 0;

  const pendenciaIndevida =
    diasPedido == null || medioPrazo == null
      ? 0
      : medioPrazo === 1 && diasPedido > 59
        ? 1
        : 0;

  const pendenciaLoja = entrada.pendenciaLoja ?? 0;
  const pendenciaCpaCd = entrada.pendenciaCpaCd ?? 0;
  const possuiPedidoCompra = pendenciaLoja + pendenciaCpaCd > 0 ? "Sim" : "Não";

  const cadastrosSemEntradas = isUltimaEntradaZero(entrada.ultimaEntradaLoja) ? 1 : 0;
  const semEntradaSemPedido =
    cadastrosSemEntradas === 1 &&
    (entrada.estoqueLoja ?? 0) === 0 &&
    pendenciaCdIgualZero(entrada.pendenciaLoja) &&
    pendenciaCdIgualZero(entrada.pendenciaCd1) &&
    pendenciaCdIgualZero(entrada.pendenciaCd2) &&
    pendenciaCdIgualZero(entrada.pendenciaCd3) &&
    pendenciaCdIgualZero(entrada.pendenciaCd4) &&
    pendenciaCdIgualZero(entrada.pendenciaCd5)
      ? "Ruptura Cadastro Novo / Sem Entrada & Sem Pedido"
      : "Ok";

  let statusEstoqueCds: string | null = null;
  let statusSolicitacaoAtivacaoCd: string | null = null;
  let statusRegra: MotorRegraStatus = "aplicada";

  if (!entrada.centralizacaoDisponivel) {
    statusEstoqueCds = null;
    statusSolicitacaoAtivacaoCd = null;
    dependenciasBloqueadas.push("status_estoque_cds", "status_solicitacao_ativacao_cd");
    statusRegra = "bloqueada_dependencia";
    alertas.push({
      codigo: "CENTRALIZACAO_AUSENTE",
      mensagem: "Status Estoque CDs e Status Solicitação Ativação CD aguardam Fase 2C.3",
      severidade: "info",
    });
  }

  return {
    rupDiasRecebtoMaiorData,
    curtoPrazoRebtoProximo,
    curtoPrazoNaoRebtoProximo,
    pedidoSuperior30Dias,
    avaliarPedido,
    pendenciaIndevida,
    possuiPedidoCompra,
    cadastrosSemEntradas,
    semEntradaSemPedido,
    statusEstoqueCds,
    statusSolicitacaoAtivacaoCd,
    dependenciasBloqueadas,
    alertas,
    statusRegra,
  };
}
