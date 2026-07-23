import type { MotorCatalogos } from "../catalog/catalogTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import type { MotorInventarioAgrupado, MotorLinhaValidacao } from "../types/motorLinhaTypes.ts";
import type { MotorErroValidacao } from "../types/motorTypes.ts";

export type MotorRegraStatus =
  | "aplicada"
  | "nao_aplicavel"
  | "bloqueada_dependencia"
  | "erro"
  | "ambigua";

export type MotorClassificacaoPrazo = "CP" | "MP" | "LP" | null;

export type MotorDiasPedidoOrigem = "loja" | "cd1" | "cd2" | "cd3" | "cd4" | "cd5" | "nenhum";

export type MotorDiasPedidoEntrada = {
  pendenciaLoja: number | null;
  diasCompraLoja: number | null;
  pendenciaCd1: number | null;
  diasCompraCd1: number | string | null;
  pendenciaCd2: number | null;
  diasCompraCd2: number | string | null;
  pendenciaCd3: number | null;
  diasCompraCd3: number | string | null;
  pendenciaCd4: number | null;
  diasCompraCd4: number | string | null;
  pendenciaCd5: number | null;
  diasCompraCd5: number | string | null;
};

export type MotorDiasPedidoResultado = {
  mediaDiasPedidoLoja: number | null;
  mediaDiasPedidoCd1: number | null;
  mediaDiasPedidoCd2: number | null;
  mediaDiasPedidoCd3: number | null;
  mediaDiasPedidoCd4: number | null;
  mediaDiasPedidoCd5: number | null;
  diasPedidoFinal: number;
  origemResultado: MotorDiasPedidoOrigem;
  alertas: MotorAlerta[];
  statusRegra: MotorRegraStatus;
};

export type MotorAuxiliaresPedidoEntrada = {
  parMin: number | null;
  curtoPrazo: 0 | 1;
  medioPrazo: 0 | 1;
  menorQueTres: 0 | 1;
  modCurtoPrazo: "LJ_Exclusiva" | null;
  diasPedido: number | null;
  pendenciaLoja: number | null;
  pendenciaCpaCd: number | null;
  pendenciaCd1: number | null;
  pendenciaCd2: number | null;
  pendenciaCd3: number | null;
  pendenciaCd4: number | null;
  pendenciaCd5: number | null;
  estoqueLoja: number | null;
  ultimaEntradaLoja: string | null;
  estoqueCd1: number | null;
  estoqueCd2: number | null;
  estoqueCd3: number | null;
  estoqueCd4: number | null;
  estoqueCd5: number | null;
  diasRecebtoCd1: number | string | null;
  diasRecebtoCd2: number | string | null;
  diasRecebtoCd3: number | string | null;
  diasRecebtoCd4: number | string | null;
  diasRecebtoCd5: number | string | null;
  centralizacaoDisponivel?: boolean;
  statusEstoqueCdsCentralizacao?: string | null;
  statusSolicitacaoAtivacaoCentralizacao?: string | null;
};

export type MotorAuxiliaresPedidoResultado = {
  rupDiasRecebtoMaiorData: number;
  curtoPrazoRebtoProximo: 0 | 1;
  curtoPrazoNaoRebtoProximo: 0 | 1;
  pedidoSuperior30Dias: 0 | 1;
  avaliarPedido: 0 | 1;
  pendenciaIndevida: 0 | 1;
  possuiPedidoCompra: "Sim" | "Não";
  cadastrosSemEntradas: 0 | 1;
  semEntradaSemPedido: "Ruptura Cadastro Novo / Sem Entrada & Sem Pedido" | "Ok";
  statusEstoqueCds: string | null;
  statusSolicitacaoAtivacaoCd: string | null;
  dependenciasBloqueadas: string[];
  alertas: MotorAlerta[];
  statusRegra: MotorRegraStatus;
};

export type MotorAcoesOperacionaisEntrada = {
  parMin: number | null;
  curtoPrazo: 0 | 1;
  medioPrazo: 0 | 1;
  diasCompraLj: number | null;
  diasPedido: number | null;
  auxiliares: MotorAuxiliaresPedidoResultado;
};

export type MotorAcoesOperacionaisResultado = {
  auxiliares: MotorAuxiliaresPedidoResultado;
  acaoCurtoPrazo: string;
  acaoMedioPrazo: string;
  alertas: MotorAlerta[];
  statusRegra: MotorRegraStatus;
};

export type MotorAlerta = {
  codigo: string;
  mensagem: string;
  severidade: "info" | "aviso" | "erro";
};

export type MotorDependenciaAusente = {
  nome: string;
  descricao: string;
};

export type MotorAcaoOperacional = {
  tipo: "CP" | "MP";
  texto: string;
};

export type MotorRegraResultado = {
  regra: string;
  status: MotorRegraStatus;
  resultado: boolean | number | string | null;
  entradasUtilizadas: Record<string, string | number | boolean | null>;
  motivo: string;
  alertas: MotorAlerta[];
  dependenciasAusentes: MotorDependenciaAusente[];
};

export type MotorBreContexto = {
  regional: string;
  dataReferencia: string;
  catalogos: MotorCatalogos;
  alertas: string[];
};

export type MotorBreEntrada = {
  contexto: MotorBreContexto;
  produtosLoja: MotorProdutoLojaNormalizado[];
  cds5: Map<number, MotorCd5Normalizado>;
  validacao: Map<string, MotorLinhaValidacao>;
  inventario: Map<string, MotorInventarioAgrupado>;
};

export type MotorPendenciaAgregadaResultado = MotorRegraResultado & {
  soma: number | null;
};

