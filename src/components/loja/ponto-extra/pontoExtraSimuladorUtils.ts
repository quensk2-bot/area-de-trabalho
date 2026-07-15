import { alertasPontoExtra, chavePontaLojaOperacional, chavePontaOperacional, chaveSetorCapaOperacional, chaveTexto, toNumber } from "./pontoExtraSharedUtils";
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

export type ArvoreAprovacaoTotais = {
  somaCx: number;
  somaEstoque: number;
  somaUnid: number;
  somaM3: number;
  somaMedia: number;
  coberturaMedia: number;
  participacaoMedia: number;
  percentualPontaMedia: number;
};

export type ArvoreAprovacaoCapaMeta = {
  setorCodigo: string;
  setorNome: string;
  codPonta: string;
  quantPonta: string;
  tipoPonta: string;
  descricaoPonta: string;
  mesVigencia: string;
  seqVigencia: string;
  dtInicio: string;
  dtFim: string;
  limiteSku: number;
  lojas: number;
  itensAprovados: number;
  itensElegiveis: number;
  statusSimulacao: string;
  m3Alvo: number;
  totalM3: number;
  percentualAbastecimento: number;
};

export type ArvoreAprovacaoPontaMeta = {
  loja: string;
  pontaLabel: string;
  setorCodigo: string;
  setorNome: string;
  codPonta: string;
  quantPonta: string;
  tipoPonta: string;
  descricaoPonta: string;
  mesVigencia: string;
  seqVigencia: string;
  dtInicio: string;
  dtFim: string;
  limiteSku: number;
  totalM3: number;
  percentualAbastecimento: number;
  m3Alvo: number;
  m3Utilizado: number;
  percentualOcupacao: number;
  statusSimulacao: string;
  itensAprovados: number;
  itensElegiveis: number;
  somaCx: number;
  somaEstoque: number;
  alertas: number;
};

export type ArvoreAprovacaoNode = {
  id: string;
  level: "ponta" | "loja" | "setor" | "capa" | "produto";
  label: string;
  sublabel?: string;
  totais: ArvoreAprovacaoTotais;
  meta?: ArvoreAprovacaoCapaMeta | ArvoreAprovacaoPontaMeta;
  item?: Record<string, unknown>;
  children: ArvoreAprovacaoNode[];
};

export function isMetaPonta(meta: ArvoreAprovacaoCapaMeta | ArvoreAprovacaoPontaMeta): meta is ArvoreAprovacaoPontaMeta {
  return "pontaLabel" in meta;
}

export function itensDoNo(node: ArvoreAprovacaoNode): Record<string, unknown>[] {
  if (node.item) return [node.item];
  return node.children.flatMap(itensDoNo);
}

function somarTotais(itens: Record<string, unknown>[]): ArvoreAprovacaoTotais {
  const coberturas = itens
    .map((item) => {
      const media = toNumber(item.media_venda_un_dia);
      const estoque = toNumber(item.estoque_cd);
      return media > 0 ? estoque / media : 0;
    })
    .filter((value) => value > 0);

  const participacoes = itens.map((item) => toNumber(item.participacao)).filter((value) => value > 0);
  const percentuaisPonta = itens.map((item) => toNumber(item.percentual_ocupacao)).filter((value) => value > 0);

  return {
    somaCx: itens.reduce((total, item) => total + toNumber(item.caixas_sugeridas), 0),
    somaEstoque: itens.reduce((total, item) => total + toNumber(item.estoque_cd), 0),
    somaUnid: itens.reduce((total, item) => total + toNumber(item.unidade_sugerida), 0),
    somaM3: itens.reduce((total, item) => total + toNumber(item.m3_ocupado ?? item.m3_capacidade), 0),
    somaMedia: itens.reduce((total, item) => total + toNumber(item.media_venda_un_dia), 0),
    coberturaMedia: coberturas.length ? coberturas.reduce((a, b) => a + b, 0) / coberturas.length : 0,
    participacaoMedia: participacoes.length ? participacoes.reduce((a, b) => a + b, 0) / participacoes.length : 0,
    percentualPontaMedia: percentuaisPonta.length ? percentuaisPonta.reduce((a, b) => a + b, 0) / percentuaisPonta.length : 0,
  };
}

