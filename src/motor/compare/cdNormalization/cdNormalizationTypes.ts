export type MotorCdPosicaoLogica = "CD1" | "CD2" | "CD3" | "CD4" | "CD5";

export const MOTOR_CD_POSICOES: MotorCdPosicaoLogica[] = ["CD1", "CD2", "CD3", "CD4", "CD5"];

export type MotorCdOrigem = "ordem_cds_importada" | "cadastro_manual";

export type MotorCdVigenciaStatus = "nao_disponivel" | "vigente" | "ausente";

export type MotorCdMapeamento = {
  posicaoLogica: MotorCdPosicaoLogica;
  posicaoNumerica: number;
  codigoFisico: number;
  ordemPivot: string | null;
};

export type MotorCdConfiguracaoVigente = {
  regional: string;
  bandeira: string;
  dataReferencia: string;
  origem: MotorCdOrigem;
  vigenciaStatus: MotorCdVigenciaStatus;
  alertas: string[];
  mapeamentos: MotorCdMapeamento[];
  /** Posições ordenadas — fonte dinâmica (sem teto). */
  posicoes: Array<{ posicaoLogica: number; codigoFisico: number | null }>;
  porPosicaoNumerico: ReadonlyMap<number, number | null>;
  porCodigoNumerico: ReadonlyMap<number, number>;
  porPosicao: Record<MotorCdPosicaoLogica, number | null>;
  porCodigo: ReadonlyMap<number, MotorCdPosicaoLogica>;
};

export type MotorCdComparacaoEstado =
  | "igual_exato"
  | "igual_semantico"
  | "divergente_codigo"
  | "divergente_posicao"
  | "divergente_valor"
  | "divergente_texto"
  | "posicao_ausente_excel"
  | "posicao_ausente_v7"
  | "codigo_fisico_ausente"
  | "coluna_nao_reconhecida"
  | "cadastro_ausente"
  | "vigencia_ausente"
  | "nao_comparavel";

export type MotorCdTextoNormalizado = {
  posicaoLogica?: MotorCdPosicaoLogica | null;
  codigoFisico?: number | null;
  codigosFisicos: number[];
  posicoesLogicas: MotorCdPosicaoLogica[];
  textoBase?: string | null;
  naoCentralizado: boolean;
  rupturaCd: boolean;
  ativoNoCd: boolean;
  inativos: { posicao: MotorCdPosicaoLogica; codigo: number }[];
};

export type MotorV7CdContexto = {
  posicaoCdSelecionada: MotorCdPosicaoLogica | null;
  codigoCdSelecionado: number | null;
  flags: Record<MotorCdPosicaoLogica, number | null>;
  codigosFisicos: Record<MotorCdPosicaoLogica, number | null>;
  textoProdutoCentralizado: string | null;
  statusEstoqueCds: string | null;
  statusSolicitacaoAtivacaoCd: string | null;
};

export type MotorComparacaoCdResultado = {
  campo: string;
  estado: MotorCdComparacaoEstado;
  valorExcel: string | null;
  valorV7: string | null;
  excelNormalizado?: MotorCdTextoNormalizado;
  v7Normalizado?: MotorCdTextoNormalizado;
  alertas: string[];
};

export type MotorParidadeChavesResultado = {
  regional: string;
  loja: number;
  dataReferencia: string;
  excelDataExport: string | null;
  v7Total: number;
  excelTotal: number;
  intersecao: number;
  somenteV7: number;
  somenteExcel: number;
  chavesIntersecao: string[];
  chavesSomenteV7: string[];
  chavesSomenteExcel: string[];
  alertas: string[];
};

export type MotorDivergenciaClassificacao =
  | "igual_exato"
  | "igual_semantico"
  | "dado_ausente_excel"
  | "dado_ausente_v7"
  | "coluna_excel_intermediaria"
  | "formato"
  | "texto_fisico_vs_logico"
  | "cadastro_cd_ausente"
  | "vigencia_cd_ausente"
  | "transformacao"
  | "join"
  | "bre"
  | "centralizacao"
  | "comprador"
  | "erro_real"
  | "nao_comparavel";

export type MotorDivergenciaReclassificada = {
  loja: number;
  seqproduto: number;
  descricao: string | null;
  fornecedor: string | null;
  campo: string;
  valorExcel: string | number | boolean | null;
  valorV7: string | number | boolean | null;
  classificacao: MotorDivergenciaClassificacao;
  severidade: "critica" | "informativa" | "tolerada";
  estadoCd?: MotorCdComparacaoEstado;
  observacao: string;
};

export type MotorDivergenciaRealDetalhe = MotorDivergenciaReclassificada & {
  regraM: string | null;
  etapaPowerQuery: string | null;
  fonteUtilizada: string | null;
  categoriaInvestigacao: "bre" | "join" | "comprador" | "transformacao" | "centralizacao";
  hipotese: string;
  conclusao: string;
  correcaoNecessaria: string;
  correcaoEm: "v7" | "excel" | "fonte" | "nenhuma" | "pendente";
  statusInvestigacao:
    | "resolvida"
    | "regra_confirmada"
    | "erro_v7"
    | "erro_excel"
    | "dado_divergente"
    | "pendente";
};
