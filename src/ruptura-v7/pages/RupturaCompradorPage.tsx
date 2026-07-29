import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaContextHelp } from "../components/RupturaHelp.tsx";
import { RupturaCapaTable } from "../components/RupturaCapaTable.tsx";
import { RupturaKpiCards, RupturaResumoTexto } from "../components/RupturaKpiCards.tsx";
import { buttonStyle } from "../components/rupturaSharedStyles.ts";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import {
  consultarDashboardCompradorHibrido,
  consultarExecucaoAtivaHibrido,
} from "../services/hibrido/rupturaResumoHibridoService.ts";
import type { HybridServiceError } from "../../hibrido-v7/hybridErrors.ts";
import type { RupturaDashboardLoja } from "../types/rupturaDashboardTypes.ts";
import { fetchCatalogoLojas } from "../../auth-v7/catalogoLojasService.ts";
import { lojasNoEscopoCatalogo, todasLojasSelecionadas } from "../services/lojasFiltroUtils.ts";
import { montarCapaExportContextProps } from "../utils/capaExportContext.ts";
import type { DashboardHibridoCobertura } from "../services/hibrido/rupturaResumoHibridoService.ts";
import type { RupturaCompradorResultado } from "../utils/agregarCapaFromGestao.ts";

type Props = { onAbrirGestao?: () => void };

