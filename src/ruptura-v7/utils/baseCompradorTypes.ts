/** Linha tabular — aba BASE_COMPRADOR / Tabela dinâmica (sem valores agregados). */
export type BaseCompradorLinha = {
  codigo: number;
  descCompleta: string;
  departamento: string;
  secao: string;
  categoria: string;
  fornecedor: string;
  comprador: string;
  /** Atributos divergentes encontrados para o mesmo código em lojas diferentes. */
  conflitoAtributos?: string[];
};

export const COLUNAS_BASE_COMPRADOR = [
  { key: "comprador" as const, label: "COMPRADOR" },
  { key: "fornecedor" as const, label: "FORNECEDOR" },
  { key: "departamento" as const, label: "DEPARTAMENTO" },
  { key: "secao" as const, label: "SEÇÃO" },
  { key: "categoria" as const, label: "CATEGORIA" },
  { key: "codigo" as const, label: "CÓDIGO" },
  { key: "descCompleta" as const, label: "DESCCOMPLETA" },
];

export type BaseCompradorColunaKey = (typeof COLUNAS_BASE_COMPRADOR)[number]["key"];

export type BaseCompradorFiltrosSlicer = {
  departamentos: string[];
  secoes: string[];
  categorias: string[];
};
