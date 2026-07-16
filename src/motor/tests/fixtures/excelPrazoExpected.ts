import type { CompareRowInput } from "../compare/compareTypes.ts";

export const EXCEL_PRAZO_FIXTURE: CompareRowInput[] = [
  {
    loja: 103,
    produto: 1001,
    excel: { "Curto Prazo": 1, "Médio Prazo": 0, "Longo Prazo": 0, "Pendência Cpa CD": 0 },
    v7: { "Curto Prazo": 1, "Médio Prazo": 0, "Longo Prazo": 0, "Pendência Cpa CD": 0 },
  },
  {
    loja: 103,
    produto: 1002,
    excel: { "Curto Prazo": 0, "Médio Prazo": 1, "Longo Prazo": 0, "Pendência Cpa CD": 144 },
    v7: { "Curto Prazo": 0, "Médio Prazo": 1, "Longo Prazo": 0, "Pendência Cpa CD": 144 },
  },
  {
    loja: 103,
    produto: 1003,
    excel: { "Curto Prazo": 0, "Médio Prazo": 1, "Longo Prazo": 0, "Pendência Cpa CD": 1 },
    v7: { "Curto Prazo": 0, "Médio Prazo": 1, "Longo Prazo": 0, "Pendência Cpa CD": 1 },
  },
  {
    loja: 103,
    produto: 1004,
    excel: { "Curto Prazo": 0, "Médio Prazo": 0, "Longo Prazo": 1, "Pendência Cpa CD": 0 },
    v7: { "Curto Prazo": 0, "Médio Prazo": 0, "Longo Prazo": 1, "Pendência Cpa CD": 0 },
  },
  {
    loja: 103,
    produto: 1005,
    excel: { "Curto Prazo": 0, "Médio Prazo": 0, "Longo Prazo": 0, "Pendência Cpa CD": 0 },
    v7: { "Curto Prazo": 0, "Médio Prazo": 0, "Longo Prazo": 0, "Pendência Cpa CD": 0 },
  },
  {
    loja: 103,
    produto: 1006,
    excel: { "Curto Prazo": 0, "Médio Prazo": 0, "Longo Prazo": 0, "Pendência Cpa CD": 0 },
    v7: { "Curto Prazo": 0, "Médio Prazo": 0, "Longo Prazo": 1, "Pendência Cpa CD": 0 },
  },
];
