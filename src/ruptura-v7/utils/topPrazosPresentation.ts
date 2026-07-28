import type {
  TopPrazosGrupo,
  TopPrazosStatusMovimentacao,
  TopPrazosTotais,
} from "../../hibrido-v7/topPrazosTypes.ts";

export type TopPrazosModo = "compra" | "recebimento";

export type TopPrazosFiltros = {
  lojas: number[];
  setor: string | null;
  secao: string | null;
  statusMovimentacaoLoja: TopPrazosStatusMovimentacao | null;
};

export type TopPrazosIndicadores = TopPrazosTotais & {
  percentualRuptura: number | null;
  percentualPrazo: number | null;
};

export type TopPrazosRankingLinha = TopPrazosTotais & {
  setor: string | null;
  fornecedor: string | null;
  percentualRuptura: number | null;
  percentualPrazo: number | null;
};

export const TOP_PRAZOS_SETORES = [
  { codigo: "60-MERCEARIA", label: "Mercearia" },
  { codigo: "62-PERECIVEIS", label: "Perecíveis" },
  { codigo: "63-BAZAR", label: "Bazar" },
] as const;

export function calcularPercentual(
  numerador: number,
  denominador: number,
): number | null {
  return denominador === 0 ? null : (numerador / denominador) * 100;
}

export function rotuloFornecedor(fornecedor: string | null): string {
  return fornecedor ?? "Não identificado";
}

export function filtrarGruposTopPrazos(
  grupos: TopPrazosGrupo[],
  filtros: TopPrazosFiltros,
): TopPrazosGrupo[] {
  const lojas = filtros.lojas.length ? new Set(filtros.lojas) : null;
  return grupos.filter(
    (grupo) =>
      (!lojas || lojas.has(grupo.loja)) &&
      (!filtros.setor || grupo.setor === filtros.setor) &&
      (!filtros.secao || grupo.secao === filtros.secao) &&
      (!filtros.statusMovimentacaoLoja ||
        grupo.statusMovimentacaoLoja === filtros.statusMovimentacaoLoja),
  );
}

function somarTotais(grupos: TopPrazosGrupo[]): TopPrazosTotais {
  return grupos.reduce<TopPrazosTotais>(
    (total, grupo) => ({
      qtdeProdutos: total.qtdeProdutos + grupo.qtdeProdutos,
      totalRuptura: total.totalRuptura + grupo.totalRuptura,
      curtoPrazo: total.curtoPrazo + grupo.curtoPrazo,
      medioPrazo: total.medioPrazo + grupo.medioPrazo,
      longoPrazo: total.longoPrazo + grupo.longoPrazo,
    }),
    {
      qtdeProdutos: 0,
      totalRuptura: 0,
      curtoPrazo: 0,
      medioPrazo: 0,
      longoPrazo: 0,
    },
  );
}

export function agregarIndicadoresTopPrazos(
  grupos: TopPrazosGrupo[],
  modo: TopPrazosModo,
): TopPrazosIndicadores {
  const totais = somarTotais(grupos);
  const prazo = modo === "compra" ? totais.longoPrazo : totais.medioPrazo;
  return {
    ...totais,
    percentualRuptura: calcularPercentual(
      totais.totalRuptura,
      totais.qtdeProdutos,
    ),
    percentualPrazo: calcularPercentual(prazo, totais.totalRuptura),
  };
}

export function agregarRankingTopPrazos(
  grupos: TopPrazosGrupo[],
  modo: TopPrazosModo,
): TopPrazosRankingLinha[] {
  const porFornecedor = new Map<string, TopPrazosRankingLinha>();

  for (const grupo of grupos) {
    const chave = JSON.stringify([grupo.setor, grupo.fornecedor]);
    const atual = porFornecedor.get(chave) ?? {
      setor: grupo.setor,
      fornecedor: grupo.fornecedor,
      qtdeProdutos: 0,
      totalRuptura: 0,
      curtoPrazo: 0,
      medioPrazo: 0,
      longoPrazo: 0,
      percentualRuptura: null,
      percentualPrazo: null,
    };
    atual.qtdeProdutos += grupo.qtdeProdutos;
    atual.totalRuptura += grupo.totalRuptura;
    atual.curtoPrazo += grupo.curtoPrazo;
    atual.medioPrazo += grupo.medioPrazo;
    atual.longoPrazo += grupo.longoPrazo;
    porFornecedor.set(chave, atual);
  }

  const linhas = [...porFornecedor.values()];
  for (const linha of linhas) {
    const prazo = modo === "compra" ? linha.longoPrazo : linha.medioPrazo;
    linha.percentualRuptura = calcularPercentual(
      linha.totalRuptura,
      linha.qtdeProdutos,
    );
    linha.percentualPrazo = calcularPercentual(prazo, linha.totalRuptura);
  }

  return linhas
    .filter((linha) =>
      modo === "compra" ? linha.longoPrazo > 0 : linha.medioPrazo > 0,
    )
    .sort((a, b) => {
      const prazoA = modo === "compra" ? a.longoPrazo : a.medioPrazo;
      const prazoB = modo === "compra" ? b.longoPrazo : b.medioPrazo;
      return (
        prazoB - prazoA ||
        b.totalRuptura - a.totalRuptura ||
        rotuloFornecedor(a.fornecedor).localeCompare(
          rotuloFornecedor(b.fornecedor),
          "pt-BR",
        )
      );
    });
}

export function topRankingPorSetor(
  linhas: TopPrazosRankingLinha[],
  setor: string,
  limite: number,
): TopPrazosRankingLinha[] {
  return linhas.filter((linha) => linha.setor === setor).slice(0, limite);
}