function ordenarProdutos(produtos: Record<string, unknown>[]) {
  return [...produtos].sort((a, b) => {
    const ordem = toNumber(a.ordem_reparticao) - toNumber(b.ordem_reparticao);
    if (ordem !== 0) return ordem;
    return String(a.codigo_produto ?? "").localeCompare(String(b.codigo_produto ?? ""), "pt-BR", { numeric: true });
  });
}

function montarFilhosProduto(produtos: Record<string, unknown>[]): ArvoreAprovacaoNode[] {
  return ordenarProdutos(produtos).map((item) => {
    const codigo = String(item.codigo_produto ?? "").trim();
    return {
      id: `produto|${String(item.id ?? codigo)}`,
      level: "produto" as const,
      label: "",
      totais: somarTotais([item]),
      item,
      children: [],
    };
  });
}

function montarMetaPonta(itens: Record<string, unknown>[], loja: string, pontaLabel: string): ArvoreAprovacaoPontaMeta {
  const base = itens[0] ?? {};
  const resumo = calcularResumoOcupacaoPonta(itens);
  const totais = somarTotais(itens);
  const limiteSku = Math.max(1, ...itens.map((item) => Math.floor(toNumber(item.limite_reparticao))));
  const alertas = itens.filter((item) => alertasPontoExtra(item).length > 0).length;

  return {
    loja,
    pontaLabel,
    setorCodigo: String(base.setor_codigo ?? "").trim(),
    setorNome: String(base.setor_nome ?? base.secao ?? "").trim(),
    codPonta: String(base.cod_ponta ?? "").trim(),
    quantPonta: String(base.quant_ponta ?? "").trim(),
    tipoPonta: String(base.tipo_ponta ?? "").trim(),
    descricaoPonta: String(base.descricao_ponta ?? "").trim() || "Sem descricao da ponta",
    mesVigencia: String(base.mes_vigencia ?? "").trim(),
    seqVigencia: String(base.seq_vigencia ?? "").trim(),
    dtInicio: String(base.dtavigenciainicio ?? "").trim(),
    dtFim: String(base.dtavigenciafim ?? "").trim(),
    limiteSku: Number.isFinite(limiteSku) && limiteSku > 0 ? limiteSku : 7,
    totalM3: resumo.totalM3,
    percentualAbastecimento: resumo.percentualAbastecimento,
    m3Alvo: resumo.m3Alvo,
    m3Utilizado: resumo.m3Utilizado,
    percentualOcupacao: resumo.percentualOcupacao,
    statusSimulacao: resumo.statusSimulacao,
    itensAprovados: resumo.itensAprovados,
    itensElegiveis: resumo.itensElegiveis,
    somaCx: totais.somaCx,
    somaEstoque: totais.somaEstoque,
    alertas,
  };
}

