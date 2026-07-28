import type { MotorErroValidacao } from "../types/motorTypes.ts";

export type CatalogoLoadResult<T> = {
  origem: string;
  itens: T[];
  quantidadeCarregada: number;
  duplicatasRemovidas: number;
  erros: MotorErroValidacao[];
  alertas: string[];
};

export type CatalogoRedeFornecedor = {
  seqPessoa: number;
  razao: string;
  seqRede: number | null;
  nomeRede: string | null;
};

export type CatalogoBandeiraLoja = {
  loja: number;
  bandeira: string;
  tipoLoja: string | null;
};

export type CatalogoOrdemCd = {
  divisao: string;
  bandeira: string;
  uf: string | null;
  cd1: number;
  cd2: number;
  cd3: number;
  cd4: number;
  cd5: number;
};

export type CatalogoSequenciaCd = {
  divisao: string;
  bandeira: string;
  uf: string | null;
  cd: number;
  ordem: string;
};

export type CatalogoModalidadeLoja = {
  modalidade: string;
  tipoLoja: string;
};

export type CatalogoComprador = {
  rede: string;
  secao: string;
  nivel2: string;
  nivel3: string;
  comprador: string;
  origem: "principal" | "correcao";
};

export type CatalogoCompradorConflito = {
  chave: string;
  rede: string;
  secao: string;
  nivel2: string;
  nivel3: string;
  compradorPrincipal: string | null;
  compradorCorrecao: string | null;
};

export type CatalogoProdutoExclusivo = {
  codigo: number;
  descricao: string | null;
  modCurtoPrazo: "LJ_Exclusiva";
};

/** Produto do Plan 6 CD.txt — usado para obter MODALIDADECD oficial. */
export type CatalogoPlan6Produto = {
  codigo: number;
  modalidadeCd: string;
};

export type CatalogoProdutoLojaExcecao = {
  codigo: number;
  loja: number;
  modalidadeCd: string;
  ncurtoPrazo: "G" | "NG";
};

export type CatalogoRegraExclusao = {
  fornecedor: string | null;
  motivo: string | null;
  categoria: string | null;
  secao: string | null;
  loja: number | null;
  bandeira: string | null;
  status: number | null;
};

export type CatalogoEstruturaFake = {
  bandeira: string | null;
  setor: string | null;
  setor2: string | null;
  rede: string | null;
  loja: string | null;
  seqproduto: string | null;
  descricao: string | null;
  estruturaReal: string;
};

export type MotorCatalogos = {
  rede: CatalogoRedeFornecedor[];
  bandeira: CatalogoBandeiraLoja[];
  ordemCd: CatalogoOrdemCd[];
  sequenciaCd: CatalogoSequenciaCd[];
  modalidade: CatalogoModalidadeLoja[];
  compradores: CatalogoComprador[];
  conflitosComprador: CatalogoCompradorConflito[];
  produtosExclusivos: CatalogoProdutoExclusivo[];
  excecoesProdutoLoja: CatalogoProdutoLojaExcecao[];
  regrasExclusao: CatalogoRegraExclusao[];
  estruturaFake: CatalogoEstruturaFake[];
  /** Mapa de MODALIDADECD por SEQPRODUTO (Plan 6 CD.txt). */
  plan6Produtos: CatalogoPlan6Produto[];
};
