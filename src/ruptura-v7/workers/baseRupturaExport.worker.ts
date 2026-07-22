import * as XLSX from "xlsx";
import {
  gerarCsvBaseRuptura,
  montarWorkbookBaseRuptura,
  type LojaSelecionadaExport,
} from "../utils/baseRupturaBrowserExport.ts";
import type { BaseRupturaLinha, ResumoProcessamentoBase } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";

type WorkerInput = {
  linhas: BaseRupturaLinha[];
  resumo: ResumoProcessamentoBase;
  lojasSelecionadas: LojaSelecionadaExport[];
  cdsDinamicos: Record<string, string | number | null>[];
  formato: "xlsx" | "csv";
  incluirCdsDinamicos: boolean;
};

self.onmessage = (ev: MessageEvent<WorkerInput>) => {
  const input = ev.data;
  try {
    if (input.formato === "csv") {
      const csv = gerarCsvBaseRuptura(input.linhas);
      self.postMessage({ ok: true, csv, linhas: input.linhas.length });
      return;
    }

    const wb = montarWorkbookBaseRuptura({
      linhas: input.linhas,
      resumo: input.resumo,
      lojasSelecionadas: input.lojasSelecionadas,
      cdsDinamicos: input.cdsDinamicos,
      incluirCdsDinamicos: input.incluirCdsDinamicos,
    });
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true });
    self.postMessage({ ok: true, buffer, linhas: input.linhas.length }, [buffer]);
  } catch (e) {
    self.postMessage({ ok: false, erro: e instanceof Error ? e.message : String(e) });
  }
};

export {};
