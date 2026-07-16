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
  modCurtoPrazo: "LJ_Exclusiva" | null;
  ncurtoPrazo: "G" | "NG" | null;
  classificacaoPrazo: MotorClassificacaoPrazo;
  curtoPrazo: 0 | 1;
  medioPrazo: 0 | 1;
  longoPrazo: 0 | 1;
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
