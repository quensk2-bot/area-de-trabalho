import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DivisaoDashboard } from "../constants/dashboardDivisoes.ts";
import { DIVISOES_DASHBOARD } from "../constants/dashboardDivisoes.ts";
import type { RupturaCapaLinha, RupturaCapaResultado, RupturaCompradorResultado, RupturaLojaResultado } from "../utils/agregarCapaFromGestao.ts";
import { theme } from "../../styles.ts";
import { formatNumero, formatPercentual } from "./rupturaSharedStyles.ts";
import {
  exportCapaDashboardArquivo,
  type CapaExportContext,
} from "../utils/exportCapaDashboard.ts";
import type { CapaExportContextProps } from "../utils/capaExportContext.ts";

type TooltipsPrazoCapa = {
  cp?: string | null;
  mp?: string | null;
  lp?: string | null;
};

type CapaTableVariant = "capa" | "loja" | "comprador";

type Props = {
  capa: RupturaCapaResultado | RupturaLojaResultado | RupturaCompradorResultado | null;
  loading?: boolean;
  dataReferencia?: string;
  tooltipsPrazo?: TooltipsPrazoCapa;
  /** capa = divisão/setor; loja/comprador = uma linha por entidade. */
  variant?: CapaTableVariant;
  /** Filtros da tela — exportação XLS/CSV conforme escopo visível. */
  exportContext?: CapaExportContextProps;
};

function isFlatVariant(variant: CapaTableVariant): boolean {
  return variant === "loja";
}

function isCompradorResultado(
  data: RupturaCapaResultado | RupturaLojaResultado | RupturaCompradorResultado,
): data is RupturaCompradorResultado {
  return "compradoresPorDivisao" in data;
}

function variantEntityLabel(variant: CapaTableVariant): string {
  if (variant === "loja") return "LOJAS";
  return "PRODUTOS";
}

function variantTitulo(variant: CapaTableVariant): string {
  if (variant === "loja") return "LOJA";
  if (variant === "comprador") return "COMPRADOR";
  return "CAPA";
}

function toCapaView(
  data: RupturaCapaResultado | RupturaLojaResultado | RupturaCompradorResultado,
): RupturaCapaResultado | RupturaCompradorResultado {
  if (isCompradorResultado(data)) return data;
  if ("setoresPorDivisao" in data) return data;
  return { linhas: data.linhas, setoresPorDivisao: new Map(), total: data.total };
}

type ColGrupo = "resumo" | "cp" | "mp" | "lp" | "inv" | "pend";

type ColDef = {
  key: string;
  label: string;
  tooltip: string;
  grupo: ColGrupo;
  kind: "num" | "pct" | "media";
  minW?: number;
  dataBar?: boolean;
  redNum?: boolean;
  boldPct?: boolean;
};

/** Paleta espelhando a planilha Excel CAPA (cores por bloco + cinza nos rótulos de coluna) */
const SPACER_W = 12;

const XL = {
  font: "'Calibri', 'Segoe UI', Arial, sans-serif",
  fontSize: 13,
  headerFontSize: 8,
  grid: "1px solid #bfbfbf",
  gridStrong: "2px solid #000000",
  cell: "#ffffff",
  text: "#000000",
  headerDarkBg: "#595959",
  headerDarkText: "#ffffff",
  rowDivisaoBg: "#d9d9d9",
  rowTotalBg: "#bfbfbf",
  barBg: "#d9d9d9",
  barGreen: "#63be7b",
  barYellow: "#ffeb84",
  barRed: "#f8696b",
  red: "#c00000",
  popoverBg: "#1e293b",
  popoverText: "#f8fafc",
  popoverBorder: "#475569",
  titleRed: "#c00000",
  resumo: { titleBg: "#f2f2f2", titleColor: "#404040" },
  cp: { titleBg: "#e2efda", titleColor: "#375623" },
  mp: { titleBg: "#fff2cc", titleColor: "#7f6000" },
  lp: { titleBg: "#ffc7ce", titleColor: "#9c0006" },
  inv: { titleBg: "#fce4d6", titleColor: "#833c0c" },
  pend: { titleBg: "#f2f2f2", titleColor: "#9c0006" },
} as const;

