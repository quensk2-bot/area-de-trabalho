import type React from "react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../styles";
import type { Usuario } from "../../types";

type Props = { perfil: Usuario };

const lojaDb = supabase.schema("loja");

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  color: theme.colors.text,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: theme.colors.neonOrange,
  fontSize: 26,
  fontWeight: 800,
};

const descStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: theme.colors.textMuted,
  fontSize: 13,
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 12,
  padding: 16,
  background: "rgba(15,23,42,0.72)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 8,
  padding: "9px 10px",
  background: theme.colors.bgElevated,
  color: theme.colors.text,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "10px 18px",
  fontWeight: 800,
  cursor: "pointer",
  background: theme.colors.neonGreen,
  color: "#022c22",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: `1px solid ${theme.colors.borderSoft}`,
  color: theme.colors.textMuted,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1px solid ${theme.colors.borderSoft}`,
  whiteSpace: "nowrap",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function splitCodes(raw: unknown) {
  return String(raw ?? "")
    .split(/[\n\r\t\s/,;]+/g)
    .map((item) => item.trim())
    .filter((item) => item && !["-", "0", "A", "CIF", "LINHA", "LOJA", "TODA", "VARIANTES", "VARIAS"].includes(item.toUpperCase()));
}

async function readRows(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = value;
      });
      return normalized;
    });
  }

  const text = new TextDecoder("windows-1252").decode(buffer);
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const sep = lines[0]?.includes(";") ? ";" : "\t";
  const headers = (lines.shift() ?? "").split(sep).map(normalizeHeader);
  return lines.map((line) => {
    const cols = line.split(sep);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] ?? "";
    });
    return row;
  });
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={cardStyle}>
      <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Placeholder({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>{titulo}</h1>
        <p style={descStyle}>{descricao}</p>
      </div>
      <div style={cardStyle}>Base criada para desenvolvimento do modulo Ponto Extra.</div>
    </section>
  );
}

export function PontoExtraDashboard() {
  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Ponto Extra</h1>
        <p style={descStyle}>
          Controle de cubagem, sugestao de abastecimento e acompanhamento de ponta de gondola, mini ponta e ilha.
        </p>
      </div>
      <div style={gridStyle}>
        <MetricCard label="Lojas" value="0" />
        <MetricCard label="Pontas mapeadas" value="0" />
        <MetricCard label="Produtos classificados" value="0" />
        <MetricCard label="Pendentes de abastecimento" value="0" />
      </div>
      <div style={cardStyle}>
        <h2 style={{ margin: 0, color: theme.colors.neonGreen }}>Fluxo inicial</h2>
        <p style={descStyle}>
          Importe a base comercial, cubagem, estoque CD e media de venda. O processamento vai gerar a sugestao por loja,
          ponta e produto, mantendo o historico das importacoes.
        </p>
      </div>
    </section>
  );
}

export function PontoExtraImportacao({ perfil }: Props) {
  const [tipo, setTipo] = useState("base_ponta");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => rows.slice(0, 8), [rows]);
  const headers = useMemo(() => Object.keys(preview[0] ?? {}).slice(0, 8), [preview]);

  async function selecionar(file: File | null) {
    setArquivo(file);
    setMensagem(null);
    setErro(null);
    setRows([]);
    if (!file) return;
    try {
      setRows(await readRows(file));
    } catch (err) {
      console.error(err);
      setErro("Nao foi possivel ler o arquivo.");
    }
  }

  async function importar() {
    if (!arquivo || rows.length === 0) {
      setErro("Selecione um arquivo valido para importar.");
      return;
    }
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { data: importacao, error: importError } = await lojaDb
        .from("ponta_importacoes")
        .insert({
          tipo,
          nome_arquivo: arquivo.name,
          total_linhas: rows.length,
          usuario_id: perfil.id,
        })
        .select("id")
        .single();

      if (importError) throw importError;

      if (tipo === "base_ponta") {
        const baseRows = rows.map((row) => ({
          importacao_id: importacao.id,
          loja: String(row.LOJA ?? row.MAPEAMENTO ?? ""),
          quantidade: toNumber(row.QUANTIDADE ?? row.QTDE),
          tipo_ponta: String(row.TIPO_DE_PONTA ?? ""),
          secao: String(row.SECAO ?? ""),
          categoria: String(row.CATEGORIA ?? ""),
          codigos_raw: String(row.CODIGOS_PRODUTOS ?? row.CODIGO ?? ""),
        }));
        const { data: inserted, error } = await lojaDb
          .from("ponta_base")
          .insert(baseRows)
          .select("id, loja, quantidade, tipo_ponta, secao, categoria, codigos_raw");
        if (error) throw error;

        const produtoRows = (inserted ?? []).flatMap((base: any) =>
          splitCodes(base.codigos_raw).map((codigo) => ({
            ponta_base_id: base.id,
            loja: base.loja,
            quantidade: base.quantidade,
            tipo_ponta: base.tipo_ponta,
            secao: base.secao,
            categoria: base.categoria,
            codigo_produto: codigo,
          })),
        );

        if (produtoRows.length) {
          const { error: prodError } = await lojaDb.from("ponta_produtos").insert(produtoRows);
          if (prodError) throw prodError;
        }
        setMensagem(`Base de ponta importada: ${baseRows.length} linhas e ${produtoRows.length} codigos.`);
      } else if (tipo === "cubagem") {
        const payload = rows
          .map((row) => ({
            tipo_ponta: String(row.TIPO_DE_PONTA ?? "").trim(),
            profundidade: toNumber(row.PROF),
            frente: toNumber(row.FRENTE),
            altura: toNumber(row.ALTURA),
            m3_area: toNumber(row.M3_AREA),
            reparticao: toNumber(row.REPARTICAO),
            total_m3: toNumber(row.TOTAL_M3),
          }))
          .filter((row) => row.tipo_ponta);
        const { error } = await lojaDb.from("ponta_cubagem").upsert(payload, { onConflict: "tipo_ponta" });
        if (error) throw error;
        setMensagem(`Cubagem importada: ${payload.length} tipos de ponta.`);
      } else {
        setMensagem(`Importacao ${tipo} registrada. A carga detalhada sera ativada no proximo bloco.`);
      }
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao importar arquivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Importar Bases do Ponto Extra</h1>
        <p style={descStyle}>Importe a base comercial, cubagem, estoque CD e media de venda usados no Power Query.</p>
      </div>
      <div style={cardStyle}>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Tipo da base</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
              <option value="base_ponta">Base Ponta</option>
              <option value="cubagem">Cubagem</option>
              <option value="estoque_cd">Estoque CDs</option>
              <option value="media_venda">Media de venda</option>
            </select>
          </label>
          <label>
            <span style={descStyle}>Arquivo</span>
            <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => void selecionar(e.target.files?.[0] ?? null)} style={inputStyle} />
          </label>
          <button type="button" onClick={() => void importar()} disabled={loading} style={buttonStyle}>
            {loading ? "Importando..." : "Importar base"}
          </button>
        </div>
        {mensagem && <div style={{ marginTop: 12, color: theme.colors.neonGreen }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Preview das primeiras linhas</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{headers.map((header) => <th key={header} style={thStyle}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {preview.length === 0 && (
                <tr><td style={tdStyle}>Selecione um arquivo para visualizar.</td></tr>
              )}
              {preview.map((row, index) => (
                <tr key={index}>
                  {headers.map((header) => <td key={header} style={tdStyle}>{String(row[header] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function PontoExtraCubagem() {
  return <Placeholder titulo="Cubagem" descricao="Cadastro e manutencao dos tamanhos de ponta, mini ponta e ilha." />;
}

export function PontoExtraProcessamento() {
  return <Placeholder titulo="Processar Ponto Extra" descricao="Motor de calculo para destrinchar codigos, cruzar media de venda, estoque CD e cubagem." />;
}

export function PontoExtraAcompanhamento() {
  return <Placeholder titulo="Acompanhamento de Abastecimento" descricao="Controle por loja da implantacao e abastecimento das pontas de gondola." />;
}

export function PontoExtraRelatorio() {
  return <Placeholder titulo="Relatorio Comercial" descricao="Visao consolidada para validar loja, ponta, categoria, codigo e sugestao de abastecimento." />;
}
