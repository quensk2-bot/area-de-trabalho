import type { DmProdutoLoja, DmProdutoLojaCd } from "../datamart/dmTypes.ts";
import {
  mapearClassificacaoPrazoParaDb,
  mapearCrossDockingParaDb,
  mapearFlagCentralizacaoParaDb,
} from "./persistenciaMapper.ts";
import type { PersistenciaEntrada } from "./persistenciaTypes.ts";

/** Chave deterministica pai/filho — nunca depende da ordem do array. */
export function chaveProdutoTemporaria(regional: string, loja: number, seqproduto: number): string {
  return `${regional}|${loja}|${seqproduto}`;
}

export type RpcProdutoJson = {
  chave_produto: string;
  loja: number;
  seqproduto: number;
  bandeira: string | null;
  descricao: string | null;
  cod_fornecedor: number | null;
  fornecedor: string | null;
  status_produto: string | null;
  familia: number | null;
  divisao: string | null;
  setor_codigo: string | null;
  setor_nome: string | null;
  categoria_n1: string | null;
  setor_n2: string | null;
  grupo_n3: string | null;
  subgrupo_n4: string | null;
  tipo_n5: string | null;
  media_venda_un_dia: number | null;
  media_venda_gp: number | null;
  estoque_loja: number | null;
  par_min: number | null;
  par_max: number | null;
  pendencia_loja: number | null;
  dias_ruptura: number | null;
  ultima_entrada_loja: string | null;
  ultima_saida_loja: string | null;
  soma_estoque_cd: number | null;
  cross_docking: boolean | null;
  flag_ruptura: boolean | null;
  ruptura_104c: boolean | null;
  inventario_unid: number | null;
  status_base_limpa: string | null;
  classificacao_prazo: string | null;
  rede: string | null;
  comprador: string | null;
  cobertura_dias: number | null;
  status_operacional: string | null;
  qtde_emb_compra: number | null;
  embalagem_compra: string | null;
  custo_liquido: number | null;
  peso_unid: number | null;
  m3_unid: number | null;
  cd_sugerido: number | null;
  dias_pedido: number | null;
  acao_curto_prazo: string | null;
  acao_medio_prazo: string | null;
  texto_produto_centralizado: string | null;
  produto_centralizado: number | null;
  posicao_cd_selecionada: number | null;
  codigo_cd_selecionado: number | null;
  status_recebto: string | null;
  status_estoque_cds: string | null;
  status_solicitacao_ativacao_cd: string | null;
  qualidade_dados: string;
  quantidade_cds: number;
  curto_prazo: number | null;
  medio_prazo: number | null;
  longo_prazo: number | null;
  pendencia_cpa_cd: number | null;
};

export type RpcCdJson = {
  chave_produto: string;
  loja: number;
  seqproduto: number;
  posicao_logica: number;
  codigo_cd_fisico: number | null;
  estoque: number | null;
  pendencia: number | null;
  status_compra: string | null;
  dias_compra: number | null;
  dias_recebimento: number | null;
  flag_centralizacao: boolean;
  origem_arquivo: string | null;
  numero_bloco: number | null;
  posicao_no_arquivo: number | null;
};

export type PersistirLoteMotorV1Payload = {
  regional: string;
  data_referencia: string;
  hash_pacote: string;
  versao: number;
  quantidade_arquivos: number;
  produtos: RpcProdutoJson[];
  cds: RpcCdJson[];
  ativar: boolean;
};

export function mapearProdutoParaRpcJson(produto: DmProdutoLoja): RpcProdutoJson {
  return {
    chave_produto: chaveProdutoTemporaria(produto.regional, produto.loja, produto.seqproduto),
    loja: produto.loja,
    seqproduto: produto.seqproduto,
    bandeira: produto.bandeira,
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
  };
}

export function mapearCdParaRpcJson(cd: DmProdutoLojaCd): RpcCdJson {
  return {
    chave_produto: chaveProdutoTemporaria(cd.regional, cd.loja, cd.seqproduto),
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
  };
}

export function montarPayloadRpc(
  entrada: PersistenciaEntrada,
  options: { ativar?: boolean } = {},
): PersistirLoteMotorV1Payload {
  return {
    regional: entrada.regional,
    data_referencia: entrada.dataReferencia,
    hash_pacote: entrada.hashPacote,
    versao: entrada.versao,
    quantidade_arquivos: entrada.quantidadeArquivos ?? 0,
    produtos: entrada.lote.produtos.map(mapearProdutoParaRpcJson),
    cds: entrada.lote.cds.map(mapearCdParaRpcJson),
    ativar: options.ativar !== false,
  };
}
