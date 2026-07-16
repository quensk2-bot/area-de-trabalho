import type { MotorStandardizeContrato } from "../standardizeTypes.ts";

export const validacaoRupturaContract: MotorStandardizeContrato = {
  tipo: "validacao_ruptura",
  nomeArquivoPadrao: "motor_validacao_ruptura_padrao.xlsx",
  statusValidacao: "validado_producao",
  descricao:
    "Validação Ruptura — aba DADOS; origem com título na linha 1 e cabeçalho real via scan (dupla promoção M). Aba Mozart Reports ignorada.",
  abas: [
    {
      nomeOficial: "DADOS",
      nomesOrigem: ["Validaçao Ruptura", "Validacao Ruptura", "DADOS"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["Loja", "Item"],
      colunas: [
        { nome: "Loja", tipo: "int", obrigatoria: true, aliases: ["LOJA"] },
        { nome: "Item", tipo: "int", obrigatoria: true, aliases: ["ITEM", "Seqproduto"] },
        { nome: "Qtd Item Ruptura no Mix", tipo: "int", obrigatoria: true },
        { nome: "Qtd Item Ruptura", tipo: "int", obrigatoria: true },
      ],
    },
  ],
};
