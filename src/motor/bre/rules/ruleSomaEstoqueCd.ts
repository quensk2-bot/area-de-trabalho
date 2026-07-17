import type { MotorBreItemInput, MotorRegraResultado } from "../breTypes.ts";
import { somarEstoqueCds } from "../../cds/rules/somarEstoqueCds.ts";
import { unificarCdsBre } from "../../cds/unificarCdsBre.ts";

function num(value: number | null | undefined): number {
  return value ?? 0;
}

export function calcularSomaEstoqueCdLegado(input: MotorBreItemInput): number {
  return (
    num(input.produto.estoqueCd1) +
    num(input.produto.estoqueCd2) +
    num(input.produto.estoqueCd3) +
    num(input.produto.estoqueCd4) +
    num(input.cd5?.estoqueCd5)
  );
}

export function calcularSomaEstoqueCd(input: MotorBreItemInput): number {
  const cds = unificarCdsBre(input);
  return somarEstoqueCds(cds);
}

export function aplicarRuleSomaEstoqueCd(input: MotorBreItemInput): MotorRegraResultado {
  const soma = calcularSomaEstoqueCd(input);
  const cds = unificarCdsBre(input);

  return {
    regra: "soma_estoque_cd",
    status: "aplicada",
    resultado: soma,
    entradasUtilizadas: {
      estoqueCd1: cds.find((c) => c.posicaoLogica === 1)?.estoque ?? input.produto.estoqueCd1,
      estoqueCd2: cds.find((c) => c.posicaoLogica === 2)?.estoque ?? input.produto.estoqueCd2,
      estoqueCd3: cds.find((c) => c.posicaoLogica === 3)?.estoque ?? input.produto.estoqueCd3,
      estoqueCd4: cds.find((c) => c.posicaoLogica === 4)?.estoque ?? input.produto.estoqueCd4,
      estoqueCd5: cds.find((c) => c.posicaoLogica === 5)?.estoque ?? input.cd5?.estoqueCd5 ?? null,
    },
    motivo: "Soma dinâmica sobre cds[] — equivalência CD1..CD5",
    alertas: input.cd5 == null ? [{ codigo: "CD5_AUSENTE", mensagem: "CD5 não encontrado — soma parcial CD1..4", severidade: "aviso" }] : [],
    dependenciasAusentes: input.cd5 ? [] : [{ nome: "grupo_cds_2", descricao: "2º Grupo CDs para ESTQ_CD5" }],
  };
}
