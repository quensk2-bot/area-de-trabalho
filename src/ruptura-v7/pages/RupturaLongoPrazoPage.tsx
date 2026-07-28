import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaLongoPrazoKpiCards } from "../components/RupturaLongoPrazoKpiCards.tsx";
import {
  RupturaLongoPrazoTable,
  COLUNAS_LONGO_PRAZO,
  type ColunaIdLp,
} from "../components/RupturaLongoPrazoTable.tsx";
import {
  buttonGhostStyle,
  inputStyle,
} from "../components/rupturaSharedStyles.ts";
import { RupturaExportMenu } from "../components/RupturaExportMenu.tsx";
import { RupturaProdutoDetalhe } from "../components/RupturaProdutoDetalhe.tsx";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import {
  consultarProdutosPaginadosHibrido,
  invalidateGestaoCache,
} from "../services/hibrido/rupturaGestaoHibridoService.ts";
import {
  RUPTURA_BUSCA_DEBOUNCE_MS,
  RUPTURA_BUSCA_MIN_CHARS,
  RUPTURA_PAGE_SIZE_DEFAULT,
  RUPTURA_PAGE_SIZES,
} from "../types/rupturaFiltrosTypes.ts";
import type { RupturaFiltrosProdutos } from "../types/rupturaFiltrosTypes.ts";
import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import type { HybridServiceError } from "../../hibrido-v7/hybridErrors.ts";
import { useDebouncedValue } from "../hooks/useRupturaContexto.ts";
import {
  contarCardsLp,
  acaoVisualLp,
  extrairAcoesVisuaisUnicasLp,
} from "../utils/longoPrazoPresentation.ts";
import type { CardCountsLp, AcaoVisualLp } from "../utils/longoPrazoPresentation.ts";

