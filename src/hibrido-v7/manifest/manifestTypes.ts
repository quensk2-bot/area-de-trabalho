export type ManifestStatus = "rascunho" | "validando" | "publicando" | "concluido" | "falhou";

export type ManifestLojaPaths = {
  resumo: string;
  /** KPIs modo OFICIAL_COMPATIVEL (Base Limpa). */
  resumoOficial?: string;
  gestao: string;
  cds: string;
};

export type RupturaManifest = {
  modulo: "ruptura";
  regional: string;
  bandeira: string;
  competencia: string;
  dataReferencia: string;
  versao: number;
  status: ManifestStatus;
  geradoEm: string;
  hashConteudo: string;
  baseXlsxDriveFileId?: string | null;
  baseCsvDriveFileId?: string | null;
  dashboardRegional: string;
  dashboardLojas: string;
  /** Dashboard agregado modo OFICIAL_COMPATIVEL (opcional — manifests legados). */
  dashboardRegionalOficial?: string;
  dashboardLojasOficial?: string;
  /** Agregação regional Top Prazos (opcional para manifestos antigos). */
  dashboardTopPrazos?: string;
  lojas: Record<string, ManifestLojaPaths>;
};

export type GestaoChunkIndex = {
  quantidadePartes: number;
  totalProdutos: number;
  partes: Array<{
    path: string;
    hash: string;
    seqprodutoMin: number;
    seqprodutoMax: number;
    bytes: number;
  }>;
};

export type GestaoJson = {
  meta: {
    regional: string;
    bandeira: string;
    loja: number;
    dataReferencia: string;
    versao: number;
    total: number;
    geradoEm: string;
    chunked?: boolean;
    chunkIndex?: GestaoChunkIndex;
  };
  produtos: unknown[];
};

export type ResumoLojaJson = {
  loja: number;
  regional: string;
  bandeira: string;
  dataReferencia: string;
  /** V7_INTEGRAL | OFICIAL_COMPATIVEL */
  modoUniverso?: "V7_INTEGRAL" | "OFICIAL_COMPATIVEL";
  totalProdutos: number;
  /** Operacional CP+MP+LP+bloqueados — alias legado de totalRupturaGeral */
  ruptura: number;
  totalRupturaGeral: number;
  totalRupturaClassificada: number;
  curtoPrazo: number;
  medioPrazo: number;
  longoPrazo: number;
  semRuptura: number;
  bloqueados: number;
  totalBaseLimpaElegivel: number;
  /** @deprecated use percentualRupturaGeral */
  percentualRuptura: number | null;
  percentualRupturaGeral: number | null;
  percentualRupturaClassificada: number | null;
  comEstoqueCd: number;
  semEstoqueCd: number;
  totalCentralizados: number;
  totalNaoCentralizados: number;
  totalCentralizacaoSemInfo?: number;
  atualizadoEm: string;
  setores?: Array<{
    setor: string;
    totalRuptura: number;
    totalBaseLimpa?: number;
    percentualRuptura?: number | null;
    curtoPrazo?: number;
    medioPrazo?: number;
    longoPrazo?: number;
  }>;
  /** Agregação por divisão (ex.: 60-MERCEARIA) — ruptura classificada e base limpa por grupo. */
  divisoes?: Array<{
    divisao: string;
    totalRuptura: number;
    totalBaseLimpa: number;
    percentualRuptura: number | null;
    curtoPrazo?: number;
    medioPrazo?: number;
    longoPrazo?: number;
  }>;
  fornecedores?: Array<{ fornecedor: string; comprador: string | null; totalRuptura: number }>;
  compradores?: Array<{ comprador: string; totalRuptura: number }>;
  estoquePorCd?: Array<{ codigoFisico: number | null; posicaoLogica: number; totalEstoque: number }>;
};

export type CdsLojaJson = {
  loja: number;
  regional: string;
  bandeira: string;
  dataReferencia: string;
  produtos: Array<{
    seqproduto: number;
    cds: Array<{
      posicaoLogica: number;
      codigoFisico: number | null;
      estoque: number | null;
      pendencia: number | null;
      statusCompra: string | null;
      diasCompra: number | null;
      diasRecebimento: number | null;
      flagCentralizacao: number | null;
    }>;
  }>;
};

export type DashboardRegionalJson = {
  regional: string;
  bandeira: string;
  competencia: string;
  dataReferencia: string;
  versao: number;
  totalLojas: number;
  totalProdutos: number;
  totalRuptura: number;
  atualizadoEm: string;
};

export type DashboardLojasJson = {
  regional: string;
  bandeira: string;
  competencia: string;
  lojas: Array<{
    loja: number;
    totalProdutos: number;
    ruptura: number;
    percentualRuptura: number | null;
  }>;
};
