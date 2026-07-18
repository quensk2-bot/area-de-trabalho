import type { MotorClassificacaoPrazo } from "../bre/breTypes.ts";
import type { DmProdutoLoja, DmProdutoLojaCd } from "../datamart/dmTypes.ts";
import type {
  ClassificacaoPrazoDb,
  DmProdutoLojaCdRowInsert,
  DmProdutoLojaRowInsert,
} from "./persistenciaTypes.ts";

/** Converte CP|MP|LP do BRE para contrato persistido no banco. */
export function mapearClassificacaoPrazoParaDb(valor: MotorClassificacaoPrazo): ClassificacaoPrazoDb {
  if (valor === "CP") return "curto_prazo";
  if (valor === "MP") return "medio_prazo";
  if (valor === "LP") return "longo_prazo";
  return null;
}

/**
 * cross_docking: codigo Motor 0|1|null → banco boolean.
 * Decisao Fase 3B.1: manter boolean no PostgreSQL; conversao explicita no mapper.
 */
export function mapearCrossDockingParaDb(valor: number | null): boolean | null {
  if (valor === null || valor === undefined) return null;
  return valor === 1;
}

export function mapearFlagCentralizacaoParaDb(valor: number | null): boolean {
  return valor != null && valor !== 0;
}

export function mapearDmProdutoLojaParaRow(
  produto: DmProdutoLoja,
  execucaoMotorId: string,
  versao: number,
  versaoAtiva: boolean,
): DmProdutoLojaRowInsert {
  return {
    execucao_motor_id: execucaoMotorId,
    data_referencia: produto.dataReferencia,
    regional: produto.regional,
    bandeira: produto.bandeira,
    loja: produto.loja,
    seqproduto: produto.seqproduto,
    descricao: produto.descricao,
    cod_fornecedor: produto.codFornecedor,
    fornecedor: produto.fornecedor,
    status_produto: produto.statusProduto,
    familia: produto.familia,
    divisao: produto.divisao,
    setor_codigo: produto.setorCodigo,
    setor_nome: produto.setorNome,
    categoria_n1: produto.categoriaN1,
    setor_n2: produto.setorN2,
    grupo_n3: produto.grupoN3,
    subgrupo_n4: produto.subgrupoN4,
    tipo_n5: produto.tipoN5,
    media_venda_un_dia: produto.mediaVendaUnDia,
    media_venda_gp: produto.mediaVendaGp,
    estoque_loja: produto.estoqueLoja,
    par_min: produto.parMin,
    par_max: produto.parMax,
    pendencia_loja: produto.pendenciaLoja,
    dias_ruptura: produto.diasRuptura,
    ultima_entrada_loja: produto.ultimaEntradaLoja,
    ultima_saida_loja: produto.ultimaSaidaLoja,
    soma_estoque_cd: produto.somaEstoqueCd,
    cross_docking: mapearCrossDockingParaDb(produto.crossDocking),
    flag_ruptura: produto.geraRuptura,
    ruptura_104c: produto.ruptura104c,
    inventario_unid: produto.inventarioUnid,
    status_base_limpa: produto.baseLimpa,
    classificacao_prazo: mapearClassificacaoPrazoParaDb(produto.classificacaoPrazo),
    rede: produto.rede,
    comprador: produto.comprador,
    cobertura_dias: produto.coberturaDias,
    status_operacional: produto.statusOperacional,
    qtde_emb_compra: produto.qtdeEmbCompra,
    embalagem_compra: produto.embalagemCompra,
    custo_liquido: produto.custoLiquido,
    peso_unid: produto.pesoUnid,
    m3_unid: produto.m3Unid,
    cd_sugerido: produto.codigoCdSelecionado,
    dias_pedido: produto.diasPedido,
    acao_curto_prazo: produto.acaoCurtoPrazo,
    acao_medio_prazo: produto.acaoMedioPrazo,
    texto_produto_centralizado: produto.textoProdutoCentralizado,
    produto_centralizado: produto.produtoCentralizado,
    posicao_cd_selecionada: produto.posicaoCdSelecionada,
    codigo_cd_selecionado: produto.codigoCdSelecionado,
    status_recebto: produto.statusRecebto,
    status_estoque_cds: produto.statusEstoqueCds,
    status_solicitacao_ativacao_cd: produto.statusSolicitacaoAtivacaoCd,
    qualidade_dados: produto.qualidadeDados,
    quantidade_cds: produto.quantidadeCds,
    curto_prazo: produto.curtoPrazo,
    medio_prazo: produto.medioPrazo,
    longo_prazo: produto.longoPrazo,
    pendencia_cpa_cd: produto.pendenciaCpaCd,
    versao,
    versao_ativa: versaoAtiva,
  };
}

export function mapearDmProdutoLojaCdParaRow(
  cd: DmProdutoLojaCd,
  execucaoMotorId: string,
  produtoLojaId: string,
  versao: number,
  versaoAtiva: boolean,
): DmProdutoLojaCdRowInsert {
  return {
    execucao_motor_id: execucaoMotorId,
    produto_loja_id: produtoLojaId,
    regional: cd.regional,
    data_referencia: cd.dataReferencia,
    loja: cd.loja,
    seqproduto: cd.seqproduto,
    posicao_logica: cd.posicaoLogica,
    codigo_cd_fisico: cd.codigoFisico,
    estoque: cd.estoque,
    pendencia: cd.pendencia,
    status_compra: cd.statusCompra,
    dias_compra: cd.diasCompra,
    dias_recebimento: cd.diasRecebimento,
    flag_centralizacao: mapearFlagCentralizacaoParaDb(cd.flagCentralizacao),
    origem_arquivo: cd.origemArquivo,
    numero_bloco: cd.numeroBloco,
    posicao_no_arquivo: cd.posicaoNoArquivo,
    versao,
    versao_ativa: versaoAtiva,
  };
}

export function mapearLoteProdutosParaRows(
  produtos: readonly DmProdutoLoja[],
  execucaoMotorId: string,
  versao: number,
  versaoAtiva: boolean,
): DmProdutoLojaRowInsert[] {
  return produtos.map((p) => mapearDmProdutoLojaParaRow(p, execucaoMotorId, versao, versaoAtiva));
}
