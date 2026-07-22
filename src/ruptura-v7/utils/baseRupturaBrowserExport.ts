import * as XLSX from "xlsx";
import { CABECALHOS_BASE_RUPTURA } from "../../motor/export/baseRuptura/baseRupturaColumns.ts";
import type { BaseRupturaLinha, ResumoProcessamentoBase } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import { gerarResumoProcessamento } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";
import type { ErroValidacaoExport } from "../../motor/export/baseRuptura/baseRupturaTypes.ts";

export type LojaSelecionadaExport = {
  loja: number;
  bandeira: string;
  publicada: boolean;
};

export type MontarWorkbookBaseInput = {
  linhas: BaseRupturaLinha[];
  resumo: ResumoProcessamentoBase;
  lojasSelecionadas?: LojaSelecionadaExport[];
  errosValidacao?: ErroValidacaoExport[];
  cdsDinamicos?: Record<string, string | number | null>[];
  incluirCdsDinamicos?: boolean;
};

function aplicarEstiloBase(ws: XLSX.WorkSheet, totalColunas: number, totalLinhas: number) {
  const ultimaCol = XLSX.utils.encode_col(Math.max(0, totalColunas - 1));
  const ultimaLinha = Math.max(1, totalLinhas);
  ws["!autofilter"] = { ref: `A1:${ultimaCol}${ultimaLinha}` };
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}

export function montarWorkbookBaseRuptura(input: MontarWorkbookBaseInput): XLSX.WorkBook {
  const rowsBase = input.linhas.map((linha) => CABECALHOS_BASE_RUPTURA.map((h) => linha[h] ?? null));
  const wsBase = XLSX.utils.aoa_to_sheet([CABECALHOS_BASE_RUPTURA, ...rowsBase]);
  aplicarEstiloBase(wsBase, CABECALHOS_BASE_RUPTURA.length, rowsBase.length + 1);

  const resumoRows = gerarResumoProcessamento(input.resumo);
  const wsResumo = XLSX.utils.json_to_sheet(resumoRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsBase, "BASE");
  XLSX.utils.book_append_sheet(wb, wsResumo, "RESUMO_PROCESSAMENTO");

  if (input.lojasSelecionadas?.length) {
    const wsLojas = XLSX.utils.json_to_sheet(
      input.lojasSelecionadas.map((l) => ({
        loja: l.loja,
        bandeira: l.bandeira,
        publicada: l.publicada ? "sim" : "nao",
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsLojas, "LOJAS_SELECIONADAS");
  }

  if (input.resumo.camposAusentes.length > 0) {
    const wsCampos = XLSX.utils.json_to_sheet(
      input.resumo.camposAusentes.map((coluna) => ({
        coluna,
        tipo: coluna.includes("%") || coluna.includes("Sku") ? "ausente_v7" : "sem_fonte_json",
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsCampos, "CAMPOS_AUSENTES");
  }

  if (input.incluirCdsDinamicos && input.cdsDinamicos?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(input.cdsDinamicos), "CDS_DINAMICOS");
  }

  const erros = input.errosValidacao ?? [];
  if (erros.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        erros.map((e) => ({
          etapa: e.etapa,
          arquivo: e.arquivo,
          linha: e.linha,
          produto: e.produto,
          codigo: e.codigo,
          severidade: e.severidade,
          mensagem: e.mensagem,
          acao_recomendada: e.acaoRecomendada,
        })),
      ),
      "ERROS_VALIDACAO",
    );
  }

  return wb;
}

export function gerarCsvBaseRuptura(linhas: BaseRupturaLinha[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const linhasCsv = [
    CABECALHOS_BASE_RUPTURA.join(";"),
    ...linhas.map((row) => CABECALHOS_BASE_RUPTURA.map((h) => escape(row[h])).join(";")),
  ];
  return "\ufeff" + linhasCsv.join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadWorkbookXlsx(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true });
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export function downloadCsvBaseRuptura(csv: string, filename: string) {
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}
