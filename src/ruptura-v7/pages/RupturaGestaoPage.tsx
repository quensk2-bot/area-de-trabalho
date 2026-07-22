import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthV7, toPermissionContext } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import { RupturaContextHelp } from "../components/RupturaHelp.tsx";
import { RupturaProdutoDetalhe } from "../components/RupturaProdutoDetalhe.tsx";
import {
  badgeStyle,
  buttonGhostStyle,
  buttonStyle,
  CLASSIFICACAO_LABEL,
  formatNumero,
  inputStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "../components/rupturaSharedStyles.ts";
import { useDebouncedValue } from "../hooks/useRupturaContexto.ts";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import { consultarProdutosPaginados } from "../services/rupturaProdutosService.ts";
import {
  consultarProdutosPaginadosHibrido,
  invalidateGestaoCache,
} from "../services/hibrido/rupturaGestaoHibridoService.ts";
import type { HybridServiceError } from "../../hibrido-v7/hybridErrors.ts";
import type { RupturaFiltrosProdutos } from "../types/rupturaFiltrosTypes.ts";
import {
  RUPTURA_BUSCA_DEBOUNCE_MS,
  RUPTURA_BUSCA_MIN_CHARS,
  RUPTURA_PAGE_SIZE_DEFAULT,
  RUPTURA_PAGE_SIZES,
} from "../types/rupturaFiltrosTypes.ts";
import type { RupturaProdutoLoja } from "../types/rupturaTypes.ts";
import { RupturaExportMenu } from "../components/RupturaExportMenu.tsx";

type ColunaId =
  | "loja"
  | "seqproduto"
  | "descricao"
  | "razao_fornecedor"
  | "rede"
  | "comprador"
  | "estoque_loja"
  | "media_venda_dia"
  | "par_min"
  | "par_max"
  | "soma_estoque_cd"
  | "pendencia_cpa_cd"
  | "classificacao_prazo"
  | "dias_pedido"
  | "produto_centralizado"
  | "codigo_cd_selecionado"
  | "status_estoque_cds"
  | "acao_recomendada"
  | "qualidade_dados";

const COLUNAS: { id: ColunaId; label: string; default: boolean }[] = [
  { id: "loja", label: "Loja", default: true },
  { id: "seqproduto", label: "Produto", default: true },
  { id: "descricao", label: "Descrição", default: true },
  { id: "razao_fornecedor", label: "Fornecedor", default: true },
  { id: "rede", label: "Rede", default: false },
  { id: "comprador", label: "Comprador", default: true },
  { id: "estoque_loja", label: "Est. Loja", default: true },
  { id: "media_venda_dia", label: "Média", default: false },
  { id: "par_min", label: "Mín", default: false },
  { id: "par_max", label: "Máx", default: false },
  { id: "soma_estoque_cd", label: "Est. CD", default: true },
  { id: "pendencia_cpa_cd", label: "Pend.", default: true },
  { id: "classificacao_prazo", label: "Class.", default: true },
  { id: "dias_pedido", label: "Dias Ped.", default: true },
  { id: "produto_centralizado", label: "Central.", default: false },
  { id: "codigo_cd_selecionado", label: "CD", default: false },
  { id: "status_estoque_cds", label: "Status Est.", default: false },
  { id: "acao_recomendada", label: "Ação", default: true },
  { id: "qualidade_dados", label: "Qualidade", default: false },
];

export function RupturaGestaoPage() {
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
  const [dados, setDados] = useState<RupturaProdutoLoja[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<RupturaProdutoLoja | null>(null);
  const [colunasVisiveis, setColunasVisiveis] = useState<Set<ColunaId>>(
    () => new Set(COLUNAS.filter((c) => c.default).map((c) => c.id)),
  );
  const [configColunasAberto, setConfigColunasAberto] = useState(false);
  const [hybridState, setHybridState] = useState<HybridServiceError | null>(null);

  const filtrosCompletos = useMemo((): RupturaFiltrosProdutos => {
    const termo = buscaDebounced.trim();
    return {
      ...ctx,
      ...filtros,
      busca: termo.length >= RUPTURA_BUSCA_MIN_CHARS ? termo : undefined,
    };
  }, [ctx, filtros, buscaDebounced]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setHybridState(null);

    if (isModoHibrido()) {
      const r = await consultarProdutosPaginadosHibrido({
        filtros: filtrosCompletos,
        pagina,
        tamanho,
        authCtx: permCtx,
        onProgress: (p) => setLoadProgress(`Carregando loja ${p.atual} de ${p.total}…`),
      });
      setLoadProgress(null);
      if (r.erro) setHybridState(r.erro);
      setDados(r.dados);
      setTotal(r.total);
      setLoading(false);
      return;
    }

    const r = await consultarProdutosPaginados({
      filtros: filtrosCompletos,
      pagina,
      tamanho,
      ordenacao: { coluna: "descricao", direcao: "asc" },
    });
    if (r.erro) setErro(r.erro.message);
    setDados(r.dados);
    setTotal(r.total);
    setLoading(false);
  }, [filtrosCompletos, pagina, tamanho, permCtx]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setPagina(1);
  }, [ctx.regional, ctx.bandeira, ctx.dataReferencia, ctx.loja, ctx.lojas, buscaDebounced, filtros.classificacao]);

  useEffect(() => {
    if (isModoHibrido()) invalidateGestaoCache();
  }, [ctx.regional, ctx.bandeira, ctx.dataReferencia, ctx.loja, ctx.lojas]);

  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));

  function renderCelula(row: RupturaProdutoLoja, col: ColunaId) {
    const v = row[col];
    if (col === "classificacao_prazo") {
      return <span style={badgeStyle("neutral")}>{CLASSIFICACAO_LABEL[String(v)] ?? String(v ?? "—")}</span>;
    }
    if (typeof v === "number") return formatNumero(v, col.includes("estoque") || col.includes("pendencia") ? 2 : 0);
    return String(v ?? "—");
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 24, fontWeight: 800 }}>Gestão Operacional da Ruptura</h1>
      </header>

      <RupturaContextHelp
        titulo="Gestão Operacional"
        texto="Cada linha representa um produto processado pelo Motor. As classificações e ações não são calculadas nesta tela."
      />

      <RupturaContextoBar
        ctx={ctx}
        onChange={setCtx}
        onAtualizar={() => void carregar()}
        readonlyFields={readonly}
        multiSelectLoja={multiSelectLoja}
      />

      {loadProgress && (
        <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{loadProgress}</div>
      )}

      {hybridState && !dados.length && !loading ? (
        <HybridDataPending code={hybridState.code} message={hybridState.message} />
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, minWidth: 220 }}
          placeholder="Buscar produto/descrição (mín. 2 caracteres)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          style={inputStyle}
          value={filtros.classificacao ?? ""}
          onChange={(e) => setFiltros((f) => ({ ...f, classificacao: (e.target.value || undefined) as RupturaFiltrosProdutos["classificacao"] }))}
        >
          <option value="">Todas classificações</option>
          <option value="curto_prazo">Curto Prazo</option>
          <option value="medio_prazo">Médio Prazo</option>
          <option value="longo_prazo">Longo Prazo</option>
          <option value="sem_ruptura">Sem ruptura</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select
          style={inputStyle}
          value={filtros.possuiEstoqueCd === undefined ? "" : filtros.possuiEstoqueCd ? "sim" : "nao"}
          onChange={(e) =>
            setFiltros((f) => ({
              ...f,
              possuiEstoqueCd: e.target.value === "" ? undefined : e.target.value === "sim",
            }))
          }
        >
          <option value="">Estoque CD (todos)</option>
          <option value="sim">Com estoque CD</option>
          <option value="nao">Sem estoque CD</option>
        </select>
        <button type="button" style={buttonGhostStyle} onClick={() => setConfigColunasAberto((v) => !v)}>
          Configurar colunas
        </button>
        <RupturaExportMenu ctx={ctx} authCtx={permCtx} filtrosProdutos={filtrosCompletos} />
      </div>

      {configColunasAberto && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          {COLUNAS.map((c) => (
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

      {erro && <div style={{ color: theme.colors.danger }}>{erro}</div>}

      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ color: theme.colors.textMuted }}>Carregando produtos…</div>
        ) : !dados.length ? (
          <div style={{ color: theme.colors.textMuted }}>Nenhum produto encontrado para os filtros atuais.</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {COLUNAS.filter((c) => colunasVisiveis.has(c.id)).map((c) => (
                  <th key={c.id} style={thStyle}>{c.label}</th>
                ))}
                <th style={thStyle}>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((row) => (
                <tr key={`${row.loja}-${row.seqproduto}`}>
                  {COLUNAS.filter((c) => colunasVisiveis.has(c.id)).map((c) => (
                    <td key={c.id} style={tdStyle}>{renderCelula(row, c.id)}</td>
                  ))}
                  <td style={tdStyle}>
                    <button type="button" style={buttonGhostStyle} onClick={() => setDetalhe(row)}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" style={buttonGhostStyle} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span style={{ fontSize: 12 }}>Página {pagina} de {totalPaginas} ({total} registros)</span>
        <button type="button" style={buttonGhostStyle} disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
        <select style={inputStyle} value={tamanho} onChange={(e) => { setTamanho(Number(e.target.value)); setPagina(1); }}>
          {RUPTURA_PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}/página</option>
          ))}
        </select>
      </div>

      <RupturaProdutoDetalhe produto={detalhe} aberto={!!detalhe} onFechar={() => setDetalhe(null)} />
    </section>
  );
}
