import type { MotorCdCampoExportacao, MotorPerfilExportacaoCd } from "./exportTypes.ts";

export const PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD: MotorPerfilExportacaoCd = {
  id: "excel_mt_legado_5cd",
  quantidadePosicoes: 5,
  camposPorCd: ["estoque"],
  formatoCabecalho: "logico",
  usarCodigoFisico: false,
  incluirPosicaoLogica: false,
  regional: "MT",
  bandeira: "Comper MT",
  ativo: true,
};

export const PERFIL_EXPORT_REGIONAL_8CD: MotorPerfilExportacaoCd = {
  id: "regional_8cd",
  quantidadePosicoes: 8,
  camposPorCd: ["estoque", "pendencia", "diasCompra", "diasRecebimento"],
  formatoCabecalho: "logico",
  usarCodigoFisico: false,
  incluirPosicaoLogica: true,
  ativo: true,
};

export const PERFIL_EXPORT_BASE_CENTRAL: MotorPerfilExportacaoCd = {
  id: "base_central",
  quantidadePosicoes: "auto",
  camposPorCd: ["estoque", "pendencia", "statusCompra", "diasCompra", "diasRecebimento"],
  formatoCabecalho: "logico",
  usarCodigoFisico: false,
  incluirPosicaoLogica: false,
  ativo: true,
};

export const PERFIL_EXPORT_AUDITORIA_COMPLETA: MotorPerfilExportacaoCd = {
  id: "auditoria_completa",
  quantidadePosicoes: "auto",
  camposPorCd: ["estoque", "pendencia", "statusCompra", "diasCompra", "diasRecebimento"],
  formatoCabecalho: "misto",
  usarCodigoFisico: true,
  incluirPosicaoLogica: true,
  ativo: true,
};

export const PERFIL_EXPORT_LAYOUT_DINAMICO: MotorPerfilExportacaoCd = {
  id: "layout_dinamico",
  quantidadePosicoes: "auto",
  camposPorCd: ["estoque", "pendencia", "statusCompra", "diasCompra", "diasRecebimento"],
  formatoCabecalho: "logico",
  usarCodigoFisico: false,
  incluirPosicaoLogica: false,
  ativo: true,
};

const PERFIS: Record<string, MotorPerfilExportacaoCd> = {
  [PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD.id]: PERFIL_EXPORT_EXCEL_MT_LEGADO_5CD,
  [PERFIL_EXPORT_REGIONAL_8CD.id]: PERFIL_EXPORT_REGIONAL_8CD,
  [PERFIL_EXPORT_BASE_CENTRAL.id]: PERFIL_EXPORT_BASE_CENTRAL,
  [PERFIL_EXPORT_AUDITORIA_COMPLETA.id]: PERFIL_EXPORT_AUDITORIA_COMPLETA,
  [PERFIL_EXPORT_LAYOUT_DINAMICO.id]: PERFIL_EXPORT_LAYOUT_DINAMICO,
};

export function obterPerfilExportacaoCd(id: string): MotorPerfilExportacaoCd {
  const p = PERFIS[id];
  if (!p) throw new Error(`Perfil exportação CD não encontrado: ${id}`);
  return p;
}

export const PREFIXOS_EXPORT: Record<MotorCdCampoExportacao, string> = {
  estoque: "ESTQ",
  pendencia: "PENDCD",
  statusCompra: "STATUS_COMPRA",
  diasCompra: "DIAS_DA_COMPRA",
  diasRecebimento: "DIAS_RECEBTO",
};
