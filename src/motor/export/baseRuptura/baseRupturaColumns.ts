/** Coluna oficial da aba BASE — ordem fixa de publicação. */
export type BaseRupturaColunaDef = {
  /** Cabeçalho exato na planilha */
  cabecalho: string;
  /** Campo interno V7 (quando mapeado) */
  fonte?: string;
  /** Campo ainda não disponível no Motor V7 */
  ausenteV7?: boolean;
};

/** Colunas oficiais BASE_RUPTURA_V7 — referência usuário + mapeamento DM/Consolidado. */
export const COLUNAS_BASE_RUPTURA_V7: readonly BaseRupturaColunaDef[] = [
  { cabecalho: "LOJA", fonte: "loja" },
  { cabecalho: "SEQPRODUTO", fonte: "seqproduto" },
  { cabecalho: "DESCCOMPLETA", fonte: "descricao" },
  { cabecalho: "CODFORN", fonte: "codFornecedor" },
  { cabecalho: "RAZAO", fonte: "fornecedor" },
  { cabecalho: "ESTOQUE", fonte: "estoqueLoja" },
  { cabecalho: "PARMAX", fonte: "parMax" },
  { cabecalho: "PENDCPA", fonte: "pendenciaCpaCd" },
  { cabecalho: "EMBCPA", fonte: "embalagemCompra" },
  { cabecalho: "SETOR", fonte: "setorNome" },
  { cabecalho: "SETOR2", fonte: "setorN2" },
  { cabecalho: "CATEGORIA", fonte: "categoriaN1" },
  { cabecalho: "ESTQ_CD1", fonte: "estoqueCd1" },
  { cabecalho: "ESTQ_CD2", fonte: "estoqueCd2" },
  { cabecalho: "ESTQ_CD3", fonte: "estoqueCd3" },
  { cabecalho: "ESTQ_CD4", fonte: "estoqueCd4" },
  { cabecalho: "ESTQ_CD5", fonte: "estoqueCd5" },
  { cabecalho: "Ruptura 104C", fonte: "ruptura104c" },
  { cabecalho: "Inventário (Unid)", fonte: "inventarioUnid" },
  { cabecalho: "Ruptura Inventário", fonte: "rupturaComInventario" },
  { cabecalho: "% Rup Inventário", ausenteV7: true },
  { cabecalho: "% Ruptura Sem Inventário", ausenteV7: true },
  { cabecalho: "Flag Ruptura 104c", fonte: "ruptura104c" },
  { cabecalho: "Menor que três Unidades", fonte: "ruptura104c" },
  { cabecalho: "% < 3", ausenteV7: true },
  { cabecalho: "Mod_CurtoPrazo", fonte: "modCurtoPrazo" },
  { cabecalho: "NCurtoPrazo", fonte: "ncurtoPrazo" },
  { cabecalho: "Curto Prazo", fonte: "curtoPrazo" },
  { cabecalho: "Cross Docking", fonte: "crossDocking" },
  { cabecalho: "Sku´s Curto Prazo", ausenteV7: true },
  { cabecalho: "% Curto Prazo", ausenteV7: true },
  { cabecalho: "Rup (X) Dias Recebto Maior data", ausenteV7: true },
  { cabecalho: "Curto Prazo Rebto Próximo", ausenteV7: true },
  { cabecalho: "Curto Prazo Não Rebto Próximo", ausenteV7: true },
  { cabecalho: "Médio Prazo", fonte: "medioPrazo" },
  { cabecalho: "Sku´s Médio Prazo", ausenteV7: true },
  { cabecalho: "Longo Prazo", fonte: "longoPrazo" },
  { cabecalho: "% Longo Prazo", ausenteV7: true },
  { cabecalho: "Sku´s Longo Prazo", ausenteV7: true },
  { cabecalho: "PRODUTO", fonte: "textoProdutoCentralizado" },
  { cabecalho: "Dias Pedido", fonte: "diasPedido" },
  { cabecalho: "Avaliar Pedido", ausenteV7: true },
  { cabecalho: "Pendência Indevida", ausenteV7: true },
  { cabecalho: "% Médio Prazo", ausenteV7: true },
  { cabecalho: "Último Pedido Loja", fonte: "ultimaEntradaLoja" },
  { cabecalho: "Ativação e Ruptura > 30 Dias Sem Pedido", ausenteV7: true },
  { cabecalho: "Último Pedido Loja e CD´s (Com ou sem Compra)", ausenteV7: true },
  { cabecalho: "Rede", fonte: "rede" },
  { cabecalho: "BANDEIRA", fonte: "bandeira" },
  { cabecalho: "Status Solicitação Ativação CD", fonte: "statusSolicitacaoAtivacaoCd" },
  { cabecalho: "Sku´s", ausenteV7: true },
  { cabecalho: "Dias Ruptura (revisado)", fonte: "diasRuptura" },
  { cabecalho: "Último Pedido (revisado)", ausenteV7: true },
  { cabecalho: "Dias Ativação", ausenteV7: true },
  { cabecalho: "Status Estoque CDs", fonte: "statusEstoqueCds" },
  { cabecalho: "Ação Curto Prazo", fonte: "acaoCurtoPrazo" },
  { cabecalho: "Ação Médio Prazo", fonte: "acaoMedioPrazo" },
  { cabecalho: "Estrura Real", ausenteV7: true },
  { cabecalho: "COMPRADOR", fonte: "comprador" },
  { cabecalho: "Itens Vda Pendência", ausenteV7: true },
  { cabecalho: "% Rup Sem Pendência Vda", ausenteV7: true },
  { cabecalho: "Dias Pedido (Análise Geral)", fonte: "diasPedido" },
];

export const CABECALHOS_BASE_RUPTURA = COLUNAS_BASE_RUPTURA_V7.map((c) => c.cabecalho);

export const CAMPOS_AUSENTES_V7 = COLUNAS_BASE_RUPTURA_V7.filter((c) => c.ausenteV7).map((c) => c.cabecalho);
