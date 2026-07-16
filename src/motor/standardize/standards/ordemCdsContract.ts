import type { MotorStandardizeContrato } from "../standardizeTypes.ts";

export const ordemCdsContract: MotorStandardizeContrato = {
  tipo: "ordem_cds",
  nomeArquivoPadrao: "motor_ordem_cds_padrao.xlsx",
  statusValidacao: "validado_producao",
  descricao:
    "Ordem dos CDs — ORDEM_CDS, BANDEIRA_LOJA, SEQUENCIA, MODALIDADE. Aba auxiliar Tipo Loja ignorada. Bandeira pode vir de bandeira.csv.",
  abas: [
    {
      nomeOficial: "ORDEM_CDS",
      nomesOrigem: ["Ordem", "ORDEM_CDS"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["DIVISÃO", "BANDEIRA", "UF"],
      colunas: [
        { nome: "DIVISÃO", tipo: "text", obrigatoria: true, aliases: ["DIVISAO"] },
        { nome: "BANDEIRA", tipo: "text", obrigatoria: true },
        { nome: "UF", tipo: "text", obrigatoria: false },
        { nome: "1º", tipo: "int", obrigatoria: true },
        { nome: "2º", tipo: "int", obrigatoria: true },
        { nome: "3º", tipo: "int", obrigatoria: true },
        { nome: "4º", tipo: "int", obrigatoria: true },
        { nome: "5º", tipo: "int", obrigatoria: true },
      ],
    },
    {
      nomeOficial: "BANDEIRA_LOJA",
      nomesOrigem: ["Bandeira", "BANDEIRA_LOJA"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["LOJA"],
      colunas: [
        { nome: "LOJA", tipo: "int", obrigatoria: true, aliases: ["Loja"] },
        { nome: "BANDEIRA", tipo: "text", obrigatoria: true },
        { nome: "TIPO LOJA", tipo: "text", obrigatoria: true, aliases: ["Tipo Loja"] },
      ],
    },
    {
      nomeOficial: "SEQUENCIA",
      nomesOrigem: ["Sequência", "Sequencia", "SEQUENCIA"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["DIVISÃO", "BANDEIRA", "CD", "ORDEM"],
      colunas: [
        { nome: "DIVISÃO", tipo: "text", obrigatoria: true, aliases: ["DIVISAO"] },
        { nome: "BANDEIRA", tipo: "text", obrigatoria: true },
        { nome: "UF", tipo: "text", obrigatoria: false },
        { nome: "CD", tipo: "int", obrigatoria: true },
        { nome: "ORDEM", tipo: "text", obrigatoria: true },
      ],
    },
    {
      nomeOficial: "MODALIDADE",
      nomesOrigem: ["Modalidade", "MODALIDADE"],
      cabecalhoEstrategia: "scan",
      chaveDedup: ["Modalidade", "Tipo Loja"],
      colunas: [
        { nome: "Modalidade", tipo: "text", obrigatoria: true, aliases: ["Modalide"] },
        { nome: "Tipo Loja", tipo: "text", obrigatoria: true },
      ],
    },
  ],
};
