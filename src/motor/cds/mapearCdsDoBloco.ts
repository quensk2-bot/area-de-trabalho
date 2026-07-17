import { PREFIXOS_COLUNA_CD, type MapearBlocoCdsOpcoes, type MotorBlocoCdsEntrada } from "./blocoCdsTypes.ts";
import { calcularPosicaoLogica, type MotorProdutoCdNormalizado } from "./cdTypes.ts";

export type ValoresCdParseados = {
  estoque: number | null;
  pendencia: number | null;
  statusCompra: string | null;
  diasCompra: number | null;
  diasRecebimento: number | null;
  ultimaCompra: Date | null;
  ultimaEntrada: Date | null;
  estoqueSelecionadoInventario: number | null;
};

export type PosicaoCdNoBloco = {
  posicaoNoArquivo: number;
  valores: ValoresCdParseados;
  codigoFisico?: number | null;
};

const SUFIXO_REGEX = /^(\d+)$/;

export function detectarPosicoesCdNoCabecalho(cabecalhos: readonly string[], prefixo: string): number[] {
  const posicoes: number[] = [];
  for (const col of cabecalhos) {
    if (!col.startsWith(prefixo)) continue;
    const sufixo = col.slice(prefixo.length);
    const match = SUFIXO_REGEX.exec(sufixo);
    if (match) posicoes.push(Number(match[1]));
  }
  return [...new Set(posicoes)].sort((a, b) => a - b);
}

export function detectarTodasPosicoesCdNoCabecalho(cabecalhos: readonly string[]): number[] {
  return detectarPosicoesCdNoCabecalho(cabecalhos, PREFIXOS_COLUNA_CD.estoque);
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function parseNumeroBr(value: string | null): number | null {
  if (value == null) return null;
  const t = value.trim();
  if (t === "") return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDataBr(value: string | null): Date | null {
  if (value == null) return null;
  const t = value.trim();
  if (t === "") return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = Date.parse(t);
  return Number.isNaN(iso) ? null : new Date(iso);
}

function valoresCdVazios(v: ValoresCdParseados): boolean {
  return (
    v.estoque == null &&
    v.pendencia == null &&
    v.statusCompra == null &&
    v.diasCompra == null &&
    v.diasRecebimento == null &&
    v.ultimaCompra == null &&
    v.ultimaEntrada == null &&
    v.estoqueSelecionadoInventario == null
  );
}

function posicaoTemConteudoReal(v: ValoresCdParseados): boolean {
  if (v.statusCompra != null) return true;
  if (v.diasCompra != null) return true;
  if (v.diasRecebimento != null) return true;
  if (v.ultimaCompra != null) return true;
  if (v.estoqueSelecionadoInventario != null && v.estoqueSelecionadoInventario !== 0) return true;
  if (v.estoque != null && v.estoque !== 0) return true;
  if (v.pendencia != null && v.pendencia !== 0) return true;
  return false;
}

export function mapearCdsDoPayload(
  payload: Record<string, string>,
  bloco: MotorBlocoCdsEntrada,
  opcoes?: MapearBlocoCdsOpcoes,
): MotorProdutoCdNormalizado[] {
  const cabecalhos = Object.keys(payload);
  const posicoesArquivo = detectarTodasPosicoesCdNoCabecalho(cabecalhos);
  const posicoes: PosicaoCdNoBloco[] = posicoesArquivo.map((posicaoNoArquivo) => ({
    posicaoNoArquivo,
    valores: {
      estoque: parseNumeroBr(emptyToNull(payload[`${PREFIXOS_COLUNA_CD.estoque}${posicaoNoArquivo}`])),
      pendencia: parseNumeroBr(emptyToNull(payload[`${PREFIXOS_COLUNA_CD.pendencia}${posicaoNoArquivo}`])),
      statusCompra: emptyToNull(payload[`${PREFIXOS_COLUNA_CD.statusCompra}${posicaoNoArquivo}`]),
      diasCompra: parseNumeroBr(emptyToNull(payload[`${PREFIXOS_COLUNA_CD.diasCompra}${posicaoNoArquivo}`])),
      diasRecebimento: parseNumeroBr(emptyToNull(payload[`${PREFIXOS_COLUNA_CD.diasRecebimento}${posicaoNoArquivo}`])),
      ultimaCompra: parseDataBr(emptyToNull(payload[`${PREFIXOS_COLUNA_CD.ultimaCompra}${posicaoNoArquivo}`])),
      ultimaEntrada: parseDataBr(emptyToNull(payload[`${PREFIXOS_COLUNA_CD.ultimaEntrada}${posicaoNoArquivo}`])),
      estoqueSelecionadoInventario: parseNumeroBr(
        emptyToNull(payload[`${PREFIXOS_COLUNA_CD.estoqueSelecionadoInventario}${posicaoNoArquivo}`]),
      ),
    },
  }));

  return mapearCdsDoBloco(bloco, posicoes, opcoes);
}

export function mapearCdsDoBloco(
  bloco: MotorBlocoCdsEntrada,
  posicoes: readonly PosicaoCdNoBloco[],
  opcoes?: MapearBlocoCdsOpcoes,
): MotorProdutoCdNormalizado[] {
  const resultado: MotorProdutoCdNormalizado[] = [];
  const mtPiloto = opcoes?.mtPilotoSomentePosicao5 === true;

  for (const pos of posicoes) {
    if (mtPiloto && pos.posicaoNoArquivo !== 1) {
      continue;
    }

    if (valoresCdVazios(pos.valores) && !mtPiloto && !opcoes?.incluirPosicoesVazias) {
      continue;
    }

    if (mtPiloto && pos.posicaoNoArquivo === 1 && valoresCdVazios(pos.valores)) {
      continue;
    }

    if (mtPiloto && pos.posicaoNoArquivo > 1 && !posicaoTemConteudoReal(pos.valores)) {
      continue;
    }

    const posicaoLogica = calcularPosicaoLogica(bloco.posicaoInicial, pos.posicaoNoArquivo);

    resultado.push({
      posicaoLogica,
      codigoFisico: pos.codigoFisico ?? null,
      estoque: pos.valores.estoque,
      pendencia: pos.valores.pendencia,
      statusCompra: pos.valores.statusCompra,
      diasCompra: pos.valores.diasCompra,
      diasRecebimento: pos.valores.diasRecebimento,
      ultimaCompra: pos.valores.ultimaCompra,
      ultimaEntrada: pos.valores.ultimaEntrada,
      estoqueSelecionadoInventario: pos.valores.estoqueSelecionadoInventario,
      origemArquivo: bloco.arquivo,
      numeroBloco: bloco.numeroBloco,
      posicaoNoArquivo: pos.posicaoNoArquivo,
      alertas: [],
    });
  }

  return resultado;
}

export function criarBlocoRuptura(
  regional: string,
  dataReferencia: string,
  numeroBloco: number,
  posicaoInicial: number,
  arquivo: string,
): MotorBlocoCdsEntrada {
  return {
    arquivo,
    regional,
    dataReferencia,
    numeroBloco,
    posicaoInicial,
    quantidadePosicoes: 4,
    hash: "",
    origem: "erp_relatorio_ruptura",
  };
}

export function criarBlocoGrupo2(
  regional: string,
  dataReferencia: string,
  posicaoInicial: number,
  arquivo = "2º Grupo de Ruptura.txt",
): MotorBlocoCdsEntrada {
  return {
    arquivo,
    regional,
    dataReferencia,
    numeroBloco: 2,
    posicaoInicial,
    quantidadePosicoes: 4,
    hash: "",
    origem: "erp_relatorio_cds",
  };
}
