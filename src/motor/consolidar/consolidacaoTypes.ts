import type { MotorAlerta, MotorBreItemResultado, MotorBreResultado, MotorClassificacaoPrazo } from "../bre/breTypes.ts";
import type { MotorProdutoCdNormalizado } from "../cds/cdTypes.ts";
import type { MotorCatalogos } from "../catalog/catalogTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import type { MotorInventarioAgrupado, MotorLinhaValidacao } from "../types/motorLinhaTypes.ts";
import type { MotorBlocoCdsComplementar } from "./cds/consolidarCdsProduto.ts";
import type { MotorProdutoCdNormalizado } from "../cds/cdTypes.ts";

export type MotorStatusOperacional =
  | "erro_estrutural"
  | "bloqueado"
  | "curto_prazo"
  | "medio_prazo"
  | "longo_prazo"
  | "sem_ruptura"
  | "dados_incompletos";

/** Classificação consolidada para publicação (Data Mart / persistência). */
export type MotorClassificacaoPrazoPublicacao =
  | "curto_prazo"
  | "medio_prazo"
  | "longo_prazo"
  | "sem_ruptura"
  | "bloqueado"
  | "dados_incompletos";

export type MotorQualidadeDados = "completo" | "completo_com_alertas" | "incompleto" | "invalido";

export type MotorConsolidacaoContexto = {
  regional: string;
  dataReferencia: string;
  catalogos: MotorCatalogos;
  /** Blocos complementares esperados para a regional (ex.: [2] no piloto MT). Vazio = somente bloco principal. */
  blocosEsperados?: number[];
};

export type MotorBlocoCdsComplementarEntrada = {
  regional?: string;
  loja: number | null;
  seqproduto: number;
  numeroBloco: number;
  origemArquivo: string;
  cds: MotorProdutoCdNormalizado[];
};

export type MotorConsolidacaoEntrada = {
  contexto: MotorConsolidacaoContexto;
  produtosLoja: MotorProdutoLojaNormalizado[];
  cds5: Map<number, MotorCd5Normalizado>;
  /** Blocos complementares adicionais (bloco 3+, ou com loja na fonte). */
  blocosCdsComplementares?: MotorBlocoCdsComplementarEntrada[];
  inventario: Map<string, MotorInventarioAgrupado>;
  validacao: Map<string, MotorLinhaValidacao>;
  bre: MotorBreResultado | null;
};

export type MotorConsolidacaoErro = {
  regional: string;
  loja: number;
  seqproduto: number;
  codigo: string;
  mensagem: string;
  severidade: "aviso" | "erro";
};

export type MotorJoinDiagnostico = {
  fonte: string;
  chave: string;
  encontrado: boolean;
  quantidadeCorrespondencias: number;
  decisao: string;
  severidade: "info" | "aviso" | "erro";
  mensagem: string;
};

export type MotorDuplicidadeDiagnostico = {
  chave: string;
  regional: string;
  loja: number;
  seqproduto: number;
  quantidade: number;
  severidade: "erro";
  mensagem: string;
};

export type MotorConsolidacaoMetricasCds = {
  totalCdsConsolidados: number;
  produtosCom1Cd: number;
  produtosCom4Cds: number;
  produtosCom5Cds: number;
  produtosComMaisDe5Cds: number;
  produtosCom8Cds: number;
  posicoesDuplicadas: number;
  blocosSobrepostos: number;
  cdsSemCodigoFisico: number;
  totalProdutosComCds: number;
  totalProdutosSemCds: number;
  mediaCdsPorProduto: number;
  maxCdsEmUmProduto: number;
  produtosComPosicoesNaoContiguas: number;
  produtosComCodigoFisicoAusente: number;
};

export type MotorConsolidacaoMetricas = {
  linhasEntrada: number;
  linhasSaida: number;
  linhasInvalidas: number;
  duplicidadesBase: number;
  duplicidadesCatalogos: number;
  semGrupo2: number;
  semInventario: number;
  semValidacao: number;
  semRede: number;
  semBandeira: number;
  semOrdem: number;
  semComprador: number;
  semBre: number;
  totalAlertas: number;
  totalErros: number;
  duracaoMs: number;
  cds: MotorConsolidacaoMetricasCds;
};

