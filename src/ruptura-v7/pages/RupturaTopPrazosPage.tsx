import { useCallback, useEffect, useMemo, useState } from "react";
import { toPermissionContext, useAuthV7 } from "../../auth-v7/index.ts";
import { HybridDataPending } from "../../hibrido-v7/components/HybridDataPending.tsx";
import type {
  TopPrazosJson,
  TopPrazosStatusMovimentacao,
} from "../../hibrido-v7/topPrazosTypes.ts";
import { isModoHibrido } from "../../lib/env.ts";
import { theme } from "../../styles.ts";
import { RupturaContextoBar } from "../components/RupturaContextoBar.tsx";
import {
  buttonGhostStyle,
  cardStyle,
  formatNumero,
  formatPercentual,
  inputStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "../components/rupturaSharedStyles.ts";
import { useRupturaContextoScoped } from "../hooks/useRupturaContextoScoped.ts";
import { carregarTopPrazosHibrido } from "../services/hibrido/rupturaTopPrazosHibridoService.ts";
import type { HybridServiceError } from "../../hibrido-v7/hybridErrors.ts";
import {
  TOP_PRAZOS_SETORES,
  agregarIndicadoresTopPrazos,
  agregarRankingTopPrazos,
  filtrarGruposTopPrazos,
  rotuloFornecedor,
  topRankingPorSetor,
  type TopPrazosModo,
  type TopPrazosRankingLinha,
} from "../utils/topPrazosPresentation.ts";

type Props = { modo: TopPrazosModo };

const STATUS_MOVIMENTACAO: TopPrazosStatusMovimentacao[] = [
  "Com movimentação",
  "Sem Movimentação",
];

function KpiCard({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <article
      style={{
        ...cardStyle,
        minWidth: 145,
        padding: 14,
        borderColor: destaque ? theme.colors.neonOrange : undefined,
      }}
    >
      <div style={{ color: theme.colors.textMuted, fontSize: 11 }}>{titulo}</div>
      <div
        style={{
          color: destaque ? theme.colors.neonOrange : theme.colors.text,
          fontSize: 22,
          fontWeight: 800,
          marginTop: 4,
        }}
      >
        {valor}
      </div>
    </article>
  );
}

function RankingTable({
  linhas,
  modo,
  compacto = false,
}: {
  linhas: TopPrazosRankingLinha[];
  modo: TopPrazosModo;
  compacto?: boolean;
}) {
  const prazoLabel = modo === "compra" ? "Sem Pedido" : "Com Pedido";
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th scope="col" style={thStyle}>Fornecedor</th>
            {!compacto && <th scope="col" style={thStyle}>Setor</th>}
            <th scope="col" style={{ ...thStyle, textAlign: "right" }}>SKUs</th>
            <th scope="col" style={{ ...thStyle, textAlign: "right" }}>Ruptura</th>
            <th scope="col" style={{ ...thStyle, textAlign: "right" }}>{prazoLabel}</th>
            {!compacto && (
              <>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }}>% Ruptura</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }}>% {prazoLabel}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={JSON.stringify([linha.setor, linha.fornecedor])}>
              <td style={tdStyle}>{rotuloFornecedor(linha.fornecedor)}</td>
              {!compacto && <td style={tdStyle}>{linha.setor ?? "—"}</td>}
              <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumero(linha.qtdeProdutos)}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumero(linha.totalRuptura)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {formatNumero(modo === "compra" ? linha.longoPrazo : linha.medioPrazo)}
              </td>
              {!compacto && (
                <>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {formatPercentual(linha.percentualRuptura)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {formatPercentual(linha.percentualPrazo)}
                  </td>
                </>
              )}
            </tr>
          ))}
          {!linhas.length && (
            <tr>
              <td colSpan={compacto ? 4 : 7} style={{ ...tdStyle, color: theme.colors.textMuted }}>
                Nenhum fornecedor no filtro atual.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function RupturaTopPrazosPage({ modo }: Props) {
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
  const tela = modo === "compra" ? "promover-compra" : "promover-recebimento";
  const [ctx, setCtx, { readonly, multiSelectLoja }] =
    useRupturaContextoScoped(tela);
  const [dados, setDados] = useState<TopPrazosJson | null>(null);
  const [erro, setErro] = useState<HybridServiceError | null>(null);
  const [loading, setLoading] = useState(false);
  const [setor, setSetor] = useState<string | null>(null);
  const [secao, setSecao] = useState<string | null>(null);
  const [status, setStatus] =
    useState<TopPrazosStatusMovimentacao | null>(null);

  const carregar = useCallback(async () => {
    if (!isModoHibrido()) return;
    setLoading(true);
    setErro(null);
    const resultado = await carregarTopPrazosHibrido({ ctx, authCtx: permCtx });
    setDados(resultado.dados);
    setErro(resultado.erro);
    setLoading(false);
  }, [ctx, permCtx]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const gruposBase = dados?.grupos ?? [];
  const lojasCtx = useMemo(() => {
    if (ctx.lojas?.length) return ctx.lojas;
    return ctx.loja && ctx.loja !== 0 ? [ctx.loja] : [];
  }, [ctx.loja, ctx.lojas]);
  const gruposFiltrados = useMemo(
    () =>
      filtrarGruposTopPrazos(gruposBase, {
        lojas: lojasCtx,
        setor,
        secao,
        statusMovimentacaoLoja: status,
      }),
    [gruposBase, lojasCtx, setor, secao, status],
  );
  const indicadores = useMemo(
    () => agregarIndicadoresTopPrazos(gruposFiltrados, modo),
    [gruposFiltrados, modo],
  );
  const ranking = useMemo(
    () => agregarRankingTopPrazos(gruposFiltrados, modo),
    [gruposFiltrados, modo],
  );
  const setores = useMemo(
    () =>
      [...new Set(gruposBase.map((grupo) => grupo.setor).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [gruposBase],
  );
  const secoes = useMemo(
    () =>
      [
        ...new Set(
          gruposBase
            .filter((grupo) => !setor || grupo.setor === setor)
            .map((grupo) => grupo.secao)
            .filter(Boolean) as string[],
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [gruposBase, setor],
  );

  const prazoLabel = modo === "compra" ? "Sem Pedido" : "Com Pedido";
  const titulo = modo === "compra" ? "Promover Compra" : "Promover Recebimento";
  const limite = modo === "compra" ? 3 : 10;

  const limparFiltros = () => {
    setSetor(null);
    setSecao(null);
    setStatus(null);
    if (!readonly.loja) setCtx({ loja: 0, lojas: [] });
  };

  if (!isModoHibrido()) {
    return <p>Top Prazos disponível apenas no modo híbrido.</p>;
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 22 }}>
            {titulo}
          </h1>
          <div style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Consolidado V7 · {dados?.meta.totalGrupos ?? 0} grupos agregados
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 360 }}>
          <RupturaContextoBar
            ctx={ctx}
            onChange={setCtx}
            onAtualizar={() => void carregar()}
            readonlyFields={readonly}
            multiSelectLoja={multiSelectLoja}
          />
        </div>
      </header>

      {erro && !dados && !loading ? (
        <HybridDataPending code={erro.code} message={erro.message} />
      ) : null}

      <div
        aria-busy={loading}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 10,
        }}
      >
        <KpiCard titulo="SKUs" valor={formatNumero(indicadores.qtdeProdutos)} />
        <KpiCard titulo="Ruptura Total" valor={formatNumero(indicadores.totalRuptura)} />
        <KpiCard
          titulo={prazoLabel}
          valor={formatNumero(
            modo === "compra" ? indicadores.longoPrazo : indicadores.medioPrazo,
          )}
          destaque
        />
        <KpiCard titulo="% Ruptura" valor={formatPercentual(indicadores.percentualRuptura)} />
        <KpiCard titulo={`% ${prazoLabel}`} valor={formatPercentual(indicadores.percentualPrazo)} />
      </div>

      <div style={{ ...cardStyle, padding: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
          Setor
          <select
            aria-label="Setor"
            style={inputStyle}
            value={setor ?? ""}
            onChange={(event) => {
              setSetor(event.target.value || null);
              setSecao(null);
            }}
          >
            <option value="">Todos</option>
            {setores.map((valor) => <option key={valor}>{valor}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
          Seção
          <select
            aria-label="Seção"
            style={inputStyle}
            value={secao ?? ""}
            onChange={(event) => setSecao(event.target.value || null)}
          >
            <option value="">Todas</option>
            {secoes.map((valor) => <option key={valor}>{valor}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
          Status Movimentação
          <select
            aria-label="Status Movimentação"
            style={inputStyle}
            value={status ?? ""}
            onChange={(event) =>
              setStatus(
                (event.target.value || null) as TopPrazosStatusMovimentacao | null,
              )
            }
          >
            <option value="">Todos</option>
            {STATUS_MOVIMENTACAO.map((valor) => <option key={valor}>{valor}</option>)}
          </select>
        </label>
        <button
          type="button"
          style={{ ...buttonGhostStyle, alignSelf: "end" }}
          onClick={limparFiltros}
        >
          Limpar filtros
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: 12,
        }}
      >
        {TOP_PRAZOS_SETORES.map((grupoSetor) => (
          <article key={grupoSetor.codigo} style={{ ...cardStyle, padding: 12 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 15, color: theme.colors.neonOrange }}>
              Top {limite} {grupoSetor.label}
            </h2>
            <RankingTable
              linhas={topRankingPorSetor(ranking, grupoSetor.codigo, limite)}
              modo={modo}
              compacto
            />
          </article>
        ))}
      </div>

      {modo === "compra" && (
        <article style={{ ...cardStyle, padding: 12 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Ranking completo</h2>
          <RankingTable linhas={ranking} modo={modo} />
        </article>
      )}
    </section>
  );
}
