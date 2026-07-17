import type {
  MotorAlerta,
  MotorDiasPedidoEntrada,
  MotorDiasPedidoOrigem,
  MotorDiasPedidoResultado,
  MotorRegraStatus,
} from "../breTypes.ts";
import type { MotorBreItemInput } from "../breTypes.ts";
import { calcularDiasPedidoCds } from "../../cds/rules/calcularDiasPedidoCds.ts";
import { unificarCdsBre } from "../../cds/unificarCdsBre.ts";

export type { MotorDiasPedidoEntrada, MotorDiasPedidoResultado, MotorDiasPedidoOrigem };

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

function isDiasZero(valor: number | null): boolean {
  return valor === 0;
}

function calcularMediaDiasPedidoLoja(
  pendenciaLoja: number | null,
  diasCompraLoja: number | null,
  alertas: MotorAlerta[],
): number | null {
  if (pendenciaLoja == null || pendenciaLoja <= 0) {
    return null;
  }

  const dias = normalizarDiasCompra(diasCompraLoja);
  if (dias != null && dias < 0) {
    alertas.push({
      codigo: "DIAS_COMPRA_LOJA_NEGATIVO",
      mensagem: `diasCompraLoja=${dias} — valor negativo preservado`,
      severidade: "aviso",
    });
  }

  if (dias == null) return null;
  if (isDiasZero(dias)) return 1;
  return dias;
}

function calcularMediaDiasPedidoCd(
  pendenciaCd: number | null,
  diasCompraCd: number | string | null,
  slot: string,
  alertas: MotorAlerta[],
): number | null {
  if (pendenciaCd !== 1) return 0;

  const dias = normalizarDiasCompra(diasCompraCd);
  if (dias != null && dias < 0) {
    alertas.push({
      codigo: "DIAS_COMPRA_CD_NEGATIVO",
      mensagem: `${slot}=${dias} — valor negativo preservado`,
      severidade: "aviso",
    });
  }

  if (dias == null) return null;
  if (isDiasZero(dias)) return 1;
  return dias;
}

function listMaxPowerQuery(values: (number | null)[]): number {
  const validos = values.filter((v): v is number => v != null);
  if (validos.length === 0) return 0;
  return Math.max(...validos);
}

const ORDEM_MAX_CDS: { origem: MotorDiasPedidoOrigem; indice: number }[] = [
  { origem: "cd5", indice: 4 },
  { origem: "cd4", indice: 3 },
  { origem: "cd3", indice: 2 },
  { origem: "cd2", indice: 1 },
  { origem: "cd1", indice: 0 },
];

function resolverOrigemResultado(
  mediaLoja: number | null,
  mediasCd: (number | null)[],
  diasPedidoFinal: number,
): MotorDiasPedidoOrigem {
  if (mediaLoja != null) return "loja";

  const candidatos = ORDEM_MAX_CDS.map(({ origem, indice }) => ({
    origem,
    valor: mediasCd[indice],
  })).filter((c): c is { origem: MotorDiasPedidoOrigem; valor: number } => c.valor != null);

  if (candidatos.length === 0) return "nenhum";

  const maxValor = listMaxPowerQuery(mediasCd);
  if (diasPedidoFinal === 0 && maxValor === 0 && candidatos.every((c) => c.valor === 0)) {
    return "nenhum";
  }

  const vencedor = ORDEM_MAX_CDS.find(({ indice }) => mediasCd[indice] === maxValor);
  return vencedor?.origem ?? "nenhum";
}

function alertasPendencia(input: MotorDiasPedidoEntrada): MotorAlerta[] {
  const alertas: MotorAlerta[] = [];
  const pares = [
    ["pendencia_cd1", input.pendenciaCd1],
    ["pendencia_cd2", input.pendenciaCd2],
    ["pendencia_cd3", input.pendenciaCd3],
    ["pendencia_cd4", input.pendenciaCd4],
    ["pendencia_cd5", input.pendenciaCd5],
  ] as const;

  for (const [nome, valor] of pares) {
    if (valor != null && valor > 1) {
      alertas.push({
        codigo: "PENDCD_MAIOR_QUE_1",
        mensagem: `${nome}=${valor} — MP usa soma >0, mas Dias Pedido do CD usa =1`,
        severidade: "aviso",
      });
    }
  }

  return alertas;
}

