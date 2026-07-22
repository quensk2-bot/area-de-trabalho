import {
  CABECALHOS_BASE_RUPTURA,
  CAMPOS_AUSENTES_V7,
  COLUNAS_BASE_RUPTURA_V7,
} from "../../../motor/export/baseRuptura/baseRupturaColumns.ts";
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

function flagPrazo(classificacao: ClassificacaoPrazoConsumo | null, alvo: ClassificacaoPrazoConsumo): number | null {
  if (!classificacao) return null;
  return classificacao === alvo ? 1 : 0;
}

/** ESTQ_CD1..5 a partir de cds[] — sem flat legado inventado. */
export function estoquesCdOficiais(cds: CdsLojaJson["produtos"][0]["cds"]): Record<string, number | null> {
  const sorted = [...cds].sort((a, b) => a.posicaoLogica - b.posicaoLogica);
  const out: Record<string, number | null> = {};
  for (let i = 0; i < 5; i++) {
    const estoque = sorted[i]?.estoque;
    out[`ESTQ_CD${i + 1}`] = estoque === undefined || estoque === null ? null : estoque;
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
  bandeira: string,
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
    case "pendenciaCpaCd":
      return produto.pendenciaCpaCd;
    case "setorNome":
      return produto.divisao;
    case "setorN2":
      return produto.setorN2;
    case "categoriaN1":
      return null;
    case "ruptura104c":
      return null;
    case "inventarioUnid":
      return null;
    case "rupturaComInventario":
      return null;
    case "modCurtoPrazo":
      return null;
    case "ncurtoPrazo":
      return null;
    case "curtoPrazo":
      return flagPrazo(produto.classificacaoPrazo, "curto_prazo");
    case "crossDocking":
      return null;
    case "medioPrazo":
      return flagPrazo(produto.classificacaoPrazo, "medio_prazo");
    case "longoPrazo":
      return flagPrazo(produto.classificacaoPrazo, "longo_prazo");
    case "textoProdutoCentralizado":
      return null;
    case "diasPedido":
      return produto.diasPedido;
    case "ultimaEntradaLoja":
      return null;
    case "rede":
      return produto.rede;
    case "bandeira":
      return bandeira;
    case "statusSolicitacaoAtivacaoCd":
      return null;
    case "diasRuptura":
      return null;
    case "statusEstoqueCds":
      return produto.statusEstoqueCds;
    case "acaoCurtoPrazo":
      return produto.classificacaoPrazo === "curto_prazo" ? produto.acaoRecomendada : null;
    case "acaoMedioPrazo":
      return produto.classificacaoPrazo === "medio_prazo" ? produto.acaoRecomendada : null;
    case "comprador":
      return produto.comprador;
    case "embalagemCompra":
      return null;
    default:
      return null;
  }
}

/** Mapeia gestao.json + cds.json → linhas BASE oficiais (sem recalcular BRE). */
export function mapearBaseRupturaHibrido(input: {
  produtos: HibridoProdutoGestao[];
  cdsPorProduto: CdsPorProduto;
  bandeira: string;
}): MapeamentoHibridoResultado {
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
      const valor = valorColunaHibrido(col.cabecalho, col.fonte, produto, input.bandeira, cds);
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
