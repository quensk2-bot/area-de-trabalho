import type { MotorStandardizeContrato } from "../standardizeTypes.ts";

export const compradoresContract: MotorStandardizeContrato = {
  tipo: "compradores",
  nomeArquivoPadrao: "motor_compradores_padrao.xlsx",
  statusValidacao: "preliminar_aguardando_arquivo_real",
  descricao: "Compradores — abas COMPRADORES e CORRECAO com hierarquia REDE/SEÇÃO/NIVEL.",
  abas: [
    {
      nomeOficial: "COMPRADORES",
      nomesOrigem: ["Compradores", "COMPRADORES"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["REDE", "SEÇÃO", "NIVEL 2", "NIVEL 3"],
      colunas: [
        { nome: "REDE", tipo: "text", obrigatoria: true, aliases: ["Rede"] },
        { nome: "SEÇÃO", tipo: "text", obrigatoria: true, aliases: ["SECAO", "SETOR"] },
        { nome: "NIVEL 2", tipo: "text", obrigatoria: true, aliases: ["SETOR2"] },
        { nome: "NIVEL 3", tipo: "text", obrigatoria: true, aliases: ["CATEGORIA"] },
        { nome: "COMPRADOR", tipo: "text", obrigatoria: true },
      ],
    },
    {
      nomeOficial: "CORRECAO",
      nomesOrigem: ["Compradores Rede", "CORRECAO", "Correção"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["REDE", "SEÇÃO", "NIVEL 2", "NIVEL 3"],
      opcional: true,
      colunas: [
        { nome: "REDE", tipo: "text", obrigatoria: true, aliases: ["Rede"] },
        { nome: "SEÇÃO", tipo: "text", obrigatoria: true, aliases: ["SETOR"] },
        { nome: "NIVEL 2", tipo: "text", obrigatoria: true, aliases: ["SETOR2"] },
        { nome: "NIVEL 3", tipo: "text", obrigatoria: true, aliases: ["CATEGORIA"] },
        { nome: "COMPRADOR", tipo: "text", obrigatoria: true },
      ],
    },
  ],
};
