export type TipoArquivoMotor =
  | "grupo_ruptura_1"
  | "grupo_ruptura_2"
  | "inventario_lojas"
  | "plan_6_cd"
  | "rede"
  | "validacao_ruptura"
  | "ordem_cds"
  | "compradores"
  | "regras_definidas"
  | "estrutura_fake"
  | "bandeira";

export type CategoriaTamanhoDrive = "pequeno" | "medio" | "grande";

export type StatusArquivoPacote =
  | "reconhecido"
  | "faltante"
  | "duplicado"
  | "invalido"
  | "desconhecido"
  | "vazio";

export type StatusReconhecimento = StatusArquivoPacote | "duplicado_tipo" | "formato_invalido";

export type EntradaCatalogoMotor = {
  tipoArquivo: TipoArquivoMotor;
  tituloExibicao: string;
  descricaoAutoexplicativa: string;
  obrigatorio: boolean;
  formatosPermitidos: string[];
  padroesNome: RegExp[];
  parserDestino: string;
  motorEtapa: string;
  precisaPadronizacao: boolean;
  tamanhoMaximoBytes: number;
  permiteMaisDeUm: boolean;
  ordemProcessamento: number;
  categoriaTamanhoEsperada: CategoriaTamanhoDrive;
  rotulos: string[];
};

export const VERSAO_MOTOR_PADRAO = "V7";
export const VERSAO_CATALOGO_MT = "MT-v1";

