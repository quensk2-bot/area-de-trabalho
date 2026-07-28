import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type {
  TopPrazosGrupo,
  TopPrazosJson,
  TopPrazosStatusMovimentacao,
  TopPrazosTotais,
} from "../../../hibrido-v7/topPrazosTypes.ts";

type TopPrazosEscopo = {
  regional: string;
  bandeira: string;
  competencia: string;
  dataReferencia: string;
  versao: number;
};

export type TopPrazosDuplicidadeConflitante = {
  loja: number;
  seqproduto: number;
  camposDivergentes: string[];
};

export class TopPrazosDuplicidadeConflitanteError extends Error {
  readonly relatorio: TopPrazosDuplicidadeConflitante[];

  constructor(relatorio: TopPrazosDuplicidadeConflitante[]) {
    super(
      `Top Prazos abortado: ${relatorio.length} chave(s) Loja + Seqproduto com linhas conflitantes.`,
    );
    this.name = "TopPrazosDuplicidadeConflitanteError";
    this.relatorio = relatorio;
  }
}

export class TopPrazosCampoOficialInvalidoError extends Error {
  readonly loja: number;
  readonly seqproduto: number;
  readonly campo: string;
  readonly valor: unknown;

  constructor(input: {
    loja: number;
    seqproduto: number;
    campo: string;
    valor: unknown;
  }) {
    super(
      `Top Prazos abortado: ${input.campo} inválido para Loja ${input.loja} / Produto ${input.seqproduto}.`,
    );
    this.name = "TopPrazosCampoOficialInvalidoError";
    this.loja = input.loja;
    this.seqproduto = input.seqproduto;
    this.campo = input.campo;
    this.valor = input.valor;
  }
}

const CAMPOS_RELEVANTES_DUPLICIDADE = [
  "regional",
  "loja",
  "seqproduto",
  "baseLimpa",
  "rede",
  "divisao",
  "setorN2",
  "estoqueLoja",
  "mediaVendaUnDia",
  "custoLiquido",
  "ruptura104c",
  "curtoPrazo",
  "medioPrazo",
  "longoPrazo",
] as const satisfies readonly (keyof MotorProdutoLojaConsolidado)[];

function chaveProduto(item: MotorProdutoLojaConsolidado): string {
  return `${item.loja}\u0001${item.seqproduto}`;
}

function camposDivergentes(
  anterior: MotorProdutoLojaConsolidado,
  atual: MotorProdutoLojaConsolidado,
): string[] {
  return CAMPOS_RELEVANTES_DUPLICIDADE.filter(
    (campo) => anterior[campo] !== atual[campo],
  );
}

export function calcularStatusMovimentacaoLoja(
  item: Pick<
    MotorProdutoLojaConsolidado,
    "estoqueLoja" | "mediaVendaUnDia" | "custoLiquido"
  >,
): TopPrazosStatusMovimentacao {
  const estoqueLoja = item.estoqueLoja ?? 0;
  const mediaVendaUnDia = item.mediaVendaUnDia ?? 0;
  const custoLiquido = item.custoLiquido ?? 0;

  return estoqueLoja === 0 &&
    mediaVendaUnDia === 0 &&
    custoLiquido === 0
    ? "Sem Movimentação"
    : "Com movimentação";
}

function valorFlagOficial(
  item: MotorProdutoLojaConsolidado,
  campo: "curtoPrazo" | "medioPrazo" | "longoPrazo",
): number {
  const valor = item[campo];
  if (valor !== 0 && valor !== 1) {
    throw new TopPrazosCampoOficialInvalidoError({
      loja: item.loja,
      seqproduto: item.seqproduto,
      campo,
      valor,
    });
  }
  return valor;
}

function valorRupturaOficial(item: MotorProdutoLojaConsolidado): number {
  if (item.ruptura104c !== true && item.ruptura104c !== false) {
    throw new TopPrazosCampoOficialInvalidoError({
      loja: item.loja,
      seqproduto: item.seqproduto,
      campo: "ruptura104c",
      valor: item.ruptura104c,
    });
  }
  return item.ruptura104c ? 1 : 0;
}

