import { consolidarProdutoLoja } from "./consolidarProdutoLoja.ts";
import { construirIndexes, contarDuplicidadesCatalogo, detectarDuplicidadesBase } from "./consolidacaoIndexes.ts";
import { chaveConsolidacao, validarChaveConsolidacao } from "./consolidacaoKeys.ts";
import { criarMetricasVazias, finalizarMetricas } from "./consolidacaoMetrics.ts";
import { criarMetricasCdsVazias, finalizarMetricasCds } from "./cds/consolidacaoCdsMetrics.ts";
import type { MotorConsolidacaoEntrada, MotorConsolidacaoLoteContexto, MotorConsolidacaoResultado } from "./consolidacaoTypes.ts";

function ordenarProdutos(entrada: MotorConsolidacaoEntrada): MotorConsolidacaoEntrada["produtosLoja"] {
  return [...entrada.produtosLoja].sort((a, b) => {
    const reg = a.regional.localeCompare(b.regional);
    if (reg !== 0) return reg;
    if (a.loja !== b.loja) return a.loja - b.loja;
    return a.seqproduto - b.seqproduto;
  });
}

export function consolidarLote(entrada: MotorConsolidacaoEntrada, chunkSize = 500): MotorConsolidacaoResultado {
  const inicioMs = Date.now();
  const indexes = construirIndexes(entrada);
  const metricasParciais = criarMetricasVazias(entrada.produtosLoja.length);
  const metricasCdsParciais = criarMetricasCdsVazias();
  metricasParciais.duplicidadesCatalogos = contarDuplicidadesCatalogo(entrada);

  const ctx: MotorConsolidacaoLoteContexto = {
    entrada,
    indexes,
    diagnosticosJoin: [],
    duplicidades: [],
    erros: [],
    metricasParciais,
    metricasCdsParciais,
  };

  const ordenados = ordenarProdutos(entrada);
  const chavesEmitidas = new Set<string>();
  const itens: MotorConsolidacaoResultado["itens"] = [];

  for (let offset = 0; offset < ordenados.length; offset += chunkSize) {
    const chunk = ordenados.slice(offset, offset + chunkSize);
    for (const produto of chunk) {
      const val = validarChaveConsolidacao(produto.regional, produto.loja, produto.seqproduto);
      const chave = val.valida ? chaveConsolidacao(val.regional, val.loja, val.seqproduto) : null;
      const duplicidadeBase = chave != null && indexes.chavesDuplicadasBase.has(chave);
      const quantidadeDuplicidade = chave ? indexes.chavesDuplicadasBase.get(chave) : undefined;

      if (duplicidadeBase && chave && chavesEmitidas.has(chave)) {
        continue;
      }

      const item = consolidarProdutoLoja(produto, ctx, {
        duplicidadeBase,
        quantidadeDuplicidade,
      });

      if (chave) chavesEmitidas.add(chave);
      itens.push(item);
    }
  }

  finalizarMetricasCds(metricasCdsParciais);
  metricasParciais.cds = metricasCdsParciais;

  const totalAlertas = itens.reduce((acc, i) => acc + i.alertas.length, 0);
  const metricas = finalizarMetricas(metricasParciais, itens.length, totalAlertas, ctx.erros.length, Date.now() - inicioMs);

  return {
    itens,
    erros: ctx.erros,
    diagnosticosJoin: ctx.diagnosticosJoin,
    duplicidades: ctx.duplicidades,
    metricas,
  };
}

export { detectarDuplicidadesBase, ordenarProdutos };
