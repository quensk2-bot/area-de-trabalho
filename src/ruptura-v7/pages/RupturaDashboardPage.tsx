import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isConsumoV7SchemaError, toHybridPendingError } from "../../hibrido-v7/hybridErrors.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { DonutChartSvg, HorizontalBarChartSvg, BarChartSvg } from "../components/charts/RupturaCharts.tsx";
import { RupturaContextHelp } from "../components/RupturaHelp.tsx";
import { RupturaKpiCards, RupturaResumoTexto } from "../components/RupturaKpiCards.tsx";
import { buttonStyle, cardStyle } from "../components/rupturaSharedStyles.ts";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import {
  consultarCompradoresTop,
  consultarDashboardFornecedores,
  consultarDashboardLoja,
  consultarDashboardSetores,
  consultarEstoquePorCd,
  consultarExecucaoAtiva,
} from "../services/rupturaDashboardService.ts";
import {
  consultarCompradoresTopHibrido,
  consultarDashboardFornecedoresHibrido,
  consultarDashboardLojaHibrido,
  consultarDashboardSetoresHibrido,
  consultarEstoquePorCdHibrido,
  consultarExecucaoAtivaHibrido,
} from "../services/hibrido/rupturaResumoHibridoService.ts";
import type { HybridServiceError } from "../../hibrido-v7/hybridErrors.ts";
import type { RupturaDashboardLoja } from "../types/rupturaDashboardTypes.ts";
import { RupturaExportMenu } from "../components/RupturaExportMenu.tsx";

type Props = { onAbrirGestao?: () => void };

