import type { MotorStandardizeContrato } from "../standardizeTypes.ts";

export const regrasContract: MotorStandardizeContrato = {
  tipo: "regras",
  nomeArquivoPadrao: "motor_regras_padrao.xlsx",
  statusValidacao: "preliminar_aguardando_arquivo_real",
  descricao: "Regras de exclusão — aba DADOS com fornecedor, seção, loja e bandeira.",
  abas: [
    {
      nomeOficial: "DADOS",
      nomesOrigem: ["Regras", "DADOS"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["Fornecedor", "Seção", "Loja", "Bandeira"],
      colunas: [
        { nome: "Fornecedor", tipo: "text", obrigatoria: true },
        { nome: "Motivo", tipo: "text", obrigatoria: false },
        { nome: "Categoria", tipo: "text", obrigatoria: false },
        { nome: "Seção", tipo: "text", obrigatoria: false, aliases: ["Secao"] },
        { nome: "Loja", tipo: "int", obrigatoria: false },
        { nome: "Bandeira", tipo: "text", obrigatoria: false },
        { nome: "Status", tipo: "int", obrigatoria: false },
      ],
    },
  ],
};