const COLUNAS: ColDef[] = [
  { key: "skus", label: "SKU'S", tooltip: "Sku´s — soma na base limpa", grupo: "resumo", kind: "num", minW: 72 },
  { key: "ruptura", label: "RUPTURA", tooltip: "Ruptura classificada (CP + MP + LP)", grupo: "resumo", kind: "num", minW: 72 },
  { key: "pct_ruptura", label: "%", tooltip: "Percentual de ruptura sobre SKUs", grupo: "resumo", kind: "pct", minW: 44, dataBar: true, boldPct: true },
  { key: "cp", label: "CP", tooltip: "Curto Prazo — soma", grupo: "cp", kind: "num", minW: 56 },
  { key: "cross", label: "Cross", tooltip: "Itens Cross — Cross Docking", grupo: "cp", kind: "num", minW: 52 },
  { key: "estq_cd", label: "Estq. CD", tooltip: "Havia Estoque no CD", grupo: "cp", kind: "num", minW: 58 },
  { key: "rebto", label: "Rebto", tooltip: "Rebto Próximo", grupo: "cp", kind: "num", minW: 52 },
  {
    key: "dias_receb",
    label: "Dias Receb.",
    tooltip: "Rup (X) Dias Recebto Maior data — MÉDIA sobre todos os SKUs",
    grupo: "cp",
    kind: "media",
    minW: 62,
  },
  { key: "pct_cp", label: "%", tooltip: "Curto Prazo / Ruptura", grupo: "cp", kind: "pct", minW: 40, dataBar: true, boldPct: true },
  { key: "mp", label: "MP", tooltip: "Médio Prazo — soma", grupo: "mp", kind: "num", minW: 56 },
  { key: "gt30", label: ">30d", tooltip: "Pedidos > 30 Dias — Avaliar Pedido", grupo: "mp", kind: "num", minW: 48 },
  { key: "gt60", label: ">60d", tooltip: "Pedidos > 60 Dias — Pendência Indevida", grupo: "mp", kind: "num", minW: 48 },
  {
    key: "dias_ped",
    label: "Dias Ped.",
    tooltip: "Dias Pedido — MÉDIA sobre todos os SKUs",
    grupo: "mp",
    kind: "media",
    minW: 58,
  },
  { key: "pct_mp", label: "%", tooltip: "Médio Prazo / Ruptura", grupo: "mp", kind: "pct", minW: 40, dataBar: true, boldPct: true },
  { key: "lp", label: "LP", tooltip: "Longo Prazo — soma", grupo: "lp", kind: "num", minW: 56 },
  {
    key: "r30",
    label: "30d s/ ped.",
    tooltip: "30 DIAS EM RUPTURA sem inclusão de pedido no período",
    grupo: "lp",
    kind: "num",
    minW: 68,
  },
  {
    key: "dias_ult",
    label: "Dias Últ.",
    tooltip: "Dias Último Pedido Loja — MÉDIA sobre todos os SKUs",
    grupo: "lp",
    kind: "media",
    minW: 58,
  },
  { key: "pct_lp", label: "%", tooltip: "Longo Prazo / Ruptura", grupo: "lp", kind: "pct", minW: 40, dataBar: true, boldPct: true },
  {
    key: "rup_inv",
    label: "Rup. Inv.",
    tooltip: "Itens Ruptura Via Inventário",
    grupo: "inv",
    kind: "num",
    minW: 62,
  },
  {
    key: "pct_imp",
    label: "% Imp.",
    tooltip: "% Impacto Sobre Ruptura — % Rup Inventário (MÉDIA)",
    grupo: "inv",
    kind: "pct",
    minW: 52,
    dataBar: true,
  },
  {
    key: "pct_sinv",
    label: "% s/ Inv.",
    tooltip: "% Ruptura Sem Inventário (MÉDIA)",
    grupo: "inv",
    kind: "pct",
    minW: 58,
    dataBar: true,
    boldPct: true,
  },
  {
    key: "pend",
    label: "Pend.",
    tooltip: "Itens Vda Pendência — soma",
    grupo: "pend",
    kind: "num",
    minW: 52,
    redNum: true,
  },
  {
    key: "pct_sp",
    label: "% s/ pend.",
    tooltip: "% Rup Sem Pendência Vda — MÉDIA sobre todos os SKUs",
    grupo: "pend",
    kind: "pct",
    minW: 62,
    dataBar: true,
    boldPct: true,
  },
];

const COLUNAS_RESUMO = COLUNAS.filter((c) => c.grupo === "resumo");
const COLUNAS_SCROLL = COLUNAS.filter((c) => c.grupo !== "resumo");
const GRUPOS_SCROLL: ColGrupo[] = ["cp", "mp", "lp", "inv", "pend"];

type GrupoBalao = {
  titulo: string;
  tooltip: string;
  count: number;
  pct: number | null;
};

const PRODUTOS_W_MIN = 200;
const PRODUTOS_W_MAX = 560;
/** Largura aproximada por caractere (Calibri 13px). */
const PRODUTOS_CHAR_PX = 7.1;
const RESUMO_W = COLUNAS_RESUMO.map((c) => c.minW ?? 80);
const RESUMO_W_TOTAL = RESUMO_W.reduce((a, b) => a + b, 0);
const HEADER_H1 = 44;
const HEADER_H2 = 34;

type BodyRowWidthHint = {
  linha: RupturaCapaLinha;
  rowKind: "divisao" | "setor" | "loja" | "comprador" | "fornecedor" | "total";
  indent?: number;
};

function computeProdutosColWidth(rows: BodyRowWidthHint[], entityLabel: string): number {
  let maxW = PRODUTOS_W_MIN;
  const measure = (text: string, indent: number, toggle: boolean) => {
    const extra = indent + (toggle ? 21 : 0) + 16;
    return extra + text.length * PRODUTOS_CHAR_PX;
  };

  for (const row of rows) {
    const indent =
      row.indent ??
      (row.rowKind === "fornecedor" ? 36 : row.rowKind === "comprador" ? 16 : row.rowKind === "setor" ? 22 : 4);
    const toggle = row.rowKind === "divisao" || row.rowKind === "comprador";
    maxW = Math.max(maxW, measure(row.linha.nome, indent, toggle));
  }

  maxW = Math.max(maxW, measure(entityLabel, 4, false), measure("TOTAL", 4, false));
  return Math.min(PRODUTOS_W_MAX, Math.ceil(maxW));
}

function grupoBalao(g: ColGrupo, t: RupturaCapaLinha): GrupoBalao {
  switch (g) {
    case "resumo":
      return {
        titulo: "Ruptura classificada",
        tooltip: "Ruptura classificada (CP + MP + LP)",
        count: t.total_ruptura,
        pct: t.pct_ruptura,
      };
    case "cp":
      return {
        titulo: "Curto Prazo",
        tooltip: "RUPTURA COM ESTOQUE NO CD — Curto Prazo",
        count: t.total_curto_prazo,
        pct: t.pct_curto_prazo,
      };
    case "mp":
      return {
        titulo: "Médio Prazo",
        tooltip: "RUPTURA COM PEDIDO PARA INDÚSTRIA — Médio Prazo",
        count: t.total_medio_prazo,
        pct: t.pct_medio_prazo,
      };
    case "lp":
      return {
        titulo: "Longo Prazo",
        tooltip: "RUPTURA SEM PEDIDO PARA INDÚSTRIA — Longo Prazo",
        count: t.total_longo_prazo,
        pct: t.pct_longo_prazo,
      };
    case "inv":
      return {
        titulo: "Ruptura (X) Inventário",
        tooltip: "Ruptura impactada via inventário",
        count: t.itens_ruptura_via_inventario,
        pct: t.pct_impacto_inventario,
      };
    case "pend":
      return {
        titulo: "Pendência de Venda",
        tooltip: "Pendência de venda — impacto sobre ruptura",
        count: t.itens_vda_pendencia,
        pct: t.total_ruptura > 0 ? (t.itens_vda_pendencia / t.total_ruptura) * 100 : null,
      };
  }
}