function compararTextoNulo(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.localeCompare(b, "pt-BR");
}

function ordenarGrupos(a: TopPrazosGrupo, b: TopPrazosGrupo): number {
  return (
    a.regional.localeCompare(b.regional, "pt-BR") ||
    a.bandeira.localeCompare(b.bandeira, "pt-BR") ||
    a.loja - b.loja ||
    compararTextoNulo(a.setor, b.setor) ||
    compararTextoNulo(a.secao, b.secao) ||
    compararTextoNulo(a.fornecedor, b.fornecedor) ||
    a.statusMovimentacaoLoja.localeCompare(
      b.statusMovimentacaoLoja,
      "pt-BR",
    )
  );
}

function totaisVazios(): TopPrazosTotais {
  return {
    qtdeProdutos: 0,
    totalRuptura: 0,
    curtoPrazo: 0,
    medioPrazo: 0,
    longoPrazo: 0,
  };
}

export function gerarTopPrazos(
  itensPorLoja: Record<
    number,
    readonly MotorProdutoLojaConsolidado[]
  >,
  escopo: TopPrazosEscopo,
): TopPrazosJson {
  const produtosUnicos = new Map<string, MotorProdutoLojaConsolidado>();
  const conflitos: TopPrazosDuplicidadeConflitante[] = [];

  for (const itens of Object.values(itensPorLoja)) {
    for (const item of itens) {
      const chave = chaveProduto(item);
      const anterior = produtosUnicos.get(chave);
      if (!anterior) {
        produtosUnicos.set(chave, item);
        continue;
      }

      const divergentes = camposDivergentes(anterior, item);
      if (divergentes.length > 0) {
        conflitos.push({
          loja: item.loja,
          seqproduto: item.seqproduto,
          camposDivergentes: divergentes,
        });
      }
    }
  }

  if (conflitos.length > 0) {
    throw new TopPrazosDuplicidadeConflitanteError(conflitos);
  }

  const gruposPorChave = new Map<string, TopPrazosGrupo>();
  const totais = totaisVazios();

  for (const item of produtosUnicos.values()) {
    if (item.baseLimpa !== "Base Limpa") continue;

    const statusMovimentacaoLoja = calcularStatusMovimentacaoLoja(item);
    const chaveGrupo = JSON.stringify([
      escopo.regional,
      escopo.bandeira,
      escopo.competencia,
      item.loja,
      item.divisao,
      item.setorN2,
      item.rede,
      statusMovimentacaoLoja,
    ]);

    let grupo = gruposPorChave.get(chaveGrupo);
    if (!grupo) {
      grupo = {
        regional: escopo.regional,
        bandeira: escopo.bandeira,
        competencia: escopo.competencia,
        loja: item.loja,
        setor: item.divisao,
        secao: item.setorN2,
        fornecedor: item.rede,
        statusMovimentacaoLoja,
        ...totaisVazios(),
      };
      gruposPorChave.set(chaveGrupo, grupo);
    }

    const totalRuptura = valorRupturaOficial(item);
    const curtoPrazo = valorFlagOficial(item, "curtoPrazo");
    const medioPrazo = valorFlagOficial(item, "medioPrazo");
    const longoPrazo = valorFlagOficial(item, "longoPrazo");

    grupo.qtdeProdutos += 1;
    grupo.totalRuptura += totalRuptura;
    grupo.curtoPrazo += curtoPrazo;
    grupo.medioPrazo += medioPrazo;
    grupo.longoPrazo += longoPrazo;

    totais.qtdeProdutos += 1;
    totais.totalRuptura += totalRuptura;
    totais.curtoPrazo += curtoPrazo;
    totais.medioPrazo += medioPrazo;
    totais.longoPrazo += longoPrazo;
  }

  const grupos = [...gruposPorChave.values()].sort(ordenarGrupos);

  return {
    meta: {
      ...escopo,
      totalGrupos: grupos.length,
    },
    totais,
    grupos,
  };
}
