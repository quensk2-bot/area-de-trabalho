import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaMedioPrazoKpiCards } from "../components/RupturaMedioPrazoKpiCards.tsx";
import {
  RupturaMedioPrazoTable,
  COLUNAS_MEDIO_PRAZO,
  type ColunaIdMp,
} from "../components/RupturaMedioPrazoTable.tsx";
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
  contarCardsPorAcaoMp,
  normalizarAcao,
  extrairAcoesUnicasMp,
} from "../utils/medioPrazoPresentation.ts";
import type { CardCountsMp } from "../utils/medioPrazoPresentation.ts";

export function RupturaMedioPrazoPage() {
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
  const [todosMp, setTodosMp] = useState<RupturaProdutoLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [hybridState, setHybridState] = useState<HybridServiceError | null>(null);
  const [detalhe, setDetalhe] = useState<RupturaProdutoLoja | null>(null);
  const [colunasVisiveis, setColunasVisiveis] = useState<Set<ColunaIdMp>>(
    () => new Set(COLUNAS_MEDIO_PRAZO.filter((c) => c.default).map((c) => c.id)),
  );
  const [configColunasAberto, setConfigColunasAberto] = useState(false);

  // Filtro acaoMedioPrazo
  const [acaoFiltro, setAcaoFiltro] = useState<string | null>(null);

  // Ações únicas dinâmicas
  const acoesDisponiveis = useMemo(() => extrairAcoesUnicasMp(todosMp), [todosMp]);

  const handleAcaoFiltroChange = (value: string) => {
    setAcaoFiltro(value || null);
    setPagina(1);
  };

  // Filtros + busca
  const filtrosCompletos = useMemo((): RupturaFiltrosProdutos => {
    const termo = buscaDebounced.trim();
    return {
      ...ctx,
      ...filtros,
      classificacao: ["medio_prazo"],
      busca: termo.length >= RUPTURA_BUSCA_MIN_CHARS ? termo : undefined,
    };
  }, [ctx, filtros, buscaDebounced]);

  // Filtros de texto
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string | null>(null);
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string | null>(null);
  const [statusAtivacaoFiltro, setStatusAtivacaoFiltro] = useState<string | null>(null);

  // Aplicar filtros client-side
  const filtrados = useMemo(() => {
    let list = todosMp;
    if (filtros.possuiEstoqueCd === true) list = list.filter((p) => (p.soma_estoque_cd ?? 0) > 0);
    if (filtros.possuiEstoqueCd === false) list = list.filter((p) => (p.soma_estoque_cd ?? 0) <= 0);
    if (filtros.setor) list = list.filter((p) => p.setor_n2 === filtros.setor);
    if (filtros.comprador) list = list.filter((p) => p.comprador === filtros.comprador);
    if (fornecedorFiltro) list = list.filter((p) => p.razao_fornecedor === fornecedorFiltro);
    if (modalidadeFiltro) {
      list = list.filter((p) => (p.modalidade_cd ?? "ED Direto Loja") === modalidadeFiltro);
    }
    if (statusAtivacaoFiltro) {
      list = list.filter((p) => p.status_solicitacao_ativacao_cd === statusAtivacaoFiltro);
    }
    // Filtro por ação oficial
    if (acaoFiltro) {
      const targetNorm = normalizarAcao(acaoFiltro);
      list = list.filter((p) => normalizarAcao(p.acao_medio_prazo) === targetNorm);
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
  }, [todosMp, filtros, buscaDebounced, acaoFiltro, fornecedorFiltro, modalidadeFiltro, statusAtivacaoFiltro]);

  // Cards sobre a lista filtrada (refletem o mesmo universo da tabela)
  const cardCounts = useMemo((): CardCountsMp => {
    const acoes = filtrados.map((p) => p.acao_medio_prazo ?? "");
    return contarCardsPorAcaoMp(acoes);
  }, [filtrados]);

  // Paginação client-side
  const paginaAtual = useMemo(() => {
    const offset = Math.max(0, pagina - 1) * tamanho;
    return filtrados.slice(offset, offset + tamanho);
  }, [filtrados, pagina, tamanho]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamanho));

  // Handles para filtros resetarem página
  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setPagina(1);
  };

  const handleCompradorChange = (value: string) => {
    setFiltros((f) => ({ ...f, comprador: value || undefined }));
    setPagina(1);
  };

  const handleSetorChange = (value: string) => {
    setFiltros((f) => ({ ...f, setor: value || undefined }));
    setPagina(1);
  };

  const handleFornecedorChange = (value: string) => {
    setFornecedorFiltro(value || null);
    setPagina(1);
  };

  const handleModalidadeChange = (value: string) => {
    setModalidadeFiltro(value || null);
    setPagina(1);
  };

  const handleStatusAtivacaoChange = (value: string) => {
    setStatusAtivacaoFiltro(value || null);
    setPagina(1);
  };

  // Carregar dados
  const carregar = useCallback(async () => {
    setLoading(true);
    setHybridState(null);

    if (!isModoHibrido()) {
      setLoading(false);
      return;
    }

    const r = await consultarProdutosPaginadosHibrido({
      filtros: {
        ...ctx,
        ...filtros,
        classificacao: ["medio_prazo"],
      },
      pagina: 1,
      tamanho: 999999,
      authCtx: permCtx,
      visaoOficial: true,
      onProgress: (p) =>
        setLoadProgress(`Carregando loja ${p.atual} de ${p.total}…`),
    });
    setLoadProgress(null);

    if (r.erro) {
      setHybridState(r.erro);
      setLoading(false);
      return;
    }

    setTodosMp(r.dados);
    setPagina(1);
    setLoading(false);
  }, [ctx, filtros, permCtx]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (isModoHibrido()) invalidateGestaoCache();
  }, [ctx.regional, ctx.bandeira, ctx.dataReferencia, ctx.loja, ctx.lojas]);

  // Setores disponíveis
  const setoresDisponiveis = useMemo(() => {
    const setores = new Set<string>();
    for (const p of todosMp) {
      if (p.setor_n2) setores.add(p.setor_n2);
    }
    return [...setores].sort();
  }, [todosMp]);

  // Compradores disponíveis
  const compradoresDisponiveis = useMemo(() => {
    const comps = new Set<string>();
    for (const p of todosMp) {
      if (p.comprador) comps.add(p.comprador);
    }
    return [...comps].sort();
  }, [todosMp]);

  // Fornecedores disponíveis
  const fornecedoresDisponiveis = useMemo(() => {
    const f = new Set<string>();
    for (const p of todosMp) {
      if (p.razao_fornecedor) f.add(p.razao_fornecedor);
    }
    return [...f].sort();
  }, [todosMp]);

  // Modalidades disponíveis
  const modalidadesDisponiveis = useMemo(() => {
    const m = new Set<string>();
    for (const p of todosMp) {
      const mod = p.modalidade_cd ?? "ED Direto Loja";
      m.add(mod);
    }
    return [...m].sort();
  }, [todosMp]);

  // Status ativação CD disponíveis
  const statusAtivacaoDisponiveis = useMemo(() => {
    const s = new Set<string>();
    for (const p of todosMp) {
      if (p.status_solicitacao_ativacao_cd) s.add(p.status_solicitacao_ativacao_cd);
    }
    return [...s].sort();
  }, [todosMp]);

  if (!isModoHibrido()) {
    return (
      <section>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
          Médio Prazo Operacional
        </h1>
        <p style={{ color: theme.colors.textMuted, marginTop: 12 }}>
          Tela Médio Prazo disponível apenas no modo híbrido.
        </p>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cabeçalho compacto */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: theme.colors.neonOrange,
            fontSize: 20,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Médio Prazo Operacional
          <span
            title="Produtos em ruptura de médio prazo. Acompanhamento da área comercial."
            style={{
              marginLeft: 6,
              cursor: "help",
              fontSize: 14,
              color: theme.colors.textMuted,
            }}
          >
            ⓘ
          </span>
        </h1>
        <div style={{ flex: 1, minWidth: 0 }}>
          <RupturaContextoBar
            ctx={ctx}
            onChange={setCtx}
            onAtualizar={() => void carregar()}
            readonlyFields={readonly}
            multiSelectLoja={multiSelectLoja}
          />
        </div>
      </div>

      {loadProgress && (
        <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{loadProgress}</div>
      )}

      {hybridState && !todosMp.length && !loading ? (
        <HybridDataPending code={hybridState.code} message={hybridState.message} />
      ) : null}

      {/* Cards compactos — calculados sobre a LISTA FILTRADA */}
      <RupturaMedioPrazoKpiCards counts={cardCounts} loading={loading} />

      {/* Filtros — barra única */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: 200, fontSize: 12 }}
          placeholder="Buscar produto/descrição"
          value={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
        />
        <select
          style={{ ...inputStyle, minWidth: 250, fontSize: 12 }}
          value={acaoFiltro ?? ""}
          onChange={(e) => handleAcaoFiltroChange(e.target.value)}
        >
          <option value="">Todas as ações</option>
          {acoesDisponiveis.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, fontSize: 12 }}
          value={filtros.comprador ?? ""}
          onChange={(e) => handleCompradorChange(e.target.value)}
        >
          <option value="">Comprador</option>
          {compradoresDisponiveis.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, fontSize: 12 }}
          value={filtros.setor ?? ""}
          onChange={(e) => handleSetorChange(e.target.value)}
        >
          <option value="">Seção</option>
          {setoresDisponiveis.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, fontSize: 12 }}
          value={fornecedorFiltro ?? ""}
          onChange={(e) => handleFornecedorChange(e.target.value)}
        >
          <option value="">Fornecedor</option>
          {fornecedoresDisponiveis.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, fontSize: 12 }}
          value={modalidadeFiltro ?? ""}
          onChange={(e) => handleModalidadeChange(e.target.value)}
        >
          <option value="">Modalidade</option>
          {modalidadesDisponiveis.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, fontSize: 12 }}
          value={statusAtivacaoFiltro ?? ""}
          onChange={(e) => handleStatusAtivacaoChange(e.target.value)}
        >
          <option value="">Status Ativação CD</option>
          {statusAtivacaoDisponiveis.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          style={{ ...buttonGhostStyle, fontSize: 12, padding: "6px 10px" }}
          onClick={() => setConfigColunasAberto((v) => !v)}
        >
          Colunas
        </button>
        <RupturaExportMenu
          ctx={ctx}
          authCtx={permCtx}
          filtrosProdutos={filtrosCompletos}
        />
      </div>

      {/* Configuração de colunas */}
      {configColunasAberto && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          {COLUNAS_MEDIO_PRAZO.map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={colunasVisiveis.has(c.id)}
                onChange={(e) => {
                  setColunasVisiveis((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(c.id);
                    else next.delete(c.id);
                    return next;
                  });
                }}
              />{" "}
              {c.label}
            </label>
          ))}
        </div>
      )}

      {/* Tabela */}
      <RupturaMedioPrazoTable
        produtos={paginaAtual}
        loading={loading}
        colunasVisiveis={colunasVisiveis}
        onVerDetalhe={(p) => setDetalhe(p)}
      />

      {/* Paginação */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          style={buttonGhostStyle}
          disabled={pagina <= 1}
          onClick={() => setPagina((p) => p - 1)}
        >
          Anterior
        </button>
        <span style={{ fontSize: 12 }}>
          Página {pagina} de {totalPaginas} ({filtrados.length} registros)
        </span>
        <button
          type="button"
          style={buttonGhostStyle}
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina((p) => p + 1)}
        >
          Próxima
        </button>
        <select
          style={inputStyle}
          value={tamanho}
          onChange={(e) => {
            setTamanho(Number(e.target.value));
            setPagina(1);
          }}
        >
          {RUPTURA_PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}/página
            </option>
          ))}
        </select>
      </div>

      {/* Detalhe do produto */}
      <RupturaProdutoDetalhe
        produto={detalhe}
        aberto={!!detalhe}
        onFechar={() => setDetalhe(null)}
      />
    </section>
  );
}
