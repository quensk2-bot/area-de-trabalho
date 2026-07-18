import type { MotorV7Db, PersistenciaEntrada } from "./persistenciaTypes.ts";
import { montarPayloadRpc } from "./persistenciaRpcPayload.ts";
import { validarEntradaPersistencia } from "./persistenciaValidator.ts";

export type PersistenciaAtomicaResultado =
  | {
      status: "persistida";
      execucaoId: string;
      versao: number;
      produtosInseridos: number;
      cdsInseridos: number;
      duplicada: false;
      ativada: boolean;
      duracaoMs: number;
    }
  | {
      status: "ignorada_duplicada";
      execucaoId: string;
      versao: number;
      produtosInseridos: 0;
      cdsInseridos: 0;
      duplicada: true;
      ativada: false;
      duracaoMs: number;
    }
  | {
      status: "bloqueada_concorrencia";
      execucaoId: string | null;
      mensagem: string;
      duplicada: false;
      ativada: false;
      duracaoMs: number;
    };

type RpcRespostaBruta = {
  status: string;
  execucao_id?: string;
  versao?: number;
  produtos_inseridos?: number;
  cds_inseridos?: number;
  duplicada?: boolean;
  ativada?: boolean;
  duracao_ms?: number;
  mensagem?: string;
};

export type PersistirLoteAtomicoOptions = {
  ativar?: boolean;
};

/**
 * Fluxo de producao — unica RPC PostgreSQL transacional.
 * Nao realiza INSERT direto nas tabelas.
 */
export async function persistirLoteMotorAtomico(
  db: MotorV7Db,
  entrada: PersistenciaEntrada,
  options: PersistirLoteAtomicoOptions = {},
): Promise<PersistenciaAtomicaResultado> {
  const inicioMs = Date.now();
  const validacao = validarEntradaPersistencia(entrada);
  if (!validacao.valido) {
    throw new Error(
      `Lote invalido antes da RPC: ${validacao.erros.map((e) => e.codigo).join(", ")}`,
    );
  }

  const payload = montarPayloadRpc(entrada, options);

  const { data, error } = await db.rpc("persistir_lote_motor_v1", {
    p_regional: payload.regional,
    p_data_referencia: payload.data_referencia,
    p_hash_pacote: payload.hash_pacote,
    p_versao: payload.versao,
    p_quantidade_arquivos: payload.quantidade_arquivos,
    p_produtos: payload.produtos,
    p_cds: payload.cds,
    p_ativar: payload.ativar,
  });

  if (error) {
    throw new Error(`RPC persistir_lote_motor_v1 falhou: ${error.message}`);
  }

  const res = data as RpcRespostaBruta;

  if (res.status === "ignorada_duplicada") {
    return {
      status: "ignorada_duplicada",
      execucaoId: res.execucao_id ?? "",
      versao: res.versao ?? entrada.versao,
      produtosInseridos: 0,
      cdsInseridos: 0,
      duplicada: true,
      ativada: false,
      duracaoMs: res.duracao_ms ?? Date.now() - inicioMs,
    };
  }

  if (res.status === "bloqueada_concorrencia") {
    return {
      status: "bloqueada_concorrencia",
      execucaoId: res.execucao_id ?? null,
      mensagem: res.mensagem ?? "Concorrencia bloqueada",
      duplicada: false,
      ativada: false,
      duracaoMs: res.duracao_ms ?? Date.now() - inicioMs,
    };
  }

  if (res.status !== "persistida") {
    throw new Error(`Resposta RPC inesperada: ${res.status}`);
  }

  return {
    status: "persistida",
    execucaoId: res.execucao_id ?? "",
    versao: res.versao ?? entrada.versao,
    produtosInseridos: res.produtos_inseridos ?? entrada.lote.produtos.length,
    cdsInseridos: res.cds_inseridos ?? entrada.lote.cds.length,
    duplicada: false,
    ativada: res.ativada ?? payload.ativar,
    duracaoMs: res.duracao_ms ?? Date.now() - inicioMs,
  };
}

/** Indica que producao deve usar somente persistirLoteMotorAtomico. */
export const PERSISTENCIA_PRODUCAO_USA_RPC = true as const;
