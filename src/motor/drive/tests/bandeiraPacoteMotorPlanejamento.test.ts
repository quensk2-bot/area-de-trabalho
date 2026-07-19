import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANDEIRA_PASTA_COMPARTILHADOS,
  BANDEIRAS_PACOTE_MOTOR,
  formatarChavePacoteMotorFutura,
  isBandeiraPacoteMotor,
  montarChaveIdempotenciaMotorFutura,
  segmentosPastaMotorOriginaisComBandeira,
} from "../bandeiraPacoteMotorPlanejamento.ts";

describe("bandeiraPacoteMotorPlanejamento — stub futuro", () => {
  it("bandeiras operacionais incluem COMPER e FORT sem exclusividade", () => {
    assert.deepEqual([...BANDEIRAS_PACOTE_MOTOR], ["COMPER", "FORT"]);
  });

  it("segmentos Drive futuros por bandeira", () => {
    assert.deepEqual(segmentosPastaMotorOriginaisComBandeira("MT", 2026, 7, "COMPER"), [
      "V7",
      "Motor Operacional",
      "MT",
      "2026",
      "07",
      "COMPER",
      "originais",
    ]);
    assert.deepEqual(segmentosPastaMotorOriginaisComBandeira("MT", 2026, 7, BANDEIRA_PASTA_COMPARTILHADOS), [
      "V7",
      "Motor Operacional",
      "MT",
      "2026",
      "07",
      "COMPARTILHADOS",
      "originais",
    ]);
  });

  it("chave pacote distingue bandeiras com mesmo hash", () => {
    const base = {
      regional: "MT",
      competencia: "2026-07-01",
      dataReferencia: "2026-07-13",
      hashPacote: "abc123",
    };
    const comper = formatarChavePacoteMotorFutura({ ...base, bandeira: "COMPER" });
    const fort = formatarChavePacoteMotorFutura({ ...base, bandeira: "FORT" });
    assert.notEqual(comper, fort);
  });

  it("idempotência futura inclui bandeira", () => {
    const k = montarChaveIdempotenciaMotorFutura({
      regional: "MT",
      bandeira: "FORT",
      dataReferencia: "2026-07-13",
      tipoArquivo: "rede",
      hashSha256: "deadbeef",
    });
    assert.match(k, /FORT/);
    assert.match(k, /rede/);
  });

  it("isBandeiraPacoteMotor aceita ambas bandeiras", () => {
    assert.equal(isBandeiraPacoteMotor("COMPER"), true);
    assert.equal(isBandeiraPacoteMotor("fort"), true);
    assert.equal(isBandeiraPacoteMotor("COMPARTILHADO"), false);
  });
});
