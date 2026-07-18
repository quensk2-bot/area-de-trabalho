export type DmTipoCampo = "string" | "number" | "boolean" | "date";

export type DmPersistencia = "sim" | "nao" | "opcional" | "diagnostico";

export type DmCampoSchema = {
  campo: string;
  tipo: DmTipoCampo;
  origem: string;
  obrigatorio: boolean;
  podeSerNull: boolean;
  exigeMigration: boolean;
  persistir: DmPersistencia;
  tabela: "dm_produto_loja" | "dm_produto_loja_cd" | "auditoria";
};

export const DM_SCHEMA_PRODUTO_LOJA: readonly DmCampoSchema[] = [
  { campo: "regional", tipo: "string", origem: "consolidado.regional", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "dataReferencia", tipo: "date", origem: "consolidado.dataReferencia", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "loja", tipo: "number", origem: "consolidado.loja", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "seqproduto", tipo: "number", origem: "consolidado.seqproduto", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "bandeira", tipo: "string", origem: "consolidado.bandeira", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "descricao", tipo: "string", origem: "consolidado.descricao", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "codFornecedor", tipo: "number", origem: "consolidado.codFornecedor", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "fornecedor", tipo: "string", origem: "consolidado.fornecedor", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "rede", tipo: "string", origem: "consolidado.rede", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "comprador", tipo: "string", origem: "consolidado.comprador", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "divisao", tipo: "string", origem: "consolidado.divisao", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "setorN2", tipo: "string", origem: "consolidado.setorN2", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "grupoN3", tipo: "string", origem: "consolidado.grupoN3", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "estoqueLoja", tipo: "number", origem: "consolidado.estoqueLoja", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "baseLimpa", tipo: "string", origem: "consolidado.baseLimpa", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "ruptura104c", tipo: "boolean", origem: "consolidado.ruptura104c", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "curtoPrazo", tipo: "number", origem: "consolidado.curtoPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "medioPrazo", tipo: "number", origem: "consolidado.medioPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "longoPrazo", tipo: "number", origem: "consolidado.longoPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "classificacaoPrazo", tipo: "string", origem: "consolidado.classificacaoPrazo", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "pendenciaCpaCd", tipo: "number", origem: "consolidado.pendenciaCpaCd", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "diasPedido", tipo: "number", origem: "consolidado.diasPedido", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "acaoCurtoPrazo", tipo: "string", origem: "consolidado.acaoCurtoPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "acaoMedioPrazo", tipo: "string", origem: "consolidado.acaoMedioPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "somaEstoqueCd", tipo: "number", origem: "consolidado.somaEstoqueCd", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "crossDocking", tipo: "number", origem: "consolidado.crossDocking", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "produtoCentralizado", tipo: "number", origem: "consolidado.produtoCentralizado", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "posicaoCdSelecionada", tipo: "number", origem: "consolidado.posicaoCdSelecionada", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "codigoCdSelecionado", tipo: "number", origem: "consolidado.codigoCdSelecionado", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "statusOperacional", tipo: "string", origem: "consolidado.statusOperacional", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "qualidadeDados", tipo: "string", origem: "consolidado.qualidadeDados", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "quantidadeCds", tipo: "number", origem: "consolidado.cds.length", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja" },
  { campo: "crossSum", tipo: "number", origem: "consolidado.crossSum", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "nao", tabela: "auditoria" },
  { campo: "modCurtoPrazo", tipo: "string", origem: "consolidado.modCurtoPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "nao", tabela: "auditoria" },
  { campo: "ncurtoPrazo", tipo: "string", origem: "consolidado.ncurtoPrazo", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "nao", tabela: "auditoria" },
  { campo: "estoqueCd1", tipo: "number", origem: "legado", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "nao", tabela: "auditoria" },
  { campo: "alertas", tipo: "string", origem: "consolidado.alertas", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "diagnostico", tabela: "auditoria" },
  { campo: "erros", tipo: "string", origem: "consolidado.erros", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "diagnostico", tabela: "auditoria" },
  { campo: "fontesAusentes", tipo: "string", origem: "consolidado.fontesAusentes", obrigatorio: false, podeSerNull: true, exigeMigration: false, persistir: "diagnostico", tabela: "auditoria" },
];

export const DM_SCHEMA_PRODUTO_LOJA_CD: readonly DmCampoSchema[] = [
  { campo: "regional", tipo: "string", origem: "consolidado.regional", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "dataReferencia", tipo: "date", origem: "consolidado.dataReferencia", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "loja", tipo: "number", origem: "consolidado.loja", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "seqproduto", tipo: "number", origem: "consolidado.seqproduto", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "posicaoLogica", tipo: "number", origem: "consolidado.cds[].posicaoLogica", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "codigoFisico", tipo: "number", origem: "consolidado.cds[].codigoFisico", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "estoque", tipo: "number", origem: "consolidado.cds[].estoque", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "pendencia", tipo: "number", origem: "consolidado.cds[].pendencia", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "statusCompra", tipo: "string", origem: "consolidado.cds[].statusCompra", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "diasCompra", tipo: "number", origem: "consolidado.cds[].diasCompra", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "diasRecebimento", tipo: "number", origem: "consolidado.cds[].diasRecebimento", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "flagCentralizacao", tipo: "number", origem: "consolidado.flags por posição", obrigatorio: false, podeSerNull: true, exigeMigration: true, persistir: "opcional", tabela: "dm_produto_loja_cd" },
  { campo: "origemArquivo", tipo: "string", origem: "consolidado.cds[].origemArquivo", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
  { campo: "numeroBloco", tipo: "number", origem: "consolidado.cds[].numeroBloco", obrigatorio: true, podeSerNull: false, exigeMigration: true, persistir: "sim", tabela: "dm_produto_loja_cd" },
];

export function obterSchemaPorTabela(tabela: DmCampoSchema["tabela"]): DmCampoSchema[] {
  const all = [...DM_SCHEMA_PRODUTO_LOJA, ...DM_SCHEMA_PRODUTO_LOJA_CD];
  return all.filter((s) => s.tabela === tabela);
}

export function camposPersistiveis(tabela: "dm_produto_loja" | "dm_produto_loja_cd"): string[] {
  return obterSchemaPorTabela(tabela)
    .filter((s) => s.persistir === "sim" || s.persistir === "opcional")
    .map((s) => s.campo);
}
