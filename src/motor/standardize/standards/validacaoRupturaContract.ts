import type { MotorStandardizeContrato } from "../standardizeTypes.ts";

export const validacaoRupturaContract: MotorStandardizeContrato = {
  tipo: "validacao_ruptura",
  nomeArquivoPadrao: "motor_validacao_ruptura_padrao.xlsx",
  statusValidacao: "preliminar_aguardando_arquivo_real",
  descricao: "Validação Ruptura — aba DADOS com colunas de mix e ruptura por loja/produto.",
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
