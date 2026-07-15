import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import type { Usuario } from "../../../types";
import { PontoExtraSimuladorPlanilha } from "./PontoExtraSimuladorPlanilha";
import { PontoExtraSimuladorProdutos } from "./PontoExtraSimuladorProdutos";
import {
  buttonStyle,
  cardStyle,
  descStyle,
  warningBoxStyle,
} from "./pontoExtraSharedStyles";
import { theme } from "../../../styles";
import { alertasPontoExtra, isMesVigenciaValido } from "./pontoExtraSharedUtils";
import { PontoExtraPageShell } from "./PontoExtraPageShell";
import { getMesVigenciaPersistido, setMesVigenciaPersistido } from "./pontoExtraWorkflow";
import { produtoElegivel } from "./pontoExtraSimuladorUtils";

type Props = { perfil: Usuario };

const lojaDb = supabase.schema("loja");

function ordenarItensCapa(itens: Record<string, unknown>[]) {
  return [...itens].sort((a, b) => {
    const setor = String(a.setor_codigo ?? "").localeCompare(String(b.setor_codigo ?? ""), "pt-BR", { numeric: true });
    if (setor !== 0) return setor;
    const loja = String(a.loja ?? "").localeCompare(String(b.loja ?? ""), "pt-BR", { numeric: true });
    if (loja !== 0) return loja;
    const ordem = Number(a.ordem_reparticao ?? 0) - Number(b.ordem_reparticao ?? 0);
    if (ordem !== 0) return ordem;
    return String(a.codigo_produto ?? "").localeCompare(String(b.codigo_produto ?? ""), "pt-BR", { numeric: true });
  });
}

export function PontoExtraSimulador({ perfil }: Props) {
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [visaoProdutos, setVisaoProdutos] = useState<"planilha" | "detalhe">("planilha");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const vigenciaValida = isMesVigenciaValido(mesVigencia);
  const itensVisao = useMemo(() => ordenarItensCapa(rows), [rows]);

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
          .order("setor_codigo", { ascending: true })
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
    void carregarDados();
  }, [mesVigencia]);

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
    const ids = itensVisao.filter(produtoElegivel).map((item) => String(item.id));
    await atualizarAprovacao(ids, true);
  }

  async function reprovarAlertas() {
    const ids = itensVisao
      .filter((item) => alertasPontoExtra(item).length > 0)
      .map((item) => String(item.id));
    await atualizarAprovacao(ids, false);
  }

  return (
    <PontoExtraPageShell
      stepId="validar"
      mesVigencia={mesVigencia}
      onMesVigenciaChange={(mes) => {
        setMesVigencia(mes);
        setMesVigenciaPersistido(mes);
      }}
      title="Validar Ponta"
      subtitle="Revise todas as capas e lojas em uma unica planilha. Aprove os produtos antes de exportar para o COM5."
    >
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, color: "#22c55e", fontSize: 15 }}>Capa completa — todas as lojas</h2>
            <p style={{ ...descStyle, margin: "6px 0 0" }}>
              Visao unica por setor/capa, com todas as lojas na mesma tela. Sem filtros.
            </p>
          </div>
          <button type="button" onClick={() => void carregarDados()} disabled={loading || !vigenciaValida} style={buttonStyle}>
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
        {!vigenciaValida && <div style={warningBoxStyle}>Selecione o mes de vigencia para simular, aprovar ou exportar.</div>}
        {mensagem && <div style={{ marginTop: 12, color: "#22c55e" }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>

      {vigenciaValida && itensVisao.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: "#22c55e" }}>Aprovacao — visao planilha</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setVisaoProdutos("planilha")}
                style={{
                  ...buttonStyle,
                  padding: "6px 12px",
                  background: visaoProdutos === "planilha" ? theme.colors.neonGreen : "transparent",
                  color: visaoProdutos === "planilha" ? "#022c22" : theme.colors.text,
                  border: `1px solid ${theme.colors.borderSoft}`,
                }}
              >
                Planilha
              </button>
              <button
                type="button"
                onClick={() => setVisaoProdutos("detalhe")}
                style={{
                  ...buttonStyle,
                  padding: "6px 12px",
                  background: visaoProdutos === "detalhe" ? theme.colors.neonGreen : "transparent",
                  color: visaoProdutos === "detalhe" ? "#022c22" : theme.colors.text,
                  border: `1px solid ${theme.colors.borderSoft}`,
                }}
              >
                Detalhe tecnico
              </button>
            </div>
          </div>
          {visaoProdutos === "planilha" ? (
            <PontoExtraSimuladorPlanilha
              itens={itensVisao}
              loading={loading}
              onAprovar={(id, aprovado) => void aprovarProduto(id, aprovado)}
              onAprovarPonta={(ids, aprovado) => void atualizarAprovacao(ids, aprovado)}
              onAprovarElegiveis={() => void aprovarElegiveis()}
              onReprovarAlertas={() => void reprovarAlertas()}
            />
          ) : (
            <PontoExtraSimuladorProdutos
              itens={itensVisao}
              limiteSku={7}
              loading={loading}
              onAprovar={(id, aprovado) => void aprovarProduto(id, aprovado)}
              onAprovarElegiveis={() => void aprovarElegiveis()}
              onReprovarAlertas={() => void reprovarAlertas()}
            />
          )}
        </div>
      )}
    </PontoExtraPageShell>
  );
}
