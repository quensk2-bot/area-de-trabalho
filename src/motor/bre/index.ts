import type { MotorBreEntrada, MotorBreItemInput, MotorBreItemResultado, MotorBreResultado } from "./breTypes.ts";
import { chaveLojaProduto } from "./breContext.ts";
import { consolidarMetricasBre, criarBreResultadoVazio, mergeRegraResults } from "./breResult.ts";
import { aplicarRuleAtivacaoRecente } from "./rules/ruleAtivacaoRecente.ts";
import { aplicarRuleBaseLimpa } from "./rules/ruleBaseLimpa.ts";
import { aplicarRuleCrossDocking, calcularCrossSum } from "./rules/ruleCrossDocking.ts";
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

export function processarItemBreFundacao(
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
  const crossSum = calcularCrossSum(input);
  const crossRegras = aplicarRuleCrossDocking(crossSum, (somaCd.resultado as number) ?? 0, modCurtoPrazo);

  const regras = mergeRegraResults(
    [baseLimpa, ativacao, ruptura104c],
    inventarioRegras,
    [somaCd],
    crossRegras,
  );

  const inventarioUnid = inventarioRegras.find((r) => r.regra === "inventario_unid")?.resultado as number ?? 0;
  const rupturaInventario = inventarioRegras.find((r) => r.regra === "ruptura_inventario")?.resultado as 0 | 1 ?? 0;
  const rupturaSemInventario = inventarioRegras.find((r) => r.regra === "ruptura_sem_inventario")?.resultado as 0 | 1 ?? 0;

  return {
    loja: input.produto.loja,
    seqproduto: input.produto.seqproduto,
    statusBaseLimpa: baseLimpa.resultado as MotorBreItemResultado["statusBaseLimpa"],
    diasAtivacaoRevisado: ativacao.entradasUtilizadas.diasAtivacaoRevisado as number,
    statusAtivo60Dias: ativacao.resultado as boolean,
    menorQueTresUnidades: ruptura104c.resultado as 0 | 1,
    flagRuptura: input.validacao?.geraRuptura === true ? "Gera Ruptura" : input.validacao ? "Não Gera Ruptura" : null,
    ruptura104c: input.validacao?.ruptura104c === true,
    inventarioUnid,
    rupturaInventario,
    rupturaSemInventario,
    somaEstoqueCd: somaCd.resultado as number,
    crossSum,
    crossDocking: null,
    modCurtoPrazo,
    ncurtoPrazo,
    classificacaoPrazo: null,
    curtoPrazo: null,
    medioPrazo: null,
    longoPrazo: null,
    regras,
    alertas: regras.flatMap((r) => r.alertas),
  };
}

export function processarBreFundacao(entrada: MotorBreEntrada): MotorBreResultado {
  const inicioMs = Date.now();
  const resultado = criarBreResultadoVazio(entrada.contexto.regional, entrada.contexto.dataReferencia);

  resultado.itens = entrada.produtosLoja.map((produto) =>
    processarItemBreFundacao(
      montarItemInput(entrada, produto),
      entrada.contexto.dataReferencia,
      entrada.contexto.catalogos,
    ),
  );

  resultado.metricas = consolidarMetricasBre(resultado.itens, inicioMs);
  resultado.alertas = entrada.contexto.alertas.map((mensagem) => ({
    codigo: "CATALOGO",
    mensagem,
    severidade: "aviso" as const,
  }));

  return resultado;
}

export { aplicarRuleBaseLimpa } from "./rules/ruleBaseLimpa.ts";
export { aplicarRuleAtivacaoRecente, calcularDiasAtivacaoRevisado } from "./rules/ruleAtivacaoRecente.ts";
export { aplicarRuleRuptura104c, aplicarRuleMenorQueTresCentralizados } from "./rules/ruleRuptura104c.ts";
export { aplicarRuleInventario } from "./rules/ruleInventario.ts";
export { aplicarRuleSomaEstoqueCd, calcularSomaEstoqueCd } from "./rules/ruleSomaEstoqueCd.ts";
export { aplicarRuleCrossDocking, calcularCrossSum, calcularCrossSumFromValues } from "./rules/ruleCrossDocking.ts";
