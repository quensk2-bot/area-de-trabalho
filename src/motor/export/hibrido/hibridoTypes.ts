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
  /** Pendência loja pura (TXT PENDCPA) — export BASE coluna PENDCPA. */
  pendenciaLoja: number | null;
  /** Soma loja + CDs — uso interno MP/BRE; não exportar como PENDCPA. */
  pendenciaCpaCd: number | null;
  baseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  classificacaoPrazo: ClassificacaoPrazoConsumo | null;
  diasPedido: number | null;
  produtoCentralizado: number | null;
  codigoCdSelecionado: number | null;
  statusEstoqueCds: string | null;
  acaoRecomendada: string | null;
  qualidadeDados: QualidadeDadosConsumo | null;
  setorN2: string | null;
  divisao: string | null;
  /** Campos adicionais publicados para export BASE (origem consolidado, sem recalcular BRE). */
  categoriaN1: string | null;
  embalagemCompra: string | null;
  ruptura104c: boolean | null;
  geraRuptura: boolean | null;
  inventarioUnid: number | null;
  rupturaComInventario: number | null;
  rupturaSemInventario: number | null;
  crossDocking: number | null;
  crossSum: number | null;
  estSelecInvCd1: number | null;
  estSelecInvCd2: number | null;
  estSelecInvCd3: number | null;
  estSelecInvCd4: number | null;
  modCurtoPrazo: string | null;
  ncurtoPrazo: string | null;
  curtoPrazo: number | null;
  medioPrazo: number | null;
  longoPrazo: number | null;
  ultimaEntradaLoja: string | null;
  diasRuptura: number | null;
  statusSolicitacaoAtivacaoCd: string | null;
  acaoCurtoPrazo: string | null;
  acaoMedioPrazo: string | null;
  textoProdutoCentralizado: string | null;
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