export const CATALOGO_ARQUIVOS_MOTOR_MT: readonly EntradaCatalogoMotor[] = [
  {
    tipoArquivo: "grupo_ruptura_1",
    tituloExibicao: "1º Grupo de Ruptura",
    descricaoAutoexplicativa: "Arquivo TXT principal do 1º grupo de ruptura da regional.",
    obrigatorio: true,
    formatosPermitidos: [".txt"],
    padroesNome: [/1\s*º?\s*grupo\s*de\s*ruptura/i, /grupo\s*ruptura\s*1/i],
    parserDestino: "parseGrupoRuptura1",
    motorEtapa: "parse",
    precisaPadronizacao: false,
    tamanhoMaximoBytes: 120 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 1,
    categoriaTamanhoEsperada: "grande",
    rotulos: ["1º Grupo de Ruptura"],
  },
  {
    tipoArquivo: "grupo_ruptura_2",
    tituloExibicao: "2º Grupo de Ruptura",
    descricaoAutoexplicativa: "Arquivo TXT do 2º grupo de ruptura ou CDs.",
    obrigatorio: true,
    formatosPermitidos: [".txt"],
    padroesNome: [/2\s*º?\s*grupo\s*de\s*ruptura/i, /grupo\s*ruptura\s*2/i, /2\s*º?\s*grupo\s*de\s*cds/i],
    parserDestino: "parseGrupoRuptura2",
    motorEtapa: "parse",
    precisaPadronizacao: false,
    tamanhoMaximoBytes: 120 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 2,
    categoriaTamanhoEsperada: "grande",
    rotulos: ["2º Grupo de Ruptura", "2º Grupo de CDs"],
  },
  {
    tipoArquivo: "inventario_lojas",
    tituloExibicao: "Inventário Lojas",
    descricaoAutoexplicativa: "Inventário consolidado das lojas da regional.",
    obrigatorio: true,
    formatosPermitidos: [".txt"],
    padroesNome: [/invent[aá]rio\s*lojas?/i],
    parserDestino: "parseInventarioLojas",
    motorEtapa: "parse",
    precisaPadronizacao: false,
    tamanhoMaximoBytes: 80 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 3,
    categoriaTamanhoEsperada: "medio",
    rotulos: ["Inventário Lojas"],
  },
  {
    tipoArquivo: "plan_6_cd",
    tituloExibicao: "Plan 6 CD",
    descricaoAutoexplicativa: "Plano operacional dos CDs (Plan 6).",
    obrigatorio: true,
    formatosPermitidos: [".txt"],
    padroesNome: [/plan\s*6\s*cd/i],
    parserDestino: "parsePlan6Cd",
    motorEtapa: "parse",
    precisaPadronizacao: false,
    tamanhoMaximoBytes: 40 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 4,
    categoriaTamanhoEsperada: "medio",
    rotulos: ["Plan 6 CD"],
  },
  {
    tipoArquivo: "rede",
    tituloExibicao: "Rede",
    descricaoAutoexplicativa: "Arquivo de rede da regional.",
    obrigatorio: true,
    formatosPermitidos: [".txt"],
    padroesNome: [/^rede$/i, /rede\.txt$/i, /\brede\b/i],
    parserDestino: "parseRede",
    motorEtapa: "parse",
    precisaPadronizacao: false,
    tamanhoMaximoBytes: 20 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 5,
    categoriaTamanhoEsperada: "medio",
    rotulos: ["Rede"],
  },
  {
    tipoArquivo: "validacao_ruptura",
    tituloExibicao: "Validação Ruptura",
    descricaoAutoexplicativa: "Planilha de validação da ruptura.",
    obrigatorio: true,
    formatosPermitidos: [".xlsx", ".xls"],
    padroesNome: [/valida[cç][aã]o\s*ruptura/i],
    parserDestino: "parseValidacaoRuptura",
    motorEtapa: "padronizar",
    precisaPadronizacao: true,
    tamanhoMaximoBytes: 30 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 6,
    categoriaTamanhoEsperada: "medio",
    rotulos: ["Validação Ruptura"],
  },
  {
    tipoArquivo: "ordem_cds",
    tituloExibicao: "Ordem CDs",
    descricaoAutoexplicativa: "Ordem operacional dos CDs.",
    obrigatorio: true,
    formatosPermitidos: [".xlsx", ".xls"],
    padroesNome: [/ordem\s*cd/i, /ordem\s*cd[`´'’]?s/i],
    parserDestino: "parseOrdemCds",
    motorEtapa: "padronizar",
    precisaPadronizacao: true,
    tamanhoMaximoBytes: 10 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 7,
    categoriaTamanhoEsperada: "pequeno",
    rotulos: ["Ordem CDs", "Ordem CD´s"],
  },
  {
    tipoArquivo: "compradores",
    tituloExibicao: "Compradores",
    descricaoAutoexplicativa: "Planilha de compradores da regional.",
    obrigatorio: true,
    formatosPermitidos: [".xlsx", ".xls"],
    padroesNome: [/compradores?(\s*da\s*regional)?/i],
    parserDestino: "parseCompradores",
    motorEtapa: "padronizar",
    precisaPadronizacao: true,
    tamanhoMaximoBytes: 10 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 8,
    categoriaTamanhoEsperada: "pequeno",
    rotulos: ["Compradores", "Compradores da regional"],
  },
  {
    tipoArquivo: "regras_definidas",
    tituloExibicao: "Regras definidas",
    descricaoAutoexplicativa: "Regras operacionais definidas para a regional.",
    obrigatorio: true,
    formatosPermitidos: [".xlsx", ".xls"],
    padroesNome: [/regras?\s*(definidas?)?/i],
    parserDestino: "parseRegras",
    motorEtapa: "padronizar",
    precisaPadronizacao: true,
    tamanhoMaximoBytes: 10 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 9,
    categoriaTamanhoEsperada: "pequeno",
    rotulos: ["Regras definidas", "Regras"],
  },
  {
    tipoArquivo: "estrutura_fake",
    tituloExibicao: "Estrutura Fake",
    descricaoAutoexplicativa: "Estrutura auxiliar para validações do motor.",
    obrigatorio: true,
    formatosPermitidos: [".xlsx", ".xls"],
    padroesNome: [/estrutura\s*fake/i],
    parserDestino: "parseEstruturaFake",
    motorEtapa: "padronizar",
    precisaPadronizacao: true,
    tamanhoMaximoBytes: 10 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 10,
    categoriaTamanhoEsperada: "pequeno",
    rotulos: ["Estrutura Fake"],
  },
  {
    tipoArquivo: "bandeira",
    tituloExibicao: "Bandeira",
    descricaoAutoexplicativa: "CSV de bandeiras utilizado pelo motor.",
    obrigatorio: true,
    formatosPermitidos: [".csv"],
    padroesNome: [/bandeira/i],
    parserDestino: "parseBandeira",
    motorEtapa: "parse",
    precisaPadronizacao: false,
    tamanhoMaximoBytes: 5 * 1024 * 1024,
    permiteMaisDeUm: false,
    ordemProcessamento: 11,
    categoriaTamanhoEsperada: "pequeno",
    rotulos: ["bandeira.csv"],
  },
];

export function segmentosPastaMotorOriginais(regional: string, ano: number, mes: number): string[] {
  return ["V7", "Motor Operacional", regional.toUpperCase(), String(ano), String(mes).padStart(2, "0"), "originais"];
}
