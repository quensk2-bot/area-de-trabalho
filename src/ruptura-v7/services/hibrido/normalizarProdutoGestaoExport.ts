import type { HibridoProdutoGestao } from "../../../motor/export/hibrido/hibridoTypes.ts";
import type { ClassificacaoPrazoConsumo } from "../../types/rupturaTypes.ts";
import type { StatusBaseLimpaOficial } from "../../../motor/export/hibrido/filtrarUniversoOficialCompativel.ts";

type LegacyGestaoRaw = Record<string, unknown>;

function pick<T>(raw: LegacyGestaoRaw, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function flagFromClassificacao(classificacao: ClassificacaoPrazoConsumo | null, alvo: ClassificacaoPrazoConsumo): number | null {
  if (classificacao == null) return null;
  return classificacao === alvo ? 1 : 0;
}

/**
 * Normaliza produto gestao.json para export BASE.
 * - Aceita camelCase atual e snake_case legado do Storage.
 * - Preenche flags de prazo/ação quando ausentes mas deriváveis de classificacaoPrazo.
 */
export function normalizarProdutoGestaoExport(raw: LegacyGestaoRaw): HibridoProdutoGestao {
  const classificacaoPrazo = pick<ClassificacaoPrazoConsumo>(raw, "classificacaoPrazo", "classificacao_prazo") ?? null;
  const acaoRecomendada = pick<string>(raw, "acaoRecomendada", "acao_recomendada") ?? null;

  const curtoPrazo = pick<number>(raw, "curtoPrazo", "curto_prazo") ?? flagFromClassificacao(classificacaoPrazo, "curto_prazo");
  const medioPrazo = pick<number>(raw, "medioPrazo", "medio_prazo") ?? flagFromClassificacao(classificacaoPrazo, "medio_prazo");
  const longoPrazo = pick<number>(raw, "longoPrazo", "longo_prazo") ?? flagFromClassificacao(classificacaoPrazo, "longo_prazo");

  const acaoCurtoPrazo =
    pick<string>(raw, "acaoCurtoPrazo", "acao_curto_prazo") ??
    (classificacaoPrazo === "curto_prazo" ? acaoRecomendada : null);
  const acaoMedioPrazo =
    pick<string>(raw, "acaoMedioPrazo", "acao_medio_prazo") ??
    (classificacaoPrazo === "medio_prazo" ? acaoRecomendada : null);

  return {
    loja: pick<number>(raw, "loja") ?? 0,
    seqproduto: pick<number>(raw, "seqproduto", "seq_produto") ?? 0,
    descricao: pick<string>(raw, "descricao") ?? null,
    codFornecedor: pick<number>(raw, "codFornecedor", "cod_fornecedor") ?? null,
    razaoFornecedor: pick<string>(raw, "razaoFornecedor", "razao_fornecedor") ?? null,
    rede: pick<string>(raw, "rede") ?? null,
    comprador: pick<string>(raw, "comprador") ?? null,
    origemComprador: pick(raw, "origemComprador", "origem_comprador") ?? null,
    chaveComprador: pick<string>(raw, "chaveComprador", "chave_comprador") ?? null,
    fallbackComprador: pick<boolean>(raw, "fallbackComprador", "fallback_comprador") ?? false,
    estoqueLoja: pick<number>(raw, "estoqueLoja", "estoque_loja") ?? null,
    mediaVendaDia: pick<number>(raw, "mediaVendaDia", "media_venda_dia") ?? null,
    parMin: pick<number>(raw, "parMin", "par_min") ?? null,
    parMax: pick<number>(raw, "parMax", "par_max") ?? null,
    somaEstoqueCd: pick<number>(raw, "somaEstoqueCd", "soma_estoque_cd") ?? null,
    pendenciaLoja: pick<number>(raw, "pendenciaLoja", "pendencia_loja") ?? null,
    pendenciaCpaCd: pick<number>(raw, "pendenciaCpaCd", "pendencia_cpa_cd") ?? null,
    baseLimpa: (pick<string>(raw, "baseLimpa", "base_limpa") as StatusBaseLimpaOficial | undefined) ?? null,
    classificacaoPrazo,
    diasPedido: pick<number>(raw, "diasPedido", "dias_pedido") ?? null,
    produtoCentralizado: pick<number>(raw, "produtoCentralizado", "produto_centralizado") ?? null,
    codigoCdSelecionado: pick<number>(raw, "codigoCdSelecionado", "codigo_cd_selecionado") ?? null,
    statusEstoqueCds: pick<string>(raw, "statusEstoqueCds", "status_estoque_cds") ?? null,
    acaoRecomendada,
    qualidadeDados: pick(raw, "qualidadeDados", "qualidade_dados") ?? null,
    setorN2: pick<string>(raw, "setorN2", "setor_n2") ?? null,
    divisao: pick<string>(raw, "divisao") ?? null,
    grupoN3: pick<string>(raw, "grupoN3", "grupo_n3") ?? null,
    categoriaN1: pick<string>(raw, "categoriaN1", "categoria_n1") ?? null,
    embalagemCompra: pick<string>(raw, "embalagemCompra", "embalagem_compra") ?? null,
    ruptura104c: pick<boolean>(raw, "ruptura104c", "ruptura_104c") ?? null,
    geraRuptura: pick<boolean>(raw, "geraRuptura", "gera_ruptura") ?? null,
    inventarioUnid: pick<number>(raw, "inventarioUnid", "inventario_unid") ?? null,
    rupturaComInventario: pick<number>(raw, "rupturaComInventario", "ruptura_com_inventario") ?? null,
    rupturaSemInventario: pick<number>(raw, "rupturaSemInventario", "ruptura_sem_inventario") ?? null,
    crossSum: pick<number>(raw, "crossSum", "cross_sum") ?? null,
    estSelecInvCd1: pick<number>(raw, "estSelecInvCd1", "est_selec_inv_cd1") ?? null,
    estSelecInvCd2: pick<number>(raw, "estSelecInvCd2", "est_selec_inv_cd2") ?? null,
    estSelecInvCd3: pick<number>(raw, "estSelecInvCd3", "est_selec_inv_cd3") ?? null,
    estSelecInvCd4: pick<number>(raw, "estSelecInvCd4", "est_selec_inv_cd4") ?? null,
    crossDocking: pick<number>(raw, "crossDocking", "cross_docking") ?? null,
    modalidadeCd: pick<string>(raw, "modalidadeCd", "modalidade_cd") ?? null,
    cdFisicosAtivos: (pick<number[]>(raw, "cdFisicosAtivos", "cd_fisicos_ativos") ?? null) as number[] | null,
    cdFisicosComRecebimento: (pick<number[]>(raw, "cdFisicosComRecebimento", "cd_fisicos_com_recebimento") ?? null) as number[] | null,
    modCurtoPrazo: pick<string>(raw, "modCurtoPrazo", "mod_curto_prazo") ?? null,
    ncurtoPrazo: pick<string>(raw, "ncurtoPrazo", "ncurto_prazo") ?? null,
    curtoPrazo,
    medioPrazo,
    longoPrazo,
    ultimaEntradaLoja: pick<string>(raw, "ultimaEntradaLoja", "ultima_entrada_loja") ?? null,
    diasRuptura: pick<number>(raw, "diasRuptura", "dias_ruptura") ?? null,
    statusSolicitacaoAtivacaoCd:
      pick<string>(raw, "statusSolicitacaoAtivacaoCd", "status_solicitacao_ativacao_cd") ?? null,
    acaoCurtoPrazo,
    acaoMedioPrazo,
    textoProdutoCentralizado: pick<string>(raw, "textoProdutoCentralizado", "texto_produto_centralizado") ?? null,
    rupDiasRecebtoMaiorData: pick<number>(raw, "rupDiasRecebtoMaiorData", "rup_dias_recebto_maior_data") ?? null,
    ultimoPedidoLoja: pick<number>(raw, "ultimoPedidoLoja", "ultimo_pedido_loja") ?? null,
    ativacaoRuptura30SemPedido:
      pick<number>(raw, "ativacaoRuptura30SemPedido", "ativacao_ruptura_30_sem_pedido") ?? null,
    itensVdaPendencia: pick<number>(raw, "itensVdaPendencia", "itens_vda_pendencia") ?? null,
    rupSemPendenciaVda: pick<number>(raw, "rupSemPendenciaVda", "rup_sem_pendencia_vda") ?? null,
    rupInventarioPct: pick<number>(raw, "rupInventarioPct", "rup_inventario_pct") ?? null,
    rupSemInventarioPct: pick<number>(raw, "rupSemInventarioPct", "rup_sem_inventario_pct") ?? null,
  };
}

export function normalizarProdutosGestaoExport(rawProdutos: unknown[]): HibridoProdutoGestao[] {
  return rawProdutos.map((p) => normalizarProdutoGestaoExport((p ?? {}) as LegacyGestaoRaw));
}
