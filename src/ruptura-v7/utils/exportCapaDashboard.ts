import * as XLSX from "xlsx";
import { DIVISOES_DASHBOARD } from "../constants/dashboardDivisoes.ts";
import { escopoCapaRestrito } from "./capaExportContext.ts";
import type {
  RupturaCapaLinha,
  RupturaCapaResultado,
  RupturaCompradorResultado,
  RupturaLojaResultado,
} from "./agregarCapaFromGestao.ts";

export type CapaDashboardVariant = "capa" | "loja" | "comprador";

export type CapaExportContext = {
  regional: string;
  bandeira?: string | null;
  lojas?: number[];
  compradores?: string[];
  /** true = filtro “Todas as lojas” (lojas vazio no ctx). */
  todasLojas?: boolean;
  /** true = filtro “Todos os compradores”. */
  todosCompradores?: boolean;
  rotuloLojas?: string;
  rotuloCompradores?: string;
  dataReferencia: string;
  variant: CapaDashboardVariant;
};

export type CapaExportRow = Record<string, string | number | null>;

const COLUNAS_EXPORT: { key: keyof CapaExportRow; label: string }[] = [
  { key: "nivel", label: "Nível" },
  { key: "divisao", label: "Divisão" },
  { key: "comprador", label: "Comprador" },
  { key: "setor", label: "Setor" },
  { key: "produtos", label: "PRODUTOS" },
  { key: "skus", label: "SKU'S" },
  { key: "ruptura", label: "RUPTURA" },
  { key: "pct_ruptura", label: "% Ruptura" },
  { key: "cp", label: "CP" },
  { key: "cross", label: "Cross" },
  { key: "estq_cd", label: "Estq. CD" },
  { key: "rebto", label: "Rebto" },
  { key: "dias_receb", label: "Dias Receb." },
  { key: "pct_cp", label: "% CP" },
  { key: "mp", label: "MP" },
  { key: "gt30", label: ">30d" },
  { key: "gt60", label: ">60d" },
  { key: "dias_ped", label: "Dias Ped." },
  { key: "pct_mp", label: "% MP" },
  { key: "lp", label: "LP" },
  { key: "r30", label: "30d s/ ped." },
  { key: "dias_ult", label: "Dias Últ." },
  { key: "pct_lp", label: "% LP" },
  { key: "rup_inv", label: "Rup. Inv." },
  { key: "pct_imp", label: "% Imp." },
  { key: "pct_sinv", label: "% s/ Inv." },
  { key: "pend", label: "Pend." },
  { key: "pct_sp", label: "% s/ pend." },
];

function linhaToExportRow(
  l: RupturaCapaLinha,
  nivel: string,
  ctx: { divisao?: string; comprador?: string; setor?: string },
): CapaExportRow {
  const pendPct =
    l.total_ruptura > 0 ? Math.round((l.itens_vda_pendencia / l.total_ruptura) * 10000) / 100 : null;
  return {
    nivel,
    divisao: ctx.divisao ?? l.divisao ?? "",
    comprador: ctx.comprador ?? "",
    setor: ctx.setor ?? (nivel === "setor" ? l.nome : ""),
    produtos: l.nome,
    skus: l.total_skus,
    ruptura: l.total_ruptura,
    pct_ruptura: l.pct_ruptura,
    cp: l.total_curto_prazo,
    cross: l.itens_cross,
    estq_cd: l.havia_estoque_cd,
    rebto: l.rebto_proximo,
    dias_receb: l.media_dias_recebimento_cd,
    pct_cp: l.pct_curto_prazo,
    mp: l.total_medio_prazo,
    gt30: l.pedido_maior_30,
    gt60: l.pedido_maior_60,
    dias_ped: l.media_dias_pedido,
    pct_mp: l.pct_medio_prazo,
    lp: l.total_longo_prazo,
    r30: l.ruptura_30_dias_sem_pedido,
    dias_ult: l.media_dias_ultimo_pedido,
    pct_lp: l.pct_longo_prazo,
    rup_inv: l.itens_ruptura_via_inventario,
    pct_imp: l.pct_impacto_inventario,
    pct_sinv: l.pct_ruptura_sem_inventario,
    pend: l.itens_vda_pendencia,
    pct_sp: l.pct_rup_sem_pendencia_vda ?? pendPct,
  };
}


function compradoresPermitidos(ctx?: Pick<CapaExportContext, "compradores" | "todosCompradores">): Set<string> | null {
  if (ctx?.todosCompradores) return null;
  if (!ctx?.compradores?.length) return null;
  return new Set(ctx.compradores);
}

function lojasPermitidas(ctx?: Pick<CapaExportContext, "lojas" | "todasLojas">): Set<string> | null {
  if (ctx?.todasLojas) return null;
  if (!ctx?.lojas?.length) return null;
  return new Set(ctx.lojas.map(String));
}

function omitirDivisaoSemDados(linha: RupturaCapaLinha | undefined, escopoFiltrado: boolean): boolean {
  if (!linha) return true;
  return escopoFiltrado && linha.total_skus === 0;
}

