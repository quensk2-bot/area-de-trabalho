import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { DmValidacaoItem } from "../../datamart/dmTypes.ts";
import { CABECALHOS_BASE_RUPTURA, COLUNAS_BASE_RUPTURA_V7 } from "./baseRupturaColumns.ts";

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

function formatarCelula(
  cabecalho: string,
  fonte: string | undefined,
  item: MotorProdutoLojaConsolidado,
): string | number | boolean | null {
  if (!fonte) return null;
  const bruto = valorConsolidado(item, fonte);

  if (cabecalho === "Flag Ruptura 104c" || cabecalho === "Menor que três Unidades") {
    if (bruto === true || bruto === 1) return 1;
    if (bruto === false || bruto === 0) return 0;
    return bruto as number | null;
  }

  if (cabecalho === "Ruptura 104C") {
    if (bruto === true) return 1;
    if (bruto === false) return 0;
    return bruto as number | null;
  }

  return bruto as string | number | boolean | null;
}

/** Mapeia consolidado → linhas BASE sem recalcular BRE. */
export function mapearBaseRuptura(
  consolidado: readonly MotorProdutoLojaConsolidado[],
): BaseRupturaMapeamentoResultado {
  const camposAusentes = COLUNAS_BASE_RUPTURA_V7.filter((c) => c.ausenteV7).map((c) => c.cabecalho);
  const linhas: BaseRupturaLinha[] = [];

  for (const item of consolidado) {
    const row: BaseRupturaLinha = {};
    for (const col of COLUNAS_BASE_RUPTURA_V7) {
      row[col.cabecalho] = col.ausenteV7 ? null : formatarCelula(col.cabecalho, col.fonte, item);
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
};

export function gerarResumoProcessamento(input: ResumoProcessamentoBase): Record<string, string | number | null>[] {
  const campos: Array<[string, string | number | null]> = [
    ["regional", input.regional],
    ["bandeira", input.bandeira],
    ["competencia", input.competencia],
    ["data_referencia", input.dataReferencia],
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
}): string {
  const data = input.dataReferencia.slice(0, 10);
  const band = slugBandeiraArquivo(input.bandeira);
  return `BASE_RUPTURA_V7_${input.regional}_${band}_${data}.${input.extensao}`;
}
