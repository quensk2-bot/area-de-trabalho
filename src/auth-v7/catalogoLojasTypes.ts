/** Linha bruta do catálogo app_v7.lojas */
export type CatalogoLojaRow = {
  regional: string;
  bandeira: string;
  loja: number;
  nome: string;
  ativo?: boolean;
};

export type CatalogoLoja = {
  regional: string;
  bandeira: string;
  loja: number;
  nome: string;
};

export type CatalogoBandeira = {
  regional: string;
  bandeira: string;
};

export type CatalogoRegional = {
  regional: string;
  bandeiras: CatalogoBandeira[];
};

/**
 * Sentinelas de filtro (documentação de contrato V7):
 * - bandeira `null` → Todas as bandeiras da regional selecionada
 * - loja `0` / lojas `[]` → Todas as lojas (respeitando regional/bandeira)
 */
export const FILTRO_BANDEIRA_TODAS = null;
export const FILTRO_LOJA_TODAS = 0;

export type FiltroRegionalBandeiraLojaValores = {
  regional: string;
  bandeira: string | null;
  /** @deprecated Preferir `lojas`. Mantido para compatibilidade e sentinela 0 = Todas. */
  loja: number;
  /** Lojas selecionadas. Vazio = Todas no escopo (equivalente a loja 0). */
  lojas: number[];
};
