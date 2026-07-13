import { alertasPontoExtra, chavePontaOperacional, chaveTexto, toNumber } from "./pontoExtraSharedUtils";
import { calcularResumoOcupacaoPonta } from "./pontoExtraOcupacaoUtils";

export type PontaSimulacaoGrupo = {
  key: string;
  loja: string;
  quantPonta: string;
  codPonta: string;
  descricaoPonta: string;
  setorCodigo: string;
  setorNome: string;
  tipoPonta: string;
  mesVigencia: string;
  seqVigencia: string;
  dtInicio: string;
  dtFim: string;
  limiteSku: number;
  itens: Record<string, unknown>[];
  resumo: ReturnType<typeof calcularResumoOcupacaoPonta>;
};

export function agruparPontasSimulacao(itens: Record<string, unknown>[]): PontaSimulacaoGrupo[] {
  const mapa = new Map<string, Record<string, unknown>[]>();
  for (const item of itens) {
    const key = chavePontaOperacional(item);
    mapa.set(key, [...(mapa.get(key) ?? []), item]);
  }

  return Array.from(mapa.entries())
    .map(([key, grupo]) => {
      const base = grupo[0] ?? {};
      const limiteSku = Math.max(
        1,
        ...grupo.map((item) => Math.floor(toNumber(item.limite_reparticao))),
      );
      return {
        key,
        loja: String(base.loja ?? "").trim(),
        quantPonta: String(base.quant_ponta ?? "").trim(),
        codPonta: String(base.cod_ponta ?? "").trim(),
        descricaoPonta: String(base.descricao_ponta ?? "").trim() || "Sem descricao da ponta",
        setorCodigo: String(base.setor_codigo ?? "").trim(),
        setorNome: String(base.setor_nome ?? base.secao ?? "").trim(),
        tipoPonta: String(base.tipo_ponta ?? "").trim(),
        mesVigencia: String(base.mes_vigencia ?? "").trim(),
        seqVigencia: String(base.seq_vigencia ?? "").trim(),
        dtInicio: String(base.dtavigenciainicio ?? "").trim(),
        dtFim: String(base.dtavigenciafim ?? "").trim(),
        limiteSku: Number.isFinite(limiteSku) && limiteSku > 0 ? limiteSku : 7,
        itens: grupo.sort((a, b) => toNumber(a.ordem_reparticao) - toNumber(b.ordem_reparticao)),
        resumo: calcularResumoOcupacaoPonta(grupo),
      };
    })
    .sort((a, b) =>
      `${a.loja} ${a.codPonta} ${a.quantPonta}`.localeCompare(`${b.loja} ${b.codPonta} ${b.quantPonta}`, "pt-BR", { numeric: true }),
    );
}

export function filtrarGruposSimulacao(
  grupos: PontaSimulacaoGrupo[],
  filtros: {
    regionalLojas?: Set<string>;
    loja?: string;
    codPonta?: string;
    quantPonta?: string;
    setor?: string;
    tipoPonta?: string;
  },
) {
  return grupos.filter((grupo) => {
    const lojaOk = !filtros.loja || grupo.loja.includes(filtros.loja);
    const codOk = !filtros.codPonta || grupo.codPonta.toUpperCase().includes(filtros.codPonta.toUpperCase());
    const pontaOk = !filtros.quantPonta || `${grupo.quantPonta} ${grupo.descricaoPonta}`.toUpperCase().includes(filtros.quantPonta.toUpperCase());
    const setorOk = !filtros.setor || `${grupo.setorCodigo} ${grupo.setorNome}`.toUpperCase().includes(filtros.setor.toUpperCase());
    const tipoOk = !filtros.tipoPonta || grupo.tipoPonta.toUpperCase().includes(filtros.tipoPonta.toUpperCase());
    const regionalOk = !filtros.regionalLojas || filtros.regionalLojas.size === 0 || filtros.regionalLojas.has(grupo.loja);
    return lojaOk && codOk && pontaOk && setorOk && tipoOk && regionalOk;
  });
}

export type CenarioComparacao = {
  titulo: string;
  produtos: number;
  ocupacaoPct: number;
  m3Utilizado: number;
  minTotal: number;
  maxTotal: number;
  coberturaMedia: number;
  unidades: number;
  caixas: number;
};

export function montarComparacaoCenarios(grupo: PontaSimulacaoGrupo): {
  atual: CenarioComparacao | null;
  sugerido: CenarioComparacao;
  temAnterior: boolean;
} {
  const elegiveis = grupo.itens.filter(
    (item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL",
  );
  const aprovados = elegiveis.filter((item) => Boolean(item.aprovado));

  const sugerido = resumoCenario("Cenario sugerido", elegiveis, grupo.resumo.percentualOcupacao);
  const atual = aprovados.length > 0 ? resumoCenario("Cenario atual", aprovados, grupo.resumo.percentualOcupacao) : null;

  return {
    atual,
    sugerido,
    temAnterior: aprovados.length > 0,
  };
}

function resumoCenario(titulo: string, itens: Record<string, unknown>[], ocupacaoSugerida: number): CenarioComparacao {
  const m3Utilizado = itens.reduce((total, item) => total + toNumber(item.m3_ocupado ?? item.m3_capacidade), 0);
  const m3Alvo = toNumber(itens[0]?.m3_alvo);
  const ocupacaoPct = m3Alvo > 0 ? (m3Utilizado / m3Alvo) * 100 : ocupacaoSugerida;

  const coberturas = itens
    .map((item) => {
      const media = toNumber(item.media_venda_un_dia);
      const estoque = toNumber(item.estoque_cd);
      return media > 0 ? estoque / media : 0;
    })
    .filter((value) => value > 0);

  return {
    titulo,
    produtos: itens.length,
    ocupacaoPct,
    m3Utilizado,
    minTotal: itens.reduce((total, item) => total + toNumber(item.estoque_minimo_total ?? item.estqminimo_sugerido), 0),
    maxTotal: itens.reduce((total, item) => total + toNumber(item.estoque_maximo_total ?? item.estqmaximo_sugerido), 0),
    coberturaMedia: coberturas.length ? coberturas.reduce((a, b) => a + b, 0) / coberturas.length : 0,
    unidades: itens.reduce((total, item) => total + toNumber(item.unidade_sugerida), 0),
    caixas: itens.reduce((total, item) => total + toNumber(item.caixas_sugeridas), 0),
  };
}

export function produtoElegivel(item: Record<string, unknown>) {
  return !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL";
}

export function coberturaProduto(item: Record<string, unknown>) {
  const media = toNumber(item.media_venda_un_dia);
  const estoque = toNumber(item.estoque_cd);
  if (media <= 0) return 0;
  return estoque / media;
}

export function situacaoProduto(item: Record<string, unknown>) {
  if (item.fora_reparticao) return "FORA_DA_REPARTICAO";
  if (Boolean(item.aprovado)) return "APROVADO";
  const alertas = alertasPontoExtra(item);
  if (alertas.length > 0) return "ALERTA";
  return "ELEGIVEL";
}

export function labelPonta(grupo: PontaSimulacaoGrupo) {
  const partes = [grupo.tipoPonta, grupo.quantPonta].filter(Boolean);
  return partes.join(" ") || grupo.descricaoPonta;
}

export function chaveGrupoExport(grupo: PontaSimulacaoGrupo) {
  return chaveTexto(grupo.loja, grupo.codPonta, grupo.quantPonta, grupo.setorCodigo, grupo.tipoPonta);
}
