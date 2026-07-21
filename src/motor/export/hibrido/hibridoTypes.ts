import type { ClassificacaoPrazoConsumo, QualidadeDadosConsumo } from "../../ruptura-v7/types/rupturaTypes.ts";
import type {
  CdsLojaJson,
  DashboardLojasJson,
  DashboardRegionalJson,
  GestaoJson,
  ResumoLojaJson,
} from "../../hibrido-v7/manifest/manifestTypes.ts";

export type HibridoProdutoGestao = {
  loja: number;
  seqproduto: number;
  descricao: string | null;
  codFornecedor: number | null;
  razaoFornecedor: string | null;
  rede: string | null;
  comprador: string | null;
  estoqueLoja: number | null;
  mediaVendaDia: number | null;
  parMin: number | null;
  parMax: number | null;
  somaEstoqueCd: number | null;
  pendenciaCpaCd: number | null;
  classificacaoPrazo: ClassificacaoPrazoConsumo | null;
  diasPedido: number | null;
  produtoCentralizado: number | null;
  codigoCdSelecionado: number | null;
  statusEstoqueCds: string | null;
  acaoRecomendada: string | null;
  qualidadeDados: QualidadeDadosConsumo | null;
  setorN2: string | null;
  divisao: string | null;
};

export type PublicacaoHibridaArtefato = {
  path: string;
  json: unknown;
  bytes: number;
};

export type PublicacaoHibridaResultado = {
  artefatos: PublicacaoHibridaArtefato[];
  resumo: ResumoLojaJson;
  gestao: GestaoJson;
  cds: CdsLojaJson;
  dashboardRegional: DashboardRegionalJson;
  dashboardLojas: DashboardLojasJson;
};

export { type ResumoLojaJson, type GestaoJson, type CdsLojaJson };
