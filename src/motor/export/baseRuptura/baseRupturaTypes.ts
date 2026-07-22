import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { DmValidacaoItem } from "../../datamart/dmTypes.ts";
import { CABECALHOS_BASE_RUPTURA, COLUNAS_BASE_RUPTURA_V7 } from "./baseRupturaColumns.ts";
import {
  formatBandeiraExportModo,
  formatFlagRuptura104c,
  formatMenorQueTres,
  formatRuptura104cTexto,
  formatTextoProduto,
} from "./rupturaExportFormat.ts";

export type BaseRupturaLinha = Record<string, string | number | boolean | null>;

export type BaseRupturaMapeamentoResultado = {
  linhas: BaseRupturaLinha[];
  camposAusentes: string[];
  avisos: DmValidacaoItem[];
};

function valorConsolidado(
  item: MotorProdutoLojaConsolidado,
  fonte: string,
): string | number | boolean | null {
  const rec = item as unknown as Record<string, unknown>;
  const v = rec[fonte];
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean" || typeof v === "number" || typeof v === "string") return v;
  return null;
}

function estoqueCdConsolidado(item: MotorProdutoLojaConsolidado, pos: 1 | 2 | 3 | 4 | 5): number | null {
  if ((item.cds?.length ?? 0) > 0) {
    const cd = item.cds.find((c) => c.posicaoLogica === pos);
    const estoque = cd?.estoque;
    return estoque === undefined || estoque === null ? null : estoque;
  }
  const flat = item[`estoqueCd${pos}` as keyof MotorProdutoLojaConsolidado];
  return flat === undefined || flat === null ? null : (flat as number);
}

function formatarCelula(
  cabecalho: string,
  fonte: string | undefined,
  item: MotorProdutoLojaConsolidado,
  regional: string,
  modoUniverso: "integral" | "oficial_compativel",
): string | number | boolean | null {
  if (!fonte) return null;

  if (fonte.startsWith("estoqueCd")) {
    const pos = Number(fonte.replace("estoqueCd", "")) as 1 | 2 | 3 | 4 | 5;
    return estoqueCdConsolidado(item, pos);
  }

  switch (fonte) {
    case "fornecedor":
      return item.fornecedor;
    case "setorNome":
      return item.setorNome ?? item.divisao;
    case "ruptura104cTexto":
      return formatRuptura104cTexto(item.ruptura104c);
    case "flagRuptura104c":
      return formatFlagRuptura104c(item.geraRuptura);
    case "menorQueTres":
      return formatMenorQueTres(item.ruptura104c);
    case "textoProduto":
      return formatTextoProduto(item.descricao, item.seqproduto);
    case "bandeiraExport":
      return formatBandeiraExportModo(
        regional,
        item.bandeira,
        modoUniverso === "oficial_compativel" ? "oficial_compativel" : "v7_integral",
      );
    case "curtoPrazo":
      return item.curtoPrazo;
    case "medioPrazo":
      return item.medioPrazo;
    case "longoPrazo":
      return item.longoPrazo;
    case "acaoCurtoPrazo":
      return item.acaoCurtoPrazo;
    case "acaoMedioPrazo":
      return item.acaoMedioPrazo;
    default:
      return valorConsolidado(item, fonte) as string | number | boolean | null;
  }
}

/** Mapeia consolidado → linhas BASE sem recalcular BRE. */
export function mapearBaseRuptura(
  consolidado: readonly MotorProdutoLojaConsolidado[],
  input?: {
    regional?: string;
    modoUniverso?: "integral" | "oficial_compativel";
  },
): BaseRupturaMapeamentoResultado {
  const regional = input?.regional ?? "MT";
  const modoUniverso = input?.modoUniverso ?? "integral";
  const camposAusentes = COLUNAS_BASE_RUPTURA_V7.filter((c) => c.ausenteV7).map((c) => c.cabecalho);
  const linhas: BaseRupturaLinha[] = [];

  for (const item of consolidado) {
    const row: BaseRupturaLinha = {};
    for (const col of COLUNAS_BASE_RUPTURA_V7) {
      row[col.cabecalho] = col.ausenteV7 ? null : formatarCelula(col.cabecalho, col.fonte, item, regional, modoUniverso);
    }
    linhas.push(row);
  }

  return { linhas, camposAusentes, avisos: [] };
}

export function validarBaseRuptura(linhas: BaseRupturaLinha[]): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];
  if (linhas.length === 0) erros.push("BASE vazia");

  const primeira = linhas[0];
  if (primeira) {
    for (const h of CABECALHOS_BASE_RUPTURA) {
      if (!(h in primeira)) erros.push(`Coluna ausente no mapeamento: ${h}`);
    }
  }

  return { valido: erros.length === 0, erros };
}

