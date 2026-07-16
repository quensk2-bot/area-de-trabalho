export type CompareStatus =
  | "igual"
  | "divergente"
  | "ausente_no_v7"
  | "ausente_no_excel"
  | "nao_comparavel"
  | "tolerancia_decimal";

export type CompareFieldConfig = {
  campo: string;
  toleranciaDecimal?: number;
  comparavelNestaEtapa?: boolean;
};

export type CompareRowInput = {
  loja: number;
  produto: number;
  excel: Record<string, string | number | boolean | null>;
  v7: Record<string, string | number | boolean | null>;
};

export type CompareFieldResult = {
  campo: string;
  status: CompareStatus;
  valorExcel: string | number | boolean | null;
  valorV7: string | number | boolean | null;
  motivo: string;
};

export type CompareRowResult = {
  chave: string;
  loja: number;
  produto: number;
  campos: CompareFieldResult[];
  divergencias: number;
};

export type CompareSummary = {
  totalLinhas: number;
  totalCampos: number;
  iguais: number;
  divergentes: number;
  ausentesNoV7: number;
  ausentesNoExcel: number;
  naoComparaveis: number;
  toleranciaDecimal: number;
};

export type CompareResult = {
  linhas: CompareRowResult[];
  resumo: CompareSummary;
};

export const CAMPOS_PRIORITARIOS_COMPARE: CompareFieldConfig[] = [
  { campo: "Base Limpa", comparavelNestaEtapa: true },
  { campo: "Menor que três", comparavelNestaEtapa: true },
  { campo: "Ruptura Inventário", comparavelNestaEtapa: true },
  { campo: "Ruptura Sem Inventário", comparavelNestaEtapa: true },
  { campo: "Soma_EstoqueCD", comparavelNestaEtapa: true },
  { campo: "Curto Prazo", comparavelNestaEtapa: false },
  { campo: "Médio Prazo", comparavelNestaEtapa: false },
  { campo: "Longo Prazo", comparavelNestaEtapa: false },
  { campo: "Centralizado", comparavelNestaEtapa: false },
  { campo: "Comprador", comparavelNestaEtapa: false },
  { campo: "Ação Curto", comparavelNestaEtapa: false },
  { campo: "Ação Médio", comparavelNestaEtapa: false },
];
