import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";

export function aplicarRuleInventario(input: MotorBreItemInput): MotorRegraResultado[] {
  const inventarioUnid = input.inventario?.inventarioUnid ?? 0;
  const ruptura104c = input.validacao?.ruptura104c === true;

  const rupturaInventario = ruptura104c && inventarioUnid > 0 ? 1 : 0;
  const rupturaSemInventario = ruptura104c && rupturaInventario === 0 ? 1 : 0;

  const baseEntradas = {
    ruptura104c,
    inventarioUnid,
    inventarioEncontrado: input.inventario != null,
  };

  return [
    {
      regra: "inventario_unid",
      status: "aplicada",
      resultado: inventarioUnid,
      entradasUtilizadas: baseEntradas,
      motivo: input.inventario ? "Inventário agrupado carregado" : "Sem inventário para o par loja+produto",
      alertas: [],
      dependenciasAusentes: input.inventario ? [] : [{ nome: "inventario_lojas", descricao: "Inventário agrupado" }],
    },
    {
      regra: "ruptura_inventario",
      status: "aplicada",
      resultado: rupturaInventario,
      entradasUtilizadas: baseEntradas,
      motivo: rupturaInventario === 1 ? "Ruptura 104C com inventário > 0" : "Sem ruptura com inventário",
      alertas: [],
      dependenciasAusentes: [],
    },
    {
      regra: "ruptura_sem_inventario",
      status: "aplicada",
      resultado: rupturaSemInventario,
      entradasUtilizadas: baseEntradas,
      motivo: rupturaSemInventario === 1 ? "Ruptura 104C sem inventário ativo" : "Não aplicável",
      alertas: [],
      dependenciasAusentes: [],
    },
  ];
}
