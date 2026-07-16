import type { MotorStandardizeContrato } from "./standardizeTypes.ts";
import { compradoresContract } from "./compradoresContract.ts";
import { estruturaFakeContract } from "./estruturaFakeContract.ts";
import { ordemCdsContract } from "./ordemCdsContract.ts";
import { regrasContract } from "./regrasContract.ts";
import { validacaoRupturaContract } from "./validacaoRupturaContract.ts";

export const STANDARD_CONTRACTS: MotorStandardizeContrato[] = [
  validacaoRupturaContract,
  ordemCdsContract,
  compradoresContract,
  regrasContract,
  estruturaFakeContract,
];

export function obterContratoPorTipo(tipo: MotorStandardizeContrato["tipo"]): MotorStandardizeContrato {
  const contrato = STANDARD_CONTRACTS.find((c) => c.tipo === tipo);
  if (!contrato) throw new Error(`Contrato não encontrado: ${tipo}`);
  return contrato;
}

export { validacaoRupturaContract, ordemCdsContract, compradoresContract, regrasContract, estruturaFakeContract };