function montarMetaCapa(itensCapa: Record<string, unknown>[], lojas: number): ArvoreAprovacaoCapaMeta {
  const base = itensCapa[0] ?? {};
  const resumo = calcularResumoOcupacaoPonta(itensCapa);
  const limiteSku = Math.max(1, ...itensCapa.map((item) => Math.floor(toNumber(item.limite_reparticao))));
  return {
    setorCodigo: String(base.setor_codigo ?? "").trim(),
    setorNome: String(base.setor_nome ?? base.secao ?? "").trim(),
    codPonta: String(base.cod_ponta ?? "").trim(),
    quantPonta: String(base.quant_ponta ?? "").trim(),
    tipoPonta: String(base.tipo_ponta ?? "").trim(),
    descricaoPonta: String(base.descricao_ponta ?? "").trim() || "Sem descricao da ponta",
    mesVigencia: String(base.mes_vigencia ?? "").trim(),
    seqVigencia: String(base.seq_vigencia ?? "").trim(),
    dtInicio: String(base.dtavigenciainicio ?? "").trim(),
    dtFim: String(base.dtavigenciafim ?? "").trim(),
    limiteSku: Number.isFinite(limiteSku) && limiteSku > 0 ? limiteSku : 7,
    lojas,
    itensAprovados: resumo.itensAprovados,
    itensElegiveis: resumo.itensElegiveis,
    statusSimulacao: resumo.statusSimulacao,
    m3Alvo: resumo.m3Alvo,
    totalM3: resumo.totalM3,
    percentualAbastecimento: resumo.percentualAbastecimento,
  };
}

export function montarArvoreCapaAprovacao(itens: Record<string, unknown>[]): ArvoreAprovacaoNode[] {
  const porCapa = new Map<string, Map<string, Map<string, Record<string, unknown>[]>>>();

  for (const item of itens) {
    const capaKey = chaveSetorCapaOperacional(item);
    const loja = String(item.loja ?? "").trim() || "SEM LOJA";
    const pontaKey = chavePontaLojaOperacional(item);
    if (!porCapa.has(capaKey)) porCapa.set(capaKey, new Map());
    const porLoja = porCapa.get(capaKey)!;
    if (!porLoja.has(loja)) porLoja.set(loja, new Map());
    const porPonta = porLoja.get(loja)!;
    porPonta.set(pontaKey, [...(porPonta.get(pontaKey) ?? []), item]);
  }

  return Array.from(porCapa.entries())
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .map(([capaKey, lojas]) => {
      const filhosLoja = Array.from(lojas.entries())
        .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))
        .map(([loja, pontas]) => {
          const filhosPonta = Array.from(pontas.entries())
            .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))
            .map(([pontaKey, produtos]) => {
              const ordenados = ordenarProdutos(produtos);
              const base = ordenados[0] ?? {};
              const quantPonta = String(base.quant_ponta ?? "?").trim();
              const tipoPonta = String(base.tipo_ponta ?? "PONTA NORMAL").trim();
              const pontaLabel = `PONTA NR ${quantPonta} - ${tipoPonta}`;
              return {
                id: `ponta|${capaKey}|${loja}|${pontaKey}`,
                level: "ponta" as const,
                label: pontaLabel,
                totais: somarTotais(ordenados),
                meta: montarMetaPonta(ordenados, loja, pontaLabel),
                children: montarFilhosProduto(ordenados),
              };
            });

          const itensLoja = filhosPonta.flatMap((ponta) =>
            ponta.children.map((child) => child.item!).filter(Boolean),
          );

          return {
            id: `loja|${capaKey}|${loja}`,
            level: "loja" as const,
            label: loja,
            totais: somarTotais(itensLoja),
            children: filhosPonta,
          };
        });

      const itensCapa = filhosLoja.flatMap((loja) =>
        loja.children.flatMap((ponta) => ponta.children.map((child) => child.item!).filter(Boolean)),
      );
      const meta = montarMetaCapa(itensCapa, filhosLoja.length);
      const base = itensCapa[0] ?? {};
      const capaLabel = String(base.descricao_ponta ?? "").trim().toUpperCase()
        || `SETOR ${meta.setorCodigo} — ${meta.setorNome}`.toUpperCase();

      return {
        id: `capa|${capaKey}`,
        level: "capa" as const,
        label: capaLabel,
        sublabel: `Setor ${meta.setorCodigo} — ${meta.setorNome}`,
        meta,
        totais: somarTotais(itensCapa),
        children: filhosLoja,
      };
    });
}

export function montarArvoreAprovacao(itens: Record<string, unknown>[]): ArvoreAprovacaoNode[] {
  return montarArvoreCapaAprovacao(itens);
}
