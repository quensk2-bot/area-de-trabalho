import type { MotorCdCampoComparavel } from "./motorCdComparacaoTypes.ts";

export type MotorPerfilComparacaoCd = {
  id: string;
  quantidadePosicoes: number | "auto";
  usarAdaptadorLegado: boolean;
  compararCodigoFisico: boolean;
  compararCamposPorCd: MotorCdCampoComparavel[];
  regional?: string;
  bandeira?: string;
  vigenciaInicio?: string;
  ativo: boolean;
};

const CAMPOS_PADRAO: MotorCdCampoComparavel[] = [
  "estoque",
  "pendencia",
  "statusCompra",
  "diasCompra",
  "diasRecebimento",
];

export const PERFIL_EXCEL_MT_LEGADO_5CD: MotorPerfilComparacaoCd = {
  id: "excel_mt_legado_5cd",
  quantidadePosicoes: 5,
  usarAdaptadorLegado: true,
  compararCodigoFisico: true,
  compararCamposPorCd: ["estoque"],
  regional: "MT",
  bandeira: "Comper MT",
  ativo: true,
};

export const PERFIL_REGIONAL_8CD: MotorPerfilComparacaoCd = {
  id: "regional_8cd",
  quantidadePosicoes: 8,
  usarAdaptadorLegado: false,
  compararCodigoFisico: true,
  compararCamposPorCd: CAMPOS_PADRAO,
  ativo: true,
};

export const PERFIL_AUDITORIA_COMPLETA: MotorPerfilComparacaoCd = {
  id: "auditoria_completa",
  quantidadePosicoes: "auto",
  usarAdaptadorLegado: false,
  compararCodigoFisico: true,
  compararCamposPorCd: CAMPOS_PADRAO,
  ativo: true,
};

export const PERFIL_LAYOUT_DINAMICO: MotorPerfilComparacaoCd = {
  id: "layout_dinamico",
  quantidadePosicoes: "auto",
  usarAdaptadorLegado: false,
  compararCodigoFisico: true,
  compararCamposPorCd: CAMPOS_PADRAO,
  ativo: true,
};

const PERFIS: Record<string, MotorPerfilComparacaoCd> = {
  [PERFIL_EXCEL_MT_LEGADO_5CD.id]: PERFIL_EXCEL_MT_LEGADO_5CD,
  [PERFIL_REGIONAL_8CD.id]: PERFIL_REGIONAL_8CD,
  [PERFIL_AUDITORIA_COMPLETA.id]: PERFIL_AUDITORIA_COMPLETA,
  [PERFIL_LAYOUT_DINAMICO.id]: PERFIL_LAYOUT_DINAMICO,
};

export function obterPerfilComparacaoCd(id: string): MotorPerfilComparacaoCd {
  const perfil = PERFIS[id];
  if (!perfil) throw new Error(`Perfil de comparação CD não encontrado: ${id}`);
  return perfil;
}

export function resolverQuantidadePosicoesComparacao(
  perfil: MotorPerfilComparacaoCd,
  maxDetectado: number,
): number {
  if (perfil.quantidadePosicoes === "auto") return maxDetectado;
  return perfil.quantidadePosicoes;
}
