import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { BaseCompradorSlicer } from "../components/BaseCompradorSlicers.tsx";
import { BaseCompradorTable } from "../components/BaseCompradorTable.tsx";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaContextHelp } from "../components/RupturaHelp.tsx";
import { buttonStyle, inputStyle } from "../components/rupturaSharedStyles.ts";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import { fetchCatalogoLojas } from "../../auth-v7/catalogoLojasService.ts";
import { lojasNoEscopoCatalogo, todasLojasSelecionadas, formatLojasSelecionadasLabel } from "../services/lojasFiltroUtils.ts";
import { formatCompradoresSelecionadosLabel } from "../services/compradoresFiltroUtils.ts";
import {
  consultarBaseCompradorHibrido,
  consultarExecucaoAtivaHibrido,
  type DashboardHibridoCobertura,
} from "../services/hibrido/rupturaResumoHibridoService.ts";
import type { HybridServiceError } from "../../hibrido-v7/hybridErrors.ts";
import type { BaseCompradorFiltrosSlicer, BaseCompradorLinha } from "../utils/baseCompradorTypes.ts";
import { aplicarSlicersBaseComprador } from "../utils/mapearBaseCompradorFromGestao.ts";
import type { BaseCompradorExportContext } from "../utils/exportBaseComprador.ts";

type Props = { onAbrirGestao?: () => void };

const SLICERS_VAZIOS: BaseCompradorFiltrosSlicer = { departamentos: [], secoes: [], categorias: [] };

function rotuloSlicer(selecionados: string[], total: number, todos: string): string {
  if (total === 0) return "—";
  if (selecionados.length === 0 || selecionados.length >= total) return todos;
  if (selecionados.length <= 3) return selecionados.join(", ");
  return `${selecionados.length} selecionados`;
}

