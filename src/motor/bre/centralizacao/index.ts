import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";
import { resolverRedeFornecedor } from "../../catalog/parseRede.ts";
import type { MotorBreItemInput } from "../breTypes.ts";
import { calcularFlagsOrdemCd, construirLookupFlagsCentralizados, obterFlagsOrdemCd } from "./calcularFlagsOrdemCd.ts";
import { calcularMenorRecebimento } from "./calcularMenorRecebimento.ts";
import { calcularProdutoCentralizado } from "./calcularProdutoCentralizado.ts";
import { calcularStatusAtivacaoCd } from "./calcularStatusAtivacaoCd.ts";
import { calcularStatusEstoqueCds } from "./calcularStatusEstoqueCds.ts";
import { calcularStatusRecebto } from "./calcularStatusRecebto.ts";
import type {
  MotorCentralizacaoEntrada,
  MotorCentralizacaoResultado,
  MotorFlagsLookupKey,
  MotorFlagsOrdemCdResultado,
} from "./centralizacaoTypes.ts";
import { catalogoOrdemDisponivel, resolverOrdemCds } from "./resolverOrdemCds.ts";

export function montarCentralizacaoEntrada(
  input: MotorBreItemInput,
  catalogos: MotorCatalogos,
): MotorCentralizacaoEntrada {
  const p = input.produto;
  const cd5 = input.cd5;
  const rede = resolverRedeFornecedor(catalogos.rede, p.codFornecedor ?? 0, p.fornecedor);

  return {
    regional: p.regional,
    loja: p.loja,
    divisao: p.hierarquia.divisao,
    rede,
    diasRecebtoCd1: p.diasRecebtoCd1,
    diasRecebtoCd2: p.diasRecebtoCd2,
    diasRecebtoCd3: p.diasRecebtoCd3,
    diasRecebtoCd4: p.diasRecebtoCd4,
    diasRecebtoCd5: cd5?.diasRecebtoCd5 ?? null,
    estoqueCd1: p.estoqueCd1,
    estoqueCd2: p.estoqueCd2,
    estoqueCd3: p.estoqueCd3,
    estoqueCd4: p.estoqueCd4,
    estoqueCd5: cd5?.estoqueCd5 ?? null,
    statusCompraCd1: p.statusCompraCd1,
    statusCompraCd2: p.statusCompraCd2,
    statusCompraCd3: p.statusCompraCd3,
    statusCompraCd4: p.statusCompraCd4,
    statusCompraCd5: cd5?.statusCompraCd5 ?? null,
  };
}

export function calcularCentralizacao(
  entrada: MotorCentralizacaoEntrada,
  catalogos: MotorCatalogos,
  flagsLookup: Map<MotorFlagsLookupKey, MotorFlagsOrdemCdResultado>,
): MotorCentralizacaoResultado {
  const disponivel = catalogoOrdemDisponivel(catalogos);
  const ordem = resolverOrdemCds(catalogos, entrada.regional, entrada.loja);
  const menorRecebimento = calcularMenorRecebimento(entrada);
  const produtoCentralizado = calcularProdutoCentralizado(entrada, ordem, menorRecebimento);
  const statusRecebto = calcularStatusRecebto(menorRecebimento);
  const flags = obterFlagsOrdemCd(
    flagsLookup,
    ordem.divisaoCatalogo ?? entrada.divisao,
    entrada.rede,
    produtoCentralizado,
    ordem,
  );
  const statusEstoqueCds = calcularStatusEstoqueCds(entrada, ordem, flags);
  const statusAtivacaoCd = calcularStatusAtivacaoCd(entrada, ordem, flags);

  const alertas = [
    ...ordem.alertas,
    ...menorRecebimento.alertas,
    ...produtoCentralizado.alertas,
    ...flags.alertas,
    ...statusEstoqueCds.alertas,
    ...statusAtivacaoCd.alertas,
  ];

  if (!disponivel) {
    alertas.push({
      codigo: "CATALOGO_ORDEM_INDISPONIVEL",
      mensagem: "Catálogo padronizado de Ordem CDs indisponível",
      severidade: "erro",
    });
  }

  const statusRegra = !disponivel
    ? "bloqueada_dependencia"
    : ordem.statusRegra === "ambigua" || produtoCentralizado.statusRegra === "ambigua"
      ? "ambigua"
      : "aplicada";

  return {
    ordem,
    menorRecebimento,
    produtoCentralizado,
    flags,
    statusRecebto,
    statusEstoqueCds,
    statusAtivacaoCd,
    centralizacaoDisponivel: disponivel && ordem.bandeira != null,
    alertas,
    statusRegra,
  };
}

export function construirLookupCentralizadosBatch(
  entradas: MotorCentralizacaoEntrada[],
  catalogos: MotorCatalogos,
): Map<MotorFlagsLookupKey, MotorFlagsOrdemCdResultado> {
  if (!catalogoOrdemDisponivel(catalogos)) return new Map();
  return construirLookupFlagsCentralizados(entradas, catalogos);
}

export { catalogoOrdemDisponivel, resolverOrdemCds } from "./resolverOrdemCds.ts";
export { calcularMenorRecebimento } from "./calcularMenorRecebimento.ts";
export { calcularProdutoCentralizado } from "./calcularProdutoCentralizado.ts";
export { calcularStatusRecebto } from "./calcularStatusRecebto.ts";
export { calcularStatusEstoqueCds } from "./calcularStatusEstoqueCds.ts";
export { calcularStatusAtivacaoCd } from "./calcularStatusAtivacaoCd.ts";
export { obterFlagsOrdemCd } from "./calcularFlagsOrdemCd.ts";
export type {
  MotorCentralizacaoEntrada,
  MotorCentralizacaoResultado,
  MotorFlagsOrdemCdResultado,
  MotorMenorRecebimentoResultado,
  MotorOrdemCdsResolvida,
  MotorProdutoCentralizadoResultado,
  MotorStatusAtivacaoCdResultado,
  MotorStatusEstoqueCdsResultado,
  MotorStatusRecebtoResultado,
} from "./centralizacaoTypes.ts";