const GRUPO_EXCEL: Record<ColGrupo, { titleBg: string; titleColor: string }> = {
  resumo: { titleBg: XL.resumo.titleBg, titleColor: XL.resumo.titleColor },
  cp: { titleBg: XL.cp.titleBg, titleColor: XL.cp.titleColor },
  mp: { titleBg: XL.mp.titleBg, titleColor: XL.mp.titleColor },
  lp: { titleBg: XL.lp.titleBg, titleColor: XL.lp.titleColor },
  inv: { titleBg: XL.inv.titleBg, titleColor: XL.inv.titleColor },
  pend: { titleBg: XL.pend.titleBg, titleColor: XL.pend.titleColor },
};

const cellBorder: CSSProperties = {
  border: XL.grid,
};

const thTitleRow = (g: ColGrupo): CSSProperties => {
  const s = GRUPO_EXCEL[g];
  return {
    fontFamily: XL.font,
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 4px",
    textAlign: "center",
    verticalAlign: "middle",
    boxSizing: "border-box",
    background: s.titleBg,
    color: s.titleColor,
    border: XL.grid,
    whiteSpace: "normal",
    lineHeight: 1.15,
  };
};

const thColHeader: CSSProperties = {
  ...cellBorder,
  background: XL.headerDarkBg,
  color: XL.headerDarkText,
  fontFamily: XL.font,
  fontSize: XL.headerFontSize,
  fontWeight: 700,
  padding: "2px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "normal",
  lineHeight: 1.1,
  boxSizing: "border-box",
};

const spacerTh: CSSProperties = {
  width: SPACER_W,
  minWidth: SPACER_W,
  maxWidth: SPACER_W,
  padding: 0,
  border: "none",
  background: XL.cell,
  boxSizing: "border-box",
};

const spacerTd: CSSProperties = {
  width: SPACER_W,
  minWidth: SPACER_W,
  maxWidth: SPACER_W,
  padding: 0,
  border: "none",
  background: XL.cell,
  borderBottom: XL.grid,
  boxSizing: "border-box",
};

function SpacerHeader() {
  return <th style={spacerTh} aria-hidden />;
}

function SpacerCell({ total = false }: { total?: boolean }) {
  return (
    <td
      style={{
        ...spacerTd,
        borderBottom: total ? XL.gridStrong : XL.grid,
      }}
      aria-hidden
    />
  );
}

const tdExcel: CSSProperties = {
  ...cellBorder,
  background: XL.cell,
  color: XL.text,
  fontFamily: XL.font,
  fontSize: XL.fontSize,
  fontWeight: 500,
  padding: "4px 5px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  height: 26,
  lineHeight: 1.25,
};

const tableExcel: CSSProperties = {
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontFamily: XL.font,
  fontSize: XL.fontSize,
};

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatNumero(v);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatPercentual(v);
}

function fmtMedia(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function valorCol(l: RupturaCapaLinha, col: ColDef): number | null {
  switch (col.key) {
    case "skus":
      return l.total_skus;
    case "ruptura":
      return l.total_ruptura;
    case "pct_ruptura":
      return l.pct_ruptura;
    case "cp":
      return l.total_curto_prazo;
    case "cross":
      return l.itens_cross;
    case "estq_cd":
      return l.havia_estoque_cd;
    case "rebto":
      return l.rebto_proximo;
    case "dias_receb":
      return l.media_dias_recebimento_cd;
    case "pct_cp":
      return l.pct_curto_prazo;
    case "mp":
      return l.total_medio_prazo;
    case "gt30":
      return l.pedido_maior_30;
    case "gt60":
      return l.pedido_maior_60;
    case "dias_ped":
      return l.media_dias_pedido;
    case "pct_mp":
      return l.pct_medio_prazo;
    case "lp":
      return l.total_longo_prazo;
    case "r30":
      return l.ruptura_30_dias_sem_pedido;
    case "dias_ult":
      return l.media_dias_ultimo_pedido;
    case "pct_lp":
      return l.pct_longo_prazo;
    case "rup_inv":
      return l.itens_ruptura_via_inventario;
    case "pct_imp":
      return l.pct_impacto_inventario;
    case "pct_sinv":
      return l.pct_ruptura_sem_inventario;
    case "pend":
      return l.itens_vda_pendencia;
    case "pct_sp":
      return l.pct_rup_sem_pendencia_vda;
    default:
      return null;
  }
}

function fmtValor(col: ColDef, v: number | null): string {
  if (col.kind === "pct") return fmtPct(v);
  if (col.kind === "media") return fmtMedia(v);
  return fmtNum(v);
}

function allLinhas(capa: RupturaCapaResultado): RupturaCapaLinha[] {
  const setores = Array.from(capa.setoresPorDivisao.values()).flat();
  return [...capa.linhas, ...setores, capa.total];
}

function allLinhasComprador(capa: RupturaCompradorResultado): RupturaCapaLinha[] {
  const compradores = Array.from(capa.compradoresPorDivisao.values()).flat();
  const fornecedores = Array.from(capa.fornecedoresPorComprador.values()).flat();
  return [...capa.linhas, ...compradores, ...fornecedores, capa.total];
}

function computeBarMaxesForData(
  capa: RupturaCapaResultado | RupturaCompradorResultado,
): Record<string, number> {
  const linhas = isCompradorResultado(capa) ? allLinhasComprador(capa) : allLinhas(capa);
  const maxes: Record<string, number> = {};
  for (const col of COLUNAS) {
    if (col.dataBar) {
      maxes[col.key] = Math.max(0.01, ...linhas.map((l) => valorCol(l, col) ?? 0));
    }
  }
  return maxes;
}

function computePctRangesPorDivisao(
  porDivisao: Map<DivisaoDashboard, RupturaCapaLinha[]>,
): Map<DivisaoDashboard, Record<string, SetorColRange>> {
  const map = new Map<DivisaoDashboard, Record<string, SetorColRange>>();
  for (const div of DIVISOES_DASHBOARD) {
    const linhas = porDivisao.get(div) ?? [];
    const ranges: Record<string, SetorColRange> = {};
    for (const col of COLUNAS) {
      if (col.kind !== "pct") continue;
      const vals = linhas.map((s) => valorCol(s, col) ?? 0);
      ranges[col.key] = {
        min: vals.length ? Math.min(...vals) : 0,
        max: vals.length ? Math.max(...vals, 0.01) : 0.01,
      };
    }
    map.set(div, ranges);
  }
  return map;
}

function computeFornecedorPctRangesPorComprador(
  capa: RupturaCompradorResultado,
): Map<string, Record<string, SetorColRange>> {
  const map = new Map<string, Record<string, SetorColRange>>();
  for (const [compKey, fornecedores] of capa.fornecedoresPorComprador) {
    const ranges: Record<string, SetorColRange> = {};
    for (const col of COLUNAS) {
      if (col.kind !== "pct") continue;
      const vals = fornecedores.map((s) => valorCol(s, col) ?? 0);
      ranges[col.key] = {
        min: vals.length ? Math.min(...vals) : 0,
        max: vals.length ? Math.max(...vals, 0.01) : 0.01,
      };
    }
    map.set(compKey, ranges);
  }
  return map;
}

/** Faixa min/max de cada coluna % entre setores da mesma divisão. */
type SetorColRange = { min: number; max: number };

function computeLojaPctRanges(linhas: RupturaCapaLinha[]): Record<string, SetorColRange> {
  const ranges: Record<string, SetorColRange> = {};
  for (const col of COLUNAS) {
    if (col.kind !== "pct") continue;
    const vals = linhas.map((s) => valorCol(s, col) ?? 0);
    ranges[col.key] = {
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals, 0.01) : 0.01,
    };
  }
  return ranges;
}

