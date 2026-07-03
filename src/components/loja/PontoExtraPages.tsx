import type React from "react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../styles";
import type { Usuario } from "../../types";

type Props = { perfil: Usuario };

const lojaDb = supabase.schema("loja");

type PontaRegional = {
  id: string;
  nome: string;
  uf: string | null;
  ativo: boolean;
};

type PontaLoja = {
  id: string;
  regional_id: string | null;
  codigo_loja: string | null;
  nome: string;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
};

type PontaCadastro = {
  id: string;
  regional_id: string | null;
  loja_id: string | null;
  codigo_ponta: string;
  setor: string;
  tipo_ponta: string;
  descricao: string | null;
  ativo: boolean;
};

type PontaCubagemRow = {
  id: string;
  regional_id: string | null;
  tipo_ponta: string;
  profundidade: number | string | null;
  frente: number | string | null;
  altura: number | string | null;
  m3_area: number | string | null;
  reparticao: number | string | null;
  percentual_abastecimento: number | string | null;
  total_m3: number | string | null;
  ativo: boolean;
};

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

function formatNumber(value: unknown, digits = 3) {
  const n = toNumber(value);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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
  const [regionais, setRegionais] = useState<PontaRegional[]>([]);
  const [lojas, setLojas] = useState<PontaLoja[]>([]);
  const [pontas, setPontas] = useState<PontaCadastro[]>([]);
  const [cubagens, setCubagens] = useState<PontaCubagemRow[]>([]);
  const [regionalId, setRegionalId] = useState("");
  const [lojaId, setLojaId] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regionalForm, setRegionalForm] = useState({ nome: "", uf: "" });
  const [lojaForm, setLojaForm] = useState({ codigo_loja: "", nome: "", cidade: "", uf: "" });
  const [pontaForm, setPontaForm] = useState({ codigo_ponta: "", setor: "", tipo_ponta: "PONTA NORMAL", descricao: "" });
  const [cubagemForm, setCubagemForm] = useState({
    tipo_ponta: "PONTA NORMAL",
    profundidade: "0,33",
    frente: "0,88",
    altura: "1,43",
    reparticao: "1",
    percentual_abastecimento: "120",
  });

  const lojasFiltradas = useMemo(
    () => lojas.filter((loja) => !regionalId || loja.regional_id === regionalId),
    [lojas, regionalId],
  );
  const pontasFiltradas = useMemo(
    () => pontas.filter((ponta) => (!regionalId || ponta.regional_id === regionalId) && (!lojaId || ponta.loja_id === lojaId)),
    [pontas, regionalId, lojaId],
  );
  const cubagensFiltradas = useMemo(
    () => cubagens.filter((cubagem) => !regionalId || cubagem.regional_id === regionalId),
    [cubagens, regionalId],
  );
  const m3Area = useMemo(
    () => toNumber(cubagemForm.profundidade) * toNumber(cubagemForm.frente) * toNumber(cubagemForm.altura),
    [cubagemForm.altura, cubagemForm.frente, cubagemForm.profundidade],
  );
  const totalM3 = useMemo(
    () => m3Area * toNumber(cubagemForm.reparticao || 1) * (toNumber(cubagemForm.percentual_abastecimento || 100) / 100),
    [cubagemForm.percentual_abastecimento, cubagemForm.reparticao, m3Area],
  );

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const [regionaisResult, lojasResult, pontasResult, cubagensResult] = await Promise.all([
        lojaDb.from("ponta_regionais").select("*").order("nome"),
        lojaDb.from("ponta_lojas").select("*").order("nome"),
        lojaDb.from("ponta_cadastros").select("*").order("codigo_ponta"),
        lojaDb.from("ponta_cubagem").select("*").order("tipo_ponta"),
      ]);
      if (regionaisResult.error) throw regionaisResult.error;
      if (lojasResult.error) throw lojasResult.error;
      if (pontasResult.error) throw pontasResult.error;
      if (cubagensResult.error) throw cubagensResult.error;
      setRegionais((regionaisResult.data ?? []) as PontaRegional[]);
      setLojas((lojasResult.data ?? []) as PontaLoja[]);
      setPontas((pontasResult.data ?? []) as PontaCadastro[]);
      setCubagens((cubagensResult.data ?? []) as PontaCubagemRow[]);
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function salvarRegional() {
    if (!regionalForm.nome.trim()) {
      setErro("Informe o nome da regional.");
      return;
    }
    setErro(null);
    const { error } = await lojaDb.from("ponta_regionais").upsert({
      nome: regionalForm.nome.trim().toUpperCase(),
      uf: regionalForm.uf.trim().toUpperCase() || null,
      ativo: true,
    }, { onConflict: "nome" });
    if (error) {
      setErro(error.message);
      return;
    }
    setRegionalForm({ nome: "", uf: "" });
    setMensagem("Regional salva.");
    await carregar();
  }

  async function salvarLoja() {
    if (!regionalId || !lojaForm.nome.trim()) {
      setErro("Selecione a regional e informe a loja.");
      return;
    }
    setErro(null);
    const { error } = await lojaDb.from("ponta_lojas").upsert({
      regional_id: regionalId,
      codigo_loja: lojaForm.codigo_loja.trim() || lojaForm.nome.trim().toUpperCase(),
      nome: lojaForm.nome.trim().toUpperCase(),
      cidade: lojaForm.cidade.trim().toUpperCase() || null,
      uf: lojaForm.uf.trim().toUpperCase() || null,
      ativo: true,
    }, { onConflict: "regional_id,codigo_loja" });
    if (error) {
      setErro(error.message);
      return;
    }
    setLojaForm({ codigo_loja: "", nome: "", cidade: "", uf: "" });
    setMensagem("Loja salva.");
    await carregar();
  }

  async function salvarPonta() {
    if (!regionalId || !lojaId || !pontaForm.codigo_ponta.trim() || !pontaForm.setor.trim()) {
      setErro("Selecione regional, loja, codigo da ponta e setor.");
      return;
    }
    setErro(null);
    const { error } = await lojaDb.from("ponta_cadastros").upsert({
      regional_id: regionalId,
      loja_id: lojaId,
      codigo_ponta: pontaForm.codigo_ponta.trim().toUpperCase(),
      setor: pontaForm.setor.trim().toUpperCase(),
      tipo_ponta: pontaForm.tipo_ponta.trim().toUpperCase(),
      descricao: pontaForm.descricao.trim() || null,
      ativo: true,
    }, { onConflict: "loja_id,codigo_ponta,setor" });
    if (error) {
      setErro(error.message);
      return;
    }
    setPontaForm({ codigo_ponta: "", setor: "", tipo_ponta: "PONTA NORMAL", descricao: "" });
    setMensagem("Ponta cadastrada.");
    await carregar();
  }

  async function salvarCubagem() {
    if (!regionalId || !cubagemForm.tipo_ponta.trim()) {
      setErro("Selecione a regional e informe o tipo de ponta.");
      return;
    }
    setErro(null);
    const { error } = await lojaDb.from("ponta_cubagem").upsert({
      regional_id: regionalId,
      tipo_ponta: cubagemForm.tipo_ponta.trim().toUpperCase(),
      profundidade: toNumber(cubagemForm.profundidade),
      frente: toNumber(cubagemForm.frente),
      altura: toNumber(cubagemForm.altura),
      m3_area: m3Area,
      reparticao: toNumber(cubagemForm.reparticao || 1),
      percentual_abastecimento: toNumber(cubagemForm.percentual_abastecimento || 100),
      total_m3: totalM3,
      ativo: true,
    }, { onConflict: "regional_id,tipo_ponta" });
    if (error) {
      setErro(error.message);
      return;
    }
    setMensagem("Cubagem salva.");
    await carregar();
  }

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Cubagem Ponto Extra</h1>
        <p style={descStyle}>Cadastre primeiro a regional, depois lojas, codigos das pontas por setor e o tamanho padrao de cada tipo.</p>
      </div>

      <div style={cardStyle}>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Regional de trabalho</span>
            <select value={regionalId} onChange={(e) => { setRegionalId(e.target.value); setLojaId(""); }} style={inputStyle}>
              <option value="">Selecione a regional</option>
              {regionais.map((regional) => (
                <option key={regional.id} value={regional.id}>{regional.nome}{regional.uf ? ` - ${regional.uf}` : ""}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={descStyle}>Loja</span>
            <select value={lojaId} onChange={(e) => setLojaId(e.target.value)} style={inputStyle}>
              <option value="">Todas / selecione para cadastrar ponta</option>
              {lojasFiltradas.map((loja) => (
                <option key={loja.id} value={loja.id}>{loja.codigo_loja ? `${loja.codigo_loja} - ` : ""}{loja.nome}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void carregar()} style={buttonStyle} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
        {mensagem && <div style={{ marginTop: 12, color: theme.colors.neonGreen }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonOrange }}>1. Regional</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={regionalForm.nome} onChange={(e) => setRegionalForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Ex.: Mato Grosso" style={inputStyle} />
            <input value={regionalForm.uf} onChange={(e) => setRegionalForm((prev) => ({ ...prev, uf: e.target.value }))} placeholder="UF: MT, SC..." style={inputStyle} />
            <button type="button" onClick={() => void salvarRegional()} style={buttonStyle}>Salvar regional</button>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonOrange }}>2. Loja</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={lojaForm.codigo_loja} onChange={(e) => setLojaForm((prev) => ({ ...prev, codigo_loja: e.target.value }))} placeholder="Codigo da loja" style={inputStyle} />
            <input value={lojaForm.nome} onChange={(e) => setLojaForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Nome da loja" style={inputStyle} />
            <input value={lojaForm.cidade} onChange={(e) => setLojaForm((prev) => ({ ...prev, cidade: e.target.value }))} placeholder="Cidade" style={inputStyle} />
            <input value={lojaForm.uf} onChange={(e) => setLojaForm((prev) => ({ ...prev, uf: e.target.value }))} placeholder="UF" style={inputStyle} />
            <button type="button" onClick={() => void salvarLoja()} style={buttonStyle}>Salvar loja</button>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonOrange }}>3. Codigo da ponta / setor</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={pontaForm.codigo_ponta} onChange={(e) => setPontaForm((prev) => ({ ...prev, codigo_ponta: e.target.value }))} placeholder="Ponta: 01" style={inputStyle} />
            <input value={pontaForm.setor} onChange={(e) => setPontaForm((prev) => ({ ...prev, setor: e.target.value }))} placeholder="Setor: LIQUIDA" style={inputStyle} />
            <select value={pontaForm.tipo_ponta} onChange={(e) => setPontaForm((prev) => ({ ...prev, tipo_ponta: e.target.value }))} style={inputStyle}>
              <option>ILHA</option>
              <option>MINI PONTA</option>
              <option>PONTA NORMAL</option>
            </select>
            <input value={pontaForm.descricao} onChange={(e) => setPontaForm((prev) => ({ ...prev, descricao: e.target.value }))} placeholder="Descricao opcional" style={inputStyle} />
            <button type="button" onClick={() => void salvarPonta()} style={buttonStyle}>Salvar ponta</button>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonOrange }}>4. Tamanho padrao ponto extra</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <select value={cubagemForm.tipo_ponta} onChange={(e) => setCubagemForm((prev) => ({ ...prev, tipo_ponta: e.target.value }))} style={inputStyle}>
              <option>ILHA</option>
              <option>MINI PONTA</option>
              <option>PONTA NORMAL</option>
            </select>
            <div style={gridStyle}>
              <input value={cubagemForm.profundidade} onChange={(e) => setCubagemForm((prev) => ({ ...prev, profundidade: e.target.value }))} placeholder="Prof." style={inputStyle} />
              <input value={cubagemForm.frente} onChange={(e) => setCubagemForm((prev) => ({ ...prev, frente: e.target.value }))} placeholder="Frente" style={inputStyle} />
              <input value={cubagemForm.altura} onChange={(e) => setCubagemForm((prev) => ({ ...prev, altura: e.target.value }))} placeholder="Altura" style={inputStyle} />
              <input value={cubagemForm.reparticao} onChange={(e) => setCubagemForm((prev) => ({ ...prev, reparticao: e.target.value }))} placeholder="Reparticao" style={inputStyle} />
              <input value={cubagemForm.percentual_abastecimento} onChange={(e) => setCubagemForm((prev) => ({ ...prev, percentual_abastecimento: e.target.value }))} placeholder="% abastecimento" style={inputStyle} />
            </div>
            <div style={{ color: theme.colors.textMuted }}>
              M3 area: <strong style={{ color: theme.colors.text }}>{formatNumber(m3Area, 6)}</strong> | Total M3: <strong style={{ color: theme.colors.neonGreen }}>{formatNumber(totalM3, 6)}</strong>
            </div>
            <button type="button" onClick={() => void salvarCubagem()} style={buttonStyle}>Salvar cubagem</button>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Tamanhos cadastrados</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Tipo de ponta", "Prof.", "Frente", "Altura", "M3 area", "Reparticao", "% abastecimento", "Total M3"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cubagensFiltradas.length === 0 && <tr><td style={tdStyle}>Nenhuma cubagem cadastrada.</td></tr>}
              {cubagensFiltradas.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.tipo_ponta}</td>
                  <td style={tdStyle}>{formatNumber(item.profundidade, 2)}</td>
                  <td style={tdStyle}>{formatNumber(item.frente, 2)}</td>
                  <td style={tdStyle}>{formatNumber(item.altura, 2)}</td>
                  <td style={tdStyle}>{formatNumber(item.m3_area, 6)}</td>
                  <td style={tdStyle}>{formatNumber(item.reparticao, 0)}</td>
                  <td style={tdStyle}>{formatNumber(item.percentual_abastecimento ?? 100, 0)}%</td>
                  <td style={tdStyle}>{formatNumber(item.total_m3, 6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Pontas cadastradas por loja</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Loja", "Ponta", "Setor", "Tipo de ponta", "Descricao"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pontasFiltradas.length === 0 && <tr><td style={tdStyle}>Nenhuma ponta cadastrada.</td></tr>}
              {pontasFiltradas.map((ponta) => {
                const loja = lojas.find((item) => item.id === ponta.loja_id);
                return (
                  <tr key={ponta.id}>
                    <td style={tdStyle}>{loja?.nome ?? "-"}</td>
                    <td style={tdStyle}>{ponta.codigo_ponta}</td>
                    <td style={tdStyle}>{ponta.setor}</td>
                    <td style={tdStyle}>{ponta.tipo_ponta}</td>
                    <td style={tdStyle}>{ponta.descricao ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
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
