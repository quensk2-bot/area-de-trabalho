import type { MotorV7Db, PersistenciaEntrada, PersistenciaResultado } from "./persistenciaTypes.ts";
import { persistirLoteMotorAtomico } from "./persistenciaAtomica.ts";

export type PersistirLoteOptions = {
  /** Se true, ativa a execucao ao final (substituindo versao anterior). */
  ativar?: boolean;
};

/**
 * Fluxo de producao — delega para RPC atomica PostgreSQL.
 */
export async function persistirLoteMotor(
  db: MotorV7Db,
  entrada: PersistenciaEntrada,
  options: PersistirLoteOptions = {},
): Promise<PersistenciaResultado> {
  const resultado = await persistirLoteMotorAtomico(db, entrada, options);

  if (resultado.status === "bloqueada_concorrencia") {
    return {
      status: "bloqueada_concorrencia",
      mensagem: resultado.mensagem,
    };
  }

  if (resultado.status === "ignorada_duplicada") {
    return {
      status: "ignorada_duplicada",
      execucaoMotorId: resultado.execucaoId,
      versao: resultado.versao,
      hashPacote: entrada.hashPacote,
    };
  }

  return {
    status: "persistida",
    execucaoMotorId: resultado.execucaoId,
    versao: resultado.versao,
    quantidadeProdutos: resultado.produtosInseridos,
    quantidadeCds: resultado.cdsInseridos,
  };
}

export { validarEntradaPersistencia } from "./persistenciaValidator.ts";
