import type { MotorBreEntrada, MotorBreItemInput, MotorBreItemResultado, MotorBreResultado } from "./breTypes.ts";
import { classificarPrazo } from "./classificarPrazo.ts";
import { chaveLojaProduto } from "./breContext.ts";
import { consolidarMetricasBre, criarBreResultadoVazio, mergeRegraResults } from "./breResult.ts";
import { aplicarRuleAtivacaoRecente } from "./rules/ruleAtivacaoRecente.ts";
import { aplicarRuleBaseLimpa } from "./rules/ruleBaseLimpa.ts";
import { aplicarRuleCrossDocking } from "./rules/ruleCrossDocking.ts";
import { aplicarRuleDiasPedido } from "./rules/calcularDiasPedido.ts";
import { aplicarAcoesOperacionais } from "./rules/calcularAcoesOperacionais.ts";
import { aplicarRuleInventario } from "./rules/ruleInventario.ts";
import { aplicarRuleRuptura104c } from "./rules/ruleRuptura104c.ts";
import { aplicarRuleSomaEstoqueCd } from "./rules/ruleSomaEstoqueCd.ts";
import { getModCurtoPrazo } from "../catalog/parseProdutosExclusivos.ts";
import { getNCurtoPrazo } from "../catalog/parseModalidadesExclusivas.ts";

function montarItemInput(entrada: MotorBreEntrada, produto: MotorBreEntrada["produtosLoja"][number]): MotorBreItemInput {
  const chave = chaveLojaProduto(produto.loja, produto.seqproduto);
  return {
    produto,
    cd5: entrada.cds5.get(produto.seqproduto) ?? null,
    validacao: entrada.validacao.get(chave) ?? null,
    inventario: entrada.inventario.get(chave) ?? null,
  };
}

export function processarItemBre(
  input: MotorBreItemInput,
  dataReferencia: string,
  catalogos: MotorBreEntrada["contexto"]["catalogos"],
): MotorBreItemResultado {
  const baseLimpa = aplicarRuleBaseLimpa(input);
  const ativacao = aplicarRuleAtivacaoRecente(input.dtaUltAtivacao ?? null, dataReferencia);
  const ruptura104c = aplicarRuleRuptura104c(input);
  const inventarioRegras = aplicarRuleInventario(input);
  const somaCd = aplicarRuleSomaEstoqueCd(input);
  const modCurtoPrazo = getModCurtoPrazo(catalogos.produtosExclusivos, input.produto.seqproduto);
  const ncurtoPrazo = getNCurtoPrazo(catalogos.excecoesProdutoLoja, input.produto.seqproduto, input.produto.loja);

  const statusBaseLimpa = baseLimpa.resultado as MotorBreItemResultado["statusBaseLimpa"];
  const menorQueTres = ruptura104c.resultado as 0 | 1;
  const somaEstoqueCd = somaCd.resultado as number;

  const classificacao = classificarPrazo({
    item: input,
    statusBaseLimpa,
    menorQueTres,
    somaEstoqueCd,
    modCurtoPrazo,
    ncurtoPrazo,
  });

  const crossDockingRegra = aplicarRuleCrossDocking(
    classificacao.crossSum,
    somaEstoqueCd,
    classificacao.curtoPrazo,
    modCurtoPrazo,
  );

  const diasPedido = aplicarRuleDiasPedido(input);

  const acoes = aplicarAcoesOperacionais(input, {
    curtoPrazo: classificacao.curtoPrazo,
    medioPrazo: classificacao.medioPrazo,
    menorQueTres,
    modCurtoPrazo,
    diasPedido: diasPedido.diasPedidoFinal,
    pendenciaCpaCd: classificacao.pendenciaCpaCd,
  });

  const regras = mergeRegraResults(
    [baseLimpa, ativacao, ruptura104c],
    inventarioRegras,
    [somaCd],
    classificacao.regras,
    [crossDockingRegra],
  );

  const inventarioUnid = inventarioRegras.find((r) => r.regra === "inventario_unid")?.resultado as number ?? 0;
  const rupturaInventario = inventarioRegras.find((r) => r.regra === "ruptura_inventario")?.resultado as 0 | 1 ?? 0;
  const rupturaSemInventario = inventarioRegras.find((r) => r.regra === "ruptura_sem_inventario")?.resultado as 0 | 1 ?? 0;

  return {
    loja: input.produto.loja,
    seqproduto: input.produto.seqproduto,
    statusBaseLimpa,
    diasAtivacaoRevisado: ativacao.entradasUtilizadas.diasAtivacaoRevisado as number,
    statusAtivo60Dias: ativacao.resultado as boolean,
    menorQueTresUnidades: menorQueTres,
    flagRuptura: input.validacao?.geraRuptura === true ? "Gera Ruptura" : input.validacao ? "Não Gera Ruptura" : null,
    ruptura104c: input.validacao?.ruptura104c === true,
    inventarioUnid,
    rupturaInventario,
    rupturaSemInventario,
    somaEstoqueCd,
    pendenciaCpaCd: classificacao.pendenciaCpaCd,
    crossSum: classificacao.crossSum,
    crossDocking: crossDockingRegra.resultado as 0 | 1,
    modCurtoPrazo,
    ncurtoPrazo,
    classificacaoPrazo: classificacao.classificacaoPrazo,
    curtoPrazo: classificacao.curtoPrazo,
    medioPrazo: classificacao.medioPrazo,
    longoPrazo: classificacao.longoPrazo,
    mediaDiasPedidoLoja: diasPedido.mediaDiasPedidoLoja,
    mediaDiasPedidoCd1: diasPedido.mediaDiasPedidoCd1,
    mediaDiasPedidoCd2: diasPedido.mediaDiasPedidoCd2,
    mediaDiasPedidoCd3: diasPedido.mediaDiasPedidoCd3,
    mediaDiasPedidoCd4: diasPedido.mediaDiasPedidoCd4,
    mediaDiasPedidoCd5: diasPedido.mediaDiasPedidoCd5,
    diasPedido: diasPedido.diasPedidoFinal,
    origemDiasPedido: diasPedido.origemResultado,
    avaliarPedido: acoes.auxiliares.avaliarPedido,
    pendenciaIndevida: acoes.auxiliares.pendenciaIndevida,
    pedidoSuperior30Dias: acoes.auxiliares.pedidoSuperior30Dias,
    possuiPedidoCompra: acoes.auxiliares.possuiPedidoCompra,
    semEntradaSemPedido: acoes.auxiliares.semEntradaSemPedido,
    curtoPrazoRebtoProximo: acoes.auxiliares.curtoPrazoRebtoProximo,
    curtoPrazoNaoRebtoProximo: acoes.auxiliares.curtoPrazoNaoRebtoProximo,
    acaoCurtoPrazo: acoes.acaoCurtoPrazo,
    acaoMedioPrazo: acoes.acaoMedioPrazo,
    statusEstoqueCds: acoes.auxiliares.statusEstoqueCds,
    statusSolicitacaoAtivacaoCd: acoes.auxiliares.statusSolicitacaoAtivacaoCd,
    regras,
    alertas: [
      ...regras.flatMap((r) => r.alertas),
      ...classificacao.alertas,
      ...diasPedido.alertas,
      ...acoes.alertas,
    ],
  };
}

