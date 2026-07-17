import type { MotorAlerta, MotorDiasPedidoOrigem, MotorDiasPedidoResultado } from "../../bre/breTypes.ts";
import type { MotorProdutoCdNormalizado } from "../cdTypes.ts";
import { ordenarCdsPorPosicao } from "../validarColecaoCds.ts";

export type DiasPedidoPorCdItem = {
  posicaoLogica: number;
  valor: number | null;
  considerado: boolean;
};

export type DiasPedidoDinamicoResultado = MotorDiasPedidoResultado & {
  diasPedidoPorCd: DiasPedidoPorCdItem[];
};

function normalizarDiasCompra(valor: number | string | null | undefined): number | null {
  if (valor == null) return null;
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return Number.isFinite(valor) ? valor : null;
}

function calcularMediaDiasPedidoLoja(
  pendenciaLoja: number | null,
  diasCompraLoja: number | null,
  alertas: MotorAlerta[],
): number | null {
  if (pendenciaLoja == null || pendenciaLoja <= 0) return null;
  const dias = normalizarDiasCompra(diasCompraLoja);
  if (dias != null && dias < 0) {
    alertas.push({
      codigo: "DIAS_COMPRA_LOJA_NEGATIVO",
      mensagem: `diasCompraLoja=${dias} — valor negativo preservado`,
      severidade: "aviso",
    });
  }
  if (dias == null) return null;
  if (dias === 0) return 1;
  return dias;
}

function calcularMediaDiasPedidoCd(
  pendenciaCd: number | null,
  diasCompraCd: number | null,
  posicaoLogica: number,
  alertas: MotorAlerta[],
): number | null {
  if (pendenciaCd !== 1) return 0;
  const dias = normalizarDiasCompra(diasCompraCd);
  if (dias != null && dias < 0) {
    alertas.push({
      codigo: "DIAS_COMPRA_CD_NEGATIVO",
      mensagem: `diasCompraCd${posicaoLogica}=${dias} — valor negativo preservado`,
      severidade: "aviso",
    });
  }
  if (dias == null) return null;
  if (dias === 0) return 1;
  return dias;
}

function listMaxPowerQuery(values: (number | null)[]): number {
  const validos = values.filter((v): v is number => v != null);
  if (validos.length === 0) return 0;
  return Math.max(...validos);
}

function resolverOrigemDinamica(
  mediaLoja: number | null,
  diasPedidoPorCd: DiasPedidoPorCdItem[],
  diasPedidoFinal: number,
): MotorDiasPedidoOrigem {
  if (mediaLoja != null) return "loja";

  const candidatos = diasPedidoPorCd.filter((d) => d.valor != null);
  if (candidatos.length === 0) return "nenhum";

  const maxValor = listMaxPowerQuery(candidatos.map((c) => c.valor));
  if (diasPedidoFinal === 0 && maxValor === 0 && candidatos.every((c) => c.valor === 0)) {
    return "nenhum";
  }

  const ordenadosDesc = [...candidatos].sort((a, b) => {
    if ((b.valor ?? 0) !== (a.valor ?? 0)) return (b.valor ?? 0) - (a.valor ?? 0);
    return b.posicaoLogica - a.posicaoLogica;
  });
  const vencedor = ordenadosDesc[0];
  if (!vencedor) return "nenhum";
  return `cd${vencedor.posicaoLogica}` as MotorDiasPedidoOrigem;
}

function alertasPendenciaDias(cds: readonly MotorProdutoCdNormalizado[]): MotorAlerta[] {
  const alertas: MotorAlerta[] = [];
  for (const cd of cds) {
    if (cd.pendencia != null && cd.pendencia > 1) {
      alertas.push({
        codigo: "PENDCD_MAIOR_QUE_1",
        mensagem: `pendencia_cd${cd.posicaoLogica}=${cd.pendencia} — MP usa soma >0, mas Dias Pedido do CD usa =1`,
        severidade: "aviso",
      });
    }
  }
  return alertas;
}

function valorPorPosicao(items: DiasPedidoPorCdItem[], posicao: number): number | null {
  return items.find((d) => d.posicaoLogica === posicao)?.valor ?? null;
}

export function calcularDiasPedidoCds(
  pendenciaLoja: number | null,
  diasCompraLoja: number | null,
  cds: readonly MotorProdutoCdNormalizado[],
): DiasPedidoDinamicoResultado {
  const alertas: MotorAlerta[] = [...alertasPendenciaDias(cds)];
  const ordenados = ordenarCdsPorPosicao(cds);

  const mediaDiasPedidoLoja = calcularMediaDiasPedidoLoja(pendenciaLoja, diasCompraLoja, alertas);

  const diasPedidoPorCd: DiasPedidoPorCdItem[] = ordenados.map((cd) => {
    const valor = calcularMediaDiasPedidoCd(cd.pendencia, cd.diasCompra, cd.posicaoLogica, alertas);
    return {
      posicaoLogica: cd.posicaoLogica,
      valor,
      considerado: cd.pendencia === 1,
    };
  });

  const mediasCd = diasPedidoPorCd.map((d) => d.valor);
  const diasPedidoFinal = mediaDiasPedidoLoja != null ? mediaDiasPedidoLoja : listMaxPowerQuery(mediasCd);
  const origemResultado = resolverOrigemDinamica(mediaDiasPedidoLoja, diasPedidoPorCd, diasPedidoFinal);

  return {
    mediaDiasPedidoLoja,
    mediaDiasPedidoCd1: valorPorPosicao(diasPedidoPorCd, 1),
    mediaDiasPedidoCd2: valorPorPosicao(diasPedidoPorCd, 2),
    mediaDiasPedidoCd3: valorPorPosicao(diasPedidoPorCd, 3),
    mediaDiasPedidoCd4: valorPorPosicao(diasPedidoPorCd, 4),
    mediaDiasPedidoCd5: valorPorPosicao(diasPedidoPorCd, 5),
    diasPedidoFinal,
    origemResultado,
    alertas,
    statusRegra: "aplicada",
    diasPedidoPorCd,
  };
}
