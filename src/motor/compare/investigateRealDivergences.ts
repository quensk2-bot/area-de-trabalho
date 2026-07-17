import type { MotorDivergenciaRealDetalhe, MotorDivergenciaReclassificada } from "./cdNormalization/cdNormalizationTypes.ts";

const REGRAS_M: Record<string, string> = {
  "Curto Prazo": "calcularCurtoPrazo — gates CP/MP/LP",
  "Médio Prazo": "calcularMedioPrazo",
  "Longo Prazo": "calcularLongoPrazo",
  "Dias Pedido": "calcularDiasPedido",
  "Ação Curto Prazo": "calcularAcoesOperacionais",
  "Ação Médio Prazo": "calcularAcoesOperacionais",
  COMPRADOR: "Compradores + CORRECAO via CODFORN→Rede.txt",
  Rede: "Rede.txt join SEQPESSOA",
  "Cross Docking": "transformGrupoRuptura1 / flag cross",
  "Pendência Cpa CD": "PENDCPA agregado CDs",
  "Status Estoque CDs": "calcularStatusEstoqueCds",
  "Status Solicitação Ativação CD": "calcularStatusAtivacaoCd",
};

function categoriaInvestigacao(campo: string, classificacao: string): MotorDivergenciaRealDetalhe["categoriaInvestigacao"] {
  if (classificacao === "comprador" || campo === "COMPRADOR") return "comprador";
  if (classificacao === "join" || campo === "Rede") return "join";
  if (classificacao === "bre") return "bre";
  if (classificacao === "centralizacao" || classificacao === "texto_fisico_vs_logico") return "centralizacao";
  return "transformacao";
}

function hipoteseInicial(div: MotorDivergenciaReclassificada): string {
  if (div.campo === "COMPRADOR") {
    return "Divergência de join comprador: CODFORN→Rede→hierarquia vs correção manual ou rede distinta";
  }
  if (div.campo === "Curto Prazo" || div.campo === "Longo Prazo") {
    return "Possível divergência de gate CP/MP/LP ou flag 104C/Base Limpa";
  }
  if (div.campo === "Cross Docking") {
    return "Campo derivado no PQ — verificar transformação TXT vs M";
  }
  if (div.classificacao === "centralizacao") {
    return "Centralização real — flags/status distintos após normalização";
  }
  return "Investigar literalmente contra código M do fluxo principal";
}

function conclusaoInicial(div: MotorDivergenciaReclassificada): {
  conclusao: string;
  correcaoNecessaria: string;
  correcaoEm: MotorDivergenciaRealDetalhe["correcaoEm"];
  status: MotorDivergenciaRealDetalhe["statusInvestigacao"];
} {
  if (div.campo === "COMPRADOR") {
    return {
      conclusao: "Join comprador V7 usa Rede.txt + CORRECAO; Excel pode usar caminho distinto ou rede desatualizada",
      correcaoNecessaria: "Auditar CODFORN do produto, join Rede.txt e aba CORRECAO na data de referência",
      correcaoEm: "pendente",
      status: "pendente",
    };
  }
  if (div.campo === "Curto Prazo" || div.campo === "Longo Prazo") {
    return {
      conclusao: "Divergência BRE CP/MP/LP — requer confronto linha-a-linha com M",
      correcaoNecessaria: "Comparar gates de classificação de prazo para o produto na interseção",
      correcaoEm: "pendente",
      status: "pendente",
    };
  }
  if (div.classificacao === "centralizacao") {
    return {
      conclusao: "Centralização persiste após normalizador — possível diferença de regra ou dado de entrada",
      correcaoNecessaria: "Confrontar flags, status compra CD e estoque por posição lógica",
      correcaoEm: "pendente",
      status: "pendente",
    };
  }
  return {
    conclusao: "Pendente análise detalhada contra M",
    correcaoNecessaria: "Mapear etapa Power Query correspondente",
    correcaoEm: "pendente",
    status: "pendente",
  };
}

export function investigarDivergenciasReais(
  divergencias: MotorDivergenciaReclassificada[],
  fonteExcel: string,
): MotorDivergenciaRealDetalhe[] {
  const reais = divergencias.filter((d) => d.severidade === "critica");
  return reais.map((div) => {
    const cat = categoriaInvestigacao(div.campo, div.classificacao);
    const ini = conclusaoInicial(div);
    return {
      ...div,
      regraM: REGRAS_M[div.campo] ?? null,
      etapaPowerQuery: div.campo.includes("CD") || div.classificacao === "centralizacao" ? "Centralização / flags CD" : "BRE / joins",
      fonteUtilizada: fonteExcel,
      categoriaInvestigacao: cat,
      hipotese: hipoteseInicial(div),
      conclusao: ini.conclusao,
      correcaoNecessaria: ini.correcaoNecessaria,
      correcaoEm: ini.correcaoEm,
      statusInvestigacao: ini.status,
    };
  });
}

export function resumirInvestigacaoReais(reais: MotorDivergenciaRealDetalhe[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of reais) {
    out[r.categoriaInvestigacao] = (out[r.categoriaInvestigacao] ?? 0) + 1;
    out[`status_${r.statusInvestigacao}`] = (out[`status_${r.statusInvestigacao}`] ?? 0) + 1;
  }
  return out;
}

export function divergenciasResolvidasPorNormalizador(
  totalAntesEstimado: number,
  criticasAtuais: number,
): { resolvidasEstimadas: number; permanecemCriticas: number } {
  return {
    resolvidasEstimadas: Math.max(0, totalAntesEstimado - criticasAtuais),
    permanecemCriticas: criticasAtuais,
  };
}