export function RupturaBaseCompradorPage({ onAbrirGestao }: Props) {
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

  const [ctx, setCtx, { readonly, multiSelectLoja }] = useRupturaContextoScoped("base-comprador");
  const [linhasBase, setLinhasBase] = useState<BaseCompradorLinha[]>([]);
  const [catalogoDepartamentos, setCatalogoDepartamentos] = useState<string[]>([]);
  const [catalogoSecoes, setCatalogoSecoes] = useState<string[]>([]);
  const [catalogoCategorias, setCatalogoCategorias] = useState<string[]>([]);
  const [catalogoCompradores, setCatalogoCompradores] = useState<string[]>([]);
  const [slicers, setSlicers] = useState<BaseCompradorFiltrosSlicer>(SLICERS_VAZIOS);
  const [busca, setBusca] = useState("");
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

  const todasLojas = todasLojasSelecionadas(ctx.lojas, totalLojasEscopo);
  const todosCompradoresCtx =
    !ctx.compradores?.length || ctx.compradores.length >= catalogoCompradores.length;

  const linhasVisiveis = useMemo(
    () =>
      aplicarSlicersBaseComprador(
        linhasBase,
        slicers,
        catalogoDepartamentos.length,
        catalogoSecoes.length,
        catalogoCategorias.length,
        busca,
      ),
    [linhasBase, slicers, catalogoDepartamentos.length, catalogoSecoes.length, catalogoCategorias.length, busca],
  );

  const exportCtx: BaseCompradorExportContext = useMemo(
    () => ({
      regional: ctx.regional,
      bandeira: ctx.bandeira,
      dataReferencia: ctx.dataReferencia,
      rotuloLojas: formatLojasSelecionadasLabel(todasLojas ? [] : ctx.lojas, totalLojasEscopo),
      rotuloCompradores: formatCompradoresSelecionadosLabel(
        todosCompradoresCtx ? [] : (ctx.compradores ?? []),
        catalogoCompradores.length,
      ),
      rotuloDepartamentos: rotuloSlicer(slicers.departamentos, catalogoDepartamentos.length, "Todos"),
      rotuloSecoes: rotuloSlicer(slicers.secoes, catalogoSecoes.length, "Todos"),
      rotuloCategorias: rotuloSlicer(slicers.categorias, catalogoCategorias.length, "Todas"),
      busca: busca.trim(),
    }),
    [
      ctx,
      todasLojas,
      totalLojasEscopo,
      todosCompradoresCtx,
      catalogoCompradores.length,
      slicers,
      catalogoDepartamentos.length,
      catalogoSecoes.length,
      catalogoCategorias.length,
      busca,
    ],
  );

  const permCtxRef = useRef(permCtx);
  permCtxRef.current = permCtx;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const ctxFetchKey = useMemo(
    () =>
      JSON.stringify({
        regional: ctx.regional,
        bandeira: ctx.bandeira,
        lojas: ctx.lojas,
        compradores: ctx.compradores ?? [],
        dataReferencia: ctx.dataReferencia,
      }),
    [ctx.regional, ctx.bandeira, ctx.lojas, ctx.compradores, ctx.dataReferencia],
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
      lojas: ctxAtual.lojas,
      compradores: ctxAtual.compradores ?? [],
      dataReferencia: ctxAtual.dataReferencia,
    });

    if (!isModoHibrido()) {
      setLoading(false);
      return;
    }

    const [base, ex] = await Promise.all([
      consultarBaseCompradorHibrido(ctxAtual, perm),
      consultarExecucaoAtivaHibrido(ctxAtual, perm),
    ]);
    const firstErr = base.erro ?? ex.erro;
    if (firstErr) setHybridState(firstErr);
    setCobertura(base.cobertura);
    setLinhasBase(base.linhas);
    setCatalogoDepartamentos(base.catalogoDepartamentos);
    setCatalogoSecoes(base.catalogoSecoes);
    setCatalogoCategorias(base.catalogoCategorias);
    setCatalogoCompradores(base.catalogoCompradores);
    setSlicers(SLICERS_VAZIOS);
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
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Base Comprador</h1>
        <p style={{ color: theme.colors.textMuted, marginTop: 12 }}>Disponível apenas no modo híbrido.</p>
      </section>
    );
  }

  if (hybridState && !linhasBase.length && !loading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Base Comprador</h1>
        </header>
        <RupturaContextoBar ctx={ctx} onChange={setCtx} readonlyFields={readonly} multiSelectLoja={multiSelectLoja} />
        <HybridDataPending code={hybridState.code} message={hybridState.message} />
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Base Comprador</h1>
        <p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>
          Versão ativa {execucao?.versao ?? "—"} | Última atualização:{" "}
          {execucao?.finalizado_em ? new Date(execucao.finalizado_em).toLocaleString("pt-BR") : "—"}
        </p>
      </header>

      <RupturaContextHelp
        titulo="BASE_COMPRADOR (Excel)"
        texto={
          "Réplica da tabela dinâmica sem valores: hierarquia COMPRADOR → FORNECEDOR → DEPARTAMENTO → SEÇÃO → CATEGORIA → CÓDIGO → DESCCOMPLETA. " +
          "Universo oficial compatível (sortimento limpo). Com várias lojas, um registro por CÓDIGO. " +
          "CATEGORIA = nível 3 do TXT (campo grupoN3 / hierarquia CATEGORIA). Republicar gestao.json após atualização do motor se a coluna ainda vier vazia."
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: 12,
          borderRadius: 8,
          border: `1px solid ${theme.colors.borderSoft ?? "#334155"}`,
          background: "rgba(15,23,42,0.5)",
        }}
      >
        <BaseCompradorSlicer
          titulo="DEPARTAMENTO"
          opcoes={catalogoDepartamentos}
          selecionados={slicers.departamentos}
          onApply={(departamentos) => setSlicers((s) => ({ ...s, departamentos }))}
        />
        <BaseCompradorSlicer
          titulo="SEÇÃO"
          opcoes={catalogoSecoes}
          selecionados={slicers.secoes}
          onApply={(secoes) => setSlicers((s) => ({ ...s, secoes }))}
        />
        <BaseCompradorSlicer
          titulo="CATEGORIA"
          opcoes={catalogoCategorias}
          selecionados={slicers.categorias}
          onApply={(categorias) => setSlicers((s) => ({ ...s, categorias }))}
        />
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
          CÓDIGO / DESCRIÇÃO
          <input
            style={{ ...inputStyle, minWidth: 220 }}
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar código ou descrição"
          />
        </label>
      </div>

      {filtrosDesatualizados && loading ? (
        <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Atualizando dados…</div>
      ) : null}
      {hybridState && linhasBase.length ? (
        <HybridDataPending code={hybridState.code} detail={hybridState.message} />
      ) : null}

      <BaseCompradorTable linhas={linhasVisiveis} loading={loading} exportCtx={exportCtx} />
    </section>
  );
}
