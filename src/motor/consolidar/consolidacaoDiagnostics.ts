import type { MotorAlerta } from "../bre/breTypes.ts";
import type {
  MotorConsolidacaoErro,
  MotorDuplicidadeDiagnostico,
  MotorJoinDiagnostico,
  MotorQualidadeDados,
  MotorStatusOperacional,
} from "./consolidacaoTypes.ts";

export function criarJoinDiagnostico(
  fonte: string,
  chave: string,
  quantidade: number,
  encontrado: boolean,
  decisao: string,
  severidade: MotorJoinDiagnostico["severidade"],
  mensagem: string,
): MotorJoinDiagnostico {
  return {
    fonte,
    chave,
    encontrado,
    quantidadeCorrespondencias: quantidade,
    decisao,
    severidade,
    mensagem,
  };
}

export function criarDuplicidadeDiagnostico(
  chave: string,
  regional: string,
  loja: number,
  seqproduto: number,
  quantidade: number,
): MotorDuplicidadeDiagnostico {
  return {
    chave,
    regional,
    loja,
    seqproduto,
    quantidade,
    severidade: "erro",
    mensagem: `Duplicidade na base principal: ${quantidade} linhas para a mesma chave`,
  };
}

export function deduplicarAlertas(alertas: MotorAlerta[]): MotorAlerta[] {
  const seen = new Set<string>();
  const out: MotorAlerta[] = [];
  for (const a of alertas) {
    const key = `${a.codigo}|${a.mensagem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

const ALERTAS_CRITICOS = new Set([
  "chave_invalida",
  "duplicidade_base",
  "resultado_bre_ausente",
  "cd5_ambiguo",
  "rede_duplicada",
  "catalogo_duplicado",
]);

const ALERTAS_OPCIONAIS = new Set([
  "grupo2_ausente",
  "inventario_ausente",
  "validacao_ausente",
  "rede_ausente",
  "bandeira_ausente",
  "ordem_cd_ausente",
  "comprador_ausente",
  "campo_sem_origem",
  "resultado_centralizacao_incompleto",
  "dado_incompleto",
]);

export function calcularQualidadeDados(
  erros: MotorConsolidacaoErro[],
  alertas: MotorAlerta[],
  duplicidadeBase: boolean,
  chaveInvalida: boolean,
  breAusente: boolean,
): MotorQualidadeDados {
  if (chaveInvalida || duplicidadeBase || erros.some((e) => e.severidade === "erro")) return "invalido";
  if (breAusente || alertas.some((a) => ALERTAS_CRITICOS.has(a.codigo))) return "incompleto";
  if (alertas.some((a) => ALERTAS_OPCIONAIS.has(a.codigo))) return "completo_com_alertas";
  return "completo";
}

export function calcularStatusOperacional(params: {
  chaveInvalida: boolean;
  duplicidadeBase: boolean;
  breAusente: boolean;
  breBloqueado: boolean;
  curtoPrazo: number | null;
  medioPrazo: number | null;
  longoPrazo: number | null;
  classificacaoConfiavel: boolean;
}): MotorStatusOperacional {
  if (params.chaveInvalida || params.duplicidadeBase) return "erro_estrutural";
  if (params.breAusente || params.breBloqueado) return "bloqueado";
  if (!params.classificacaoConfiavel) return "dados_incompletos";
  if (params.curtoPrazo === 1) return "curto_prazo";
  if (params.medioPrazo === 1) return "medio_prazo";
  if (params.longoPrazo === 1) return "longo_prazo";
  return "sem_ruptura";
}

export { ALERTAS_CRITICOS, ALERTAS_OPCIONAIS };
