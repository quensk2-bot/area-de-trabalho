import { toNumber } from "./pontoExtraSharedUtils";

export type StatusSimulacao = "OK" | "ESTOUROU";

export function totalM3Oficial(cubagem: Record<string, unknown> | null | undefined) {
  return toNumber(cubagem?.total_m3);
}

export function percentualAbastecimentoOficial(cubagem: Record<string, unknown> | null | undefined) {
  const pct = toNumber(cubagem?.percentual_abastecimento);
  return pct > 0 ? pct : 100;
}

export function calcularM3Alvo(totalM3: number, percentualAbastecimento: number) {
  const pct = percentualAbastecimento > 0 ? percentualAbastecimento : 100;
  return totalM3 * (pct / 100);
}

export function calcularMinMaxSugerido(unidadeSugerida: number, qtdeEmbCompraOriginal: number) {
  const embalagemInvalida = qtdeEmbCompraOriginal <= 0;
  const qtdeEmbCompra = embalagemInvalida ? 1 : qtdeEmbCompraOriginal;
  const estqMinimo = Math.ceil(unidadeSugerida);
  const estqMaximo = estqMinimo + Math.ceil(qtdeEmbCompra);
  return { estqMinimo, estqMaximo, qtdeEmbCompra, embalagemInvalida };
}

export function calcularOcupacaoProduto(params: {
  foraReparticao: boolean;
  m3Capacidade: number;
  m3Alvo: number;
}) {
  const m3Ocupado = params.foraReparticao ? 0 : params.m3Capacidade;
  const percentualOcupacao = params.m3Alvo > 0 ? (m3Ocupado / params.m3Alvo) * 100 : 0;
  return {
    m3_ocupado: m3Ocupado,
    percentual_ocupacao: percentualOcupacao,
  };
}

export function calcularStatusSimulacao(m3Utilizado: number, m3Alvo: number): StatusSimulacao {
  if (m3Alvo <= 0) return "OK";
  return m3Utilizado > m3Alvo + 1e-9 ? "ESTOUROU" : "OK";
}

export type ResumoOcupacaoPonta = {
  totalM3: number;
  percentualAbastecimento: number;
  m3Alvo: number;
  m3Utilizado: number;
  m3Restante: number;
  percentualOcupacao: number;
  statusSimulacao: StatusSimulacao;
  itensElegiveis: number;
  itensAprovados: number;
};

export function calcularResumoOcupacaoPonta(
  itens: Record<string, unknown>[],
  cubagem?: Record<string, unknown> | null,
): ResumoOcupacaoPonta {
  const elegiveis = itens.filter(
    (item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL",
  );
  const aprovados = elegiveis.filter((item) => Boolean(item.aprovado));

  const totalM3 = toNumber(itens[0]?.m3_ponta) || totalM3Oficial(cubagem);
  const percentualAbastecimento =
    toNumber(itens[0]?.percentual_abastecimento) || percentualAbastecimentoOficial(cubagem);
  const m3Alvo = toNumber(itens[0]?.m3_alvo) || calcularM3Alvo(totalM3, percentualAbastecimento);

  const m3Utilizado = elegiveis.reduce((total, item) => total + toNumber(item.m3_ocupado ?? item.m3_capacidade), 0);
  const m3Restante = Math.max(m3Alvo - m3Utilizado, 0);
  const percentualOcupacao = m3Alvo > 0 ? (m3Utilizado / m3Alvo) * 100 : 0;

  return {
    totalM3,
    percentualAbastecimento,
    m3Alvo,
    m3Utilizado,
    m3Restante,
    percentualOcupacao,
    statusSimulacao: calcularStatusSimulacao(m3Utilizado, m3Alvo),
    itensElegiveis: elegiveis.length,
    itensAprovados: aprovados.length,
  };
}

export type SegmentoOcupacao = {
  key: string;
  label: string;
  m3: number;
  percentualDoTotal: number;
  tipo: "produto" | "livre" | "estouro";
  alerta?: boolean;
};

export function montarSegmentosOcupacao(
  itens: Record<string, unknown>[],
  m3Alvo: number,
): SegmentoOcupacao[] {
  const elegiveis = itens
    .filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL")
    .sort((a, b) => toNumber(a.ordem_reparticao) - toNumber(b.ordem_reparticao));

  const segmentos: SegmentoOcupacao[] = elegiveis.map((item) => {
    const m3 = toNumber(item.m3_ocupado ?? item.m3_capacidade);
    return {
      key: String(item.id ?? item.codigo_produto),
      label: String(item.codigo_produto ?? "SKU"),
      m3,
      percentualDoTotal: m3Alvo > 0 ? (m3 / m3Alvo) * 100 : 0,
      tipo: "produto",
      alerta: alertasTemProblema(item),
    };
  });

  const m3Utilizado = segmentos.reduce((total, seg) => total + seg.m3, 0);
  const m3Restante = Math.max(m3Alvo - m3Utilizado, 0);

  if (m3Restante > 0) {
    segmentos.push({
      key: "livre",
      label: "Espaco livre",
      m3: m3Restante,
      percentualDoTotal: m3Alvo > 0 ? (m3Restante / m3Alvo) * 100 : 0,
      tipo: "livre",
    });
  } else if (m3Utilizado > m3Alvo && m3Alvo > 0) {
    segmentos.push({
      key: "estouro",
      label: "Estouro",
      m3: m3Utilizado - m3Alvo,
      percentualDoTotal: ((m3Utilizado - m3Alvo) / m3Alvo) * 100,
      tipo: "estouro",
    });
  }

  return segmentos;
}

function alertasTemProblema(item: Record<string, unknown>) {
  const alertas = Array.isArray(item.alertas) ? (item.alertas as string[]) : [];
  return alertas.length > 0 || toNumber(item.estoque_cd) <= 0;
}