export function processarItemBreFundacao(
  input: MotorBreItemInput,
  dataReferencia: string,
  catalogos: MotorBreEntrada["contexto"]["catalogos"],
): MotorBreItemResultado {
  return processarItemBre(input, dataReferencia, catalogos);
}

export function processarBre(entrada: MotorBreEntrada): MotorBreResultado {
  const inicioMs = Date.now();
  const resultado = criarBreResultadoVazio(entrada.contexto.regional, entrada.contexto.dataReferencia);

  resultado.itens = entrada.produtosLoja.map((produto) =>
    processarItemBre(montarItemInput(entrada, produto), entrada.contexto.dataReferencia, entrada.contexto.catalogos),
  );

  resultado.metricas = consolidarMetricasBre(resultado.itens, inicioMs);
  resultado.alertas = entrada.contexto.alertas.map((mensagem) => ({
    codigo: "CATALOGO",
    mensagem,
    severidade: "aviso" as const,
  }));

  return resultado;
}

export function processarBreFundacao(entrada: MotorBreEntrada): MotorBreResultado {
  return processarBre(entrada);
}

export { aplicarRuleBaseLimpa } from "./rules/ruleBaseLimpa.ts";
export { aplicarRuleAtivacaoRecente, calcularDiasAtivacaoRevisado } from "./rules/ruleAtivacaoRecente.ts";
export { aplicarRuleRuptura104c, aplicarRuleMenorQueTresCentralizados } from "./rules/ruleRuptura104c.ts";
export { aplicarRuleInventario } from "./rules/ruleInventario.ts";
export { aplicarRuleSomaEstoqueCd, calcularSomaEstoqueCd } from "./rules/ruleSomaEstoqueCd.ts";
export { aplicarRuleCrossDocking, calcularCrossSumFromValues } from "./rules/ruleCrossDocking.ts";
export { calcularPendenciaCpaCd } from "./rules/rulePendenciaCpaCd.ts";
export { aplicarRuleCurtoPrazo } from "./rules/ruleCurtoPrazo.ts";
export { aplicarRuleMedioPrazo } from "./rules/ruleMedioPrazo.ts";
export { aplicarRuleLongoPrazo } from "./rules/ruleLongoPrazo.ts";
export { classificarPrazo } from "./classificarPrazo.ts";
export {
  aplicarRuleDiasPedido,
  calcularDiasPedido,
  montarDiasPedidoEntrada,
} from "./rules/calcularDiasPedido.ts";
export {
  aplicarAcoesOperacionais,
  calcularAcaoCurtoPrazo,
  calcularAcaoMedioPrazo,
  calcularAcoesOperacionais,
} from "./rules/calcularAcoesOperacionais.ts";
export { calcularAuxiliaresPedido } from "./rules/calcularAuxiliaresPedido.ts";