/** Hierarquia da tabela CAPA (mesmos filtros do dashboard) — não exporta base SKU. */
export function flattenCapaDashboardForExport(
  data: RupturaCapaResultado | RupturaCompradorResultado | RupturaLojaResultado,
  variant: CapaDashboardVariant,
  ctx?: Pick<
    CapaExportContext,
    "compradores" | "lojas" | "todasLojas" | "todosCompradores" | "rotuloLojas" | "rotuloCompradores"
  >,
): CapaExportRow[] {
  const rows: CapaExportRow[] = [];
  const compSet = compradoresPermitidos(ctx);
  const lojaSet = lojasPermitidas(ctx);
  const escopoFiltrado = escopoCapaRestrito(ctx);

  if (variant === "loja") {
    const d = data as RupturaLojaResultado;
    for (const l of d.linhas) {
      if (lojaSet && !lojaSet.has(l.nome)) continue;
      rows.push(linhaToExportRow(l, "loja", {}));
    }
    rows.push(linhaToExportRow(d.total, "total", {}));
    return rows;
  }

  if (variant === "comprador") {
    const d = data as RupturaCompradorResultado;
    for (const div of DIVISOES_DASHBOARD) {
      const divLinha = d.linhas.find((l) => l.nome === div);
      if (omitirDivisaoSemDados(divLinha, escopoFiltrado)) continue;
      rows.push(linhaToExportRow(divLinha!, "divisao", { divisao: div }));
      for (const c of d.compradoresPorDivisao.get(div) ?? []) {
        if (compSet && !compSet.has(c.nome)) continue;
        rows.push(linhaToExportRow(c, "comprador", { divisao: div, comprador: c.nome }));
        const compKey = `${div}|${c.nome}`;
        for (const f of d.fornecedoresPorComprador.get(compKey) ?? []) {
          rows.push(linhaToExportRow(f, "fornecedor", { divisao: div, comprador: c.nome }));
        }
      }
    }
    rows.push(linhaToExportRow(d.total, "total", {}));
    return rows;
  }

  const d = data as RupturaCapaResultado;
  for (const div of DIVISOES_DASHBOARD) {
    const divLinha = d.linhas.find((l) => l.nome === div);
    if (omitirDivisaoSemDados(divLinha, escopoFiltrado)) continue;
    rows.push(linhaToExportRow(divLinha!, "divisao", { divisao: div }));
    for (const s of d.setoresPorDivisao.get(div) ?? []) {
      rows.push(linhaToExportRow(s, "setor", { divisao: div, setor: s.nome }));
    }
  }
  rows.push(linhaToExportRow(d.total, "total", {}));
  return rows;
}

function metaLinhas(ctx: CapaExportContext): string[][] {
  const lojasTxt = ctx.rotuloLojas ?? (ctx.lojas?.length ? ctx.lojas.join(", ") : "Todas as lojas");
  const compsTxt = ctx.rotuloCompradores ?? (ctx.compradores?.length ? ctx.compradores.join(", ") : "Todos os compradores");
  const titulo =
    ctx.variant === "comprador"
      ? "COMPRADOR — Ruptura por grupo"
      : ctx.variant === "loja"
        ? "LOJA — Ruptura por loja"
        : "CAPA — Ruptura por grupo";
  return [
    ["RUPTURA COMPER MT (SORTIMENTO LIMPO <= 02 UNIDADES)"],
    [titulo],
    [`Data referência: ${ctx.dataReferencia}`],
    [`Regional: ${ctx.regional}`, `Bandeira: ${ctx.bandeira ?? "Todas"}`, `Loja(s): ${lojasTxt}`],
    ...(ctx.variant === "comprador" ? [[`Comprador(es): ${compsTxt}`]] : []),
    [],
  ];
}

export function nomeArquivoCapaExport(ctx: CapaExportContext, formato: "xlsx" | "csv"): string {
  const lojas = ctx.todasLojas
    ? "todas"
    : ctx.lojas?.length
      ? ctx.lojas.length <= 3
        ? ctx.lojas.join("-")
        : `${ctx.lojas.length}lojas`
      : "todas";
  const comps =
    ctx.variant === "comprador" && !ctx.todosCompradores && ctx.compradores?.length
      ? ctx.compradores.length <= 2
        ? ctx.compradores.join("-").replace(/[^\w-]+/g, "_")
        : `${ctx.compradores.length}comps`
      : "";
  const parts = ["ruptura", ctx.variant, ctx.regional, ctx.bandeira ?? "band", lojas, comps, ctx.dataReferencia].filter(
    Boolean,
  );
  return `${parts.join("_")}.${formato}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCapaDashboardArquivo(input: {
  data: RupturaCapaResultado | RupturaCompradorResultado | RupturaLojaResultado;
  ctx: CapaExportContext;
  formato: "xlsx" | "csv";
}): { ok: boolean; filename: string; linhas: number } {
  const rows = flattenCapaDashboardForExport(input.data, input.ctx.variant, input.ctx);
  const headers = COLUNAS_EXPORT.map((c) => c.label);
  const filename = nomeArquivoCapaExport(input.ctx, input.formato);

  if (input.formato === "csv") {
    const meta = metaLinhas(input.ctx).map((r) => `# ${r.join(" | ")}`.trim());
    const body = [
      ...meta,
      headers.join(";"),
      ...rows.map((r) =>
        COLUNAS_EXPORT.map((c) => {
          const v = r[c.key];
          if (v == null) return "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        }).join(";"),
      ),
    ].join("\n");
    downloadBlob(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }), filename);
    return { ok: true, filename, linhas: rows.length };
  }

  const aoa: (string | number | null)[][] = [
    ...metaLinhas(input.ctx),
    headers,
    ...rows.map((r) => COLUNAS_EXPORT.map((c) => r[c.key] ?? null)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, input.ctx.variant === "comprador" ? "Comprador" : "CAPA");
  XLSX.writeFile(wb, filename);
  return { ok: true, filename, linhas: rows.length };
}