export type MotorProdutoLojaConsolidado = {
  regional: string;
  dataReferencia: string;
  bandeira: string | null;
  loja: number;
  seqproduto: number;
  descricao: string | null;
  codFornecedor: number | null;
  fornecedor: string | null;
  rede: string | null;
  comprador: string | null;
  statusProduto: string | null;
  familia: number | null;
  divisao: string | null;
  setorCodigo: string | null;
  setorNome: string | null;
  categoriaN1: string | null;
  setorN2: string | null;
  grupoN3: string | null;
  subgrupoN4: string | null;
  tipoN5: string | null;
  mediaVendaUnDia: number | null;
  mediaVendaGp: number | null;
  estoqueLoja: number | null;
  parMin: number | null;
  parMax: number | null;
  pendenciaLoja: number | null;
  diasRuptura: number | null;
  ultimaEntradaLoja: string | null;
  ultimaSaidaLoja: string | null;
  /** Fonte oficial dos dados por CD — ordenada por posicaoLogica. */
  cds: MotorProdutoCdNormalizado[];
  /** Campos flat CD1..5 — derivados via ConsolidadoCdsLegadoAdapter (compatibilidade). */
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  estoqueCd5: number | null;
  pendenciaCd1: number | null;
  pendenciaCd2: number | null;
  pendenciaCd3: number | null;
  pendenciaCd4: number | null;
  pendenciaCd5: number | null;
  statusCompraCd1: string | null;
  statusCompraCd2: string | null;
  statusCompraCd3: string | null;
  statusCompraCd4: string | null;
  statusCompraCd5: string | null;
  diasCompraCd1: number | null;
  diasCompraCd2: number | null;
  diasCompraCd3: number | null;
  diasCompraCd4: number | null;
  diasCompraCd5: number | null;
  diasRecebtoCd1: number | null;
  diasRecebtoCd2: number | null;
  diasRecebtoCd3: number | null;
  diasRecebtoCd4: number | null;
  diasRecebtoCd5: number | null;
  somaEstoqueCd: number | null;
  crossSum: number | null;
  crossDocking: number | null;
  geraRuptura: boolean | null;
  ruptura104c: boolean | null;
  inventarioUnid: number | null;
  rupturaComInventario: number | null;
  rupturaSemInventario: number | null;
  baseLimpa: string | null;
  ativacaoRecente: boolean | null;
  curtoPrazo: number | null;
  medioPrazo: number | null;
  longoPrazo: number | null;
  classificacaoPrazo: MotorClassificacaoPrazoPublicacao;
  pendenciaCpaCd: number | null;
  diasPedido: number | null;
  acaoCurtoPrazo: string | null;
  acaoMedioPrazo: string | null;
  primeiroCd: number | null;
  segundoCd: number | null;
  terceiroCd: number | null;
  quartoCd: number | null;
  quintoCd: number | null;
  menorDiasRecebimento: number | null;
  produtoCentralizado: number | null;
  textoProdutoCentralizado: string | null;
  posicaoCdSelecionada: 1 | 2 | 3 | 4 | 5 | null;
  codigoCdSelecionado: number | null;
  flagPrimeiroCd: number | null;
  flagSegundoCd: number | null;
  flagTerceiroCd: number | null;
  flagQuartoCd: number | null;
  flagQuintoCd: number | null;
  statusRecebto: string | null;
  statusEstoqueCds: string | null;
  statusSolicitacaoAtivacaoCd: string | null;
  qtdeEmbCompra: number | null;
  embalagemCompra: string | null;
  custoLiquido: number | null;
  pesoUnid: number | null;
  m3Unid: number | null;
  coberturaDias: number | null;
  modCurtoPrazo: string | null;
  ncurtoPrazo: string | null;
  statusOperacional: MotorStatusOperacional;
  qualidadeDados: MotorQualidadeDados;
  alertas: MotorAlerta[];
  erros: MotorConsolidacaoErro[];
  fontesAusentes: string[];
};

export type MotorConsolidacaoResultado = {
  itens: MotorProdutoLojaConsolidado[];
  erros: MotorConsolidacaoErro[];
  diagnosticosJoin: MotorJoinDiagnostico[];
  duplicidades: MotorDuplicidadeDiagnostico[];
  metricas: MotorConsolidacaoMetricas;
};

export type MotorConsolidacaoIndexes = {
  /** Blocos complementares indexados por regional|loja|seqproduto (preferencial). */
  blocosCdsPorChaveLojaProduto: Map<string, MotorBlocoCdsComplementar[]>;
  /** Blocos complementares sem loja na fonte — regional|seqproduto. */
  blocosCdsPorChaveRegionalProduto: Map<string, MotorBlocoCdsComplementar[]>;
  /** @deprecated Use blocosCdsPorChave* — alias legado para testes de transição. */
  cd5PorRegionalProduto: Map<string, MotorCd5Normalizado[]>;
  inventarioPorLojaProduto: Map<string, MotorInventarioAgrupado>;
  validacaoPorLojaProduto: Map<string, MotorLinhaValidacao>;
  redePorFornecedor: Map<number, string[]>;
  bandeiraPorLoja: Map<number, string>;
  ordemPorBandeira: Map<string, { cd1: number; cd2: number; cd3: number; cd4: number; cd5: number }[]>;
  compradorPorHierarquia: Map<string, string[]>;
  produtoExclusivoPorProduto: Map<number, boolean>;
  excecaoPorLojaProduto: Map<string, string>;
  brePorLojaProduto: Map<string, MotorBreItemResultado>;
  chavesDuplicadasBase: Map<string, number>;
};

export type MotorConsolidacaoLoteContexto = {
  entrada: MotorConsolidacaoEntrada;
  indexes: MotorConsolidacaoIndexes;
  diagnosticosJoin: MotorJoinDiagnostico[];
  duplicidades: MotorDuplicidadeDiagnostico[];
  erros: MotorConsolidacaoErro[];
  metricasParciais: Omit<MotorConsolidacaoMetricas, "duracaoMs" | "linhasSaida" | "totalAlertas" | "totalErros">;
  metricasCdsParciais: MotorConsolidacaoMetricasCds;
};
