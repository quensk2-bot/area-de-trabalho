import {
  CABECALHOS_BASE_RUPTURA,
  CAMPOS_AUSENTES_V7,
  COLUNAS_BASE_RUPTURA_V7,
} from "../../../motor/export/baseRuptura/baseRupturaColumns.ts";
import {
  formatBandeiraExportModo,
  formatFlagRuptura104c,
  formatMenorQueTres,
  formatRuptura104cTexto,
  formatTextoProduto,
} from "../../../motor/export/baseRuptura/rupturaExportFormat.ts";
import type { BaseRupturaLinha } from "../../../motor/export/baseRuptura/baseRupturaTypes.ts";
import type { CdsLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";
import type { ClassificacaoPrazoConsumo } from "../../types/rupturaTypes.ts";

export type CdsPorProduto = Map<number, CdsLojaJson["produtos"][0]["cds"]>;

export type MapeamentoHibridoResultado = {
  linhas: BaseRupturaLinha[];
  camposAusentes: string[];
  cdsDinamicos: Record<string, string | number | null>[];
  colunasSemFonte: string[];
};

export type ModoUniversoExport = "integral" | "oficial_compativel";

type CdGestaoExport = CdsLojaJson["produtos"][0]["cds"][0];

/** Ordem física Comper MT (piloto) — fallback quando cds.codigoFisico ausente no TXT. */
const ORDEM_CD_POSICAO_COMPER_MT: Readonly<Record<number, number>> = {
  1: 464,
  2: 468,
  3: 753,
  4: 904,
  5: 905,
};

function extrairCodigosStatusEstoque(texto: string): number[] {
  return [...texto.matchAll(/\((\d+)\)/g)].map((m) => parseInt(m[1]!, 10));
}

/** Status sem códigos físicos entre parênteses — ex.: "Estoque no CD:" */
export function statusEstoqueCdsPrecisaEnriquecer(texto: string | null | undefined): boolean {
  if (texto == null || texto.trim() === "") return true;
  const t = texto.trim();
  if (t === "Ruptura CD") return false;
  if (t.startsWith("Estoque no CD:")) return extrairCodigosStatusEstoque(t).length === 0;
  return false;
}

function ordemCdPorPosicao(regional: string, bandeira: string, posicao: number): number | null {
  if (regional === "MT" && bandeira === "COMPER" && posicao >= 1 && posicao <= 5) {
    return ORDEM_CD_POSICAO_COMPER_MT[posicao] ?? null;
  }
  return null;
}

function resolverCodigoFisicoCdExport(
  cd: CdGestaoExport,
  produto: Pick<HibridoProdutoGestao, "produtoCentralizado" | "codigoCdSelecionado">,
  regional: string,
  bandeira: string,
): number | null {
  if (cd.codigoFisico != null) return cd.codigoFisico;
  const ordem = ordemCdPorPosicao(regional, bandeira, cd.posicaoLogica);
  if (ordem != null) return ordem;
  const flag = cd.flagCentralizacao;
  if (flag != null && flag > 1) return flag;
  return produto.produtoCentralizado;
}

function modoFlagLegadoCentralizado(cds: CdGestaoExport[], produtoCentralizado: number | null): boolean {
  if (produtoCentralizado == null) return false;
  const flags = cds.map((c) => c.flagCentralizacao).filter((f): f is number => f != null && f > 0);
  return flags.length > 0 && flags.every((f) => f === produtoCentralizado);
}

function cdIncluirStatusEstoqueExport(
  cd: CdGestaoExport,
  codigo: number,
  produto: Pick<HibridoProdutoGestao, "produtoCentralizado" | "codigoCdSelecionado">,
  cds: CdGestaoExport[],
): boolean {
  if (cd.estoque !== 1) return false;
  if (modoFlagLegadoCentralizado(cds, produto.produtoCentralizado)) return true;
  const flag = cd.flagCentralizacao;
  if (flag === 1) return true;
  if (flag != null && flag > 1 && flag === codigo) return true;
  if (produto.produtoCentralizado != null && codigo === produto.produtoCentralizado) return true;
  if (produto.codigoCdSelecionado != null && codigo === produto.codigoCdSelecionado) return true;
  return false;
}

/** Completa "Estoque no CD:" com códigos físicos a partir de cds.json (export-only, sem recalcular BRE). */
export function enriquecerStatusEstoqueCdsExport(
  statusEstoqueCds: string | null,
  produto: Pick<HibridoProdutoGestao, "produtoCentralizado" | "codigoCdSelecionado" | "somaEstoqueCd">,
  cds: CdGestaoExport[],
  regional = "MT",
  bandeira = "COMPER",
): string | null {
  if (!statusEstoqueCdsPrecisaEnriquecer(statusEstoqueCds)) return statusEstoqueCds;

  const soma = produto.somaEstoqueCd ?? cds.reduce((acc, cd) => acc + (cd.estoque ?? 0), 0);
  if (soma === 0) return "Ruptura CD";

  const trechos: string[] = [];
  for (const cd of [...cds].sort((a, b) => a.posicaoLogica - b.posicaoLogica)) {
    const codigo = resolverCodigoFisicoCdExport(cd, produto, regional, bandeira);
    if (codigo == null || !cdIncluirStatusEstoqueExport(cd, codigo, produto, cds)) continue;
    trechos.push(` (${codigo})`);
  }

  if (trechos.length === 0) return statusEstoqueCds?.trim() || "Estoque no CD:";
  return `Estoque no CD:${trechos.join("")}`;
}

export function inventarioUnidExport(valor: number | null | undefined): number {
  return valor ?? 0;
}

function flagPrazo(classificacao: ClassificacaoPrazoConsumo | null, alvo: ClassificacaoPrazoConsumo): number | null {
  if (classificacao == null) return null;
  return classificacao === alvo ? 1 : 0;
}

function flagPrazoOuConsolidado(
  produto: HibridoProdutoGestao,
  alvo: ClassificacaoPrazoConsumo,
  consolidado: number | null | undefined,
): number | null {
  if (consolidado != null) return consolidado;
  return flagPrazo(produto.classificacaoPrazo, alvo);
}

/** ESTQ_CD1..5 por posicaoLogica do CD (não índice do array). */
export function estoquesCdOficiais(cds: CdsLojaJson["produtos"][0]["cds"]): Record<string, number | null> {
  const out: Record<string, number | null> = {
    ESTQ_CD1: null,
    ESTQ_CD2: null,
    ESTQ_CD3: null,
    ESTQ_CD4: null,
    ESTQ_CD5: null,
  };
  for (const cd of cds) {
    const pos = cd.posicaoLogica;
    if (pos >= 1 && pos <= 5) {
      const estoque = cd.estoque;
      out[`ESTQ_CD${pos}`] = estoque === undefined || estoque === null ? null : estoque;
    }
  }
  return out;
}

export function montarCdsDinamicos(
  loja: number,
  seqproduto: number,
  cds: CdsLojaJson["produtos"][0]["cds"],
): Record<string, string | number | null>[] {
  return [...cds]
    .sort((a, b) => a.posicaoLogica - b.posicaoLogica)
    .map((cd) => ({
      LOJA: loja,
      SEQPRODUTO: seqproduto,
      POSICAO_LOGICA: cd.posicaoLogica,
      CODIGO_CD_FISICO: cd.codigoFisico,
      ESTOQUE: cd.estoque,
      PENDENCIA: cd.pendencia,
      STATUS_COMPRA: cd.statusCompra,
      DIAS_COMPRA: cd.diasCompra,
      DIAS_RECEBIMENTO: cd.diasRecebimento,
      FLAG_CENTRALIZACAO: cd.flagCentralizacao,
    }));
}

function valorColunaHibrido(
  cabecalho: string,
  fonte: string | undefined,
  produto: HibridoProdutoGestao,
  bandeiraCatalogo: string,
  regional: string,
  modoUniverso: ModoUniversoExport,
  cds: CdsLojaJson["produtos"][0]["cds"],
): string | number | null {
  if (cabecalho.startsWith("ESTQ_CD")) {
    return estoquesCdOficiais(cds)[cabecalho] ?? null;
  }

  if (!fonte) return null;

  switch (fonte) {
    case "loja":
      return produto.loja;
    case "seqproduto":
      return produto.seqproduto;
    case "descricao":
      return produto.descricao;
    case "codFornecedor":
      return produto.codFornecedor;
    case "fornecedor":
      return produto.razaoFornecedor;
    case "estoqueLoja":
      return produto.estoqueLoja;
    case "parMax":
      return produto.parMax;
    case "pendenciaLoja":
      return produto.pendenciaLoja;
    case "embalagemCompra":
      return produto.embalagemCompra;
    case "setorNome":
      return produto.divisao;
    case "setorN2":
      return produto.setorN2;
    case "categoriaN1":
      return produto.grupoN3 ?? produto.categoriaN1;
    case "ruptura104cTexto":
      return formatRuptura104cTexto(produto.ruptura104c);
    case "flagRuptura104c":
      return formatFlagRuptura104c(produto.geraRuptura);
    case "menorQueTres":
      return formatMenorQueTres(produto.ruptura104c);
    case "inventarioUnid":
      return inventarioUnidExport(produto.inventarioUnid);
    case "rupturaComInventario":
      return produto.rupturaComInventario;
    case "modCurtoPrazo":
      return produto.modCurtoPrazo;
    case "ncurtoPrazo":
      return produto.ncurtoPrazo;
    case "curtoPrazo":
      return flagPrazoOuConsolidado(produto, "curto_prazo", produto.curtoPrazo);
    case "crossDocking":
      return produto.crossDocking;
    case "medioPrazo":
      return flagPrazoOuConsolidado(produto, "medio_prazo", produto.medioPrazo);
    case "longoPrazo":
      return flagPrazoOuConsolidado(produto, "longo_prazo", produto.longoPrazo);
    case "textoProduto":
      return formatTextoProduto(produto.descricao, produto.seqproduto);
    case "diasPedido":
      return produto.diasPedido;
    case "ultimaEntradaLoja":
      return produto.ultimaEntradaLoja;
    case "rede":
      return produto.rede;
    case "bandeiraExport":
      return formatBandeiraExportModo(
        regional,
        bandeiraCatalogo,
        modoUniverso === "oficial_compativel" ? "oficial_compativel" : "v7_integral",
      );
    case "statusSolicitacaoAtivacaoCd":
      return produto.statusSolicitacaoAtivacaoCd;
    case "diasRuptura":
      return produto.diasRuptura;
    case "statusEstoqueCds":
      return enriquecerStatusEstoqueCdsExport(produto.statusEstoqueCds, produto, cds, regional, bandeiraCatalogo);
    case "acaoCurtoPrazo":
      return produto.acaoCurtoPrazo ?? (produto.classificacaoPrazo === "curto_prazo" ? produto.acaoRecomendada : null);
    case "acaoMedioPrazo":
      return produto.acaoMedioPrazo ?? (produto.classificacaoPrazo === "medio_prazo" ? produto.acaoRecomendada : null);
    case "comprador":
      return produto.comprador;
    default:
      return null;
  }
}

/** Mapeia gestao.json + cds.json → linhas BASE oficiais (sem recalcular BRE). */
export function mapearBaseRupturaHibrido(input: {
  produtos: HibridoProdutoGestao[];
  cdsPorProduto: CdsPorProduto;
  bandeira: string;
  regional?: string;
  modoUniverso?: ModoUniversoExport;
}): MapeamentoHibridoResultado {
  const modoUniverso = input.modoUniverso ?? "integral";
  const regional = input.regional ?? "MT";
  const linhas: BaseRupturaLinha[] = [];
  const cdsDinamicos: Record<string, string | number | null>[] = [];
  const colunasSemFonte = new Set<string>();

  for (const produto of input.produtos) {
    const cds = input.cdsPorProduto.get(produto.seqproduto) ?? [];
    const row: BaseRupturaLinha = {};

    for (const col of COLUNAS_BASE_RUPTURA_V7) {
      if (col.ausenteV7) {
        row[col.cabecalho] = null;
        continue;
      }
      const valor = valorColunaHibrido(col.cabecalho, col.fonte, produto, input.bandeira, regional, modoUniverso, cds);
      row[col.cabecalho] = valor;
      if (valor === null && col.fonte && !col.ausenteV7) {
        colunasSemFonte.add(col.cabecalho);
      }
    }

    linhas.push(row);
    cdsDinamicos.push(...montarCdsDinamicos(produto.loja, produto.seqproduto, cds));
  }

  const camposAusentes = [
    ...CAMPOS_AUSENTES_V7,
    ...[...colunasSemFonte].filter((c) => !CAMPOS_AUSENTES_V7.includes(c)).sort(),
  ];

  for (const linha of linhas) {
    for (const h of CABECALHOS_BASE_RUPTURA) {
      if (!(h in linha)) linha[h] = null;
    }
  }

  return { linhas, camposAusentes, cdsDinamicos, colunasSemFonte: [...colunasSemFonte] };
}

export function filtrarLinhasUniversoOficial(
  linhas: BaseRupturaLinha[],
  chavesOficiais: ReadonlySet<string>,
): BaseRupturaLinha[] {
  return linhas.filter((linha) => {
    const loja = linha.LOJA;
    const seq = linha.SEQPRODUTO;
    if (loja == null || seq == null) return false;
    return chavesOficiais.has(`${loja}\u0001${seq}`);
  });
}

export function chaveLinhaBase(loja: unknown, seqproduto: unknown): string {
  const norm = (v: unknown) => {
    if (v == null || v === "") return "";
    if (typeof v === "number" && Number.isInteger(v)) return String(v);
    const s = String(v).trim();
    if (/^-?\d+\.0+$/.test(s)) return String(parseInt(s, 10));
    return s;
  };
  return `${norm(loja)}\u0001${norm(seqproduto)}`;
}