function computeSetorPctRangesPorDivisao(
  capa: RupturaCapaResultado,
): Map<DivisaoDashboard, Record<string, SetorColRange>> {
  return computePctRangesPorDivisao(capa.setoresPorDivisao);
}

function heatRatio(val: number, range: SetorColRange): number {
  if (range.max <= range.min) return 0;
  return Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));
}

function heatBarColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  if (t <= 0.5) {
    const u = t / 0.5;
    return mixHex(XL.barGreen, XL.barYellow, u);
  }
  const u = (t - 0.5) / 0.5;
  return mixHex(XL.barYellow, XL.barRed, u);
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function DataBarCell({
  value,
  max,
  children,
  footer,
  barColor,
}: {
  value: number | null;
  max: number;
  children: ReactNode;
  footer?: boolean;
  barColor?: string;
}) {
  const pct = value != null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {!footer && pct > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 1,
            bottom: 1,
            width: `${pct}%`,
            background: barColor ?? XL.barBg,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </div>
  );
}

function ToggleBtn({ aberto, onClick }: { aberto: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      aria-label={aberto ? "Recolher setores" : "Expandir setores"}
      style={{
        display: "inline-flex",
        width: 13,
        height: 13,
        alignItems: "center",
        justifyContent: "center",
        border: XL.grid,
        borderRadius: 0,
        background: XL.cell,
        color: XL.text,
        cursor: "pointer",
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        padding: 0,
        flexShrink: 0,
        fontFamily: XL.font,
      }}
    >
      {aberto ? "−" : "+"}
    </button>
  );
}

type SortState = { key: string; dir: "asc" | "desc" };

function cmpLinhas(a: RupturaCapaLinha, b: RupturaCapaLinha, sort: SortState): number {
  let cmp = 0;
  if (sort.key === "produtos") {
    const na = Number(a.nome);
    const nb = Number(b.nome);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) cmp = na - nb;
    else cmp = a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });
  } else {
    const col = COLUNAS.find((c) => c.key === sort.key);
    if (!col) return 0;
    const va = valorCol(a, col);
    const vb = valorCol(b, col);
    if (va == null && vb == null) cmp = 0;
    else if (va == null) cmp = 1;
    else if (vb == null) cmp = -1;
    else cmp = va - vb;
  }
  if (cmp === 0) {
    const na = Number(a.nome);
    const nb = Number(b.nome);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) cmp = na - nb;
    else cmp = a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });
  }
  return sort.dir === "asc" ? cmp : -cmp;
}

function sortedLinhas(list: readonly RupturaCapaLinha[], sort: SortState | null): RupturaCapaLinha[] {
  if (!sort || list.length <= 1) return [...list];
  return [...list].sort((a, b) => cmpLinhas(a, b, sort));
}

function SortableHeaderTh({
  colKey,
  label,
  tooltip,
  sort,
  onSort,
  style,
}: {
  colKey: string;
  label: string;
  tooltip: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  style: CSSProperties;
}) {
  const active = sort?.key === colKey;
  const ariaSort = active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none";
  const indicator = active ? (sort!.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <th
      style={{ ...style, cursor: "pointer", userSelect: "none" }}
      aria-sort={ariaSort}
      title={`${tooltip} — clique para ordenar`}
      onClick={() => onSort(colKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(colKey);
        }
      }}
      tabIndex={0}
    >
      {label}
      {indicator}
    </th>
  );
}

