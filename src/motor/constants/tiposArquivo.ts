export const MOTOR_TIPOS_ARQUIVO = [
  "grupo_ruptura_1",
  "grupo_cds_2",
  "inventario_lojas",
  "validacao_ruptura",
] as const;

export type MotorTipoArquivo = (typeof MOTOR_TIPOS_ARQUIVO)[number];

export function isMotorTipoArquivo(value: string): value is MotorTipoArquivo {
  return (MOTOR_TIPOS_ARQUIVO as readonly string[]).includes(value);
}
