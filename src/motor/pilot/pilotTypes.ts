import type { CompareResult } from "../compare/compareTypes.ts";
import type { MotorConsolidacaoResultado } from "../consolidar/consolidacaoTypes.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";

export type PilotDivergenciaCategoria =
  | "parser"
  | "transformacao"
  | "join"
  | "catalogo"
  | "bre"
  | "centralizacao"
  | "excel_intermediario_vs_final"
  | "dado_ausente"
  | "regra_m_ambigua"
  | "diferenca_decimal_permitida"
  | "erro_arquivo_original";

export type PilotDivergenciaSeveridade = "critica" | "tolerada" | "informativa";

export type PilotDivergencia = {
  loja: number;
  produto: number;
  campo: string;
  esperadoExcel: string | number | boolean | null;
  encontradoV7: string | number | boolean | null;
  categoria: PilotDivergenciaCategoria;
  regraMRelacionada: string | null;
  severidade: PilotDivergenciaSeveridade;
  observacao: string;
};

export type PilotMemoriaAprox = {
  heapUsedMbPicoAprox: number;
  rssMbPicoAprox: number;
  externalMbPicoAprox: number;
  nota: string;
};

export type PilotEtapaMetricas = {
  etapa: string;
  duracaoMs: number;
  linhasLidas?: number;
  linhasRetidas?: number;
  bytesLidos?: number;
  produtosUnicos?: number;
};

export type PilotMetricas = {
  regional: string;
  loja: number;
  dataReferencia: string;
  bytesLidosPorArquivo: Record<string, number>;
  linhasLidasPorArquivo: Record<string, number>;
  linhasLoja: number;
  produtosUnicos: number;
  duplicidades: number;
  cp: number;
  mp: number;
  lp: number;
  semRuptura: number;
  linhasInvalidas: number;
  qualidadeCompleta: number;
  qualidadeComAlertas: number;
  qualidadeIncompleta: number;
  qualidadeInvalida: number;
  alertas: number;
  erros: number;
  etapas: PilotEtapaMetricas[];
  duracaoTotalMs: number;
  memoria: PilotMemoriaAprox;
  totalDivergencias: number;
  divergenciasCriticas: number;
  divergenciasToleradas: number;
  motivoEncerramento: string;
};

export type PilotEstratoInfo = {
  id: string;
  descricao: string;
  encontrado: boolean;
  quantidade: number;
};

export type PilotOpcoes = {
  regional: string;
  loja: number;
  dataReferencia: string;
  sampleSize: number;
  outputDir: string;
  modoCompleto: boolean;
};

export type PilotExcelFonte = {
  arquivo: string;
  aba: string;
  consulta: string;
  dataExportacao: string | null;
  loja: number;
  linhasLoja: number;
  camposPresentes: string[];
};

export type PilotResultado = {
  opcoes: PilotOpcoes;
  fontes: Record<string, string>;
  excelFonte: PilotExcelFonte;
  consolidado: MotorConsolidacaoResultado;
  amostra: MotorProdutoLojaConsolidado[];
  estratos: PilotEstratoInfo[];
  comparacao: CompareResult;
  divergencias: PilotDivergencia[];
  metricas: PilotMetricas;
  aprovado: boolean;
  bloqueioMotivo: string | null;
};