function CapaHeaderPopover({
  children,
  subtitulo,
  detalhe,
}: {
  children: ReactNode;
  subtitulo?: string;
  detalhe?: string | null;
}) {
  const [hover, setHover] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const syncAnchor = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ x: r.left + r.width / 2, y: r.top });
  }, []);

  useEffect(() => {
    if (!hover) return;
    syncAnchor();
    const onMove = () => syncAnchor();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [hover, syncAnchor]);

  if (!subtitulo && !detalhe) return <>{children}</>;

  const popover =
    hover && anchor
      ? createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: anchor.x,
              top: anchor.y,
              transform: "translate(-50%, calc(-100% - 8px))",
              zIndex: 10050,
              background: XL.popoverBg,
              border: `1px solid ${XL.popoverBorder}`,
              padding: "10px 12px",
              minWidth: 240,
              maxWidth: 360,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              textAlign: "left",
              fontSize: 10,
              lineHeight: 1.5,
              color: XL.popoverText,
              fontWeight: 400,
              pointerEvents: "none",
              whiteSpace: "normal",
            }}
          >
            {subtitulo ? (
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: detalhe ? 8 : 0,
                  fontSize: 10,
                  color: "#fcd34d",
                  borderBottom: detalhe ? `1px solid ${XL.popoverBorder}` : undefined,
                  paddingBottom: detalhe ? 6 : 0,
                }}
              >
                {subtitulo}
              </div>
            ) : null}
            {detalhe ? <div style={{ color: XL.popoverText }}>{detalhe}</div> : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={triggerRef}
        style={{ position: "relative", width: "100%", cursor: "help" }}
        onMouseEnter={() => {
          setHover(true);
          syncAnchor();
        }}
        onMouseLeave={() => {
          setHover(false);
          setAnchor(null);
        }}
      >
        {children}
      </div>
      {popover}
    </>
  );
}

function detalheTooltipGrupo(g: ColGrupo, tooltips?: TooltipsPrazoCapa): string | null | undefined {
  if (!tooltips) return undefined;
  if (g === "cp") return tooltips.cp;
  if (g === "mp") return tooltips.mp;
  if (g === "lp") return tooltips.lp;
  return undefined;
}

function GrupoTituloBalao({
  g,
  total,
  tooltipsPrazo,
}: {
  g: ColGrupo;
  total: RupturaCapaLinha;
  tooltipsPrazo?: TooltipsPrazoCapa;
}) {
  const s = GRUPO_EXCEL[g];
  const balao = grupoBalao(g, total);
  const metrica = `${formatNumero(balao.count)} / ${formatPercentual(balao.pct)}`;
  const detalhe = detalheTooltipGrupo(g, tooltipsPrazo);
  const comPopover = g === "cp" || g === "mp" || g === "lp";

  const conteudo = (
    <div style={{ width: "100%", textAlign: "center", lineHeight: 1.15 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: s.titleColor }}>{balao.titulo}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: s.titleColor, marginTop: 3 }}>{metrica}</div>
    </div>
  );

  if (comPopover && (balao.tooltip || detalhe)) {
    return (
      <CapaHeaderPopover subtitulo={balao.tooltip} detalhe={detalhe}>
        {conteudo}
      </CapaHeaderPopover>
    );
  }

  return <div title={balao.tooltip}>{conteudo}</div>;
}

function CelulasGrupo({
  l,
  grupo,
  barMaxes,
  boldPct,
  footer,
  rowKind,
  setorPctRanges,
}: {
  l: RupturaCapaLinha;
  grupo: ColGrupo;
  barMaxes: Record<string, number>;
  boldPct?: boolean;
  footer?: boolean;
  rowKind: "divisao" | "setor" | "loja" | "comprador" | "fornecedor" | "total";
  setorPctRanges?: Record<string, SetorColRange>;
}) {
  const cols = grupo === "resumo" ? COLUNAS_RESUMO : COLUNAS_SCROLL.filter((c) => c.grupo === grupo);
  return (
    <CelulasValores
      l={l}
      cols={cols}
      barMaxes={barMaxes}
      boldPct={boldPct}
      footer={footer}
      rowKind={rowKind}
      setorPctRanges={setorPctRanges}
      resumoWidths={grupo === "resumo" ? RESUMO_W : undefined}
    />
  );
}

function CelulasValores({
  l,
  cols,
  barMaxes,
  boldPct = false,
  footer = false,
  rowKind,
  setorPctRanges,
  resumoWidths,
}: {
  l: RupturaCapaLinha;
  cols: ColDef[];
  barMaxes: Record<string, number>;
  boldPct?: boolean;
  footer?: boolean;
  rowKind: "divisao" | "setor" | "loja" | "comprador" | "fornecedor" | "total";
  setorPctRanges?: Record<string, SetorColRange>;
  resumoWidths?: number[];
}) {
  const rowBg = footer ? XL.rowTotalBg : rowKind === "divisao" ? XL.rowDivisaoBg : XL.cell;
  const isComparavel =
    rowKind === "setor" || rowKind === "loja" || rowKind === "comprador" || rowKind === "fornecedor";

  return (
    <>
      {cols.map((col, idx) => {
        const v = valorCol(l, col);
        const isBold = footer || boldPct || col.boldPct;
        const content = fmtValor(col, v);

        const isSetorPct = isComparavel && col.kind === "pct" && setorPctRanges?.[col.key];
        const useDivBar = !footer && rowKind === "divisao" && col.dataBar;
        const showBar = isSetorPct || useDivBar;

        let barMax = barMaxes[col.key] ?? 1;
        let barColor: string | undefined;
        if (isSetorPct && v != null) {
          const range = setorPctRanges![col.key];
          barMax = range.max;
          barColor = heatBarColor(heatRatio(v, range));
        }

        const inner = showBar ? (
          <DataBarCell value={v} max={barMax} footer={footer} barColor={barColor}>
            {content}
          </DataBarCell>
        ) : (
          content
        );

        return (
          <td
            key={col.key}
            style={{
              ...tdExcel,
              width: resumoWidths?.[idx],
              textAlign: "right",
              background: rowBg,
              color: footer ? XL.text : col.redNum && !footer ? XL.red : XL.text,
              fontWeight: isBold || footer ? 700 : 400,
              borderTop: footer ? XL.gridStrong : rowKind === "divisao" ? XL.grid : undefined,
            }}
          >
            {inner}
          </td>
        );
      })}
    </>
  );
}