export type ResumoProcessamentoBase = {
  regional: string;
  bandeira: string;
  competencia: string;
  dataReferencia: string;
  pacoteId: string;
  execucaoMotorId: string | null;
  versao: number | null;
  hashMetadados: string | null;
  hashConteudo: string | null;
  arquivosEncontrados: number;
  produtosProcessados: number;
  cdsProcessados: number;
  quantidadeLinhasBase: number;
  inicio: string;
  fim: string;
  duracaoMs: number;
  status: string;
  avisos: string[];
  erros: string[];
  camposAusentes: string[];
  modoUniverso?: "integral" | "oficial_compativel";
  linhasUniversoIntegral?: number | null;
  linhasUniversoOficial?: number | null;
};

export function rotuloModoUniversoExport(modo?: "integral" | "oficial_compativel"): string {
  if (modo === "oficial_compativel") return "OFICIAL_COMPATIVEL";
  if (modo === "integral") return "V7_INTEGRAL";
  return "V7_INTEGRAL";
}

export function gerarResumoProcessamento(input: ResumoProcessamentoBase): Record<string, string | number | null>[] {
  const campos: Array<[string, string | number | null]> = [
    ["regional", input.regional],
    ["bandeira", input.bandeira],
    ["competencia", input.competencia],
    ["data_referencia", input.dataReferencia],
    ["modo_universo", rotuloModoUniversoExport(input.modoUniverso)],
    ["linhas_universo_integral", input.linhasUniversoIntegral ?? input.quantidadeLinhasBase],
    ["linhas_universo_oficial", input.linhasUniversoOficial ?? null],
    ["pacote_id", input.pacoteId],
    ["execucao_motor_id", input.execucaoMotorId],
    ["versao", input.versao],
    ["hash_metadados", input.hashMetadados],
    ["hash_conteudo", input.hashConteudo],
    ["arquivos_encontrados", input.arquivosEncontrados],
    ["produtos_processados", input.produtosProcessados],
    ["cds_processados", input.cdsProcessados],
    ["quantidade_linhas_base", input.quantidadeLinhasBase],
    ["inicio", input.inicio],
    ["fim", input.fim],
    ["duracao_ms", input.duracaoMs],
    ["status", input.status],
    ["avisos", input.avisos.join("; ") || null],
    ["erros", input.erros.join("; ") || null],
    ["campos_ausentes_v7", input.camposAusentes.join("; ") || null],
  ];
  return campos.map(([campo, valor]) => ({ campo, valor }));
}

export type ErroValidacaoExport = {
  etapa: string;
  arquivo: string | null;
  linha: number | null;
  produto: number | null;
  codigo: string | null;
  severidade: "aviso" | "erro";
  mensagem: string;
  acaoRecomendada: string | null;
};

export function montarErrosValidacaoExport(
  itens: Array<{
    etapa?: string;
    arquivo?: string;
    linha?: number;
    produto?: number;
    codigo?: string;
    severidade?: "aviso" | "erro";
    mensagem: string;
    acao?: string;
  }>,
): ErroValidacaoExport[] {
  return itens.map((i) => ({
    etapa: i.etapa ?? "validacao",
    arquivo: i.arquivo ?? null,
    linha: i.linha ?? null,
    produto: i.produto ?? null,
    codigo: i.codigo ?? null,
    severidade: i.severidade ?? "erro",
    mensagem: i.mensagem,
    acaoRecomendada: i.acao ?? null,
  }));
}

export function slugBandeiraArquivo(bandeira: string | null | undefined): string {
  if (!bandeira) return "REGIONAL";
  return bandeira
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export function nomeArquivoBaseRuptura(input: {
  regional: string;
  bandeira: string | null;
  dataReferencia: string;
  extensao: "xlsx" | "csv";
  sufixo?: string;
  modoUniverso?: "integral" | "oficial_compativel";
}): string {
  const data = input.dataReferencia.slice(0, 10);
  const band = slugBandeiraArquivo(input.bandeira);
  const modo =
    input.modoUniverso === "oficial_compativel"
      ? "OFICIAL_COMPATIVEL"
      : input.modoUniverso === "integral"
        ? "V7_INTEGRAL"
        : "";
  const partes = ["BASE_RUPTURA_V7", input.regional, band, modo, input.sufixo, data].filter(Boolean);
  return `${partes.join("_")}.${input.extensao}`;
}
