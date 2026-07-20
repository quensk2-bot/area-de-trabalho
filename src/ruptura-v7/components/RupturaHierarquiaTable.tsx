import { useCallback, useEffect, useMemo, useState } from "react";
import { theme } from "../../styles.ts";
import { buttonGhostStyle, tableStyle, tdStyle, thStyle } from "./rupturaSharedStyles.ts";
import { formatNumero, formatPercentual } from "./rupturaSharedStyles.ts";
import type { RupturaOficialHierarquia } from "../types/rupturaOficialTypes.ts";
import {
  consultarOficialCategorias,
  consultarOficialDivisoes,
  consultarOficialSetores,
} from "../services/rupturaOficialService.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";

type Props = {
  ctx: RupturaFiltrosContexto;
};

type Nivel = "setor" | "setor2" | "categoria";

type Linha = RupturaOficialHierarquia & {
  id: string;
  nivel: Nivel;
  label: string;
  filhos?: Linha[];
  expandido?: boolean;
  carregando?: boolean;
};

function cellNum(v: number | null | undefined, pct = false): string {
  if (v == null) return "—";
  return pct ? formatPercentual(v) : formatNumero(v);
}

function rowToCells(r: RupturaOficialHierarquia) {
  return [
    r.total_skus,
    r.total_ruptura,
    r.pct_ruptura,
    r.total_curto_prazo,
    r.total_itens_cross,
    r.havia_estoque_no_cd,
    r.recebimento_proximo,
    r.media_dias_recebimento_cd,
    r.pct_curto_prazo,
    r.total_medio_prazo,
    r.pedido_maior_30_dias,
    r.pedido_maior_60_dias,
    r.media_dias_pedido,
    r.pct_medio_prazo,
    r.total_longo_prazo,
    r.ruptura_sem_pedido_periodo,
    r.dias_ultimo_pedido_loja,
    r.pct_longo_prazo,
    r.itens_ruptura_via_inventario,
    r.pct_impacto_inventario,
    r.pct_ruptura_sem_inventario,
    r.itens_vda_pendencia,
    r.pct_rup_sem_pendencia_vda,
  ];
}

export function RupturaHierarquiaTable({ ctx }: Props) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarRaiz = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const res = await consultarOficialDivisoes(ctx);
    if (res.erro) setErro(res.erro.message);
    setLinhas(
      (res.dados ?? []).map((d) => ({
        ...d,
        id: `setor:${d.setor}`,
        nivel: "setor" as const,
        label: d.setor ?? "—",
        expandido: false,
      })),
    );
    setLoading(false);
  }, [ctx]);

  useEffect(() => {
    void carregarRaiz();
  }, [carregarRaiz]);

  const toggle = async (id: string) => {
    const idx = linhas.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const linha = linhas[idx];
    if (linha.expandido) {
      setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, expandido: false } : l)));
      return;
    }
    if (linha.filhos?.length) {
      setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, expandido: true } : l)));
      return;
    }
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, carregando: true } : l)));
    let filhos: Linha[] = [];
    if (linha.nivel === "setor") {
      const res = await consultarOficialSetores(ctx, linha.setor ?? undefined);
      if (res.erro) setErro(res.erro.message);
      filhos = (res.dados ?? []).map((d) => ({
        ...d,
        id: `setor2:${d.setor}:${d.setor2}`,
        nivel: "setor2" as const,
        label: d.setor2 ?? "—",
      }));
    } else if (linha.nivel === "setor2") {
      const res = await consultarOficialCategorias(ctx, linha.setor ?? "", linha.setor2 ?? "");
      if (res.erro) setErro(res.erro.message);
      filhos = (res.dados ?? []).map((d) => ({
        ...d,
        id: `cat:${d.setor}:${d.setor2}:${d.categoria}`,
        nivel: "categoria" as const,
        label: d.categoria ?? "—",
      }));
    }
    setLinhas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, expandido: true, carregando: false, filhos } : l)),
    );
  };

  const flatRows = useMemo(() => {
    const out: { linha: Linha; depth: number }[] = [];
    for (const root of linhas) {
      out.push({ linha: root, depth: 0 });
      if (root.expandido && root.filhos) {
        for (const f1 of root.filhos) {
          out.push({ linha: f1, depth: 1 });
          if (f1.expandido && f1.filhos) {
            for (const f2 of f1.filhos) {
              out.push({ linha: f2, depth: 2 });
            }
          }
        }
      }
    }
    return out;
  }, [linhas]);

  const pctCols = new Set([2, 8, 13, 17, 19, 20, 22]);

  return (
    <div style={{ overflowX: "auto" }}>
      {erro && <p style={{ color: theme.colors.danger }}>{erro}</p>}
      {loading && <p style={{ color: theme.colors.textMuted }}>Carregando hierarquia…</p>}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th colSpan={4} style={{ ...thStyle, background: "#1e293b", textAlign: "center" }}>
              Produtos
            </th>
            <th colSpan={6} style={{ ...thStyle, background: "rgba(34,197,94,0.25)", textAlign: "center" }}>
              Curto Prazo
            </th>
            <th colSpan={5} style={{ ...thStyle, background: "rgba(250,204,21,0.2)", textAlign: "center" }}>
              Médio Prazo
            </th>
            <th colSpan={4} style={{ ...thStyle, background: "rgba(248,113,113,0.2)", textAlign: "center" }}>
              Longo Prazo
            </th>
            <th colSpan={3} style={{ ...thStyle, background: "rgba(251,146,60,0.25)", textAlign: "center" }}>
              Inventário
            </th>
            <th colSpan={2} style={{ ...thStyle, background: "rgba(127,29,29,0.35)", textAlign: "center" }}>
              Pend. Venda
            </th>
          </tr>
          <tr>
            {[
              "Hierarquia",
              "SKUs",
              "Ruptura",
              "%",
              "CP",
              "Cross",
              "Estq CD",
              "Rebto",
              "Dias reb.",
              "% CP",
              "MP",
              ">30",
              ">60",
              "Dias ped.",
              "% MP",
              "LP",
              "S/ pedido",
              "Dias ult.",
              "% LP",
              "Rup inv.",
              "% imp.",
              "% s/ inv.",
              "Pend.",
              "% s/ pend.",
            ].map((h) => (
              <th key={h} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flatRows.map(({ linha, depth }) => {
            const cells = rowToCells(linha);
            const podeExpandir = linha.nivel !== "categoria";
            return (
              <tr key={linha.id}>
                <td style={{ ...tdStyle, paddingLeft: 8 + depth * 16 }}>
                  {podeExpandir ? (
                    <button type="button" style={{ ...buttonGhostStyle, padding: "2px 8px", marginRight: 6 }} onClick={() => void toggle(linha.id)}>
                      {linha.carregando ? "…" : linha.expandido ? "−" : "+"}
                    </button>
                  ) : (
                    <span style={{ display: "inline-block", width: 28 }} />
                  )}
                  {linha.label}
                </td>
                {cells.map((c, i) => (
                  <td key={i} style={tdStyle}>
                    {typeof c === "number" ? cellNum(c, pctCols.has(i)) : c == null ? "—" : String(c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
