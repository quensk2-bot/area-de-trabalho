import type { MotorAlerta, MotorBreItemResultado } from "../bre/breTypes.ts";
import type { MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import {
  acumularMetricasCdsProduto,
  adaptarCdsLegadoCentralizacao,
  adaptarCdsLegadoFlat,
  consolidarCdsProduto,
} from "./cds/index.ts";
import {
  calcularClassificacaoPrazoPublicacao,
  calcularQualidadeDados,
  calcularStatusOperacional,
  criarDuplicidadeDiagnostico,
  deduplicarAlertas,
} from "./consolidacaoDiagnostics.ts";
import { incrementarMetrica } from "./consolidacaoMetrics.ts";
import {
  joinBandeira,
  joinBre,
  joinBlocosCdsComplementares,
  joinComprador,
  joinInventario,
  joinOrdemCd,
  joinRede,
  joinValidacao,
} from "./consolidacaoJoins.ts";
import { chaveConsolidacao, validarChaveConsolidacao } from "./consolidacaoKeys.ts";
import type {
  MotorConsolidacaoErro,
  MotorConsolidacaoLoteContexto,
  MotorProdutoLojaConsolidado,
} from "./consolidacaoTypes.ts";

const CAMPOS_SEM_ORIGEM = [
  "qtdeEmbCompra",
  "pesoUnid",
  "m3Unid",
  "coberturaDias",
  "setorCodigo",
  "setorNome",
  "categoriaN1",
] as const;

function alerta(codigo: string, mensagem: string, severidade: MotorAlerta["severidade"] = "aviso"): MotorAlerta {
  return { codigo, mensagem, severidade };
}

function alertasCampoSemOrigem(): MotorAlerta[] {
  return CAMPOS_SEM_ORIGEM.map((campo) =>
    alerta("campo_sem_origem", `Campo ${campo} sem origem mapeada no Motor V7`, "info"),
  );
}

function resolverPosicaoCdSelecionada(bre: MotorBreItemResultado | null): {
  posicao: 1 | 2 | 3 | 4 | 5 | null;
  alertas: MotorAlerta[];
} {
  if (!bre) {
    return { posicao: null, alertas: [] };
  }
  if (bre.posicaoCdSelecionada != null) {
    return { posicao: bre.posicaoCdSelecionada, alertas: [] };
  }
  if (bre.textoProdutoCentralizado != null || bre.produtoCentralizado != null) {
    return {
      posicao: null,
      alertas: [
        alerta(
          "resultado_centralizacao_incompleto",
          "Centralização sem posição estruturada do CD selecionado",
          "aviso",
        ),
      ],
    };
  }
  return { posicao: null, alertas: [] };
}

function montarErrosConsolidacao(
  regional: string,
  loja: number,
  seqproduto: number,
  alertas: MotorAlerta[],
): MotorConsolidacaoErro[] {
  return alertas
    .filter((a) => a.severidade === "erro")
    .map((a) => ({
      regional,
      loja,
      seqproduto,
      codigo: a.codigo,
      mensagem: a.mensagem,
      severidade: "erro" as const,
    }));
}

function blocosEsperadosDefault(ctx: MotorConsolidacaoLoteContexto): number[] {
  return ctx.entrada.contexto.blocosEsperados ?? [2];
}

export type ConsolidarProdutoLojaParams = {
  duplicidadeBase: boolean;
  quantidadeDuplicidade?: number;
};

export function consolidarProdutoLoja(
  produto: MotorProdutoLojaNormalizado,
  ctx: MotorConsolidacaoLoteContexto,
  params: ConsolidarProdutoLojaParams,
): MotorProdutoLojaConsolidado {
  const { entrada, indexes, diagnosticosJoin, duplicidades, erros, metricasParciais, metricasCdsParciais } = ctx;
  const chaveVal = validarChaveConsolidacao(produto.regional, produto.loja, produto.seqproduto);
  const chaveInvalida = !chaveVal.valida;

  if (chaveInvalida) incrementarMetrica(metricasParciais, "linhasInvalidas");

  const chave = chaveVal.valida
    ? chaveConsolidacao(chaveVal.regional, chaveVal.loja, chaveVal.seqproduto)
    : `${produto.regional}|${produto.loja}|${produto.seqproduto}`;

  const alertas: MotorAlerta[] = [];
  const fontesAusentes: string[] = [];

  if (chaveInvalida) {
    alertas.push(alerta("chave_invalida", chaveVal.valida ? "" : chaveVal.motivo, "erro"));
  }

  if (params.duplicidadeBase && chaveVal.valida && params.quantidadeDuplicidade != null) {
    incrementarMetrica(metricasParciais, "duplicidadesBase");
    duplicidades.push(
      criarDuplicidadeDiagnostico(
        chave,
        chaveVal.regional,
        chaveVal.loja,
        chaveVal.seqproduto,
        params.quantidadeDuplicidade,
      ),
    );
    alertas.push(
      alerta(
        "duplicidade_base",
        `Duplicidade na base principal: ${params.quantidadeDuplicidade} linhas para chave ${chave}`,
        "erro",
      ),
    );
  }

  const blocosJoin = joinBlocosCdsComplementares(
    produto.regional,
    produto.loja,
    produto.seqproduto,
    indexes,
    diagnosticosJoin,
  );
  alertas.push(...blocosJoin.alertas);
  if (blocosJoin.blocos.length === 0 && !blocosJoin.ambiguo) {
    incrementarMetrica(metricasParciais, "semGrupo2");
    fontesAusentes.push("grupo2_cd5");
  }

  const invJoin = joinInventario(produto.loja, produto.seqproduto, indexes, diagnosticosJoin);
  alertas.push(...invJoin.alertas);
  if (!invJoin.inventario) {
    incrementarMetrica(metricasParciais, "semInventario");
    fontesAusentes.push("inventario");
  }

  const valJoin = joinValidacao(produto.loja, produto.seqproduto, indexes, diagnosticosJoin);
  alertas.push(...valJoin.alertas);
  if (!valJoin.validacao) {
    incrementarMetrica(metricasParciais, "semValidacao");
    fontesAusentes.push("validacao");
  }

  const breJoin = joinBre(produto.loja, produto.seqproduto, indexes, diagnosticosJoin);
  alertas.push(...breJoin.alertas);
  const bre = breJoin.bre;
  if (!bre) {
    incrementarMetrica(metricasParciais, "semBre");
    fontesAusentes.push("bre");
  }

  const redeJoin = joinRede(produto.codFornecedor, produto.fornecedor, indexes, diagnosticosJoin);
  alertas.push(...redeJoin.alertas);
  if (!redeJoin.rede) {
    incrementarMetrica(metricasParciais, "semRede");
    fontesAusentes.push("rede");
  }

  const bandeiraJoin = joinBandeira(produto.loja, indexes, diagnosticosJoin);
  alertas.push(...bandeiraJoin.alertas);
  if (!bandeiraJoin.bandeira) {
    incrementarMetrica(metricasParciais, "semBandeira");
    fontesAusentes.push("bandeira");
  }

  // Modalidade oficial do Plan 6 CD.txt
  // Fallback: "ED Direto Loja" quando o código não está no Plan 6
  const modalidadeCd =
    entrada.contexto.catalogos.plan6Produtos.find((p6) => p6.codigo === produto.seqproduto)?.modalidadeCd ?? "ED Direto Loja";

  const ordemJoin = joinOrdemCd(bandeiraJoin.bandeira, indexes, diagnosticosJoin);
  alertas.push(...ordemJoin.alertas);
  if (!ordemJoin.ordem) incrementarMetrica(metricasParciais, "semOrdem");

  const compradorJoin = joinComprador(
    redeJoin.rede,
    produto,
    entrada.contexto.catalogos.compradores,
    entrada.contexto.catalogos.conflitosComprador,
    diagnosticosJoin,
  );
  alertas.push(...compradorJoin.alertas);
  if (!compradorJoin.comprador) incrementarMetrica(metricasParciais, "semComprador");

  alertas.push(...alertasCampoSemOrigem());

  if (produto.hierarquia.niveisEncontrados < 5) {
    alertas.push(alerta("dado_incompleto", "Hierarquia mercadológica com menos de 5 níveis"));
  }

  const posicaoResolvida = resolverPosicaoCdSelecionada(bre);
  alertas.push(...posicaoResolvida.alertas);

  const cdsMerge = consolidarCdsProduto({
    regional: produto.regional,
    loja: produto.loja,
    seqproduto: produto.seqproduto,
    cdsBlocoPrincipal: produto.cds.map((cd) => ({ ...cd, alertas: [...cd.alertas] })),
    blocosComplementares: blocosJoin.ambiguo ? [] : blocosJoin.blocos,
    blocosEsperados: blocosEsperadosDefault(ctx),
  });
  alertas.push(...cdsMerge.alertas);

  // Preencher codigoFisico em cada CD usando a ordem resolvida do catálogo (cd1..cd5)
  // ATENÇÃO: ordemJoin.ordem tem cd1..cd5 (não primeiroCd..quintoCd — esse é do BRE)
  for (const cd of cdsMerge.cds) {
    if (cd.codigoFisico == null && ordemJoin.ordem) {
      const codigo =
        cd.posicaoLogica === 1 ? ordemJoin.ordem.cd1 :
        cd.posicaoLogica === 2 ? ordemJoin.ordem.cd2 :
        cd.posicaoLogica === 3 ? ordemJoin.ordem.cd3 :
        cd.posicaoLogica === 4 ? ordemJoin.ordem.cd4 :
        cd.posicaoLogica === 5 ? ordemJoin.ordem.cd5 : null;
      if (codigo != null && codigo > 0) {
        cd.codigoFisico = codigo;
      }
    }
  }

  acumularMetricasCdsProduto(metricasCdsParciais, {
    cds: cdsMerge.cds,
    posicaoDuplicada: cdsMerge.posicaoDuplicada,
    blocoSobreposto: cdsMerge.blocoSobreposto,
    posicoesNaoContiguas: cdsMerge.posicoesNaoContiguas,
    codigoFisicoAusente: cdsMerge.codigoFisicoAusente,
  });

  const legadoFlat = adaptarCdsLegadoFlat(cdsMerge.cds);
  const legadoCentralizacao = adaptarCdsLegadoCentralizacao({
    cds: cdsMerge.cds,
    bre,
    ordemCds: ordemJoin.ordem,
  });

  const alertasDedup = deduplicarAlertas(alertas);
  const errosLocais = montarErrosConsolidacao(
    produto.regional,
    produto.loja,
    produto.seqproduto,
    alertasDedup,
  );
  erros.push(...errosLocais);

  const blocosAmbiguo = blocosJoin.ambiguo;
  const breAusente = bre == null;
  const breBloqueado =
    bre != null &&
    (bre.statusBaseLimpa === "Não considera Ruptura" ||
      bre.regras.some((r) => r.status === "bloqueada_dependencia"));

  const classificacaoConfiavel =
    !chaveInvalida && !params.duplicidadeBase && !breAusente && !blocosAmbiguo && !cdsMerge.posicaoDuplicada;

  const qualidadeDados = calcularQualidadeDados(
    errosLocais,
    alertasDedup,
    params.duplicidadeBase,
    chaveInvalida,
    breAusente || blocosAmbiguo,
    cdsMerge.posicaoDuplicada,
  );

  const statusOperacional = calcularStatusOperacional({
    chaveInvalida,
    duplicidadeBase: params.duplicidadeBase,
    breAusente,
    breBloqueado,
    curtoPrazo: bre?.curtoPrazo ?? null,
    medioPrazo: bre?.medioPrazo ?? null,
    longoPrazo: bre?.longoPrazo ?? null,
    classificacaoConfiavel,
    cdsPosicaoDuplicada: cdsMerge.posicaoDuplicada,
  });

  const classificacaoPrazo = calcularClassificacaoPrazoPublicacao(statusOperacional);

  return {
    regional: produto.regional,
    dataReferencia: entrada.contexto.dataReferencia,
    bandeira: bandeiraJoin.bandeira,
    loja: produto.loja,
    seqproduto: produto.seqproduto,
    descricao: produto.descricao,
    codFornecedor: produto.codFornecedor,
    fornecedor: produto.fornecedor,
    rede: redeJoin.rede,
    comprador: compradorJoin.comprador,
    origemComprador: compradorJoin.origemComprador,
    chaveComprador: compradorJoin.chaveComprador,
    fallbackComprador: compradorJoin.fallbackComprador,
    statusProduto: produto.statusProduto,
    familia: produto.familia,
    divisao: produto.hierarquia.divisao,
    setorCodigo: null,
    setorNome: null,
    categoriaN1: null,
    setorN2: produto.hierarquia.setorN2,
    grupoN3: produto.hierarquia.grupoN3,
    subgrupoN4: produto.hierarquia.subgrupoN4,
    tipoN5: produto.hierarquia.tipoN5,
    mediaVendaUnDia: produto.mediaVendaUnDia,
    mediaVendaGp: produto.mediaVendaGp,
    estoqueLoja: produto.estoqueLoja,
    parMin: produto.parMin,
    parMax: produto.parMax,
    pendenciaLoja: produto.pendenciaLoja,
    diasRuptura: produto.diasRuptura,
    ultimaEntradaLoja: produto.ultimaEntradaLoja,
    ultimaSaidaLoja: produto.ultimaSaidaLoja,
    ultimaCpaLoja: produto.ultimaCpaLoja ?? null,
    ultimaCpaCd1: produto.ultimaCpaCd1 ?? null,
    ultimaCpaCd2: produto.ultimaCpaCd2 ?? null,
    ultimaCpaCd3: produto.ultimaCpaCd3 ?? null,
    ultimaCpaCd4: produto.ultimaCpaCd4 ?? null,
    ultimaCpaCd5: null, // virá do Grupo2 futuramente
    dtaUltAtivacao: produto.dtaUltAtivacao ?? null,
    ultimoPedidoLoja: produto.diasCompraLj ?? null,
    diasAtivacaoRevisado: bre?.diasAtivacaoRevisado ?? null,
    cds: cdsMerge.cds,
    ...legadoFlat,
    somaEstoqueCd: bre?.somaEstoqueCd ?? null,
    crossSum: bre?.crossSum ?? null,
    crossDocking: bre?.crossDocking ?? null,
    estSelecInvCd1: produto.estSelecInvCd1 ?? null,
    estSelecInvCd2: produto.estSelecInvCd2 ?? null,
    estSelecInvCd3: produto.estSelecInvCd3 ?? null,
    estSelecInvCd4: produto.estSelecInvCd4 ?? null,
    origemCross: bre?.origemCross ?? null,
    geraRuptura: valJoin.validacao?.geraRuptura ?? null,
    ruptura104c: valJoin.validacao?.ruptura104c ?? null,
    inventarioUnid: invJoin.inventario?.inventarioUnid ?? null,
    rupturaComInventario: bre?.rupturaInventario ?? null,
    rupturaSemInventario: bre?.rupturaSemInventario ?? null,
    baseLimpa: bre?.statusBaseLimpa ?? null,
    ativacaoRecente: bre?.statusAtivo60Dias ?? null,
    curtoPrazo: bre?.curtoPrazo ?? null,
    medioPrazo: bre?.medioPrazo ?? null,
    longoPrazo: bre?.longoPrazo ?? null,
    classificacaoPrazo,
    pendenciaCpaCd: bre?.pendenciaCpaCd ?? null,
    diasPedido: bre?.diasPedido ?? null,
    acaoCurtoPrazo: bre?.acaoCurtoPrazo ?? null,
    acaoMedioPrazo: bre?.acaoMedioPrazo ?? null,
    ...legadoCentralizacao,
    menorDiasRecebimento: bre?.menorRecebimentoCd ?? null,
    produtoCentralizado: bre?.produtoCentralizado ?? null,
    textoProdutoCentralizado: bre?.textoProdutoCentralizado ?? null,
    posicaoCdSelecionada: posicaoResolvida.posicao,
    codigoCdSelecionado: bre?.codigoCdSelecionado ?? null,
    statusRecebto: bre?.statusRecebtoCentralizacao ?? null,
    statusEstoqueCds: bre?.statusEstoqueCds ?? null,
    statusSolicitacaoAtivacaoCd: bre?.statusSolicitacaoAtivacaoCd ?? null,
    qtdeEmbCompra: null,
    embalagemCompra: produto.embalagemCompra,
    custoLiquido: produto.custoLiquido,
    pesoUnid: null,
    m3Unid: null,
    coberturaDias: null,
    modCurtoPrazo: bre?.modCurtoPrazo ?? null,
    ncurtoPrazo: bre?.ncurtoPrazo ?? null,
    modalidadeCd,
    statusOperacional,
    qualidadeDados,
    alertas: alertasDedup,
    erros: errosLocais,
    fontesAusentes,
  };
}