export type MotorCurtoPrazoResultado = MotorRegraResultado & {
  curtoPrazo: 0 | 1;
};

export type MotorMedioPrazoResultado = MotorRegraResultado & {
  medioPrazo: 0 | 1;
  somaPendencia: number | null;
};

export type MotorLongoPrazoResultado = MotorRegraResultado & {
  longoPrazo: 0 | 1;
};

export type MotorClassificacaoFinalResultado = {
  classificacaoPrazo: MotorClassificacaoPrazo;
  curtoPrazo: 0 | 1;
  medioPrazo: 0 | 1;
  longoPrazo: 0 | 1;
  pendenciaCpaCd: number | null;
  crossSum: number;
  crossDocking: 0 | 1;
  origemCross: "EST_SELECINV_CD1..4";
  valoresCrossPorCd: {
    estSelecInvCd1: number | null;
    estSelecInvCd2: number | null;
    estSelecInvCd3: number | null;
    estSelecInvCd4: number | null;
  };
  pendencia: MotorPendenciaAgregadaResultado;
  curtoPrazoRegra: MotorCurtoPrazoResultado;
  medioPrazoRegra: MotorMedioPrazoResultado;
  longoPrazoRegra: MotorLongoPrazoResultado;
  exclusividadeGarantida: boolean;
  alertas: MotorAlerta[];
  regras: MotorRegraResultado[];
};

export type MotorBreItemResultado = {
  loja: number;
  seqproduto: number;
  statusBaseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  diasAtivacaoRevisado: number | null;
  statusAtivo60Dias: boolean;
  menorQueTresUnidades: 0 | 1;
  flagRuptura: string | null;
  ruptura104c: boolean;
  inventarioUnid: number;
  rupturaInventario: 0 | 1;
  rupturaSemInventario: 0 | 1;
  somaEstoqueCd: number | null;
  pendenciaCpaCd: number | null;
  crossSum: number | null;
  crossDocking: 0 | 1 | null;
  origemCross: "EST_SELECINV_CD1..4" | null;
  valoresCrossPorCd: {
    estSelecInvCd1: number | null;
    estSelecInvCd2: number | null;
    estSelecInvCd3: number | null;
    estSelecInvCd4: number | null;
  } | null;
  modCurtoPrazo: "LJ_Exclusiva" | null;
  ncurtoPrazo: "G" | "NG" | null;
  classificacaoPrazo: MotorClassificacaoPrazo;
  curtoPrazo: 0 | 1;
  medioPrazo: 0 | 1;
  longoPrazo: 0 | 1;
  mediaDiasPedidoLoja: number | null;
  mediaDiasPedidoCd1: number | null;
  mediaDiasPedidoCd2: number | null;
  mediaDiasPedidoCd3: number | null;
  mediaDiasPedidoCd4: number | null;
  mediaDiasPedidoCd5: number | null;
  diasPedido: number;
  origemDiasPedido: MotorDiasPedidoOrigem;
  avaliarPedido: 0 | 1;
  pendenciaIndevida: 0 | 1;
  pedidoSuperior30Dias: 0 | 1;
  possuiPedidoCompra: "Sim" | "Não";
  semEntradaSemPedido: "Ruptura Cadastro Novo / Sem Entrada & Sem Pedido" | "Ok";
  curtoPrazoRebtoProximo: 0 | 1;
  curtoPrazoNaoRebtoProximo: 0 | 1;
  acaoCurtoPrazo: string;
  acaoMedioPrazo: string;
  statusEstoqueCds: string | null;
  statusSolicitacaoAtivacaoCd: string | null;
  menorRecebimentoCd: number | null;
  produtoCentralizado: number | null;
  textoProdutoCentralizado: string | null;
  statusRecebtoCentralizacao: string | null;
  flagPrimeiroCd: number;
  flagSegundoCd: number;
  flagTerceiroCd: number;
  flagQuartoCd: number;
  flagQuintoCd: number;
  posicaoCdSelecionada: 1 | 2 | 3 | 4 | 5 | null;
  codigoCdSelecionado: number | null;
  primeiroCd: number | null;
  segundoCd: number | null;
  terceiroCd: number | null;
  quartoCd: number | null;
  quintoCd: number | null;
  regras: MotorRegraResultado[];
  alertas: MotorAlerta[];
};

export type MotorBreMetricas = {
  itensProcessados: number;
  regrasAplicadas: number;
  regrasBloqueadas: number;
  regrasAmbiguas: number;
  duracaoMs: number;
};

export type MotorBreResultado = {
  regional: string;
  dataReferencia: string;
  itens: MotorBreItemResultado[];
  metricas: MotorBreMetricas;
  erros: MotorErroValidacao[];
  alertas: MotorAlerta[];
};

export type MotorEstSelecInv = {
  estSelecInvCd1: number | null;
  estSelecInvCd2: number | null;
  estSelecInvCd3: number | null;
  estSelecInvCd4: number | null;
};

export type MotorBreItemInput = {
  produto: MotorProdutoLojaNormalizado;
  cd5: MotorCd5Normalizado | null;
  validacao: MotorLinhaValidacao | null;
  inventario: MotorInventarioAgrupado | null;
  dtaUltAtivacao?: string | null;
  estSelecInv?: MotorEstSelecInv | null;
};

export const SETORES_EXCLUIDOS_SETOR2 = new Set([
  "37-ACOUGUE",
  "38-FLV",
  "39-PEIXARIA",
  "43-PADARIA E CONFEITARIA",
  "44-ROTISSERIA",
  "45-RESTAURANTE",
  "50-FORT DOG",
]);

export const SETORES_EXCLUIDOS_SETOR = new Set(["64-PRODUTOS ESPECIAIS", "68-FARMACIA"]);
