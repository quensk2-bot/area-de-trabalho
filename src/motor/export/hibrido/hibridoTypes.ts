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
  origemComprador?: "hierarquia_exata" | "correcao_exata" | "rede_unica" | null;
  chaveComprador?: string | null;
  fallbackComprador?: boolean;
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
  /** Nível 3 da coluna CATEGORIA do TXT (Excel BASE_COMPRADOR / pivô). */
  grupoN3: string | null;
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
  /** CD 1 — Rup (X) Dias Recebto (0 se sem estoque). */
  rupDiasRecebtoCd1: number;
  /** CD 2 — Rup (X) Dias Recebto (0 se sem estoque). */
  rupDiasRecebtoCd2: number;
  /** CD 3 — Rup (X) Dias Recebto (0 se sem estoque). */
  rupDiasRecebtoCd3: number;
  /** CD 4 — Rup (X) Dias Recebto (0 se sem estoque). */
  rupDiasRecebtoCd4: number;
  /** CD 5 — Rup (X) Dias Recebto (0 se sem estoque). */
  rupDiasRecebtoCd5: number;
  /** Excel `Rup (X) Dias Recebto Maior data` — média na CAPA Curto Prazo. */
  rupDiasRecebtoMaiorData: number;
  /** Excel `Curto Prazo Rebto Próximo` — flag 0/1. */
  curtoPrazoRebtoProximo: 0 | 1;
  /** Excel `Curto Prazo Não Rebto Próximo` — flag 0/1. */
  curtoPrazoNaoRebtoProximo: 0 | 1;
  /** Excel `Último Pedido Loja` — fórmula PQ (min loja + CDs), usado nas regras de LP/Ativação. */
  ultimoPedidoLojaPq: number | null;
  /** Raw ULTIMACPALOJA — usado APENAS na métrica visual do Dashboard Loja (média ≈ 183). */
  diasUltimoPedidoLojaDashboard: number | null;
  /** Excel `Ativação e Ruptura > 30 Dias Sem Pedido` — soma na CAPA. */
  ativacaoRuptura30SemPedido: number | null;
  /** Excel `Itens Vda Pendência` — soma na CAPA. */
  itensVdaPendencia: number | null;
  /** Excel `% Rup Sem Pendência Vda` — flag 0/1 por SKU (MÉDIA na CAPA). */
  rupSemPendenciaVda: number | null;
  /** Excel `% Rup Inventário` — flag 0/1 por SKU (MÉDIA na CAPA). */
  rupInventarioPct: number | null;
  /** Excel `% Ruptura Sem Inventário` — flag 0/1 por SKU (MÉDIA na CAPA). */
  rupSemInventarioPct: number | null;
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
