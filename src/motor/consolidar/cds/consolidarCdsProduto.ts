import type { MotorAlerta } from "../../bre/breTypes.ts";
import type { MotorProdutoCdNormalizado } from "../../cds/cdTypes.ts";
import { ordenarCdsPorPosicao } from "../../cds/validarColecaoCds.ts";
import {
  alertaBlocoAusente,
  alertaBlocoSobreposto,
  alertaCodigoFisicoAusente,
  alertaOrigemRepetida,
  alertaPosicaoNaoContigua,
  alertasPosicaoDuplicada,
} from "./consolidacaoCdsDiagnostics.ts";
import { posicoesNaoContiguas } from "./consolidacaoCdsMetrics.ts";

export type MotorBlocoCdsComplementar = {
  numeroBloco: number;
  origemArquivo: string;
  loja: number | null;
  cds: MotorProdutoCdNormalizado[];
};

export type ConsolidarCdsProdutoParams = {
  regional: string;
  loja: number;
  seqproduto: number;
  cdsBlocoPrincipal: readonly MotorProdutoCdNormalizado[];
  blocosComplementares: readonly MotorBlocoCdsComplementar[];
  blocosEsperados: readonly number[];
};

export type ConsolidarCdsProdutoResultado = {
  cds: MotorProdutoCdNormalizado[];
  alertas: MotorAlerta[];
  posicaoDuplicada: boolean;
  blocoSobreposto: boolean;
  posicoesNaoContiguas: boolean;
  codigoFisicoAusente: boolean;
  blocosPresentes: number[];
};

type EntradaMerge = {
  cd: MotorProdutoCdNormalizado;
  numeroBloco: number;
  origemArquivo: string;
};

function copiarCd(cd: MotorProdutoCdNormalizado): MotorProdutoCdNormalizado {
  return { ...cd, alertas: [...cd.alertas] };
}

function flattenEntradas(
  cdsBlocoPrincipal: readonly MotorProdutoCdNormalizado[],
  blocosComplementares: readonly MotorBlocoCdsComplementar[],
): EntradaMerge[] {
  const entradas: EntradaMerge[] = [];

  for (const cd of cdsBlocoPrincipal) {
    entradas.push({
      cd: copiarCd(cd),
      numeroBloco: cd.numeroBloco,
      origemArquivo: cd.origemArquivo,
    });
  }

  for (const bloco of blocosComplementares) {
    for (const cd of bloco.cds) {
      if (cd.origemArquivo && !cd.origemArquivo.includes(bloco.origemArquivo.split("/").pop() ?? bloco.origemArquivo)) {
        // preserva origem do CD
      }
      entradas.push({
        cd: copiarCd({ ...cd, numeroBloco: bloco.numeroBloco, origemArquivo: cd.origemArquivo || bloco.origemArquivo }),
        numeroBloco: bloco.numeroBloco,
        origemArquivo: cd.origemArquivo || bloco.origemArquivo,
      });
    }
  }

  return entradas;
}

function intervalosBloco(entradas: EntradaMerge[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const e of entradas) {
    const lista = map.get(e.numeroBloco) ?? [];
    if (!lista.includes(e.cd.posicaoLogica)) lista.push(e.cd.posicaoLogica);
    map.set(e.numeroBloco, lista);
  }
  for (const [bloco, pos] of map) {
    map.set(bloco, pos.sort((a, b) => a - b));
  }
  return map;
}

function intervalosSobrepostos(
  intervalos: Map<number, number[]>,
): Array<{ blocoA: number; blocoB: number; posicoes: number[] }> {
  const blocos = [...intervalos.keys()].sort((a, b) => a - b);
  const sobreposicoes: Array<{ blocoA: number; blocoB: number; posicoes: number[] }> = [];

  for (let i = 0; i < blocos.length; i++) {
    for (let j = i + 1; j < blocos.length; j++) {
      const posA = intervalos.get(blocos[i]) ?? [];
      const posB = intervalos.get(blocos[j]) ?? [];
      const comuns = posA.filter((p) => posB.includes(p));
      if (comuns.length > 0) {
        sobreposicoes.push({ blocoA: blocos[i], blocoB: blocos[j], posicoes: comuns });
      }
    }
  }
  return sobreposicoes;
}


export function consolidarCdsProduto(params: ConsolidarCdsProdutoParams): ConsolidarCdsProdutoResultado {
  const alertas: MotorAlerta[] = [];
  const entradas = flattenEntradas(params.cdsBlocoPrincipal, params.blocosComplementares);

  const blocosPresentes = [
    ...new Set([
      ...params.cdsBlocoPrincipal.map((c) => c.numeroBloco),
      ...params.blocosComplementares.map((b) => b.numeroBloco),
    ]),
  ].sort((a, b) => a - b);

  for (const blocoEsperado of params.blocosEsperados) {
    if (!blocosPresentes.includes(blocoEsperado)) {
      alertas.push(alertaBlocoAusente(blocoEsperado));
    }
  }

  const porPosicao = new Map<number, EntradaMerge[]>();
  for (const e of entradas) {
    const lista = porPosicao.get(e.cd.posicaoLogica) ?? [];
    lista.push(e);
    porPosicao.set(e.cd.posicaoLogica, lista);
  }

  const origemVista = new Set<string>();
  for (const e of entradas) {
    const chaveOrigem = `${e.numeroBloco}|${e.origemArquivo}|${e.cd.posicaoLogica}`;
    if (origemVista.has(chaveOrigem)) {
      alertas.push(alertaOrigemRepetida(e.numeroBloco, e.origemArquivo, e.cd.posicaoLogica));
    } else {
      origemVista.add(chaveOrigem);
    }
  }

  const intervalos = intervalosBloco(entradas);
  const sobreposicoes = intervalosSobrepostos(intervalos);
  let blocoSobreposto = false;
  for (const s of sobreposicoes) {
    blocoSobreposto = true;
    alertas.push(alertaBlocoSobreposto(s.blocoA, s.blocoB, s.posicoes));
  }

  let posicaoDuplicada = false;
  const cdsMerge: MotorProdutoCdNormalizado[] = [];

  for (const [posicao, grupo] of porPosicao) {
    if (grupo.length > 1) {
      posicaoDuplicada = true;
      const blocos = [...new Set(grupo.map((g) => g.numeroBloco))];
      const origens = [...new Set(grupo.map((g) => g.origemArquivo))];
      alertas.push(alertasPosicaoDuplicada(posicao, blocos, origens));
      continue;
    }
    cdsMerge.push(grupo[0].cd);
  }

  for (const cd of cdsMerge) {
    if (cd.codigoFisico == null) {
      alertas.push(alertaCodigoFisicoAusente(cd.posicaoLogica));
    }
  }

  const cdsOrdenados = ordenarCdsPorPosicao(cdsMerge);
  const naoContiguas = posicoesNaoContiguas(cdsOrdenados);
  if (naoContiguas && cdsOrdenados.length > 1) {
    alertas.push(
      alertaPosicaoNaoContigua(cdsOrdenados.map((c) => c.posicaoLogica)),
    );
  }

  return {
    cds: cdsOrdenados,
    alertas,
    posicaoDuplicada,
    blocoSobreposto,
    posicoesNaoContiguas: naoContiguas,
    codigoFisicoAusente: cdsOrdenados.some((c) => c.codigoFisico == null),
    blocosPresentes,
  };
}
