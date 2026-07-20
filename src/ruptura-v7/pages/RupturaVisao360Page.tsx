import { useCallback, useEffect, useMemo, useState } from "react";
import { theme } from "../../styles.ts";
import { DonutChartSvg } from "../components/charts/RupturaCharts.tsx";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaHierarquiaTable } from "../components/RupturaHierarquiaTable.tsx";
import { RupturaVisao360Blocks } from "../components/RupturaVisao360Blocks.tsx";
import { buttonGhostStyle, buttonStyle, cardStyle, formatNumero, formatPercentual, helpTextStyle } from "../components/rupturaSharedStyles.ts";
import { useRupturaContexto } from "../hooks/useRupturaContexto.ts";
import { consultarExecucaoAtiva } from "../services/rupturaDashboardService.ts";
import { consultarOficialLoja } from "../services/rupturaOficialService.ts";
import type { ModoApresentacaoVisao360, RupturaOficialLoja, UniversoLeituraOficial } from "../types/rupturaOficialTypes.ts";
import {
  CAMPOS_NAO_PUBLICADOS,
  REFERENCIA_PLANILHA_LOJA73,
  UNIVERSO_LEITURA_DEFAULT,
  UNIVERSO_LEITURA_LABEL,
} from "../types/rupturaOficialTypes.ts";

type Comparacao = {
  indicador: string;
  planilha: string;
  v7: string;
  status: "ok" | "diff" | "nao_publicado";
  nota?: string;
};

function comparar(kpi: RupturaOficialLoja | null, ref = REFERENCIA_PLANILHA_LOJA73): Comparacao[] {
  if (!kpi) return [];
  const rows: Comparacao[] = [
    { indicador: "SKUs", planilha: formatNumero(ref.skus), v7: formatNumero(kpi.total_skus), status: Math.abs(kpi.total_skus - ref.skus) <= 1 ? "ok" : "diff", nota: "Universo oficial = Base Limpa + Gera Ruptura" },
    { indicador: "Ruptura", planilha: formatNumero(ref.ruptura), v7: formatNumero(kpi.total_ruptura), status: kpi.total_ruptura === ref.ruptura ? "ok" : "diff" },
    { indicador: "% Ruptura", planilha: formatPercentual(ref.pct), v7: formatPercentual(kpi.pct_ruptura), status: kpi.pct_ruptura === ref.pct ? "ok" : "diff" },
    { indicador: "Curto Prazo", planilha: formatNumero(ref.curto_prazo), v7: formatNumero(kpi.total_curto_prazo), status: "diff", nota: "Planilha inclui subconjunto Cross (46); V7 persiste CP=103" },
    { indicador: "Itens Cross", planilha: formatNumero(ref.itens_cross), v7: formatNumero(kpi.total_itens_cross), status: "diff", nota: "cross_docking persistido = 0 (crossSum não publicado)" },
    { indicador: "Havia estoque CD", planilha: formatNumero(ref.havia_estoque_cd), v7: "—", status: "nao_publicado", nota: "Curto Prazo Não Rebto Próximo" },
    { indicador: "Receb. próximo", planilha: formatNumero(ref.rebto_proximo), v7: "—", status: "nao_publicado" },
    { indicador: "Médio Prazo", planilha: formatNumero(ref.medio_prazo), v7: formatNumero(kpi.total_medio_prazo), status: "diff", nota: "CP/MP/LP persistidos pelo Motor — sem alteração de regra" },
    { indicador: "Longo Prazo", planilha: formatNumero(ref.longo_prazo), v7: formatNumero(kpi.total_longo_prazo), status: Math.abs(kpi.total_longo_prazo - ref.longo_prazo) <= 2 ? "ok" : "diff" },
    { indicador: "Rup. inventário", planilha: formatNumero(ref.rup_inv), v7: formatNumero(kpi.itens_ruptura_via_inventario), status: kpi.itens_ruptura_via_inventario === ref.rup_inv ? "ok" : "diff" },
    { indicador: "Pend. venda", planilha: formatNumero(ref.vda_pend), v7: formatNumero(kpi.itens_vda_pendencia), status: kpi.itens_vda_pendencia === ref.vda_pend ? "ok" : "diff" },
  ];
  return rows;
}

