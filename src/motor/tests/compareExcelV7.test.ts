import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compararCampo, compararExcelV7 } from "../compare/compareExcelV7.ts";
import { formatarRelatorioDivergencias } from "../compare/divergenceReport.ts";
import { CAMPOS_PRIORITARIOS_COMPARE } from "../compare/compareTypes.ts";
import { EXCEL_PRAZO_FIXTURE } from "./fixtures/excelPrazoExpected.ts";

describe("compare Excel × V7", () => {
  it("21. comparação igual", () => {
    const r = compararCampo("Base Limpa", "Base Limpa", "Base Limpa", { campo: "Base Limpa", comparavelNestaEtapa: true });
    assert.equal(r.status, "igual");
  });

  it("22. comparação divergente", () => {
    const r = compararCampo("Menor que três", 1, 0, { campo: "Menor que três", comparavelNestaEtapa: true });
    assert.equal(r.status, "divergente");
  });

  it("23. campo ausente", () => {
    const r = compararCampo("Curto Prazo", 1, null, { campo: "Curto Prazo", comparavelNestaEtapa: false });
    assert.equal(r.status, "nao_comparavel");

    const ausenteV7 = compararCampo("Soma_EstoqueCD", 10, null, { campo: "Soma_EstoqueCD", comparavelNestaEtapa: true });
    assert.equal(ausenteV7.status, "ausente_no_v7");
  });

  it("24. tolerância decimal", () => {
    const r = compararCampo("Soma_EstoqueCD", 10.004, 10.001, { campo: "Soma_EstoqueCD", comparavelNestaEtapa: true, toleranciaDecimal: 0.01 });
    assert.equal(r.status, "tolerancia_decimal");
  });

  it("harness agregado com campos prioritários", () => {
    const resultado = compararExcelV7(
      [
        {
          loja: 103,
          produto: 2505088,
          excel: {
            "Base Limpa": "Base Limpa",
            "Menor que três": 1,
            "Curto Prazo": 1,
          },
          v7: {
            "Base Limpa": "Base Limpa",
            "Menor que três": 0,
            "Curto Prazo": null,
          },
        },
      ],
      CAMPOS_PRIORITARIOS_COMPARE,
    );

    assert.equal(resultado.resumo.totalLinhas, 1);
    assert.ok(resultado.resumo.divergentes >= 1);
    assert.ok(formatarRelatorioDivergencias(resultado).includes("Menor que três"));
  });

  it("comparação CP/MP/LP com fixture Excel", () => {
    const campos = CAMPOS_PRIORITARIOS_COMPARE.filter((c) =>
      ["Curto Prazo", "Médio Prazo", "Longo Prazo", "Pendência Cpa CD"].includes(c.campo),
    );
    const iguais = compararExcelV7(EXCEL_PRAZO_FIXTURE.slice(0, 5), campos);
    assert.equal(iguais.resumo.divergentes, 0);

    const divergente = compararExcelV7(EXCEL_PRAZO_FIXTURE.slice(5), campos);
    assert.ok(divergente.resumo.divergentes >= 1);
    assert.ok(formatarRelatorioDivergencias(divergente).includes("Longo Prazo"));
  });
});
