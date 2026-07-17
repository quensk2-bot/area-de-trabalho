import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";
import type { MotorAlerta } from "../breTypes.ts";
import type {
  MotorCentralizacaoEntrada,
  MotorFlagsLookupKey,
  MotorFlagsOrdemCdResultado,
  MotorOrdemCdsResolvida,
  MotorProdutoCentralizadoResultado,
} from "./centralizacaoTypes.ts";
import { chaveFlagsCentralizados } from "./centralizacaoTypes.ts";
import { statusRecebtoComMovimentacao } from "./calcularStatusRecebto.ts";
import { calcularProdutoCentralizado } from "./calcularProdutoCentralizado.ts";
import { calcularMenorRecebimento } from "./calcularMenorRecebimento.ts";
import { calcularStatusRecebto } from "./calcularStatusRecebto.ts";
import { resolverOrdemCds } from "./resolverOrdemCds.ts";

type ContribuicaoCentralizada = {
  chave: MotorFlagsLookupKey;
  ordemLabel: string;
  ordemResolvida: MotorOrdemCdsResolvida;
};

function flagsVazias(alertas: MotorAlerta[] = []): MotorFlagsOrdemCdResultado {
  return {
    flagPrimeiroCd: 0,
    flagSegundoCd: 0,
    flagTerceiroCd: 0,
    flagQuartoCd: 0,
    flagQuintoCd: 0,
    statusRegra: "aplicada",
    alertas,
  };
}

function resolverOrdemSequencia(
  catalogos: MotorCatalogos,
  divisao: string | null,
  codigoFisico: number,
): string | null {
  const div = divisao ?? "";
  const found = catalogos.sequenciaCd.find(
    (s) =>
      s.cd === codigoFisico &&
      s.divisao.trim().toUpperCase() === div.trim().toUpperCase(),
  );
  return found?.ordem ?? null;
}

export function construirLookupFlagsCentralizados(
  entradas: MotorCentralizacaoEntrada[],
  catalogos: MotorCatalogos,
): Map<MotorFlagsLookupKey, MotorFlagsOrdemCdResultado> {
  const contribuicoes: ContribuicaoCentralizada[] = [];

  for (const entrada of entradas) {
    const ordem = resolverOrdemCds(catalogos, entrada.regional, entrada.loja);
    const menor = calcularMenorRecebimento(entrada);
    const statusRecebto = calcularStatusRecebto(menor);
    if (!statusRecebtoComMovimentacao(statusRecebto.texto)) continue;

    const produto = calcularProdutoCentralizado(entrada, ordem, menor);
    if (produto.produtoCentralizado == null) continue;

    const ordemLabel = resolverOrdemSequencia(
      catalogos,
      ordem.divisaoCatalogo ?? entrada.divisao,
      produto.produtoCentralizado,
    );
    if (!ordemLabel) continue;

    contribuicoes.push({
      chave: chaveFlagsCentralizados(ordem.divisaoCatalogo ?? entrada.divisao, entrada.rede),
      ordemLabel,
      ordemResolvida: ordem,
    });
  }

  const porChave = new Map<MotorFlagsLookupKey, ContribuicaoCentralizada[]>();
  for (const c of contribuicoes) {
    const list = porChave.get(c.chave) ?? [];
    list.push(c);
    porChave.set(c.chave, list);
  }

  const lookup = new Map<MotorFlagsLookupKey, MotorFlagsOrdemCdResultado>();

  for (const [chave, items] of porChave) {
    if (items.length === 0) {
      lookup.set(chave, flagsVazias());
      continue;
    }

    const ordemBase = items[0].ordemResolvida;
    const contagem = new Map<string, number>();
    for (const item of items) {
      contagem.set(item.ordemLabel, (contagem.get(item.ordemLabel) ?? 0) + 1);
    }

    const flag = (label: string, codigo: number | null): number => {
      if (codigo == null) return 0;
      const qtd = contagem.get(label) ?? 0;
      return qtd === 1 ? codigo : 0;
    };

    lookup.set(chave, {
      flagPrimeiroCd: flag("1º", ordemBase.primeiroCd),
      flagSegundoCd: flag("2º", ordemBase.segundoCd),
      flagTerceiroCd: flag("3º", ordemBase.terceiroCd),
      flagQuartoCd: flag("4º", ordemBase.quartoCd),
      flagQuintoCd: flag("5º", ordemBase.quintoCd),
      statusRegra: "aplicada",
      alertas: [],
    });
  }

  return lookup;
}

export function obterFlagsOrdemCd(
  lookup: Map<MotorFlagsLookupKey, MotorFlagsOrdemCdResultado>,
  divisao: string | null,
  rede: string,
  produto: MotorProdutoCentralizadoResultado,
  ordem: MotorOrdemCdsResolvida,
): MotorFlagsOrdemCdResultado {
  const chave = chaveFlagsCentralizados(divisao ?? ordem.divisaoCatalogo, rede);
  const found = lookup.get(chave);
  if (found) return found;

  if (produto.produtoCentralizado == null || produto.posicaoCdSelecionada == null) {
    return flagsVazias();
  }

  const flags = flagsVazias([
    {
      codigo: "FLAGS_LOOKUP_AUSENTE",
      mensagem: "Lookup Centralizados ausente para rede/divisão — flags zeradas",
      severidade: "info",
    },
  ]);

  const pos = produto.posicaoCdSelecionada;
  const codigo = produto.codigoCdSelecionado ?? 0;
  if (pos === 1) flags.flagPrimeiroCd = codigo;
  if (pos === 2) flags.flagSegundoCd = codigo;
  if (pos === 3) flags.flagTerceiroCd = codigo;
  if (pos === 4) flags.flagQuartoCd = codigo;
  if (pos === 5) flags.flagQuintoCd = codigo;

  return flags;
}
