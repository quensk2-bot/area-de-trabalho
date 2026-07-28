export type TopPrazosStatusMovimentacao =
  | "Sem Movimentação"
  | "Com movimentação";

export type TopPrazosGrupo = {
  regional: string;
  bandeira: string;
  competencia: string;
  loja: number;
  setor: string | null;
  secao: string | null;
  fornecedor: string | null;
  statusMovimentacaoLoja: TopPrazosStatusMovimentacao;
  qtdeProdutos: number;
  totalRuptura: number;
  curtoPrazo: number;
  medioPrazo: number;
  longoPrazo: number;
};

export type TopPrazosTotais = {
  qtdeProdutos: number;
  totalRuptura: number;
  curtoPrazo: number;
  medioPrazo: number;
  longoPrazo: number;
};

export type TopPrazosJson = {
  meta: {
    regional: string;
    bandeira: string;
    competencia: string;
    dataReferencia: string;
    versao: number;
    totalGrupos: number;
  };
  totais: TopPrazosTotais;
  grupos: TopPrazosGrupo[];
};
