import type { ClassificacaoPrazoConsumo, QualidadeDadosConsumo } from "./rupturaTypes.ts";

export type RupturaFiltrosContexto = {
  regional: string;
  /** null = todas as bandeiras da regional */
  bandeira: string | null;
  dataReferencia: string;
  /** 0 = todas as lojas (conforme regional/bandeira). Compatibilidade legada. */
  loja: number;
  /** Lojas selecionadas. Vazio = Todas no escopo. */
  lojas: number[];
  /** Compradores selecionados. Vazio = todos no escopo. */
  compradores?: string[];
};

export type RupturaFiltrosProdutos = RupturaFiltrosContexto & {
  divisao?: string;
  setor?: string;
  grupo?: string;
  fornecedor?: string;
  rede?: string;
  comprador?: string;
  classificacao?: ClassificacaoPrazoConsumo | ClassificacaoPrazoConsumo[];
  qualidade?: QualidadeDadosConsumo | QualidadeDadosConsumo[];
  statusOperacional?: string;
  possuiEstoqueCd?: boolean;
  possuiPendencia?: boolean;
  centralizado?: boolean;
  codigoCd?: number;
  busca?: string;
};

export type RupturaOrdenacao = {
  coluna: string;
  direcao: "asc" | "desc";
};

export type RupturaPaginacao = {
  pagina: number;
  tamanho: number;
};

export const RUPTURA_PAGE_SIZES = [25, 50, 100, 250] as const;
export const RUPTURA_PAGE_SIZE_DEFAULT = 50;
export const RUPTURA_PAGE_SIZE_MAX = 500;
export const RUPTURA_BUSCA_MIN_CHARS = 2;
export const RUPTURA_BUSCA_DEBOUNCE_MS = 400;
export const RUPTURA_EXPORT_BATCH = 500;
export const RUPTURA_EXPORT_MAX_ROWS = 50_000;
/** Acima deste limite: Worker ou arquivo pré-gerado no Drive. */
export const RUPTURA_EXPORT_BROWSER_MAX_ROWS = 25_000;

export const RUPTURA_CONTEXTO_DEFAULT: RupturaFiltrosContexto = {
  regional: "MT",
  bandeira: "COMPER",
  dataReferencia: "2026-03-26",
  loja: 73,
  lojas: [73],
};
