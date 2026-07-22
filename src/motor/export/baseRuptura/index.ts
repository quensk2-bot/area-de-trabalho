export {
  COLUNAS_BASE_RUPTURA_V7,
  CABECALHOS_BASE_RUPTURA,
  CABECALHOS_OFICIAL_CONFERENCIA,
  CAMPOS_AUSENTES_V7,
  COLUNAS_MAPEAVEIS_BASE,
  type BaseRupturaColunaDef,
} from "./baseRupturaColumns.ts";

export {
  formatBandeiraExport,
  formatBandeiraExportCompativel,
  formatBandeiraExportModo,
  formatFlagRuptura104c,
  formatMenorQueTres,
  formatRuptura104cTexto,
  formatTextoProduto,
  type ModoBandeiraExport,
} from "./rupturaExportFormat.ts";

export {
  mapearBaseRuptura,
  validarBaseRuptura,
  gerarResumoProcessamento,
  montarErrosValidacaoExport,
  slugBandeiraArquivo,
  nomeArquivoBaseRuptura,
  type BaseRupturaLinha,
  type BaseRupturaMapeamentoResultado,
  type ResumoProcessamentoBase,
  type ErroValidacaoExport,
} from "./baseRupturaTypes.ts";

export { gerarBaseRupturaXlsx, gerarBaseRupturaCsv, type GerarBaseRupturaXlsxResultado } from "./gerarBaseRupturaXlsx.ts";