export function calcularDiasPedidoLegado(input: MotorDiasPedidoEntrada): MotorDiasPedidoResultado {
  const alertas: MotorAlerta[] = [...alertasPendencia(input)];
  const statusRegra: MotorRegraStatus = "aplicada";

  const mediaDiasPedidoLoja = calcularMediaDiasPedidoLoja(
    input.pendenciaLoja,
    input.diasCompraLoja,
    alertas,
  );

  const mediaDiasPedidoCd1 = calcularMediaDiasPedidoCd(
    input.pendenciaCd1,
    input.diasCompraCd1,
    "diasCompraCd1",
    alertas,
  );
  const mediaDiasPedidoCd2 = calcularMediaDiasPedidoCd(
    input.pendenciaCd2,
    input.diasCompraCd2,
    "diasCompraCd2",
    alertas,
  );
  const mediaDiasPedidoCd3 = calcularMediaDiasPedidoCd(
    input.pendenciaCd3,
    input.diasCompraCd3,
    "diasCompraCd3",
    alertas,
  );
  const mediaDiasPedidoCd4 = calcularMediaDiasPedidoCd(
    input.pendenciaCd4,
    input.diasCompraCd4,
    "diasCompraCd4",
    alertas,
  );
  const mediaDiasPedidoCd5 = calcularMediaDiasPedidoCd(
    input.pendenciaCd5,
    input.diasCompraCd5,
    "diasCompraCd5",
    alertas,
  );

  const mediasCd = [
    mediaDiasPedidoCd1,
    mediaDiasPedidoCd2,
    mediaDiasPedidoCd3,
    mediaDiasPedidoCd4,
    mediaDiasPedidoCd5,
  ];

  const diasPedidoFinal =
    mediaDiasPedidoLoja != null
      ? mediaDiasPedidoLoja
      : listMaxPowerQuery(mediasCd);

  const origemResultado = resolverOrigemResultado(mediaDiasPedidoLoja, mediasCd, diasPedidoFinal);

  return {
    mediaDiasPedidoLoja,
    mediaDiasPedidoCd1,
    mediaDiasPedidoCd2,
    mediaDiasPedidoCd3,
    mediaDiasPedidoCd4,
    mediaDiasPedidoCd5,
    diasPedidoFinal,
    origemResultado,
    alertas,
    statusRegra,
  };
}

export function calcularDiasPedido(input: MotorDiasPedidoEntrada): MotorDiasPedidoResultado {
  const cds = [
    { pos: 1, pendencia: input.pendenciaCd1, diasCompra: input.diasCompraCd1 },
    { pos: 2, pendencia: input.pendenciaCd2, diasCompra: input.diasCompraCd2 },
    { pos: 3, pendencia: input.pendenciaCd3, diasCompra: input.diasCompraCd3 },
    { pos: 4, pendencia: input.pendenciaCd4, diasCompra: input.diasCompraCd4 },
    { pos: 5, pendencia: input.pendenciaCd5, diasCompra: input.diasCompraCd5 },
  ].map(({ pos, pendencia, diasCompra }) => ({
    posicaoLogica: pos,
    codigoFisico: null,
    estoque: null,
    pendencia,
    statusCompra: null,
    diasCompra: normalizarDiasCompra(diasCompra),
    diasRecebimento: null,
    ultimaCompra: null,
    ultimaEntrada: null,
    estoqueSelecionadoInventario: null,
    origemArquivo: "dias-pedido-entrada",
    numeroBloco: pos <= 4 ? 1 : 2,
    posicaoNoArquivo: pos <= 4 ? pos : 1,
    alertas: [] as string[],
  }));

  const { diasPedidoPorCd: _omit, ...resultado } = calcularDiasPedidoCds(
    input.pendenciaLoja,
    input.diasCompraLoja,
    cds,
  );
  return resultado;
}

export function calcularDiasPedidoFromBre(input: MotorBreItemInput): MotorDiasPedidoResultado {
  const cds = unificarCdsBre(input);
  const { diasPedidoPorCd: _omit, ...resultado } = calcularDiasPedidoCds(
    input.produto.pendenciaLoja,
    input.produto.diasCompraLj,
    cds,
  );
  return resultado;
}

export function montarDiasPedidoEntrada(input: MotorBreItemInput): MotorDiasPedidoEntrada {
  const produto = input.produto;
  const cd5 = input.cd5;

  return {
    pendenciaLoja: produto.pendenciaLoja,
    diasCompraLoja: produto.diasCompraLj,
    pendenciaCd1: produto.pendenciaCd1,
    diasCompraCd1: produto.diasCompraCd1,
    pendenciaCd2: produto.pendenciaCd2,
    diasCompraCd2: produto.diasCompraCd2,
    pendenciaCd3: produto.pendenciaCd3,
    diasCompraCd3: produto.diasCompraCd3,
    pendenciaCd4: produto.pendenciaCd4,
    diasCompraCd4: produto.diasCompraCd4,
    pendenciaCd5: cd5?.pendenciaCd5 ?? null,
    diasCompraCd5: cd5?.diasCompraCd5 ?? null,
  };
}

export function aplicarRuleDiasPedido(input: MotorBreItemInput): MotorDiasPedidoResultado {
  return calcularDiasPedidoFromBre(input);
}