export function RupturaCompradorPage({ onAbrirGestao }: Props) {
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

  const [ctx, setCtx, { readonly, multiSelectLoja }] = useRupturaContextoScoped("comprador");
  const [kpi, setKpi] = useState<RupturaDashboardLoja | null>(null);
  const [comprador, setComprador] = useState<RupturaCompradorResultado | null>(null);
  const [catalogoCompradores, setCatalogoCompradores] = useState<string[]>([]);
  const [execucao, setExecucao] = useState<{ versao?: number; finalizado_em?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hybridState, setHybridState] = useState<HybridServiceError | null>(null);
  const [cobertura, setCobertura] = useState<DashboardHibridoCobertura | null>(null);
  const [catalogo, setCatalogo] = useState<Awaited<ReturnType<typeof fetchCatalogoLojas>>>([]);

  useEffect(() => {
    void fetchCatalogoLojas().then(setCatalogo);
  }, []);

  const totalLojasEscopo = useMemo(
    () => lojasNoEscopoCatalogo(catalogo, ctx.regional, ctx.bandeira).length,
    [catalogo, ctx.regional, ctx.bandeira],
  );

  const capaExportProps = useMemo(
    () =>
      montarCapaExportContextProps({
        ctx,
        variant: "comprador",
        dataReferencia: ctx.dataReferencia,
        totalLojasEscopo,
        totalCompradoresEscopo: catalogoCompradores.length,
      }),
    [ctx, totalLojasEscopo, catalogoCompradores.length],
  );

  const multiLojaResumo = useMemo(() => {
    return ctx.lojas.length > 1 || todasLojasSelecionadas(ctx.lojas, totalLojasEscopo);
  }, [ctx.lojas, totalLojasEscopo]);

  const multiCompradorResumo = useMemo(() => {
    const total = catalogoCompradores.length;
    const sel = ctx.compradores?.length ?? 0;
    return sel === 0 || sel > 1 || (total > 0 && sel >= total);
  }, [ctx.compradores, catalogoCompradores.length]);

  const avisoPendenciaPq = useMemo(() => {
    if (!comprador?.total || loading) return null;
    const { total_skus, itens_vda_pendencia } = comprador.total;
    if (total_skus < 100 || itens_vda_pendencia > 0) return null;
    return (
      "Coluna Pendência de Venda zerada — republicar gestao.json com CAPA_PQ_OFICIAL_XLSX " +
      "(planilha de conferência) para carregar Itens Vda Pendência."
    );
  }, [comprador, loading]);

  const avisoCoberturaParcial = useMemo(() => {
    if (!cobertura || !multiLojaResumo) return null;
    const { lojasAlvo, lojasCarregadas, lojasNaoPublicadas } = cobertura;
    if (lojasCarregadas.length >= lojasAlvo.length) return null;
    const lojasTxt =
      lojasCarregadas.length <= 5
        ? lojasCarregadas.join(", ")
        : `${lojasCarregadas.slice(0, 5).join(", ")}…`;
    return (
      `Filtro em "Todas as lojas", mas só ${lojasCarregadas.length} de ${lojasAlvo.length} possuem resumo publicado ` +
      `no Storage (${ctx.dataReferencia}). KPIs refletem apenas a(s) loja(s) ${lojasTxt}. ` +
      `${lojasNaoPublicadas.length} loja(s) ainda não foram publicadas pelo motor híbrido.`
    );
  }, [cobertura, multiLojaResumo, ctx.dataReferencia]);

  const permCtxRef = useRef(permCtx);
  permCtxRef.current = permCtx;

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const ctxFetchKey = useMemo(
    () =>
      JSON.stringify({
        regional: ctx.regional,
        bandeira: ctx.bandeira,
        loja: ctx.loja,
        lojas: ctx.lojas,
        compradores: ctx.compradores ?? [],
        dataReferencia: ctx.dataReferencia,
      }),
    [ctx.regional, ctx.bandeira, ctx.loja, ctx.lojas, ctx.compradores, ctx.dataReferencia],
  );

  const [loadedCtxKey, setLoadedCtxKey] = useState<string | null>(null);
  const filtrosDesatualizados = loadedCtxKey != null && loadedCtxKey !== ctxFetchKey;

  const carregar = useCallback(async () => {
    setLoading(true);
    setHybridState(null);
    const perm = permCtxRef.current;
    const ctxAtual = ctxRef.current;
    const keyAtual = JSON.stringify({
      regional: ctxAtual.regional,
      bandeira: ctxAtual.bandeira,
      loja: ctxAtual.loja,
      lojas: ctxAtual.lojas,
      compradores: ctxAtual.compradores ?? [],
      dataReferencia: ctxAtual.dataReferencia,
    });

    if (!isModoHibrido()) {
      setLoading(false);
      return;
    }

    const [dash, ex] = await Promise.all([
      consultarDashboardCompradorHibrido(ctxAtual, perm),
      consultarExecucaoAtivaHibrido(ctxAtual, perm),
    ]);
    const firstErr = dash.erro ?? ex.erro;
    if (firstErr) setHybridState(firstErr);
    setCobertura(dash.cobertura);
    setKpi(dash.dado);
    setComprador(dash.comprador);
    setCatalogoCompradores(dash.catalogoCompradores);
    setExecucao(ex.dado ?? null);
    setLoadedCtxKey(keyAtual);
    setLoading(false);
  }, []);

  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  useEffect(() => {
    if (loadedCtxKey != null) return;
    if (!isModoHibrido() || !permCtxRef.current) return;
    void carregarRef.current();
  }, [loadedCtxKey, permCtx?.nivel]);

  useEffect(() => {
    if (loadedCtxKey == null || ctxFetchKey === loadedCtxKey) return;
    if (!isModoHibrido() || !permCtxRef.current) return;
    void carregarRef.current();
  }, [ctxFetchKey, loadedCtxKey, permCtx?.nivel]);

  if (!isModoHibrido()) {
    return (
      <section>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Dashboard Comprador</h1>
        <p style={{ color: theme.colors.textMuted, marginTop: 12 }}>Dashboard Comprador disponível apenas no modo híbrido.</p>
      </section>
    );
  }

  if (hybridState && !kpi && !loading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Dashboard Comprador</h1>
        </header>
        <RupturaContextoBar ctx={ctx} onChange={setCtx} readonlyFields={readonly} multiSelectLoja={multiSelectLoja} />
        <HybridDataPending code={hybridState.code} message={hybridState.message} />
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Dashboard Comprador</h1>
        <p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>
          Versão ativa {execucao?.versao ?? "—"} | Última atualização:{" "}
          {execucao?.finalizado_em ? new Date(execucao.finalizado_em).toLocaleString("pt-BR") : "—"} · Storage privado
        </p>
      </header>

      <RupturaContextHelp
        titulo="Comparar com Excel"
        texto={
          "Compare a linha 60-MERCEARIA (expandida), não a linha TOTAL — o Excel COMPRADOR mostra um grupo por vez. " +
          "SKU/Ruptura/CP/MP/LP no TOTAL batem com a planilha oficial MT (~129.841 SKUs / 13.357 rupturas). " +
          "Pendência de venda e nomes de comprador vêm da planilha PQ na publicação do gestao.json. " +
          "Para exportar o que está na tabela, use «Exportar tela» acima da CAPA (não a base SKU da Gestão)."
        }
      />

      <RupturaContextoBar
        ctx={ctx}
        onChange={setCtx}
        onAtualizar={() => void carregar()}
        readonlyFields={readonly}
        multiSelectLoja={multiSelectLoja}
        lojasNaoPublicadas={cobertura?.lojasNaoPublicadas}
        mostrarFiltroComprador
        compradoresCatalogo={catalogoCompradores}
        extra={
          onAbrirGestao ? (
            <button type="button" style={buttonStyle} onClick={onAbrirGestao}>
              Abrir Gestão Operacional
            </button>
          ) : null
        }
      />

      {filtrosDesatualizados && loading ? (
        <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Atualizando dados…</div>
      ) : null}
      {avisoCoberturaParcial ? (
        <div style={{ color: theme.colors.warning ?? "#facc15", fontSize: 13 }}>{avisoCoberturaParcial}</div>
      ) : null}
      {avisoPendenciaPq ? (
        <div style={{ color: theme.colors.warning ?? "#facc15", fontSize: 13 }}>{avisoPendenciaPq}</div>
      ) : null}
      {hybridState && kpi ? <HybridDataPending code={hybridState.code} detail={hybridState.message} /> : null}

      <RupturaKpiCards kpi={kpi} loading={loading} />
      <RupturaResumoTexto kpi={kpi} multiLoja={multiLojaResumo || multiCompradorResumo} />

      <div>
        <h2 style={{ margin: "0 0 10px", fontSize: 15, color: theme.colors.neonOrange }}>COMPRADOR — Ruptura por grupo</h2>
        <RupturaCapaTable
          capa={comprador}
          loading={loading}
          dataReferencia={ctx.dataReferencia}
          variant="comprador"
          exportContext={capaExportProps}
          tooltipsPrazo={{
            cp: kpi?.tooltip_curto_prazo,
            mp: kpi?.tooltip_medio_prazo,
            lp: kpi?.tooltip_longo_prazo,
          }}
        />
      </div>
    </section>
  );
}
