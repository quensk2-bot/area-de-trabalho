import * as XLSX from "xlsx";
import type { RupturaFiltrosProdutos } from "../types/rupturaFiltrosTypes.ts";
import { RUPTURA_EXPORT_BATCH, RUPTURA_EXPORT_MAX_ROWS } from "../types/rupturaFiltrosTypes.ts";
import { consultarProdutosLote, contarProdutosFiltrados } from "../services/rupturaProdutosService.ts";
import { montarLinhasExport } from "./rupturaExportFormat.ts";

export { montarLinhasExport } from "./rupturaExportFormat.ts";

export async function exportarProdutosCsvXlsx(input: {
  filtros: RupturaFiltrosProdutos;
  formato: "csv" | "xlsx";
  onProgress?: (atual: number, total: number) => void;
}): Promise<{ ok: boolean; erro?: string; filename?: string }> {
  const { total, erro: erroCount } = await contarProdutosFiltrados(input.filtros);
  if (erroCount) return { ok: false, erro: erroCount.message };
  if (total > RUPTURA_EXPORT_MAX_ROWS) {
    return { ok: false, erro: `Exportação limitada a ${RUPTURA_EXPORT_MAX_ROWS} linhas. Refine os filtros.` };
  }

  const acumulado = [];
  for (let offset = 0; offset < total; offset += RUPTURA_EXPORT_BATCH) {
    const lote = await consultarProdutosLote({
      filtros: input.filtros,
      offset,
      limite: RUPTURA_EXPORT_BATCH,
    });
    if (lote.erro) return { ok: false, erro: lote.erro.message };
    acumulado.push(...lote.dados);
    input.onProgress?.(Math.min(offset + RUPTURA_EXPORT_BATCH, total), total);
  }

  const rows = montarLinhasExport(acumulado, input.filtros);
  const stamp = `${input.filtros.regional}_${input.filtros.loja}_${input.filtros.dataReferencia}`;
  const filename = `ruptura_gestao_${stamp}.${input.formato}`;

  if (input.formato === "csv") {
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(";"))].join("\n");
    downloadBlob(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), filename);
    return { ok: true, filename };
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Gestao");
  XLSX.writeFile(wb, filename);
  return { ok: true, filename };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