function formatDataBanner(raw?: string): string {
  if (!raw) {
    return new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.toUpperCase();
  return d
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

function CapaExcelBanner({ dataReferencia }: { dataReferencia?: string }) {
  const dataFmt = formatDataBanner(dataReferencia);

  return (
    <div
      style={{
        background: XL.cell,
        borderBottom: XL.grid,
        padding: "6px 8px 8px",
        fontFamily: XL.font,
        flexShrink: 0,
      }}
    >
      <div style={{ color: XL.titleRed, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{dataFmt}</div>
      <div
        style={{
          marginTop: 6,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 12,
          border: "2px solid #000",
          padding: "6px 8px",
          background: XL.cell,
          color: XL.text,
        }}
      >
        RUPTURA COMPER MT (SORTIMENTO LIMPO {"<="} 02 UNIDADES)
      </div>
    </div>
  );
}

function CapaSplitTable({
  capa,
  maxHeight,
  dataReferencia,
  tooltipsPrazo,
  variant = "capa",
}: {
  capa: RupturaCapaResultado | RupturaCompradorResultado;
  maxHeight?: number | string;
  dataReferencia?: string;
  tooltipsPrazo?: TooltipsPrazoCapa;
  variant?: CapaTableVariant;
}) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const heightFull = maxHeight === "100%";
  const isFlat = isFlatVariant(variant);
  const isComprador = variant === "comprador" && isCompradorResultado(capa);
  const [sort, setSort] = useState<SortState | null>(() =>
    isFlat ? { key: "pct_ruptura", dir: "desc" } : null,
  );
  const barMaxes = useMemo(() => computeBarMaxesForData(capa), [capa]);
  const setorPctRangesMap = useMemo(
    () => (isComprador ? computePctRangesPorDivisao(capa.compradoresPorDivisao) : computeSetorPctRangesPorDivisao(capa as RupturaCapaResultado)),
    [capa, isComprador],
  );
  const fornecedorPctRangesMap = useMemo(
    () => (isComprador ? computeFornecedorPctRangesPorComprador(capa) : null),
    [capa, isComprador],
  );
  const lojaPctRanges = useMemo(
    () => (isFlat ? computeLojaPctRanges(capa.linhas) : null),
    [capa.linhas, isFlat],
  );

  const toggle = (nome: string) => setAbertos((p) => ({ ...p, [nome]: !p[nome] }));

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "desc" };
    });
  };

  type BodyRow = {
    key: string;
    produtos: ReactNode;
    linha: RupturaCapaLinha;
    rowKind: "divisao" | "setor" | "loja" | "comprador" | "fornecedor" | "total";
    divisao?: DivisaoDashboard;
    compKey?: string;
    boldPct?: boolean;
    indent?: number;
  };

  const bodyRows: BodyRow[] = useMemo(() => {
    const mapDiv = new Map(capa.linhas.map((l) => [l.nome, l]));

    if (isFlat) {
      return sortedLinhas(capa.linhas, sort).map((linha) => ({
        key: linha.nome,
        produtos: linha.nome,
        linha,
        rowKind: "loja" as const,
      }));
    }

    const ordemDivisoes = sort
      ? sortedLinhas(capa.linhas, sort).map((l) => l.nome)
      : [...DIVISOES_DASHBOARD];

    if (isComprador) {
      return ordemDivisoes.flatMap((divNome) => {
        const linha = mapDiv.get(divNome);
        if (!linha) return [];
        const abertoDiv = abertos[divNome] ?? false;
        const compradoresRaw = capa.compradoresPorDivisao.get(divNome as DivisaoDashboard) ?? [];
        const compradores = sortedLinhas(compradoresRaw, sort);
        const rows: BodyRow[] = [
          {
            key: divNome,
            produtos: (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ToggleBtn aberto={abertoDiv} onClick={() => toggle(divNome)} />
                {divNome}
              </span>
            ),
            linha,
            rowKind: "divisao",
            divisao: divNome as DivisaoDashboard,
            boldPct: true,
          },
        ];
        if (abertoDiv) {
          for (const comp of compradores) {
            const compKey = `${divNome}|${comp.nome}`;
            const abertoComp = abertos[compKey] ?? false;
            rows.push({
              key: compKey,
              produtos: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, paddingLeft: 16 }}>
                  <ToggleBtn aberto={abertoComp} onClick={() => toggle(compKey)} />
                  {comp.nome}
                </span>
              ),
              linha: comp,
              rowKind: "comprador",
              divisao: divNome as DivisaoDashboard,
              compKey,
              indent: 16,
            });
            if (abertoComp) {
              const fornecedores = capa.fornecedoresPorComprador.get(compKey) ?? [];
              for (const f of sortedLinhas(fornecedores, sort)) {
                rows.push({
                  key: `${compKey}|${f.nome}`,
                  produtos: <span style={{ paddingLeft: 36 }}>{f.nome}</span>,
                  linha: f,
                  rowKind: "fornecedor",
                  divisao: divNome as DivisaoDashboard,
                  compKey,
                  indent: 36,
                });
              }
            }
          }
        }
        return rows;
      });
    }

    return ordemDivisoes.flatMap((divNome) => {
      const linha = mapDiv.get(divNome);
      if (!linha) return [];
      const aberto = abertos[divNome] ?? false;
      const setoresRaw = capa.setoresPorDivisao.get(divNome as DivisaoDashboard) ?? [];
      const setores = sortedLinhas(setoresRaw, sort);
      const rows: BodyRow[] = [
        {
          key: divNome,
          produtos: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ToggleBtn aberto={aberto} onClick={() => toggle(divNome)} />
              {divNome}
            </span>
          ),
          linha,
          rowKind: "divisao",
          divisao: divNome as DivisaoDashboard,
          boldPct: true,
        },
      ];
      if (aberto) {
        for (const s of setores) {
          rows.push({
            key: `${divNome}-${s.nome}`,
            produtos: s.nome,
            linha: s,
            rowKind: "setor",
            divisao: divNome as DivisaoDashboard,
          });
        }
      }
      return rows;
    });
  }, [isFlat, isComprador, capa, sort, abertos]);

  const produtosW = useMemo(
    () => computeProdutosColWidth(bodyRows, variantEntityLabel(variant)),
    [bodyRows, variant],
  );
  const frozenW = produtosW + RESUMO_W_TOTAL;

  const pctRangesForRow = (row: BodyRow): Record<string, SetorColRange> | undefined => {
    if (row.rowKind === "loja" && lojaPctRanges) return lojaPctRanges;
    if (row.rowKind === "fornecedor" && row.compKey && fornecedorPctRangesMap) {
      return fornecedorPctRangesMap.get(row.compKey);
    }
    if ((row.rowKind === "setor" || row.rowKind === "comprador") && row.divisao) {
      return setorPctRangesMap.get(row.divisao);
    }
    return undefined;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxHeight: heightFull ? undefined : (maxHeight ?? 560),
        height: heightFull ? "100%" : undefined,
        overflow: "hidden",
        flex: heightFull ? 1 : undefined,
        minHeight: heightFull ? 0 : undefined,
        background: XL.cell,
        fontFamily: XL.font,
      }}
    >
      <CapaExcelBanner dataReferencia={dataReferencia} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          background: XL.cell,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "flex-start", minWidth: "100%", background: XL.cell }}>
          {/* Bloco 1 — PRODUTOS + Resumo (congelado à esquerda) */}
          <div
            style={{
              flex: `0 0 ${frozenW}px`,
              width: frozenW,
              position: "sticky",
              left: 0,
              zIndex: 2,
              background: XL.cell,
              boxShadow: "2px 0 4px rgba(0,0,0,0.08)",
            }}
          >
            <table style={{ ...tableExcel, width: frozenW }}>
              <colgroup>
                <col style={{ width: produtosW }} />
                {RESUMO_W.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    style={{
                      ...thColHeader,
                      textAlign: "left",
                      height: HEADER_H1,
                      position: "sticky",
                      top: 0,
                      zIndex: 5,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    rowSpan={2}
                    aria-sort={sort?.key === "produtos" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    title={`${isFlat ? "Entidade da linha" : "Divisão / setor"} — clique para ordenar`}
                    onClick={() => handleSort("produtos")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSort("produtos");
                      }
                    }}
                    tabIndex={0}
                  >
                    {variantEntityLabel(variant)}
                    {sort?.key === "produtos" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                  <th
                    colSpan={3}
                    style={{
                      ...thTitleRow("resumo"),
                      height: HEADER_H1,
                      position: "sticky",
                      top: 0,
                      zIndex: 4,
                    }}
                  >
                    <GrupoTituloBalao g="resumo" total={capa.total} />
                  </th>
                </tr>
                <tr>
                  {COLUNAS_RESUMO.map((col) => (
                    <SortableHeaderTh
                      key={col.key}
                      colKey={col.key}
                      label={col.label}
                      tooltip={col.tooltip}
                      sort={sort}
                      onSort={handleSort}
                      style={{
                        ...thColHeader,
                        height: HEADER_H2,
                        position: "sticky",
                        top: HEADER_H1,
                        zIndex: 4,
                      }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row) => (
                  <tr key={row.key}>
                    <td
                      style={{
                        ...tdExcel,
                        textAlign: "left",
                        maxWidth: produtosW,
                        fontWeight:
                          row.rowKind === "setor" ||
                          row.rowKind === "loja" ||
                          row.rowKind === "comprador" ||
                          row.rowKind === "fornecedor"
                            ? 400
                            : 700,
                        paddingLeft: row.indent ?? (row.rowKind === "setor" ? 22 : 4),
                        background: row.rowKind === "divisao" ? XL.rowDivisaoBg : XL.cell,
                        borderTop: row.rowKind === "divisao" ? XL.grid : undefined,
                      }}
                      title={row.rowKind === "fornecedor" ? row.linha.nome : undefined}
                    >
                      {row.produtos}
                    </td>
                    <CelulasGrupo
                      l={row.linha}
                      grupo="resumo"
                      barMaxes={barMaxes}
                      boldPct={row.boldPct}
                      rowKind={row.rowKind}
                      setorPctRanges={pctRangesForRow(row)}
                    />
                  </tr>
                ))}
                <tr>
                  <td
                    style={{
                      ...tdExcel,
                      textAlign: "left",
                      fontWeight: 700,
                      background: XL.rowTotalBg,
                      borderTop: XL.gridStrong,
                    }}
                  >
                    TOTAL
                  </td>
                  <CelulasGrupo l={capa.total} grupo="resumo" barMaxes={barMaxes} boldPct footer rowKind="total" />
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ flex: `0 0 ${SPACER_W}px`, width: SPACER_W, background: XL.cell, alignSelf: "stretch" }} aria-hidden />

          {/* Blocos 2–6 — CP / MP / LP / Inv / Pend */}
          <div style={{ flex: "0 0 auto", background: XL.cell }}>
            <table style={{ ...tableExcel, width: "max-content", tableLayout: "auto" }}>
              <thead>
                <tr>
                  {GRUPOS_SCROLL.map((g, gi) => (
                    <Fragment key={`h1-${g}`}>
                      {gi > 0 ? <SpacerHeader /> : null}
                      <th
                        colSpan={COLUNAS_SCROLL.filter((c) => c.grupo === g).length}
                        style={{
                          ...thTitleRow(g),
                          height: HEADER_H1,
                          position: "sticky",
                          top: 0,
                          zIndex: 3,
                          overflow: "visible",
                        }}
                      >
                        <GrupoTituloBalao g={g} total={capa.total} tooltipsPrazo={tooltipsPrazo} />
                      </th>
                    </Fragment>
                  ))}
                </tr>
                <tr>
                  {GRUPOS_SCROLL.flatMap((g, gi) => [
                    ...(gi > 0 ? [<SpacerHeader key={`sh2-${g}`} />] : []),
                    ...COLUNAS_SCROLL.filter((c) => c.grupo === g).map((col) => (
                      <SortableHeaderTh
                        key={col.key}
                        colKey={col.key}
                        label={col.label}
                        tooltip={col.tooltip}
                        sort={sort}
                        onSort={handleSort}
                        style={{
                          ...thColHeader,
                          height: HEADER_H2,
                          minWidth: col.minW ?? 72,
                          position: "sticky",
                          top: HEADER_H1,
                          zIndex: 3,
                        }}
                      />
                    )),
                  ])}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row) => (
                  <tr key={row.key}>
                    {GRUPOS_SCROLL.flatMap((g, gi) => [
                      ...(gi > 0 ? [<SpacerCell key={`sb-${row.key}-${g}`} />] : []),
                      <CelulasGrupo
                        key={`cg-${row.key}-${g}`}
                        l={row.linha}
                        grupo={g}
                        barMaxes={barMaxes}
                        boldPct={row.boldPct}
                        rowKind={row.rowKind}
                        setorPctRanges={pctRangesForRow(row)}
                      />,
                    ])}
                  </tr>
                ))}
                <tr>
                  {GRUPOS_SCROLL.flatMap((g, gi) => [
                    ...(gi > 0 ? [<SpacerCell key={`st-${g}`} total />] : []),
                    <CelulasGrupo key={`gt-${g}`} l={capa.total} grupo={g} barMaxes={barMaxes} boldPct footer rowKind="total" />,
                  ])}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FullscreenOverlay({
  capa,
  onClose,
  dataReferencia,
  tooltipsPrazo,
  variant = "capa",
  exportContext,
}: {
  capa: RupturaCapaResultado | RupturaLojaResultado | RupturaCompradorResultado;
  onClose: () => void;
  dataReferencia?: string;
  tooltipsPrazo?: TooltipsPrazoCapa;
  variant?: CapaTableVariant;
  exportContext?: CapaExportContextProps;
}) {
  const capaView = toCapaView(capa);
  const titulo = variantTitulo(variant);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${titulo} — tela cheia`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#ececec",
        display: "flex",
        flexDirection: "column",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#404040", fontFamily: XL.font }}>{titulo} — tela cheia</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CapaExportToolbar
            capa={capaView}
            variant={variant}
            dataReferencia={dataReferencia}
            exportContext={exportContext}
          />
          <button type="button" onClick={onClose} style={btnExcel}>
            Fechar (Esc)
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: XL.grid,
          overflow: "hidden",
          background: XL.cell,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CapaSplitTable
          capa={capaView}
          maxHeight="100%"
          dataReferencia={dataReferencia}
          tooltipsPrazo={tooltipsPrazo}
          variant={variant}
        />
      </div>
    </div>,
    document.body,
  );
}

const btnExcel: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 0,
  border: XL.grid,
  background: XL.cell,
  color: XL.text,
  cursor: "pointer",
  fontSize: 11,
  fontFamily: XL.font,
  fontWeight: 700,
  minWidth: 72,
  lineHeight: 1.3,
};

function CapaExportToolbar({
  capa,
  variant,
  dataReferencia,
  exportContext,
}: {
  capa: RupturaCapaResultado | RupturaCompradorResultado;
  variant: CapaTableVariant;
  dataReferencia?: string;
  exportContext?: CapaExportContextProps;
}) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!exportContext || !dataReferencia) return null;

  const ctx: CapaExportContext = {
    ...exportContext,
    dataReferencia,
    variant,
  };

  function exportar(formato: "xlsx" | "csv") {
    const r = exportCapaDashboardArquivo({ data: capa, ctx, formato });
    setStatus(`${r.filename} (${r.linhas} linhas)`);
    setAberto(false);
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        style={btnExcel}
        title="Exportar só esta tabela (resumo CAPA), com os filtros atuais — não é a base SKU"
      >
        Exportar tela ▾
      </button>
      {aberto ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            zIndex: 50,
            background: XL.cell,
            border: XL.grid,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            minWidth: 160,
            display: "flex",
            flexDirection: "column",
            padding: 4,
            gap: 2,
          }}
        >
          <button type="button" style={btnExcel} onClick={() => exportar("xlsx")}>
            XLSX — tela CAPA
          </button>
          <button type="button" style={btnExcel} onClick={() => exportar("csv")}>
            CSV — tela CAPA
          </button>
        </div>
      ) : null}
      {status ? <span style={{ fontSize: 10, color: "#404040", maxWidth: 200 }}>{status}</span> : null}
    </div>
  );
}

export function RupturaCapaTable({
  capa,
  loading,
  dataReferencia,
  tooltipsPrazo,
  variant = "capa",
  exportContext,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const capaView = capa ? toCapaView(capa) : null;

  if (loading && !capaView) {
    return <div style={{ color: theme.colors.textMuted, fontFamily: XL.font }}>Carregando {variantTitulo(variant)}…</div>;
  }
  if (!capaView) return null;

  return (
    <>
      <div
        style={{
          overflow: "hidden",
          position: "relative",
          background: XL.cell,
          border: XL.grid,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px",
            borderBottom: XL.grid,
            background: "#f2f2f2",
          }}
        >
          <CapaExportToolbar
            capa={capaView}
            variant={variant}
            dataReferencia={dataReferencia}
            exportContext={exportContext}
          />
          <button type="button" onClick={() => setFullscreen(true)} style={btnExcel} title={`Expandir tabela ${variantTitulo(variant)}`}>
            Tela cheia
          </button>
        </div>
        <CapaSplitTable capa={capaView} dataReferencia={dataReferencia} tooltipsPrazo={tooltipsPrazo} variant={variant} />
        {loading ? (
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 12,
              fontSize: 11,
              color: XL.text,
              background: XL.cell,
              padding: "3px 8px",
              border: XL.grid,
              fontFamily: XL.font,
              pointerEvents: "none",
            }}
          >
            Atualizando…
          </div>
        ) : null}
      </div>
      {fullscreen && capaView ? (
        <FullscreenOverlay
          capa={capaView}
          onClose={() => setFullscreen(false)}
          dataReferencia={dataReferencia}
          tooltipsPrazo={tooltipsPrazo}
          variant={variant}
          exportContext={exportContext}
        />
      ) : null}
    </>
  );
}
