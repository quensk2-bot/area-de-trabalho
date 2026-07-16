import type { MotorRegional } from "../workflow/motorWorkflowTypes.ts";

export const MOTOR_STANDARDIZE_TIPOS = [
  "validacao_ruptura",
  "ordem_cds",
  "compradores",
  "regras",
  "estrutura_fake",
] as const;

export type MotorStandardizeTipo = (typeof MOTOR_STANDARDIZE_TIPOS)[number];

export type MotorStandardizeValidacaoStatus =
  | "preliminar_aguardando_arquivo_real"
  | "validado_fixture"
  | "validado_producao";

export type MotorStandardizeColunaContrato = {
  nome: string;
  tipo: "text" | "int" | "decimal" | "date";
  obrigatoria: boolean;
  aliases?: string[];
};

export type MotorStandardizeAbaContrato = {
  nomeOficial: string;
  nomesOrigem: string[];
  colunas: MotorStandardizeColunaContrato[];
  chaveDedup: string[];
  cabecalhoEstrategia: "linha_1" | "scan";
  opcional?: boolean;
};

export type MotorStandardizeContrato = {
  tipo: MotorStandardizeTipo;
  nomeArquivoPadrao: string;
  abas: MotorStandardizeAbaContrato[];
  statusValidacao: MotorStandardizeValidacaoStatus;
  descricao: string;
};

export type MotorStandardizeEntrada = {
  caminho: string;
  tipo: MotorStandardizeTipo;
  regional: MotorRegional;
  dataReferencia: string;
  outputDir: string;
  dryRun: boolean;
  gerarReport: boolean;
};

export type MotorStandardizeSheetInspecao = {
  nome: string;
  visivel: boolean;
  oculta: boolean;
  linhaCabecalho: number;
  cabecalhosEncontrados: string[];
  linhasDados: number;
  formulasEncontradas: number;
  celulasMescladas: number;
  colunasOcultas: number;
  linhasVazias: number;
  colunasVazias: number;
};

export type MotorStandardizeInspecao = {
  caminho: string;
  formato: "xlsx" | "xls" | "csv";
  tamanhoBytes: number;
  abas: MotorStandardizeSheetInspecao[];
};

export type MotorStandardizeLinhaRejeitada = {
  aba: string;
  numeroLinha: number;
  motivo: string;
};

export type MotorStandardizeAbaResultado = {
  nomeOficial: string;
  abaOrigem: string | null;
  linhasLidas: number;
  linhasValidas: number;
  linhasRejeitadas: MotorStandardizeLinhaRejeitada[];
  duplicidadesRemovidas: number;
  cabecalhosNormalizados: Record<string, string>;
};

export type MotorStandardizeReport = {
  arquivo: string;
  regional: MotorRegional;
  dataReferencia: string;
  tipo: MotorStandardizeTipo;
  hashSha256: string;
  chaveIdempotencia: string;
  abasEncontradas: string[];
  abasUsadas: string[];
  abasIgnoradas: string[];
  formulasRemovidas: number;
  celulasMescladasEncontradas: number;
  colunasOcultasEncontradas: number;
  linhasVaziasRemovidas: number;
  colunasVaziasRemovidas: number;
  linhasLidas: number;
  linhasValidas: number;
  linhasRejeitadas: number;
  duplicidadesRemovidas: number;
  cabecalhosNormalizados: Record<string, string>;
  abas: MotorStandardizeAbaResultado[];
  avisos: string[];
  erros: string[];
  statusFinal: "sucesso" | "sucesso_com_alertas" | "erro" | "dry_run";
  statusContrato: MotorStandardizeValidacaoStatus;
  arquivoPadraoGerado: string | null;
  caminhoDriveConceitual: string;
  dryRun: boolean;
};

export type MotorStandardizeResultado = {
  report: MotorStandardizeReport;
  sucesso: boolean;
};

export function isMotorStandardizeTipo(value: string): value is MotorStandardizeTipo {
  return (MOTOR_STANDARDIZE_TIPOS as readonly string[]).includes(value);
}