export function RupturaLongoPrazoPage() {
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

  const [ctx, setCtx, { readonly, multiSelectLoja }] = useRupturaContextoScoped("gestao");
  const [loadProgress, setLoadProgress] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Partial<RupturaFiltrosProdutos>>({});
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebouncedValue(busca, RUPTURA_BUSCA_DEBOUNCE_MS);
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(RUPTURA_PAGE_SIZE_DEFAULT);
  const [todosLp, setTodosLp] = useState<RupturaProdutoLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [hybridState, setHybridState] = useState<HybridServiceError | null>(null);
  const [detalhe, setDetalhe] = useState<RupturaProdutoLoja | null>(null);
  const [colunasVisiveis, setColunasVisiveis] = useState<Set<ColunaIdLp>>(
    () => new Set(COLUNAS_LONGO_PRAZO.filter((c) => c.default).map((c) => c.id)),
  );
  const [configColunasAberto, setConfigColunasAberto] = useState(false);

  // Filtro ação operacional
  const [acaoFiltro, setAcaoFiltro] = useState<AcaoVisualLp | null>(null);

  // Filtro ativação >30
  const [filtroAtivacao30, setFiltroAtivacao30] = useState<string | null>(null);

  // Filtro centralização
  const [filtroCentralizacao, setFiltroCentralizacao] = useState<string | null>(null);

  // Ações visuais únicas para filtro
  const acoesDisponiveis = useMemo(
    () => extrairAcoesVisuaisUnicasLp(todosLp),
    [todosLp],
  );

  const handleAcaoFiltroChange = (value: string) => {
    setAcaoFiltro((value || null) as AcaoVisualLp | null);
    setPagina(1);
  };

  // Filtros server-side
  const filtrosCompletos = useMemo((): RupturaFiltrosProdutos => {
    const termo = buscaDebounced.trim();
    return {
      ...ctx,
      ...filtros,
      classificacao: ["longo_prazo"],
      busca: termo.length >= RUPTURA_BUSCA_MIN_CHARS ? termo : undefined,
    };
  }, [ctx, filtros, buscaDebounced]);

  // Filtros client-side
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string | null>(null);
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string | null>(null);
  const [statusAtivacaoFiltro, setStatusAtivacaoFiltro] = useState<string | null>(null);
  const [faixaRupturaFiltro, setFaixaRupturaFiltro] = useState<string | null>(null);
  const [faixaUltimoPedidoFiltro, setFaixaUltimoPedidoFiltro] = useState<string | null>(null);

  // Aplicar filtros client-side
  const filtrados = useMemo(() => {
    let list = todosLp;
    if (filtros.setor) list = list.filter((p) => p.setor_n2 === filtros.setor);
    if (filtros.comprador) list = list.filter((p) => p.comprador === filtros.comprador);
    if (fornecedorFiltro) list = list.filter((p) => p.razao_fornecedor === fornecedorFiltro);
    if (modalidadeFiltro) {
      list = list.filter((p) => (p.modalidade_cd ?? "ED Direto Loja") === modalidadeFiltro);
    }
    if (statusAtivacaoFiltro) {
      list = list.filter((p) => p.status_solicitacao_ativacao_cd === statusAtivacaoFiltro);
    }

    // Filtro por ação visual
    if (acaoFiltro) {
      list = list.filter((p) => acaoVisualLp(p) === acaoFiltro);
    }

    // Filtro ativação >30
    if (filtroAtivacao30 === "sim") {
      list = list.filter((p) => p.ativacao_ruptura_30_sem_pedido === 1 || p.ativacao_ruptura_30_sem_pedido === true);
    } else if (filtroAtivacao30 === "nao") {
      list = list.filter((p) => p.ativacao_ruptura_30_sem_pedido !== 1 && p.ativacao_ruptura_30_sem_pedido !== true);
    }

    // Filtro centralização
    if (filtroCentralizacao === "centralizado") {
      list = list.filter((p) => p.produto_centralizado != null && Number(p.produto_centralizado) > 0);
    } else if (filtroCentralizacao === "nao_centralizado") {
      list = list.filter((p) => p.produto_centralizado == null || Number(p.produto_centralizado) <= 0);
    }

    // Faixa Dias Ruptura
    if (faixaRupturaFiltro) {
      const [min, max] = faixaRupturaFiltro.split("-").map(Number);
      list = list.filter((p) => {
        const v = p.dias_ruptura ?? 0;
        if (max) return v >= min && v <= max;
        return v >= min;
      });
    }

    // Faixa Último Pedido
    if (faixaUltimoPedidoFiltro) {
      const [min, max] = faixaUltimoPedidoFiltro.split("-").map(Number);
      list = list.filter((p) => {
        const v = p.ultimo_pedido_loja_pq;
        if (v == null || v === 999) return false;
        if (max) return v >= min && v <= max;
        return v >= min;
      });
    }

    if (buscaDebounced.trim().length >= RUPTURA_BUSCA_MIN_CHARS) {
      const term = buscaDebounced.trim().toLowerCase();
      const asNum = Number(term);
      list = list.filter(
        (p) =>
          p.descricao?.toLowerCase().includes(term) ||
          (Number.isFinite(asNum) && p.seqproduto === asNum),
      );
    }
    return list;
  }, [todosLp, filtros, buscaDebounced, acaoFiltro, fornecedorFiltro, modalidadeFiltro,
      statusAtivacaoFiltro, filtroAtivacao30, filtroCentralizacao, faixaRupturaFiltro, faixaUltimoPedidoFiltro]);

  // Cards sobre filtrados
  const cardCounts = useMemo((): CardCountsLp => contarCardsLp(filtrados), [filtrados]);

  // Paginação
  const paginaAtual = useMemo(() => {
    const offset = Math.max(0, pagina - 1) * tamanho;
    return filtrados.slice(offset, offset + tamanho);
  }, [filtrados, pagina, tamanho]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamanho));

  // Handles com reset de página
  const handleBuscaChange = (v: string) => { setBusca(v); setPagina(1); };
  const handleCompradorChange = (v: string) => { setFiltros((f) => ({ ...f, comprador: v || undefined })); setPagina(1); };
  const handleSetorChange = (v: string) => { setFiltros((f) => ({ ...f, setor: v || undefined })); setPagina(1); };
  const handleFornecedorChange = (v: string) => { setFornecedorFiltro(v || null); setPagina(1); };
  const handleModalidadeChange = (v: string) => { setModalidadeFiltro(v || null); setPagina(1); };
  const handleAtivacaoStatusChange = (v: string) => { setStatusAtivacaoFiltro(v || null); setPagina(1); };
  const handleAtivacao30Change = (v: string) => { setFiltroAtivacao30(v || null); setPagina(1); };
  const handleCentralizacaoChange = (v: string) => { setFiltroCentralizacao(v || null); setPagina(1); };
  const handleFaixaRupturaChange = (v: string) => { setFaixaRupturaFiltro(v || null); setPagina(1); };
  const handleFaixaUltimoPedidoChange = (v: string) => { setFaixaUltimoPedidoFiltro(v || null); setPagina(1); };

  // Carregar dados
  const carregar = useCallback(async () => {
    setLoading(true);
    setHybridState(null);
    if (!isModoHibrido()) { setLoading(false); return; }

    const r = await consultarProdutosPaginadosHibrido({
      filtros: { ...ctx, ...filtros, classificacao: ["longo_prazo"] },
      pagina: 1,
      tamanho: 999999,
      authCtx: permCtx,
      visaoOficial: true,
      onProgress: (p) => setLoadProgress(`Carregando loja ${p.atual} de ${p.total}…`),
    });
    setLoadProgress(null);
    if (r.erro) { setHybridState(r.erro); setLoading(false); return; }
    setTodosLp(r.dados);
    setPagina(1);
    setLoading(false);
  }, [ctx, filtros, permCtx]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { if (isModoHibrido()) invalidateGestaoCache(); }, [ctx.regional, ctx.bandeira, ctx.dataReferencia, ctx.loja, ctx.lojas]);

  // Valores para filtros
  const setores = useMemo(() => [...new Set(todosLp.map(p => p.setor_n2).filter(Boolean))].sort(), [todosLp]);
  const compradores = useMemo(() => [...new Set(todosLp.map(p => p.comprador).filter(Boolean))].sort(), [todosLp]);
  const fornecedores = useMemo(() => [...new Set(todosLp.map(p => p.razao_fornecedor).filter(Boolean))].sort(), [todosLp]);
  const modalidades = useMemo(() => [...new Set(todosLp.map(p => p.modalidade_cd ?? "ED Direto Loja"))].sort(), [todosLp]);
  const statusAtivacao = useMemo(() => [...new Set(todosLp.map(p => p.status_solicitacao_ativacao_cd).filter(Boolean))].sort(), [todosLp]);

  if (!isModoHibrido()) {
    return (
      <section>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
          Longo Prazo Operacional
        </h1>
        <p style={{ color: theme.colors.textMuted, marginTop: 12 }}>
          Tela Longo Prazo disponível apenas no modo híbrido.
        </p>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 20, fontWeight: 800, whiteSpace: "nowrap" }}>
          Longo Prazo Operacional
          <span title="Produtos sem solução de curto ou médio prazo. Ações de revisão de portfólio." style={{ marginLeft: 6, cursor: "help", fontSize: 14, color: theme.colors.textMuted }}>ⓘ</span>
        </h1>
        <div style={{ flex: 1, minWidth: 0 }}>
          <RupturaContextoBar ctx={ctx} onChange={setCtx} onAtualizar={() => void carregar()} readonlyFields={readonly} multiSelectLoja={multiSelectLoja} />
        </div>
      </div>

      {loadProgress && <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{loadProgress}</div>}
      {hybridState && !todosLp.length && !loading ? <HybridDataPending code={hybridState.code} message={hybridState.message} /> : null}

      <RupturaLongoPrazoKpiCards counts={cardCounts} loading={loading} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, minWidth: 200, fontSize: 12 }} placeholder="Buscar produto/descrição" value={busca} onChange={(e) => handleBuscaChange(e.target.value)} />
        <select style={{ ...inputStyle, minWidth: 220, fontSize: 12 }} value={acaoFiltro ?? ""} onChange={(e) => handleAcaoFiltroChange(e.target.value)}>
          <option value="">Todas as ações</option>
          {acoesDisponiveis.map((a) => (<option key={a.key} value={a.key}>{a.label}</option>))}
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={filtros.comprador ?? ""} onChange={(e) => handleCompradorChange(e.target.value)}>
          <option value="">Comprador</option>
          {compradores.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={filtros.setor ?? ""} onChange={(e) => handleSetorChange(e.target.value)}>
          <option value="">Seção</option>
          {setores.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={fornecedorFiltro ?? ""} onChange={(e) => handleFornecedorChange(e.target.value)}>
          <option value="">Fornecedor</option>
          {fornecedores.map((f) => (<option key={f} value={f}>{f}</option>))}
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={modalidadeFiltro ?? ""} onChange={(e) => handleModalidadeChange(e.target.value)}>
          <option value="">Modalidade</option>
          {modalidades.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={filtroAtivacao30 ?? ""} onChange={(e) => handleAtivacao30Change(e.target.value)}>
          <option value="">Ativação &gt;30</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={statusAtivacaoFiltro ?? ""} onChange={(e) => handleAtivacaoStatusChange(e.target.value)}>
          <option value="">Status Ativação CD</option>
          {statusAtivacao.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={filtroCentralizacao ?? ""} onChange={(e) => handleCentralizacaoChange(e.target.value)}>
          <option value="">Centralização</option>
          <option value="centralizado">Centralizado</option>
          <option value="nao_centralizado">Não centralizado</option>
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={faixaRupturaFiltro ?? ""} onChange={(e) => handleFaixaRupturaChange(e.target.value)}>
          <option value="">Faixa Dias Ruptura</option>
          <option value="0-30">0–30 dias</option>
          <option value="31-60">31–60 dias</option>
          <option value="61-">Acima de 60 dias</option>
        </select>
        <select style={{ ...inputStyle, fontSize: 12 }} value={faixaUltimoPedidoFiltro ?? ""} onChange={(e) => handleFaixaUltimoPedidoChange(e.target.value)}>
          <option value="">Faixa Últ. Pedido</option>
          <option value="0-30">0–30 dias</option>
          <option value="31-60">31–60 dias</option>
          <option value="61-">Acima de 60 dias</option>
        </select>
        <button type="button" style={{ ...buttonGhostStyle, fontSize: 12, padding: "6px 10px" }} onClick={() => setConfigColunasAberto((v) => !v)}>Colunas</button>
        <RupturaExportMenu ctx={ctx} authCtx={permCtx} filtrosProdutos={filtrosCompletos} />
      </div>

      {configColunasAberto && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          {COLUNAS_LONGO_PRAZO.map((c) => (
            <label key={c.id}>
              <input type="checkbox" checked={colunasVisiveis.has(c.id)} onChange={(e) => { setColunasVisiveis((prev) => { const n = new Set(prev); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; }); }} /> {c.label}
            </label>
          ))}
        </div>
      )}

      <RupturaLongoPrazoTable produtos={paginaAtual} loading={loading} colunasVisiveis={colunasVisiveis} onVerDetalhe={(p) => setDetalhe(p)} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" style={buttonGhostStyle} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span style={{ fontSize: 12 }}>Página {pagina} de {totalPaginas} ({filtrados.length} registros)</span>
        <button type="button" style={buttonGhostStyle} disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
        <select style={inputStyle} value={tamanho} onChange={(e) => { setTamanho(Number(e.target.value)); setPagina(1); }}>
          {RUPTURA_PAGE_SIZES.map((s) => (<option key={s} value={s}>{s}/página</option>))}
        </select>
      </div>

      <RupturaProdutoDetalhe produto={detalhe} aberto={!!detalhe} onFechar={() => setDetalhe(null)} />
    </section>
  );
}
