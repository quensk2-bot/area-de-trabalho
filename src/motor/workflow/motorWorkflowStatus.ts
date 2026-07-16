import { obterFasePorId, MOTOR_WORKFLOW_FASES } from "./motorWorkflowCatalog.ts";
import type {
  MotorWorkflowContexto,
  MotorWorkflowFaseEstado,
  MotorWorkflowFaseId,
  MotorWorkflowFaseStatus,
} from "./motorWorkflowTypes.ts";

function statusSelecionarRegional(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (ctx.regional && ctx.dataReferencia) return "concluida";
  if (ctx.regional || ctx.dataReferencia) return "em_andamento";
  return "disponivel";
}

function statusEnviarOriginais(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (!ctx.regional || !ctx.dataReferencia) return "bloqueada";
  if (ctx.arquivosOriginaisEnviados.length > 0) return "concluida";
  return "disponivel";
}

function statusValidarPacote(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (!ctx.regional || !ctx.dataReferencia) return "bloqueada";
  if (ctx.arquivosOriginaisEnviados.length === 0) return "bloqueada";
  if (ctx.pacoteValidado) return "concluida";
  return "disponivel";
}

function statusPadronizar(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (!ctx.regional || !ctx.dataReferencia) return "bloqueada";
  if (ctx.arquivosOriginaisEnviados.length === 0) return "bloqueada";
  if (ctx.arquivosPadronizados.length > 0) return "concluida";
  return "disponivel";
}

function statusValidarPadronizadas(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (ctx.arquivosPadronizados.length === 0) return "bloqueada";
  return "disponivel";
}

function statusParser(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (ctx.arquivosPadronizados.length === 0 && ctx.arquivosOriginaisEnviados.length === 0) return "bloqueada";
  if (ctx.parserExecutado) return "concluida";
  return ctx.arquivosPadronizados.length > 0 ? "disponivel" : "bloqueada";
}

function statusTransformacoes(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (!ctx.parserExecutado) return "bloqueada";
  if (ctx.transformacoesExecutadas) return "concluida";
  return "disponivel";
}

function statusBre(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (!ctx.transformacoesExecutadas) return "bloqueada";
  if (ctx.breExecutado) return "concluida";
  return "disponivel";
}

function statusExcelV7(ctx: MotorWorkflowContexto): MotorWorkflowFaseStatus {
  if (!ctx.breExecutado) return "bloqueada";
  if (ctx.excelV7Validado) return "concluida";
  return "disponivel";
}

function statusNaoImplementada(): MotorWorkflowFaseStatus {
  return "bloqueada";
}

const AVALIADORES: Record<MotorWorkflowFaseId, (ctx: MotorWorkflowContexto) => MotorWorkflowFaseStatus> = {
  selecionar_regional_data: statusSelecionarRegional,
  enviar_arquivos_originais: statusEnviarOriginais,
  validar_pacote_arquivos: statusValidarPacote,
  padronizar_planilhas: statusPadronizar,
  validar_planilhas_padronizadas: statusValidarPadronizadas,
  executar_parser: statusParser,
  executar_transformacoes: statusTransformacoes,
  executar_bre: statusBre,
  validar_excel_v7: statusExcelV7,
  publicar_data_mart: statusNaoImplementada,
  gerar_indicadores: statusNaoImplementada,
  liberar_views: statusNaoImplementada,
  disponibilizar_modulos: statusNaoImplementada,
};

const BLOQUEIOS: Partial<Record<MotorWorkflowFaseId, (ctx: MotorWorkflowContexto) => string | null>> = {
  enviar_arquivos_originais: (ctx) =>
    !ctx.regional || !ctx.dataReferencia
      ? "Selecione a regional e a data de referência na Fase F01 antes de enviar arquivos."
      : null,
  validar_pacote_arquivos: (ctx) =>
    ctx.arquivosOriginaisEnviados.length === 0
      ? "Envie os arquivos originais na Fase F02 antes de validar o pacote."
      : null,
  padronizar_planilhas: (ctx) =>
    ctx.arquivosOriginaisEnviados.length === 0
      ? "Envie planilhas originais na Fase F02. Apenas arquivos não-TXT passam por padronização."
      : null,
  validar_planilhas_padronizadas: (ctx) =>
    ctx.arquivosPadronizados.length === 0
      ? "Execute a padronização na Fase F04 antes de validar as planilhas padrão."
      : null,
  executar_parser: (ctx) =>
    ctx.arquivosPadronizados.length === 0 && ctx.arquivosOriginaisEnviados.length === 0
      ? "Disponibilize arquivos TXT validados ou planilhas padronizadas antes do parse."
      : null,
  executar_transformacoes: (ctx) =>
    !ctx.parserExecutado ? "Execute o parser na Fase F06 antes das transformações." : null,
  executar_bre: (ctx) =>
    !ctx.transformacoesExecutadas ? "Execute as transformações na Fase F07 antes do BRE." : null,
  validar_excel_v7: (ctx) => (!ctx.breExecutado ? "Execute o BRE na Fase F08 antes da comparação Excel × V7." : null),
  publicar_data_mart: () => "Data Mart não implementado. Aguarde autorização de nova fase.",
  gerar_indicadores: () => "Indicadores não implementados. Conclua Data Mart primeiro.",
  liberar_views: () => "Views não implementadas. Conclua Indicadores primeiro.",
  disponibilizar_modulos: () => "Integração com módulos não implementada.",
};

export function avaliarFase(id: MotorWorkflowFaseId, ctx: MotorWorkflowContexto): MotorWorkflowFaseEstado {
  const definicao = obterFasePorId(id);
  const status = AVALIADORES[id](ctx);
  const motivoBloqueio = status === "bloqueada" ? (BLOQUEIOS[id]?.(ctx) ?? "Fase bloqueada.") : null;
  const pendencias: string[] = [];

  if (status === "bloqueada" && motivoBloqueio) {
    pendencias.push(motivoBloqueio);
  }
  if (!definicao.implementada && status !== "bloqueada") {
    pendencias.push("Funcionalidade ainda não implementada no V7.");
  }
  if (id === "padronizar_planilhas") {
    pendencias.push("Contratos preliminares — aguardando validação com arquivo real (Fase 2C.2.3).");
  }

  const percentual =
    status === "concluida" || status === "concluida_com_alertas"
      ? 100
      : status === "em_andamento"
        ? Math.max(10, definicao.percentualImplementacao / 2)
        : status === "disponivel"
          ? definicao.percentualImplementacao
          : 0;

  return {
    definicao,
    status,
    percentual,
    pendencias,
    motivoBloqueio,
    alertas: !definicao.implementada ? ["Fase não implementada — apenas catálogo documentado."] : [],
  };
}

export function avaliarWorkflowCompleto(ctx: MotorWorkflowContexto): MotorWorkflowFaseEstado[] {
  return MOTOR_WORKFLOW_FASES.map((f) => avaliarFase(f.id, ctx));
}