export function RupturaVisao360Page() {
  const [ctx, setCtx] = useRupturaContexto();
  const [universo, setUniverso] = useState<UniversoLeituraOficial>(UNIVERSO_LEITURA_DEFAULT);
  const [modo, setModo] = useState<ModoApresentacaoVisao360>("oficial");
  const [kpi, setKpi] = useState<RupturaOficialLoja | null>(null);
  const [versao, setVersao] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarValidacao, setMostrarValidacao] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const [res, ex] = await Promise.all([consultarOficialLoja(ctx, universo), consultarExecucaoAtiva(ctx)]);
    if (res.erro || ex.erro) setErro(res.erro?.message ?? ex.erro?.message ?? "Erro ao carregar Visão 360°");
    setKpi(res.dado ?? null);
    setVersao(res.dado?.versao ?? ex.dado?.versao ?? null);
    setLoading(false);
  }, [ctx, universo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const comparacoes = useMemo(() => comparar(kpi), [kpi]);
  const slices = kpi
    ? [
        { label: "CP", value: kpi.total_curto_prazo, color: theme.colors.neonGreen ?? "#22c55e" },
        { label: "MP", value: kpi.total_medio_prazo, color: theme.colors.warning ?? "#facc15" },
        { label: "LP", value: kpi.total_longo_prazo, color: theme.colors.danger ?? "#f87171" },
      ]
    : [];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
          RUPTURA COMPER {ctx.regional}
        </h1>
        <p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>
          Loja {ctx.loja} · {ctx.dataReferencia} · versão {versao ?? "—"} · Views consumo_v7 (oficial)
        </p>
      </header>

      <RupturaContextoBar ctx={ctx} onChange={setCtx} onAtualizar={() => void carregar()} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <label style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Universo
          <select
            value={universo}
            onChange={(e) => setUniverso(e.target.value as UniversoLeituraOficial)}
            style={{ marginLeft: 8, background: "#0f172a", color: theme.colors.text, border: "1px solid #334155", borderRadius: 8, padding: "6px 10px" }}
          >
            {(Object.keys(UNIVERSO_LEITURA_LABEL) as UniversoLeituraOficial[]).map((k) => (
              <option key={k} value={k}>
                {UNIVERSO_LEITURA_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" style={modo === "oficial" ? buttonStyle : buttonGhostStyle} onClick={() => setModo("oficial")}>
          Modo Oficial
        </button>
        <button type="button" style={modo === "v7" ? buttonStyle : buttonGhostStyle} onClick={() => setModo("v7")}>
          Modo V7
        </button>
        <button type="button" style={buttonGhostStyle} onClick={() => setMostrarValidacao((v) => !v)}>
          {mostrarValidacao ? "Ocultar validação" : "Validação loja 73"}
        </button>
      </div>

      {erro && <p style={{ color: theme.colors.danger }}>{erro}</p>}

      {kpi && <RupturaVisao360Blocks kpi={kpi} modo={modo} />}

      {modo === "v7" && kpi && slices.length > 0 && (
        <div style={{ ...cardStyle, maxWidth: 360 }}>
          <h3 style={{ margin: "0 0 12px", color: theme.colors.neonGreen }}>CP / MP / LP</h3>
          <DonutChartSvg slices={slices} size={200} />
        </div>
      )}

      {mostrarValidacao && kpi && ctx.loja === 73 && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", color: theme.colors.neonOrange }}>Validação vs planilha (referência visual)</h3>
          <p style={helpTextStyle}>{REFERENCIA_PLANILHA_LOJA73.observacao}</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 10 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, color: theme.colors.neonOrange }}>Indicador</th>
                <th style={{ textAlign: "right", padding: 8 }}>Planilha ({REFERENCIA_PLANILHA_LOJA73.data_referencia})</th>
                <th style={{ textAlign: "right", padding: 8 }}>V7 ({ctx.dataReferencia})</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {comparacoes.map((c) => (
                <tr key={c.indicador}>
                  <td style={{ padding: 8 }}>{c.indicador}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{c.planilha}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{c.v7}</td>
                  <td style={{ padding: 8, color: c.status === "ok" ? theme.colors.neonGreen : c.status === "nao_publicado" ? theme.colors.textMuted : theme.colors.warning }}>
                    {c.status === "ok" ? "OK" : c.status === "nao_publicado" ? "Não publicado" : "Diverge"}
                    {c.nota ? ` — ${c.nota}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: theme.colors.neonGreen }}>Hierarquia oficial (SETOR → SETOR2 → CATEGORIA)</h3>
        <RupturaHierarquiaTable ctx={ctx} />
      </div>

      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", color: theme.colors.neonOrange, fontWeight: 700 }}>Campos ainda não publicados no Data Mart</summary>
        <ul style={{ ...helpTextStyle, marginTop: 12 }}>
          {CAMPOS_NAO_PUBLICADOS.map((c) => (
            <li key={c.colunaOficial}>
              <strong>{c.colunaOficial}</strong> — {c.origemNecessaria}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