export function RupturaDashboardPage({ onAbrirGestao }: Props) {
  const auth = useAuthV7();
  const permCtx = useMemo(
    () =>
      auth.perfil
        ? toPermissionContext({
            perfil: auth.perfil,
            regionais: auth.regionais,
            bandeiras: auth.bandeiras,
            lojas: auth.lojas,
            permissoes: auth.permissoes,
          })
        : null,
    [auth],
  );

  const [ctx, setCtx, { readonly, multiSelectLoja }] = useRupturaContextoScoped("dashboard");
  const [kpi, setKpi] = useState<RupturaDashboardLoja | null>(null);
  const [setores, setSetores] = useState<Awaited<ReturnType<typeof consultarDashboardSetores>>["dados"]>([]);
  const [fornecedores, setFornecedores] = useState<Awaited<ReturnType<typeof consultarDashboardFornecedores>>["dados"]>([]);
  const [compradores, setCompradores] = useState<{ comprador: string; total_ruptura: number }[]>([]);
  const [cds, setCds] = useState<Awaited<ReturnType<typeof consultarEstoquePorCd>>["dados"]>([]);
  const [execucao, setExecucao] = useState<{ versao?: number; finalizado_em?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [hybridState, setHybridState] = useState<HybridServiceError | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setHybridState(null);

    if (isModoHibrido()) {
      const [k, s, f, c, cd, ex] = await Promise.all([
        consultarDashboardLojaHibrido(ctx, permCtx),
        consultarDashboardSetoresHibrido(ctx, permCtx),
        consultarDashboardFornecedoresHibrido(ctx, permCtx, 10),
        consultarCompradoresTopHibrido(ctx, permCtx, 10),
        consultarEstoquePorCdHibrido(ctx, permCtx),
        consultarExecucaoAtivaHibrido(ctx, permCtx),
      ]);
      const firstErr = k.erro ?? s.erro ?? f.erro ?? c.erro ?? cd.erro ?? ex.erro;
      if (firstErr) setHybridState(firstErr);
      setKpi(k.dado);
      setSetores(s.dados);
      setFornecedores(f.dados);
      setCompradores(c.dados);
      setCds(cd.dados);
      setExecucao(ex.dado ?? null);
      setLoading(false);
      return;
    }

    const [k, s, f, c, cd, ex] = await Promise.all([
      consultarDashboardLoja(ctx),
      consultarDashboardSetores(ctx),
      consultarDashboardFornecedores(ctx, 10),
      consultarCompradoresTop(ctx, 10),
      consultarEstoquePorCd(ctx),
      consultarExecucaoAtiva(ctx),
    ]);
    const errMsg =
      k.erro?.message ?? s.erro?.message ?? f.erro?.message ?? c.erro?.message ?? cd.erro?.message ?? ex.erro?.message;
    if (errMsg) {
      const pending = toHybridPendingError(errMsg);
      if (pending) setHybridState(pending);
      else if (!isConsumoV7SchemaError(errMsg)) setErro(errMsg);
      else setHybridState(toHybridPendingError(errMsg));
    }
    setKpi(k.dado);
    setSetores(s.dados);
    setFornecedores(f.dados);
    setCompradores(c.dados);
    setCds(cd.dados);
    setExecucao(ex.dado ?? null);
    setLoading(false);
  }, [ctx, permCtx]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const slicesCpMpLp = useMemo(
    () =>
      kpi
        ? [
            { label: "CP", value: kpi.total_curto_prazo, color: theme.colors.neonGreen ?? "#22c55e" },
            { label: "MP", value: kpi.total_medio_prazo, color: theme.colors.warning ?? "#facc15" },
            { label: "LP", value: kpi.total_longo_prazo, color: theme.colors.danger ?? "#f87171" },
          ]
        : [],
    [kpi],
  );

  if (hybridState && !kpi && !loading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
            Gestão de Ruptura — Dashboard
          </h1>
        </header>
        <RupturaContextoBar ctx={ctx} onChange={setCtx} readonlyFields={readonly} multiSelectLoja={multiSelectLoja} />
        <HybridDataPending code={hybridState.code} message={hybridState.message} />
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Gestão de Ruptura — Dashboard</h1>
        <p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>
          Versão ativa {execucao?.versao ?? "—"} | Última atualização: {execucao?.finalizado_em ? new Date(execucao.finalizado_em).toLocaleString("pt-BR") : "—"}
          {isModoHibrido() ? " · Storage privado" : ""}
        </p>
      </header>

      <RupturaContextHelp
        titulo="Leitura operacional"
        texto={
          isModoHibrido()
            ? "Dashboard alimentado por JSON publicado no Storage privado (modo híbrido)."
            : "O Dashboard apresenta somente a versão ativa do Motor para a regional, loja e data selecionadas."
        }
      />

      <RupturaContextoBar
        ctx={ctx}
        onChange={setCtx}
        onAtualizar={() => void carregar()}
        readonlyFields={readonly}
        multiSelectLoja={multiSelectLoja}
        extra={
          <>
            <RupturaExportMenu ctx={ctx} authCtx={permCtx} compact />
            {onAbrirGestao && (
              <button type="button" style={buttonStyle} onClick={onAbrirGestao}>Abrir Gestão Operacional</button>
            )}
          </>
        }
      />

      {hybridState && kpi ? (
        <HybridDataPending code={hybridState.code} detail={hybridState.message} />
      ) : null}
      {erro && <div style={{ color: theme.colors.danger, fontSize: 13 }}>{erro}</div>}

      <RupturaKpiCards kpi={kpi} loading={loading} />
      <RupturaResumoTexto kpi={kpi} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: 14, color: theme.colors.neonOrange }}>CP × MP × LP</h3>
          <DonutChartSvg slices={slicesCpMpLp} />
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: 14, color: theme.colors.neonOrange }}>Ruptura por setor (top)</h3>
          <HorizontalBarChartSvg items={setores.slice(0, 10).map((s) => ({ label: s.setor_n2 ?? s.divisao ?? "—", value: s.total_ruptura }))} />
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: 14, color: theme.colors.neonOrange }}>Top 10 fornecedores</h3>
          <HorizontalBarChartSvg items={fornecedores.map((f) => ({ label: f.razao_fornecedor ?? String(f.cod_fornecedor ?? "—"), value: f.total_ruptura }))} />
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: 14, color: theme.colors.neonOrange }}>Top 10 compradores</h3>
          <HorizontalBarChartSvg items={compradores.map((c) => ({ label: c.comprador, value: c.total_ruptura }))} />
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: 14, color: theme.colors.neonOrange }}>Estoque disponível por CD</h3>
          <BarChartSvg
            items={cds.slice(0, 12).map((c) => ({
              label: String(c.codigo_cd_fisico ?? c.posicao_logica),
              value: Math.round(c.total_estoque),
              color: theme.colors.neonGreen ?? "#22c55e",
            }))}
          />
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: 14, color: theme.colors.neonOrange }}>Centralizados × não centralizados</h3>
          <DonutChartSvg
            slices={
              kpi
                ? [
                    { label: "Centralizados", value: kpi.total_centralizado, color: theme.colors.neonOrange ?? "#fb923c" },
                    { label: "Não centralizados", value: kpi.total_nao_centralizado, color: theme.colors.textMuted ?? "#64748b" },
                  ]
                : []
            }
          />
        </div>
      </div>
    </section>
  );
}
