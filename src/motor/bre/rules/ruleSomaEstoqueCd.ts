import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";

function num(value: number | null | undefined): number {
  return value ?? 0;
}

export function calcularSomaEstoqueCd(input: MotorBreItemInput): number {
  return (
    num(input.produto.estoqueCd1) +
    num(input.produto.estoqueCd2) +
    num(input.produto.estoqueCd3) +
    num(input.produto.estoqueCd4) +
    num(input.cd5?.estoqueCd5)
  );
}

export function aplicarRuleSomaEstoqueCd(input: MotorBreItemInput): MotorRegraResultado {
  const soma = calcularSomaEstoqueCd(input);

  return {
    regra: "soma_estoque_cd",
    status: "aplicada",
    resultado: soma,
    entradasUtilizadas: {
      estoqueCd1: input.produto.estoqueCd1,
      estoqueCd2: input.produto.estoqueCd2,
      estoqueCd3: input.produto.estoqueCd3,
      estoqueCd4: input.produto.estoqueCd4,
      estoqueCd5: input.cd5?.estoqueCd5 ?? null,
    },
    motivo: "Soma CD1..CD5 conforme código M",
    alertas: input.cd5 == null ? [{ codigo: "CD5_AUSENTE", mensagem: "CD5 não encontrado — soma parcial CD1..4", severidade: "aviso" }] : [],
    dependenciasAusentes: input.cd5 ? [] : [{ nome: "grupo_cds_2", descricao: "2º Grupo CDs para ESTQ_CD5" }],
  };
}
