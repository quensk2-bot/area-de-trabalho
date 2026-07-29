import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORMULA_FILTRO_UNIVERSO_OFICIAL_PQ,
  contarUniversoOficialCompativel,
  filtrarUniversoOficialCompativel,
} from "../export/hibrido/filtrarUniversoOficialCompativel.ts";

type Produto = {
  seqproduto: number;
  baseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  geraRuptura?: boolean | null;
  classificacaoPrazo?: string | null;
};

describe("filtrarUniversoOficialCompativel — PQ literal", () => {
  it("expõe fórmula literal Filtrar_BaseLimpa&GeraRuptura", () => {
    assert.equal(
      FORMULA_FILTRO_UNIVERSO_OFICIAL_PQ,
      'Table.SelectRows(FlagRuptura104C, each ([Status Base Limpa] = "Base Limpa"))',
    );
  });

  it("inclui Base Limpa com Gera Ruptura", () => {
    const produtos: Produto[] = [
      { seqproduto: 1, baseLimpa: "Base Limpa", geraRuptura: true, classificacaoPrazo: "curto_prazo" },
    ];
    assert.equal(filtrarUniversoOficialCompativel(produtos).length, 1);
  });

  it("exclui fora Base Limpa (setor excluído)", () => {
    const produtos: Produto[] = [
      { seqproduto: 2, baseLimpa: "Não considera Ruptura", geraRuptura: true },
    ];
    assert.equal(filtrarUniversoOficialCompativel(produtos).length, 0);
  });

  it("inclui Base Limpa mesmo sem Gera Ruptura (PQ não filtra Flag Ruptura)", () => {
    const produtos: Produto[] = [
      { seqproduto: 3, baseLimpa: "Base Limpa", geraRuptura: false, classificacaoPrazo: "sem_ruptura" },
    ];
    assert.equal(filtrarUniversoOficialCompativel(produtos).length, 1);
  });

  it("inclui bloqueado em Base Limpa", () => {
    const produtos: Produto[] = [
      { seqproduto: 4, baseLimpa: "Base Limpa", geraRuptura: true, classificacaoPrazo: "bloqueado" },
    ];
    assert.equal(filtrarUniversoOficialCompativel(produtos).length, 1);
  });

  it("exclui sem ruptura fora Base Limpa", () => {
    const produtos: Produto[] = [
      { seqproduto: 5, baseLimpa: "Não considera Ruptura", classificacaoPrazo: "sem_ruptura" },
      { seqproduto: 6, baseLimpa: null, classificacaoPrazo: "sem_ruptura" },
    ];
    assert.equal(contarUniversoOficialCompativel(produtos), 0);
  });
});
