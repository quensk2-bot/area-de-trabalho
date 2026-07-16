import type { MotorStandardizeContrato } from "../standardizeTypes.ts";

export const estruturaFakeContract: MotorStandardizeContrato = {
  tipo: "estrutura_fake",
  nomeArquivoPadrao: "motor_estrutura_fake_padrao.xlsx",
  statusValidacao: "validado_producao",
  descricao:
    "Estrutura Fake — subset mínimo de catálogo (grafia Estrura Real preservada). Arquivo real MT é template Excel sem linhas operacionais.",
  abas: [
    {
      nomeOficial: "DADOS",
      nomesOrigem: ["Planilha1", "Estrutura Fake", "DADOS"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["LOJA", "SEQPRODUTO"],
      colunas: [
        { nome: "BANDEIRA", tipo: "text", obrigatoria: false },
        { nome: "SETOR", tipo: "text", obrigatoria: false },
        { nome: "SETOR2", tipo: "text", obrigatoria: false },
        { nome: "Rede", tipo: "text", obrigatoria: false },
        { nome: "LOJA", tipo: "text", obrigatoria: false },
        { nome: "SEQPRODUTO", tipo: "text", obrigatoria: false },
        { nome: "DESCCOMPLETA", tipo: "text", obrigatoria: false },
        { nome: "Estrura Real", tipo: "text", obrigatoria: false },
      ],
    },
  ],
};
