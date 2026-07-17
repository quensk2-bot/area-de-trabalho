import type { MotorAlerta, MotorBreItemResultado } from "../bre/breTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import {
  calcularQualidadeDados,
  calcularStatusOperacional,
  criarDuplicidadeDiagnostico,
  deduplicarAlertas,
} from "./consolidacaoDiagnostics.ts";
import { incrementarMetrica } from "./consolidacaoMetrics.ts";
import {
  joinBandeira,
  joinBre,
  joinCd5,
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

export type ConsolidarProdutoLojaParams = {
  duplicidadeBase: boolean;
  quantidadeDuplicidade?: number;
};

export function consolidarProdutoLoja(
  produto: MotorProdutoLojaNormalizado,
  ctx: MotorConsolidacaoLoteContexto,
  params: ConsolidarProdutoLojaParams,
): MotorProdutoLojaConsolidado {
  const { entrada, indexes, diagnosticosJoin, duplicidades, erros, metricasParciais } = ctx;
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

  const cd5Join = joinCd5(produto.regional, produto.seqproduto, indexes, diagnosticosJoin);
  alertas.push(...cd5Join.alertas);
  if (!cd5Join.cd5) {
    incrementarMetrica(metricasParciais, "semGrupo2");
    fontesAusentes.push("grupo2_cd5");
  }
  if (cd5Join.alertas.some((a) => a.codigo === "cd5_ambiguo")) {
    // qualidade tratada abaixo
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

  const redeJoin = joinRede(produto.codFornecedor, indexes, diagnosticosJoin);
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

  const cd5: MotorCd5Normalizado | null = cd5Join.cd5;
  const alertasDedup = deduplicarAlertas(alertas);
  const errosLocais = montarErrosConsolidacao(
    produto.regional,
    produto.loja,
    produto.seqproduto,
    alertasDedup,
  );
  erros.push(...errosLocais);

  const cd5Ambiguo = alertasDedup.some((a) => a.codigo === "cd5_ambiguo");
  const breAusente = bre == null;
  const breBloqueado =
    bre != null &&
    (bre.statusBaseLimpa === "Não considera Ruptura" ||
      bre.regras.some((r) => r.status === "bloqueada_dependencia"));

  const classificacaoConfiavel =
    !chaveInvalida && !params.duplicidadeBase && !breAusente && !cd5Ambiguo;

  const qualidadeDados = calcularQualidadeDados(
    errosLocais,
    alertasDedup,
    params.duplicidadeBase,
    chaveInvalida,
    breAusente || cd5Ambiguo,
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
  });

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
    estoqueCd1: produto.estoqueCd1,
    estoqueCd2: produto.estoqueCd2,
    estoqueCd3: produto.estoqueCd3,
    estoqueCd4: produto.estoqueCd4,
    estoqueCd5: cd5?.estoqueCd5 ?? null,
    pendenciaCd1: produto.pendenciaCd1,
    pendenciaCd2: produto.pendenciaCd2,
    pendenciaCd3: produto.pendenciaCd3,
    pendenciaCd4: produto.pendenciaCd4,
    pendenciaCd5: cd5?.pendenciaCd5 ?? null,
    statusCompraCd1: produto.statusCompraCd1,
    statusCompraCd2: produto.statusCompraCd2,
    statusCompraCd3: produto.statusCompraCd3,
    statusCompraCd4: produto.statusCompraCd4,
    statusCompraCd5: cd5?.statusCompraCd5 ?? null,
    diasCompraCd1: produto.diasCompraCd1,
    diasCompraCd2: produto.diasCompraCd2,
    diasCompraCd3: produto.diasCompraCd3,
    diasCompraCd4: produto.diasCompraCd4,
    diasCompraCd5: cd5?.diasCompraCd5 ?? null,
    diasRecebtoCd1: produto.diasRecebtoCd1,
    diasRecebtoCd2: produto.diasRecebtoCd2,
    diasRecebtoCd3: produto.diasRecebtoCd3,
    diasRecebtoCd4: produto.diasRecebtoCd4,
    diasRecebtoCd5: cd5?.diasRecebtoCd5 ?? null,
    somaEstoqueCd: bre?.somaEstoqueCd ?? null,
    crossSum: bre?.crossSum ?? null,
    crossDocking: bre?.crossDocking ?? null,
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
    classificacaoPrazo: bre?.classificacaoPrazo ?? null,
    pendenciaCpaCd: bre?.pendenciaCpaCd ?? null,
    diasPedido: bre?.diasPedido ?? null,
    acaoCurtoPrazo: bre?.acaoCurtoPrazo ?? null,
    acaoMedioPrazo: bre?.acaoMedioPrazo ?? null,
    primeiroCd: bre?.primeiroCd ?? ordemJoin.ordem?.cd1 ?? null,
    segundoCd: bre?.segundoCd ?? ordemJoin.ordem?.cd2 ?? null,
    terceiroCd: bre?.terceiroCd ?? ordemJoin.ordem?.cd3 ?? null,
    quartoCd: bre?.quartoCd ?? ordemJoin.ordem?.cd4 ?? null,
    quintoCd: bre?.quintoCd ?? ordemJoin.ordem?.cd5 ?? null,
    menorDiasRecebimento: bre?.menorRecebimentoCd ?? null,
    produtoCentralizado: bre?.produtoCentralizado ?? null,
    textoProdutoCentralizado: bre?.textoProdutoCentralizado ?? null,
    posicaoCdSelecionada: posicaoResolvida.posicao,
    codigoCdSelecionado: bre?.codigoCdSelecionado ?? null,
    flagPrimeiroCd: bre?.flagPrimeiroCd ?? null,
    flagSegundoCd: bre?.flagSegundoCd ?? null,
    flagTerceiroCd: bre?.flagTerceiroCd ?? null,
    flagQuartoCd: bre?.flagQuartoCd ?? null,
    flagQuintoCd: bre?.flagQuintoCd ?? null,
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
    statusOperacional,
    qualidadeDados,
    alertas: alertasDedup,
    erros: errosLocais,
    fontesAusentes,
  };
}
