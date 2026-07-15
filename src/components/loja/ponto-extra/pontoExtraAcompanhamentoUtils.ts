import { calcularResumoOcupacaoPonta } from "./pontoExtraOcupacaoUtils";
import {
  buildMediaLookup,
  chavePontaOperacional,
  formatDateBR,
  lookupMedia,
  toNumber,
} from "./pontoExtraSharedUtils";

export type AcompanhamentoPontaItem = {
  id: string;
  codigo: string;
  descricao: string;
  ordem: number;
  parMinLoja: number;
  minPonta: number;
  minTotal: number;
  parMaxLoja: number;
  maxPonta: number;
  maxTotal: number;
  estoqueLoja: number;
  estoqueCd: number;
  percentualAbastecido: number;
  percentualLivre: number;
  cobertura: number;
};

export type AcompanhamentoPontaCard = {
  key: string;
  loja: string;
  quantPonta: string;
  tipoPonta: string;
  codPonta: string;
  descricaoPonta: string;
  setorCodigo: string;
  setorNome: string;
  dtInicio: string;
  dtFim: string;
  abastecidoPct: number;
  livrePct: number;
  somaEstoqueLoja: number;
  somaMaxTotal: number;
  m3Alvo: number;
  m3Utilizado: number;
  percentualAbastecimentoCubagem: number;
  statusSimulacao: string;
  produtos: number;
  itens: AcompanhamentoPontaItem[];
};

export function maxCapacidadeItem(item: Record<string, unknown>) {
  const parMax = toNumber(item.par_max_normal);
  const maxPonta = toNumber(item.estqmaximo_sugerido);
  const maxTotal = toNumber(item.estoque_maximo_total);
  return maxTotal > 0 ? maxTotal : parMax + maxPonta;
}

export function calcularPercentualAbastecimentoEstoque(estoque: number, maxCapacidade: number) {
  if (maxCapacidade <= 0) return 0;
  return Math.min(100, Math.max(0, (estoque / maxCapacidade) * 100));
}

function resolverEstoqueLoja(
  item: Record<string, unknown>,
  mediaPorLojaCodigo: Map<string, Record<string, unknown>>,
) {
  const estoqueSalvo = item.estoque_loja;
  if (estoqueSalvo !== undefined && estoqueSalvo !== null && String(estoqueSalvo).trim() !== "") {
    return toNumber(estoqueSalvo);
  }

  const media = lookupMedia(mediaPorLojaCodigo, item.loja, item.codigo_produto);
  return toNumber(media?.estoque);
}

export function enriquecerRowsAcompanhamentoEstoque(
  rows: Record<string, unknown>[],
  medias: Record<string, unknown>[],
) {
  const mediaPorLojaCodigo = buildMediaLookup(medias);
  return rows.map((row) => {
    const estoqueLoja = resolverEstoqueLoja(row, mediaPorLojaCodigo);
    return {
      ...row,
      estoque_loja: estoqueLoja,
      max_capacidade_estoque: maxCapacidadeItem(row),
    };
  });
}

function coberturaItem(item: Record<string, unknown>) {
  const media = toNumber(item.media_venda_un_dia);
  const estoque = toNumber(item.estoque_cd);
  if (media <= 0) return 0;
  return estoque / media;
}

function montarItemAcompanhamento(item: Record<string, unknown>) {
  const maxTotal = maxCapacidadeItem(item);
  const estoqueLoja = toNumber(item.estoque_loja);
  const percentualAbastecido = calcularPercentualAbastecimentoEstoque(estoqueLoja, maxTotal);

  return {
    id: String(item.id ?? ""),
    codigo: String(item.codigo_produto ?? "").trim(),
    descricao: String(item.descricao_produto ?? "").trim(),
    ordem: toNumber(item.ordem_reparticao),
    parMinLoja: toNumber(item.par_min_normal),
    minPonta: toNumber(item.estqminimo_sugerido),
    minTotal: toNumber(item.estoque_minimo_total),
    parMaxLoja: toNumber(item.par_max_normal),
    maxPonta: toNumber(item.estqmaximo_sugerido),
    maxTotal,
    estoqueLoja,
    estoqueCd: toNumber(item.estoque_cd),
    percentualAbastecido,
    percentualLivre: Math.max(0, 100 - percentualAbastecido),
    cobertura: coberturaItem(item),
  };
}

