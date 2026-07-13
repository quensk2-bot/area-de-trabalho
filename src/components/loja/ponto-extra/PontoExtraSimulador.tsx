import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import type { Usuario } from "../../../types";
import { PontoExtraOcupacaoVisual } from "./PontoExtraOcupacaoVisual";
import { PontoExtraSimuladorProdutos } from "./PontoExtraSimuladorProdutos";
import { PontoExtraSimuladorResumo } from "./PontoExtraSimuladorResumo";
import {
  buttonStyle,
  cardStyle,
  descStyle,
  gridStyle,
  inputStyle,
  pageStyle,
  titleStyle,
  warningBoxStyle,
} from "./pontoExtraSharedStyles";
import { alertasPontoExtra, currentMonthKey, isMesVigenciaValido, monthLabel } from "./pontoExtraSharedUtils";
import { agruparPontasSimulacao, filtrarGruposSimulacao } from "./pontoExtraSimuladorUtils";

type Props = { perfil: Usuario };

const lojaDb = supabase.schema("loja");

export function PontoExtraSimulador({ perfil }: Props) {
  const [mesVigencia, setMesVigencia] = useState(currentMonthKey());
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [regionais, setRegionais] = useState<Array<{ id: string; nome: string }>>([]);
  const [lojasRegional, setLojasRegional] = useState<Set<string>>(new Set());
  const [regionalId, setRegionalId] = useState("");
  const [grupoKey, setGrupoKey] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [filtros, setFiltros] = useState({ loja: "", codPonta: "", quantPonta: "", setor: "", tipoPonta: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const vigenciaValida = isMesVigenciaValido(mesVigencia);

  async function carregarRegionais() {
    const { data, error } = await lojaDb.from("ponta_regionais").select("id, nome").order("nome");
    if (error) throw error;
    setRegionais((data ?? []) as Array<{ id: string; nome: string }>);
  }

  async function carregarLojasRegional(id: string) {
    if (!id) {
      setLojasRegional(new Set());
      return;
    }
    const { data, error } = await lojaDb.from("ponta_lojas").select("codigo_loja, nome").eq("regional_id", id);
    if (error) throw error;
    const codigos = new Set<string>();
    for (const loja of data ?? []) {
      const codigo = String(loja.codigo_loja ?? "").trim();
      const nome = String(loja.nome ?? "").trim();
      if (codigo) codigos.add(codigo);
      if (nome) codigos.add(nome);
    }
    setLojasRegional(codigos);
  }

  async function carregarDados() {
    if (!vigenciaValida) {
      setRows([]);
      setErro("Selecione o mes de vigencia para simular.");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const pageSize = 1000;
      const allRows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await lojaDb
          .from("ponta_processada")
          .select("*")
          .eq("mes_vigencia", mesVigencia)
          .order("loja", { ascending: true })
          .order("cod_ponta", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allRows.push(...((data ?? []) as Record<string, unknown>[]));
        if (!data || data.length < pageSize) break;
      }
      setRows(allRows);
      if (allRows.length === 0) setErro("Nenhum dado processado para esta vigencia. Execute o processamento primeiro.");
    } catch (err: unknown) {
      console.error(err);
      setErro((err as { message?: string })?.message ?? "Erro ao carregar simulacao.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarRegionais().catch(console.error);
  }, []);

  useEffect(() => {
    void carregarLojasRegional(regionalId).catch(console.error);
  }, [regionalId]);

  useEffect(() => {
    void carregarDados();
  }, [mesVigencia]);

  const grupos = useMemo(() => agruparPontasSimulacao(rows), [rows]);
  const gruposFiltrados = useMemo(
    () =>
      filtrarGruposSimulacao(grupos, {
        regionalLojas: lojasRegional,
        loja: filtros.loja,
        codPonta: filtros.codPonta,
        quantPonta: filtros.quantPonta,
        setor: filtros.setor,
        tipoPonta: filtros.tipoPonta,
      }),
    [grupos, filtros, lojasRegional],
  );

  useEffect(() => {
    if (!gruposFiltrados.some((grupo) => grupo.key === grupoKey)) {
      setGrupoKey(gruposFiltrados[0]?.key ?? "");
    }
  }, [gruposFiltrados, grupoKey]);

  const grupoSelecionado = gruposFiltrados.find((grupo) => grupo.key === grupoKey) ?? null;

  async function atualizarAprovacao(ids: string[], aprovado: boolean) {
    if (!vigenciaValida) {
      setErro("Selecione o mes de vigencia antes de aprovar.");
      return;
    }
    if (ids.length === 0) return;
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const payload = {
        aprovado,
        aprovado_por: aprovado ? perfil.id : null,
        aprovado_em: aprovado ? new Date().toISOString() : null,
      };
      for (let index = 0; index < ids.length; index += 300) {
        const chunk = ids.slice(index, index + 300);
        const { error } = await lojaDb.from("ponta_processada").update(payload).in("id", chunk);
        if (error) throw error;
      }
      setMensagem(aprovado ? "Produtos aprovados na simulacao." : "Aprovacao removida.");
      await carregarDados();
    } catch (err: unknown) {
      console.error(err);
      setErro((err as { message?: string })?.message ?? "Erro ao atualizar aprovacao.");
    } finally {
      setLoading(false);
    }
  }

  async function aprovarProduto(id: string, aprovado: boolean) {
    await atualizarAprovacao([id], aprovado);
  }

  async function aprovarElegiveis() {
    if (!grupoSelecionado) return;
    const ids = grupoSelecionado.itens.filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL").map((item) => String(item.id));
    await atualizarAprovacao(ids, true);
  }

  async function reprovarAlertas() {
    if (!grupoSelecionado) return;
    const ids = grupoSelecionado.itens
      .filter((item) => alertasPontoExtra(item).length > 0)
      .map((item) => String(item.id));
    await atualizarAprovacao(ids, false);
  }

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Simulador de Ponta</h1>
        <p style={descStyle}>
          Simule a ocupacao fisica da ponta de gondola, compare cenarios e aprove produtos antes da exportacao.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "#22c55e", fontSize: 15 }}>Vigencia e filtros</h2>
          <button
            type="button"
            onClick={() => setFiltrosAbertos((prev) => !prev)}
            style={{ ...buttonStyle, padding: "6px 12px", background: "transparent", color: "#f9fafb", border: "1px solid #334155" }}
          >
            {filtrosAbertos ? "Recolher filtros" : "Expandir filtros"}
          </button>
        </div>
        {filtrosAbertos && (
          <div style={{ ...gridStyle, alignItems: "end", marginTop: 12 }}>
            <label>
              <span style={descStyle}>Mes vigencia *</span>
              <input type="month" value={mesVigencia} onChange={(e) => setMesVigencia(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Regional</span>
              <select value={regionalId} onChange={(e) => setRegionalId(e.target.value)} style={inputStyle}>
                <option value="">Todas</option>
                {regionais.map((regional) => (
                  <option key={regional.id} value={regional.id}>{regional.nome}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={descStyle}>Loja</span>
              <input value={filtros.loja} onChange={(e) => setFiltros((prev) => ({ ...prev, loja: e.target.value }))} style={inputStyle} placeholder="Ex.: 73" />
            </label>
            <label>
              <span style={descStyle}>Cod. ponta</span>
              <input value={filtros.codPonta} onChange={(e) => setFiltros((prev) => ({ ...prev, codPonta: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Numero / descricao ponta</span>
              <input value={filtros.quantPonta} onChange={(e) => setFiltros((prev) => ({ ...prev, quantPonta: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Setor</span>
              <input value={filtros.setor} onChange={(e) => setFiltros((prev) => ({ ...prev, setor: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Tipo de ponta</span>
              <input value={filtros.tipoPonta} onChange={(e) => setFiltros((prev) => ({ ...prev, tipoPonta: e.target.value }))} style={inputStyle} />
            </label>
            <button type="button" onClick={() => void carregarDados()} disabled={loading || !vigenciaValida} style={buttonStyle}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        )}
        {!vigenciaValida && <div style={warningBoxStyle}>Selecione o mes de vigencia para simular, aprovar ou exportar.</div>}
        {mensagem && <div style={{ marginTop: 12, color: "#22c55e" }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>

      {vigenciaValida && (
        <div style={cardStyle}>
          <label>
            <span style={descStyle}>Selecione a ponta ({monthLabel(mesVigencia)})</span>
            <select value={grupoKey} onChange={(e) => setGrupoKey(e.target.value)} style={inputStyle}>
              <option value="">Selecione...</option>
              {gruposFiltrados.map((grupo) => (
                <option key={grupo.key} value={grupo.key}>
                  Loja {grupo.loja} | {grupo.codPonta || "sem cod"} | {grupo.tipoPonta} {grupo.quantPonta} | {grupo.resumo.statusSimulacao}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {grupoSelecionado && (
        <>
          <PontoExtraSimuladorResumo grupo={grupoSelecionado} />
          <div style={cardStyle}>
            <PontoExtraOcupacaoVisual
              m3Alvo={grupoSelecionado.resumo.m3Alvo}
              m3Utilizado={grupoSelecionado.resumo.m3Utilizado}
              percentualOcupacao={grupoSelecionado.resumo.percentualOcupacao}
              statusSimulacao={grupoSelecionado.resumo.statusSimulacao}
              itens={grupoSelecionado.itens}
            />
          </div>
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: "#22c55e" }}>Produtos simulados</h2>
            <PontoExtraSimuladorProdutos
              itens={grupoSelecionado.itens}
              limiteSku={grupoSelecionado.limiteSku}
              loading={loading}
              onAprovar={(id, aprovado) => void aprovarProduto(id, aprovado)}
              onAprovarElegiveis={() => void aprovarElegiveis()}
              onReprovarAlertas={() => void reprovarAlertas()}
            />
          </div>
        </>
      )}
    </section>
  );
}
