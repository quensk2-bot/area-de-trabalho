import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaCurtoPrazoKpiCards } from "../components/RupturaCurtoPrazoKpiCards.tsx";
import {
  RupturaCurtoPrazoTable,
  COLUNAS_CURTO_PRAZO,
  type ColunaId,
} from "../components/RupturaCurtoPrazoTable.tsx";
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
  contarCardsPorAcao,
  normalizarAcao,
  extrairAcoesUnicas,
} from "../utils/curtoPrazoPresentation.ts";
import type { CardCounts } from "../utils/curtoPrazoPresentation.ts";

export function RupturaCurtoPrazoPage() {
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
  /** Todos os produtos CP — carregados uma vez para cards e paginação client-side. */
  const [todosCp, setTodosCp] = useState<RupturaProdutoLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [hybridState, setHybridState] = useState<HybridServiceError | null>(null);
  const [detalhe, setDetalhe] = useState<RupturaProdutoLoja | null>(null);
  const [colunasVisiveis, setColunasVisiveis] = useState<Set<ColunaId>>(
    () => new Set(COLUNAS_CURTO_PRAZO.filter((c) => c.default).map((c) => c.id)),
  );
  const [configColunasAberto, setConfigColunasAberto] = useState(false);

  // Cards
  const cardCounts = useMemo((): CardCounts => {
    const acoes = todosCp.map((p) => p.acao_curto_prazo ?? "");
    return contarCardsPorAcao(acoes);
  }, [todosCp]);

  // Filtro acaoCurtoPrazo — reseta página ao trocar
  const [acaoFiltro, setAcaoFiltro] = useState<string | null>(null);

  // Ações únicas extraídas DINAMICAMENTE dos dados carregados — não hardcoded
  const acoesDisponiveis = useMemo(() => extrairAcoesUnicas(todosCp), [todosCp]);

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
      classificacao: ["curto_prazo"],
      busca: termo.length >= RUPTURA_BUSCA_MIN_CHARS ? termo : undefined,
    };
  }, [ctx, filtros, buscaDebounced]);

  // Aplicar filtros client-side
  const filtrados = useMemo(() => {
    let list = todosCp;
    if (filtros.possuiEstoqueCd === true) list = list.filter((p) => (p.soma_estoque_cd ?? 0) > 0);
    if (filtros.possuiEstoqueCd === false) list = list.filter((p) => (p.soma_estoque_cd ?? 0) <= 0);
    if (filtros.setor) list = list.filter((p) => p.setor_n2 === filtros.setor);
    // Filtro por ação oficial — usa normalizarAcao() para comparação robusta
    if (acaoFiltro) {
      const targetNorm = normalizarAcao(acaoFiltro);
      list = list.filter((p) => normalizarAcao(p.acao_curto_prazo) === targetNorm);
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
  }, [todosCp, filtros, buscaDebounced, acaoFiltro]);

  // Paginação client-side
  const paginaAtual = useMemo(() => {
    const offset = Math.max(0, pagina - 1) * tamanho;
    return filtrados.slice(offset, offset + tamanho);
  }, [filtrados, pagina, tamanho]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamanho));

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
        classificacao: ["curto_prazo"],
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

    setTodosCp(r.dados);
    setPagina(1);
    setLoading(false);
  }, [ctx, filtros, permCtx]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (isModoHibrido()) invalidateGestaoCache();
  }, [ctx.regional, ctx.bandeira, ctx.dataReferencia, ctx.loja, ctx.lojas]);

  // Setores disponíveis (para filtro)
  const setoresDisponiveis = useMemo(() => {
    const setores = new Set<string>();
    for (const p of todosCp) {
      if (p.setor_n2) setores.add(p.setor_n2);
    }
    return [...setores].sort();
  }, [todosCp]);

  if (!isModoHibrido()) {
    return (
      <section>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>
          Curto Prazo Operacional
        </h1>
        <p style={{ color: theme.colors.textMuted, marginTop: 12 }}>
          Tela Curto Prazo disponível apenas no modo híbrido.
        </p>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cabeçalho compacto — uma linha */}
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
          Curto Prazo Operacional
          <span
            title="Produtos em ruptura com estoque no CD ou recebimento próximo. Ação imediata."
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

      {hybridState && !todosCp.length && !loading ? (
        <HybridDataPending code={hybridState.code} message={hybridState.message} />
      ) : null}

      {/* Cards compactos */}
      <RupturaCurtoPrazoKpiCards counts={cardCounts} loading={loading} />

      {/* Filtros — barra única */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: 200, fontSize: 12 }}
          placeholder="Buscar produto/descrição"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
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
          value={filtros.possuiEstoqueCd === undefined ? "" : filtros.possuiEstoqueCd ? "sim" : "nao"}
          onChange={(e) =>
            setFiltros((f) => ({
              ...f,
              possuiEstoqueCd: e.target.value === "" ? undefined : e.target.value === "sim",
            }))
          }
        >
          <option value="">Estoq. CD</option>
          <option value="sim">Com estoque</option>
          <option value="nao">Sem estoque</option>
        </select>
        <select
          style={{ ...inputStyle, fontSize: 12 }}
          value={filtros.setor ?? ""}
          onChange={(e) =>
            setFiltros((f) => ({ ...f, setor: e.target.value || undefined }))
          }
        >
          <option value="">Seção</option>
          {setoresDisponiveis.map((s) => (
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
          {COLUNAS_CURTO_PRAZO.map((c) => (
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
      <RupturaCurtoPrazoTable
        produtos={paginaAtual}
        loading={loading}
        colunasVisiveis={colunasVisiveis}
        onConfigColunas={() => setConfigColunasAberto((v) => !v)}
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
