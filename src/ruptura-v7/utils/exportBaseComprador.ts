import * as XLSX from "xlsx";
import { COLUNAS_BASE_COMPRADOR, type BaseCompradorLinha } from "./baseCompradorTypes.ts";

export type BaseCompradorExportContext = {
  regional: string;
  bandeira?: string | null;
  dataReferencia: string;
  rotuloLojas?: string;
  rotuloCompradores?: string;
  rotuloDepartamentos?: string;
  rotuloSecoes?: string;
  rotuloCategorias?: string;
  busca?: string;
};

function metaLinhas(ctx: BaseCompradorExportContext): string[][] {
  return [
    ["ESTRUTURA MERCADOLÓGICA POR COMPRADOR — BASE_COMPRADOR"],
    [`Data referência: ${ctx.dataReferencia}`],
    [
      `Regional: ${ctx.regional}`,
      `Bandeira: ${ctx.bandeira ?? "—"}`,
      `Loja(s): ${ctx.rotuloLojas ?? "—"}`,
    ],
    [`Comprador(es): ${ctx.rotuloCompradores ?? "Todos"}`],
    [`Departamento: ${ctx.rotuloDepartamentos ?? "Todos"}`],
    [`Seção: ${ctx.rotuloSecoes ?? "Todos"}`],
    [`Categoria: ${ctx.rotuloCategorias ?? "Todas"}`],
    [`Busca: ${ctx.busca || "—"}`],
    [],
  ];
}

export function nomeArquivoBaseCompradorExport(ctx: BaseCompradorExportContext, formato: "xlsx" | "csv"): string {
  const parts = ["base_comprador", ctx.regional, ctx.bandeira ?? "band", ctx.dataReferencia].filter(Boolean);
  return `${parts.join("_")}.${formato}`;
}

function valorColuna(l: BaseCompradorLinha, key: (typeof COLUNAS_BASE_COMPRADOR)[number]["key"]): string | number {
  return l[key];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBaseCompradorArquivo(input: {
  linhas: BaseCompradorLinha[];
  ctx: BaseCompradorExportContext;
  formato: "xlsx" | "csv";
}): { ok: boolean; filename: string; linhas: number } {
  const headers = COLUNAS_BASE_COMPRADOR.map((c) => c.label);
  const filename = nomeArquivoBaseCompradorExport(input.ctx, input.formato);

  if (input.formato === "csv") {
    const meta = metaLinhas(input.ctx).map((r) => `# ${r.join(" | ")}`.trim());
    const body = [
      ...meta,
      headers.join(";"),
      ...input.linhas.map((r) =>
        COLUNAS_BASE_COMPRADOR.map((c) => {
          const v = valorColuna(r, c.key);
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        }).join(";"),
      ),
    ].join("\n");
    downloadBlob(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }), filename);
    return { ok: true, filename, linhas: input.linhas.length };
  }

  const aoa: (string | number)[][] = [
    ...metaLinhas(input.ctx),
    headers,
    ...input.linhas.map((r) => COLUNAS_BASE_COMPRADOR.map((c) => valorColuna(r, c.key))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BASE_COMPRADOR");
  XLSX.writeFile(wb, filename);
  return { ok: true, filename, linhas: input.linhas.length };
}