export function agruparPontasAcompanhamento(rows: Record<string, unknown>[]): AcompanhamentoPontaCard[] {
  const mapa = new Map<string, Record<string, unknown>[]>();

  for (const item of rows) {
    const key = chavePontaOperacional(item);
    mapa.set(key, [...(mapa.get(key) ?? []), item]);
  }

  return Array.from(mapa.entries())
    .map(([key, itens]) => {
      const base = itens[0] ?? {};
      const resumo = calcularResumoOcupacaoPonta(itens);

      const detalhes = [...itens]
        .sort((a, b) => toNumber(a.ordem_reparticao) - toNumber(b.ordem_reparticao))
        .map((item) => montarItemAcompanhamento(item));

      const somaEstoqueLoja = detalhes.reduce((total, item) => total + item.estoqueLoja, 0);
      const somaMaxTotal = detalhes.reduce((total, item) => total + item.maxTotal, 0);
      const abastecidoPct = calcularPercentualAbastecimentoEstoque(somaEstoqueLoja, somaMaxTotal);
      const livrePct = Math.max(0, 100 - abastecidoPct);

      return {
        key,
        loja: String(base.loja ?? "").trim(),
        quantPonta: String(base.quant_ponta ?? "").trim(),
        tipoPonta: String(base.tipo_ponta ?? "PONTA NORMAL").trim(),
        codPonta: String(base.cod_ponta ?? "").trim(),
        descricaoPonta: String(base.descricao_ponta ?? "").trim(),
        setorCodigo: String(base.setor_codigo ?? "").trim(),
        setorNome: String(base.setor_nome ?? base.secao ?? "").trim(),
        dtInicio: String(base.dtavigenciainicio ?? "").trim(),
        dtFim: String(base.dtavigenciafim ?? "").trim(),
        abastecidoPct,
        livrePct,
        somaEstoqueLoja,
        somaMaxTotal,
        m3Alvo: resumo.m3Alvo,
        m3Utilizado: resumo.m3Utilizado,
        percentualAbastecimentoCubagem: resumo.percentualAbastecimento,
        statusSimulacao: resumo.statusSimulacao,
        produtos: detalhes.length,
        itens: detalhes,
      };
    })
    .sort((a, b) =>
      `${a.loja} ${a.quantPonta} ${a.codPonta}`.localeCompare(`${b.loja} ${b.quantPonta} ${b.codPonta}`, "pt-BR", { numeric: true }),
    );
}

export function labelPeriodoPonta(card: AcompanhamentoPontaCard) {
  if (!card.dtInicio && !card.dtFim) return "-";
  return `${formatDateBR(card.dtInicio)} a ${formatDateBR(card.dtFim)}`;
}

export type FaixaCriticidade = "ok" | "atencao" | "critica";

export function faixaCriticidade(abastecidoPct: number): FaixaCriticidade {
  if (abastecidoPct >= 70) return "ok";
  if (abastecidoPct >= 40) return "atencao";
  return "critica";
}

export function resumirCriticidadePontas(cards: AcompanhamentoPontaCard[]) {
  const resumo = { ok: 0, atencao: 0, critica: 0, total: cards.length };
  let somaPct = 0;
  for (const card of cards) {
    resumo[faixaCriticidade(card.abastecidoPct)]++;
    somaPct += card.abastecidoPct;
  }
  return {
    ...resumo,
    mediaAbastecido: cards.length ? somaPct / cards.length : 0,
  };
}

export function ordenarPontasPorCriticidade(cards: AcompanhamentoPontaCard[]) {
  return [...cards].sort((a, b) => {
    const pctDiff = a.abastecidoPct - b.abastecidoPct;
    if (pctDiff !== 0) return pctDiff;
    return `${a.loja} ${a.quantPonta} ${a.codPonta}`.localeCompare(
      `${b.loja} ${b.quantPonta} ${b.codPonta}`,
      "pt-BR",
      { numeric: true },
    );
  });
}
