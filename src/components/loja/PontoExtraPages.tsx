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

function splitCategoriaPath(value: unknown) {
  const parts = String(value ?? "")
    .split(/[\\/>|]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    categoria: parts[0] ?? "",
    setor: parts[1] ?? "",
    grupo: parts[2] ?? "",
    subgrupo: parts[3] ?? "",
    tipo: parts[4] ?? "",
  };
}

async function insertInChunks(tableName: string, payload: Record<string, unknown>[], chunkSize = 800) {
  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await lojaDb.from(tableName).insert(chunk);
    if (error) throw error;
  }
}

function splitCodes(raw: unknown) {
  return String(raw ?? "")
    .split(/[\n\r\t\s/,;]+/g)
    .map((item) => item.trim())
    .filter((item) => item && !["-", "0", "A", "CIF", "LINHA", "LOJA", "TODA", "VARIANTES", "VARIAS"].includes(item.toUpperCase()));
}

function buildRowsFromMatrix(matrix: unknown[][]) {
  const headerIndex = matrix.findIndex((line) => {
    const headers = line.map(normalizeHeader);
    return headers.includes("TIPO_DE_PONTA") || (headers.includes("PROF") && headers.includes("FRENTE"));
  });
  const effectiveHeaderIndex = headerIndex >= 0 ? headerIndex : 0;
  const headers = (matrix[effectiveHeaderIndex] ?? []).map(normalizeHeader);

  return matrix.slice(effectiveHeaderIndex + 1).map((line) => {
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = line[index] ?? "";
    });
    return row;
  }).filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

async function readRows(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    return buildRowsFromMatrix(matrix);
  }

  const text = new TextDecoder("windows-1252").decode(buffer);
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const sep = lines[0]?.includes(";") ? ";" : "\t";
  return buildRowsFromMatrix(lines.map((line) => line.split(sep)));
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
    const firstRow = rows[0] ?? {};
    const isEstoqueCd = Boolean(firstRow.CODIGO_PRODUTO && (firstRow.QUANTIDADE_EM_ESTOQUE || firstRow.ESTOQUE || firstRow.ESTOQUE_DISPONIVEL));
    const effectiveTipo = tipo === "base_ponta" && isEstoqueCd ? "estoque_cd" : tipo;

    if (effectiveTipo === "cubagem") {
      setErro("Cubagem deve ser importada em LOJA > 01 Ponto Extra > Cubagem, pois precisa selecionar a regional.");
      return;
    }
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { data: importacao, error: importError } = await lojaDb
        .from("ponta_importacoes")
        .insert({
          tipo: effectiveTipo,
          nome_arquivo: arquivo.name,
          total_linhas: rows.length,
          usuario_id: perfil.id,
        })
        .select("id")
        .single();

      if (importError) throw importError;

      if (effectiveTipo === "base_ponta") {
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
          splitCodes(base.codigos_raw).slice(0, 7).map((codigo) => ({
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
      } else if (effectiveTipo === "estoque_cd") {
        const payload = rows
          .map((row) => {
            const estoque = toNumber(row.QUANTIDADE_EM_ESTOQUE ?? row.ESTOQUE ?? row.ESTOQUE_DISPONIVEL);
            const reservado = toNumber(row.QUANTIDADE_RESERVADA);
            return {
              importacao_id: importacao.id,
              codigo_produto: String(row.CODIGO_PRODUTO ?? row.CODIGO ?? "").trim(),
              estoque_disponivel: Math.max(estoque - reservado, 0),
              payload: row,
            };
          })
          .filter((row) => row.codigo_produto);

        if (payload.length === 0) {
          setErro("Nenhuma linha valida de estoque encontrada. Confira se existe CODIGO_PRODUTO.");
          return;
        }

        await insertInChunks("ponta_estoque_cd", payload);
        const avisoTipo = tipo !== effectiveTipo ? " Arquivo identificado como Estoque CDs." : "";
        setMensagem(`Estoque CD importado: ${payload.length} produtos gravados.${avisoTipo}`);
      } else if (effectiveTipo === "media_venda") {
        const payload = rows
          .map((row) => ({
            importacao_id: importacao.id,
            loja: String(row.LOJA ?? row.CODIGO_LOJA ?? row.EMPRESA ?? ""),
            codigo_produto: String(row.CODIGO_PRODUTO ?? row.SEQPRODUTO ?? row.CODPRODUTO ?? row.CODIGO ?? "").trim(),
            descricao_produto: String(row.DESCRICAO_PRODUTO ?? row.DESCCOMPLETA ?? row.PRODUTO ?? row.DESCRICAO ?? ""),
            codigo_fornecedor: String(row.CODIGO_FORNECEDOR ?? row.COD_FORNECEDOR ?? row.CODFORN ?? ""),
            fornecedor: String(row.FORNECEDOR ?? row.RAZAO ?? ""),
            status: String(row.STATUS ?? ""),
            media_venda_un_dia: toNumber(row.MEDIA_VENDA_UN_DIA ?? row.MEDIAVENDAUNDIA ?? row.MEDIA_VENDA ?? row.MEDIA),
            media_venda_gp: toNumber(row.MEDIA_VENDA_GP ?? row.MEDIAVENDAGP),
            estoque: toNumber(row.ESTOQUE),
            par_min: toNumber(row.PAR_MIN),
            par_max: toNumber(row.PAR_MAX),
            pend_compra: toNumber(row.PEND_COMPRA),
            qtde_emb_compra: toNumber(row.QTDE_EMB_COMPRA ?? row.QTD_EMB_COMPRA),
            embalagem_compra: String(row.EMBALAGEM_COMPRA ?? ""),
            categoria: String(row.CATEGORIA ?? ""),
            setor: String(row.SETOR ?? row.SECAO ?? ""),
            grupo: String(row.GRUPO ?? ""),
            custo_liquido: toNumber(row.CUSTO_LIQUIDO),
            peso_unid: toNumber(row.PESO_UNID),
            m3_unid: toNumber(row.M3_UNID),
            peso_cx: toNumber(row.PESO_CX),
            m3_cx: toNumber(row.M3_CX),
            payload: row,
          }))
          .filter((row) => row.codigo_produto);

        if (payload.length === 0) {
          setErro("Nenhuma linha valida de media de venda encontrada. Confira se existe SEQPRODUTO ou CODIGO_PRODUTO.");
          return;
        }

        await insertInChunks("ponta_media_venda", payload);
        setMensagem(`Media de venda importada: ${payload.length} produtos gravados.`);
      } else {
        setMensagem(`Importacao ${effectiveTipo} registrada. A carga detalhada sera ativada no proximo bloco.`);
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
        <p style={descStyle}>
          Importe a base comercial, estoque CD e media de venda usados no Power Query. A cubagem deve ser importada na
          tela Cubagem, pois depende da regional.
        </p>
      </div>
      <div style={cardStyle}>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Tipo da base</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
              <option value="base_ponta">Base Ponta</option>
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

function PontoExtraCubagemManualLegacy() {
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

export function PontoExtraCubagem() {
  const emptyEditForm = {
    tipo_ponta: "",
    profundidade: "",
    frente: "",
    altura: "",
    m3_area: "",
    reparticao: "1",
    percentual_abastecimento: "100",
    total_m3: "",
  };
  const colunasCubagem = [
    "TIPO DE PONTA",
    "PROF",
    "FRENTE",
    "ALTURA",
    "M3 AREA",
    "REPARTICAO",
    "PERCETUAL ABASTECIMENTO",
    "TOTAL M3",
  ];
  const [regionais, setRegionais] = useState<PontaRegional[]>([]);
  const [regionalId, setRegionalId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cubagens, setCubagens] = useState<PontaCubagemRow[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const preview = useMemo(() => rows.slice(0, 8), [rows]);
  const cubagensFiltradas = useMemo(
    () => cubagens.filter((item) => !regionalId || item.regional_id === regionalId),
    [cubagens, regionalId],
  );

  async function carregarBase() {
    setErro(null);
    try {
      const [regionaisResult, cubagensResult] = await Promise.all([
        lojaDb.from("ponta_regionais").select("*").order("nome"),
        lojaDb.from("ponta_cubagem").select("*").order("tipo_ponta"),
      ]);
      if (regionaisResult.error) throw regionaisResult.error;
      if (cubagensResult.error) throw cubagensResult.error;
      setRegionais((regionaisResult.data ?? []) as PontaRegional[]);
      setCubagens((cubagensResult.data ?? []) as PontaCubagemRow[]);
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar regionais e cubagens.");
    }
  }

  useEffect(() => {
    void carregarBase();
  }, []);

  async function selecionar(file: File | null) {
    setArquivo(file);
    setRows([]);
    setMensagem(null);
    setErro(null);
    if (!file) return;
    try {
      setRows(await readRows(file));
    } catch (err) {
      console.error(err);
      setErro("Nao foi possivel ler o arquivo de cubagem.");
    }
  }

  async function importarCubagem() {
    if (!regionalId) {
      setErro("Selecione a regional antes de importar.");
      return;
    }
    if (!arquivo || rows.length === 0) {
      setErro("Selecione um arquivo valido para importar.");
      return;
    }
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const payload = rows
        .map((row) => {
          const profundidade = toNumber(row.PROF ?? row.PROFUNDIDADE);
          const frente = toNumber(row.FRENTE);
          const altura = toNumber(row.ALTURA);
          const m3Area = toNumber(row.M3_AREA) || profundidade * frente * altura;
          const reparticao = toNumber(row.REPARTICAO) || 1;
          const percentual = toNumber(row.PERCETUAL_ABASTECIMENTO ?? row.PERCENTUAL_ABASTECIMENTO ?? row.PERC_ABASTECIMENTO) || 100;
          const totalM3 = toNumber(row.TOTAL_M3) || m3Area * reparticao * (percentual / 100);
          return {
            regional_id: regionalId,
            tipo_ponta: String(row.TIPO_DE_PONTA ?? row.TIPO_PONTA ?? "").trim().toUpperCase(),
            profundidade,
            frente,
            altura,
            m3_area: m3Area,
            reparticao,
            percentual_abastecimento: percentual,
            total_m3: totalM3,
            ativo: true,
          };
        })
        .filter((row) => row.tipo_ponta);

      if (payload.length === 0) {
        setErro("Nenhuma linha valida encontrada. Confira se existe a coluna TIPO DE PONTA.");
        return;
      }

      const { error } = await lojaDb.from("ponta_cubagem").upsert(payload, { onConflict: "regional_id,tipo_ponta" });
      if (error) throw error;
      setMensagem(`Cubagem importada: ${payload.length} tipos de ponta atualizados.`);
      await carregarBase();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao importar cubagem.");
    } finally {
      setLoading(false);
    }
  }

  function editarCubagem(item: PontaCubagemRow) {
    setEditingId(item.id);
    setRegionalId(item.regional_id ?? "");
    setEditForm({
      tipo_ponta: item.tipo_ponta ?? "",
      profundidade: String(item.profundidade ?? ""),
      frente: String(item.frente ?? ""),
      altura: String(item.altura ?? ""),
      m3_area: String(item.m3_area ?? ""),
      reparticao: String(item.reparticao ?? "1"),
      percentual_abastecimento: String(item.percentual_abastecimento ?? "100"),
      total_m3: String(item.total_m3 ?? ""),
    });
    setMensagem(null);
    setErro(null);
  }

  function cancelarEdicao() {
    setEditingId(null);
    setEditForm(emptyEditForm);
  }

  async function salvarEdicao() {
    if (!editingId) return;
    if (!regionalId) {
      setErro("Selecione a regional antes de salvar.");
      return;
    }
    const profundidade = toNumber(editForm.profundidade);
    const frente = toNumber(editForm.frente);
    const altura = toNumber(editForm.altura);
    const m3Area = toNumber(editForm.m3_area) || profundidade * frente * altura;
    const reparticao = toNumber(editForm.reparticao) || 1;
    const percentual = toNumber(editForm.percentual_abastecimento) || 100;
    const totalM3 = toNumber(editForm.total_m3) || m3Area * reparticao * (percentual / 100);

    if (!editForm.tipo_ponta.trim()) {
      setErro("Informe o tipo de ponta.");
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { error } = await lojaDb
        .from("ponta_cubagem")
        .update({
          regional_id: regionalId,
          tipo_ponta: editForm.tipo_ponta.trim().toUpperCase(),
          profundidade,
          frente,
          altura,
          m3_area: m3Area,
          reparticao,
          percentual_abastecimento: percentual,
          total_m3: totalM3,
          ativo: true,
        })
        .eq("id", editingId);
      if (error) throw error;
      setMensagem("Cubagem atualizada.");
      cancelarEdicao();
      await carregarBase();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao salvar cubagem.");
    } finally {
      setLoading(false);
    }
  }

  async function excluirCubagem(item: PontaCubagemRow) {
    const confirmar = window.confirm(`Excluir a cubagem "${item.tipo_ponta}"?`);
    if (!confirmar) return;
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { error } = await lojaDb.from("ponta_cubagem").delete().eq("id", item.id);
      if (error) throw error;
      setMensagem("Cubagem excluida.");
      if (editingId === item.id) cancelarEdicao();
      await carregarBase();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao excluir cubagem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Cubagem Ponto Extra</h1>
        <p style={descStyle}>
          Importe os tamanhos padrao por regional. Loja, setor e produtos serao tratados pelas bases de media/KPI.
        </p>
        <p style={descStyle}>
          Cabecalho esperado: {colunasCubagem.join(" | ")}.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Regional</span>
            <select value={regionalId} onChange={(e) => setRegionalId(e.target.value)} style={inputStyle}>
              <option value="">Selecione a regional</option>
              {regionais.map((regional) => (
                <option key={regional.id} value={regional.id}>
                  {regional.nome}{regional.uf ? ` - ${regional.uf}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={descStyle}>Arquivo de cubagem</span>
            <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => void selecionar(e.target.files?.[0] ?? null)} style={inputStyle} />
          </label>
          <button type="button" onClick={() => void importarCubagem()} disabled={loading} style={buttonStyle}>
            {loading ? "Importando..." : "Importar cubagem"}
          </button>
        </div>
        {mensagem && <div style={{ marginTop: 12, color: theme.colors.neonGreen }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>

      {editingId && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Editar cubagem</h2>
          <div style={{ ...gridStyle, alignItems: "end" }}>
            <label>
              <span style={descStyle}>Tipo de ponta</span>
              <input
                value={editForm.tipo_ponta}
                onChange={(e) => setEditForm((prev) => ({ ...prev, tipo_ponta: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label>
              <span style={descStyle}>Prof.</span>
              <input value={editForm.profundidade} onChange={(e) => setEditForm((prev) => ({ ...prev, profundidade: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Frente</span>
              <input value={editForm.frente} onChange={(e) => setEditForm((prev) => ({ ...prev, frente: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Altura</span>
              <input value={editForm.altura} onChange={(e) => setEditForm((prev) => ({ ...prev, altura: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>M3 area</span>
              <input value={editForm.m3_area} onChange={(e) => setEditForm((prev) => ({ ...prev, m3_area: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Reparticao</span>
              <input value={editForm.reparticao} onChange={(e) => setEditForm((prev) => ({ ...prev, reparticao: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>% abastecimento</span>
              <input value={editForm.percentual_abastecimento} onChange={(e) => setEditForm((prev) => ({ ...prev, percentual_abastecimento: e.target.value }))} style={inputStyle} />
            </label>
            <label>
              <span style={descStyle}>Total M3</span>
              <input value={editForm.total_m3} onChange={(e) => setEditForm((prev) => ({ ...prev, total_m3: e.target.value }))} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={() => void salvarEdicao()} disabled={loading} style={buttonStyle}>
              {loading ? "Salvando..." : "Salvar alteracao"}
            </button>
            <button type="button" onClick={cancelarEdicao} disabled={loading} style={{ ...buttonStyle, background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Preview da importacao</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {colunasCubagem.map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 && <tr><td style={tdStyle}>Selecione um arquivo para visualizar.</td></tr>}
              {preview.map((row, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{String(row.TIPO_DE_PONTA ?? row.TIPO_PONTA ?? "")}</td>
                  <td style={tdStyle}>{String(row.PROF ?? row.PROFUNDIDADE ?? "")}</td>
                  <td style={tdStyle}>{String(row.FRENTE ?? "")}</td>
                  <td style={tdStyle}>{String(row.ALTURA ?? "")}</td>
                  <td style={tdStyle}>{String(row.M3_AREA ?? "")}</td>
                  <td style={tdStyle}>{String(row.REPARTICAO ?? "")}</td>
                  <td style={tdStyle}>{String(row.PERCETUAL_ABASTECIMENTO ?? row.PERCENTUAL_ABASTECIMENTO ?? "")}</td>
                  <td style={tdStyle}>{String(row.TOTAL_M3 ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Cubagens cadastradas</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Acoes", "Tipo de ponta", "Prof.", "Frente", "Altura", "M3 area", "Reparticao", "% abastecimento", "Total M3"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cubagensFiltradas.length === 0 && <tr><td style={tdStyle}>Nenhuma cubagem cadastrada.</td></tr>}
              {cubagensFiltradas.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => editarCubagem(item)} style={{ ...buttonStyle, padding: "6px 10px", background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}>
                        Editar
                      </button>
                      <button type="button" onClick={() => void excluirCubagem(item)} disabled={loading} style={{ ...buttonStyle, padding: "6px 10px", background: "#991b1b", color: "#fff" }}>
                        Excluir
                      </button>
                    </div>
                  </td>
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
    </section>
  );
}

export function PontoExtraProcessamento() {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Record<string, any>[]>([]);
  const [resumo, setResumo] = useState({
    produtosBase: 0,
    processados: 0,
    semMedia: 0,
    semCubagem: 0,
    semEstoque: 0,
    skuIgnorados: 0,
  });

  async function carregarResultado() {
    const { data, error, count } = await lojaDb
      .from("ponta_processada")
      .select("*", { count: "exact" })
      .order("loja", { ascending: true })
      .order("tipo_ponta", { ascending: true })
      .limit(200);
    if (error) throw error;
    setResultado((data ?? []) as Record<string, any>[]);

    const [produtosCount, mediaCount, estoqueCount, cubagemCount] = await Promise.all([
      lojaDb.from("ponta_produtos").select("*", { count: "exact", head: true }),
      lojaDb.from("ponta_media_venda").select("*", { count: "exact", head: true }),
      lojaDb.from("ponta_estoque_cd").select("*", { count: "exact", head: true }),
      lojaDb.from("ponta_cubagem").select("*", { count: "exact", head: true }),
    ]);

    const firstError = produtosCount.error ?? mediaCount.error ?? estoqueCount.error ?? cubagemCount.error;
    if (firstError) throw firstError;

    setResumo((prev) => ({
      ...prev,
      produtosBase: produtosCount.count ?? 0,
      processados: count ?? data?.length ?? 0,
      semMedia: mediaCount.count ? prev.semMedia : produtosCount.count ?? 0,
      semCubagem: cubagemCount.count ? prev.semCubagem : produtosCount.count ?? 0,
      semEstoque: estoqueCount.count ? prev.semEstoque : produtosCount.count ?? 0,
    }));
  }

  useEffect(() => {
    void carregarResultado().catch((err) => {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar processamento.");
    });
  }, []);

  async function carregarTabela<T = Record<string, any>>(tabela: string, select = "*") {
    const pageSize = 1000;
    const allRows: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await lojaDb
        .from(tabela)
        .select(select)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      allRows.push(...((data ?? []) as T[]));
      if (!data || data.length < pageSize) break;
    }
    return allRows;
  }

  function chaveTexto(...partes: unknown[]) {
    return partes.map((parte) => String(parte ?? "").trim().toUpperCase()).join("|");
  }

  async function processar() {
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const [produtos, medias, estoques, cubagens, cadastros] = await Promise.all([
        carregarTabela<any>("ponta_produtos"),
        carregarTabela<any>("ponta_media_venda"),
        carregarTabela<any>("ponta_estoque_cd"),
        carregarTabela<any>("ponta_cubagem"),
        carregarTabela<any>("ponta_cadastros"),
      ]);

      const mediaPorLojaCodigo = new Map<string, any>();
      const mediaPorCodigo = new Map<string, any>();
      for (const media of medias) {
        const codigo = String(media.codigo_produto ?? "").trim();
        if (!codigo) continue;
        const loja = String(media.loja ?? "").trim();
        if (loja) mediaPorLojaCodigo.set(chaveTexto(loja, codigo), media);
        if (!mediaPorCodigo.has(chaveTexto(codigo))) mediaPorCodigo.set(chaveTexto(codigo), media);
      }

      const estoquePorCodigo = new Map<string, number>();
      for (const estoque of estoques) {
        const codigo = String(estoque.codigo_produto ?? "").trim();
        if (!codigo) continue;
        estoquePorCodigo.set(chaveTexto(codigo), Math.max(estoquePorCodigo.get(chaveTexto(codigo)) ?? 0, toNumber(estoque.estoque_disponivel)));
      }

      const cubagemPorTipo = new Map<string, any>();
      for (const cubagem of cubagens) {
        const tipo = String(cubagem.tipo_ponta ?? "").trim();
        if (tipo && toNumber(cubagem.total_m3) > 0) cubagemPorTipo.set(chaveTexto(tipo), cubagem);
      }

      const cadastroPorPonta = new Map<string, any>();
      for (const cadastro of cadastros) {
        const tipo = String(cadastro.tipo_ponta ?? "").trim();
        const setor = String(cadastro.setor ?? "").trim();
        if (!tipo) continue;
        cadastroPorPonta.set(chaveTexto(tipo, setor), cadastro);
        if (!cadastroPorPonta.has(chaveTexto(tipo))) cadastroPorPonta.set(chaveTexto(tipo), cadastro);
      }

      const produtosPorPonta = new Map<string, any[]>();
      for (const produto of produtos) {
        const grupoPonta = chaveTexto(
          produto.ponta_base_id ?? "",
          produto.loja,
          produto.quantidade,
          produto.tipo_ponta,
          produto.secao,
          produto.categoria,
        );
        produtosPorPonta.set(grupoPonta, [...(produtosPorPonta.get(grupoPonta) ?? []), produto]);
      }
      const produtosLimitados = Array.from(produtosPorPonta.values()).flatMap((grupo) => grupo.slice(0, 7));
      const skuIgnorados = produtos.length - produtosLimitados.length;

      const baseCalculada = produtosLimitados.map((produto) => {
        const codigo = String(produto.codigo_produto ?? "").trim();
        const loja = String(produto.loja ?? "").trim();
        const numeroPonta = String(produto.quantidade ?? "").trim();
        const tipoPonta = String(produto.tipo_ponta ?? "").trim().toUpperCase();
        const media = mediaPorLojaCodigo.get(chaveTexto(loja, codigo)) ?? mediaPorCodigo.get(chaveTexto(codigo));
        const categoriaPath = splitCategoriaPath(media?.categoria);
        const secao = categoriaPath.setor || String(produto.secao ?? "").trim();
        const categoria = categoriaPath.categoria || String(produto.categoria ?? "").trim();
        const cubagem = cubagemPorTipo.get(chaveTexto(tipoPonta));
        const estoqueCd = estoquePorCodigo.get(chaveTexto(codigo)) ?? 0;
        const cadastro = cadastroPorPonta.get(chaveTexto(tipoPonta, secao)) ?? cadastroPorPonta.get(chaveTexto(tipoPonta));
        return {
          produto,
          media,
          cubagem,
          cadastro,
          codigo,
          loja,
          numeroPonta,
          tipoPonta,
          secao,
          categoria,
          estoqueCd,
          mediaVenda: toNumber(media?.media_venda_un_dia),
        };
      });

      const somaPorPonta = new Map<string, number>();
      for (const item of baseCalculada) {
        const grupo = chaveTexto(item.loja, item.numeroPonta, item.secao);
        somaPorPonta.set(grupo, (somaPorPonta.get(grupo) ?? 0) + item.mediaVenda);
      }

      const payload = baseCalculada.map((item) => {
        const somaMedia = somaPorPonta.get(chaveTexto(item.loja, item.numeroPonta, item.secao)) ?? 0;
        const participacao = somaMedia > 0 ? item.mediaVenda / somaMedia : 0;
        const m3Ponta = toNumber(item.cubagem?.total_m3);
        const m3Capacidade = m3Ponta * participacao;
        const m3Unid = toNumber(item.media?.m3_unid);
        const unidadeSugerida = m3Unid > 0 ? m3Capacidade / m3Unid : 0;
        const qtdeEmbCompra = toNumber(item.media?.qtde_emb_compra);
        const caixasSugeridas = qtdeEmbCompra > 0 ? unidadeSugerida / qtdeEmbCompra : 0;

        return {
          loja: item.loja,
          quant_ponta: item.numeroPonta,
          tipo_ponta: item.tipoPonta,
          secao: item.secao,
          categoria: item.categoria,
          codigo_produto: item.codigo,
          descricao_produto: item.media?.descricao_produto ?? "",
          codigo_fornecedor: item.media?.codigo_fornecedor ?? "",
          fornecedor: item.media?.fornecedor ?? "",
          media_venda_un_dia: item.mediaVenda,
          soma_media_ponta: somaMedia,
          participacao,
          m3_ponta: m3Ponta,
          m3_capacidade: m3Capacidade,
          m3_unid: m3Unid,
          unidade_sugerida: unidadeSugerida,
          qtde_emb_compra: qtdeEmbCompra,
          caixas_sugeridas: caixasSugeridas,
          estoque_cd: item.estoqueCd,
          cod_ponta: item.cadastro?.codigo_ponta ?? "",
          descricao_ponta: item.cadastro?.descricao ?? "",
        };
      });

      const { error: deleteError } = await lojaDb.from("ponta_processada").delete().not("id", "is", null);
      if (deleteError) throw deleteError;
      if (payload.length) await insertInChunks("ponta_processada", payload, 600);

      const novoResumo = {
        produtosBase: produtos.length,
        processados: payload.length,
        semMedia: baseCalculada.filter((item) => !item.media).length,
        semCubagem: baseCalculada.filter((item) => !item.cubagem).length,
        semEstoque: baseCalculada.filter((item) => item.estoqueCd <= 0).length,
        skuIgnorados,
      };
      setResumo(novoResumo);
      setResultado(payload.slice(0, 200));
      setMensagem(`Processamento concluido: ${payload.length} produtos gravados.`);
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao processar Ponto Extra.");
    } finally {
      setLoading(false);
    }
  }

  const preview = resultado.slice(0, 120);
  const gruposPreview = useMemo(() => {
    const grupos = new Map<string, Record<string, any>[]>();
    for (const item of preview) {
      const chave = chaveTexto(item.loja, item.quant_ponta, item.secao);
      grupos.set(chave, [...(grupos.get(chave) ?? []), item]);
    }
    return Array.from(grupos.entries()).map(([chave, itens]) => ({
      chave,
      loja: itens[0]?.loja ?? "-",
      ponta: itens[0]?.quant_ponta ?? "-",
      setor: itens[0]?.secao ?? "-",
      tipoPonta: itens[0]?.tipo_ponta ?? "-",
      itens,
      somaMedia: itens.reduce((sum, item) => sum + toNumber(item.media_venda_un_dia), 0),
      estoqueCd: itens.reduce((sum, item) => sum + toNumber(item.estoque_cd), 0),
    }));
  }, [preview]);

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Processar Ponto Extra</h1>
        <p style={descStyle}>
          Cruza base ponta, media de venda, estoque CD e cubagem para gerar a sugestao de abastecimento.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void processar()} disabled={loading} style={buttonStyle}>
            {loading ? "Processando..." : "Processar Ponto Extra"}
          </button>
          <button
            type="button"
            onClick={() => void carregarResultado()}
            disabled={loading}
            style={{ ...buttonStyle, background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}
          >
            Recarregar resultado
          </button>
        </div>
        {mensagem && <div style={{ marginTop: 12, color: theme.colors.neonGreen }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>

      <div style={gridStyle}>
        <MetricCard label="Produtos base" value={resumo.produtosBase || resultado.length} />
        <MetricCard label="Processados" value={resumo.processados || resultado.length} />
        <MetricCard label="Sem media" value={resumo.semMedia} />
        <MetricCard label="Sem cubagem" value={resumo.semCubagem} />
        <MetricCard label="Sem estoque CD" value={resumo.semEstoque} />
        <MetricCard label="SKU ignorados acima de 7" value={resumo.skuIgnorados} />
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Resultado processado</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  "Loja",
                  "Ponta",
                  "Setor",
                  "Tipo ponta",
                  "Categoria",
                  "Codigo",
                  "Descricao",
                  "Media",
                  "Participacao",
                  "M3 capacidade",
                  "Unid. sugerida",
                  "Caixas sugeridas",
                  "Estoque CD",
                ].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposPreview.length === 0 && <tr><td style={tdStyle}>Nenhum resultado processado.</td></tr>}
              {gruposPreview.map((grupo) => (
                <React.Fragment key={grupo.chave}>
                  <tr>
                    <td
                      colSpan={13}
                      style={{
                        ...tdStyle,
                        background: "rgba(0,0,0,0.38)",
                        color: theme.colors.neonGreen,
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      Loja {grupo.loja} | Ponta {grupo.ponta} | Setor {grupo.setor} | {grupo.tipoPonta} | {grupo.itens.length} SKU
                    </td>
                  </tr>
                  {grupo.itens.map((item, index) => (
                    <tr key={`${grupo.chave}-${item.codigo_produto}-${index}`}>
                      <td style={tdStyle}>{item.loja || "-"}</td>
                      <td style={tdStyle}>{item.quant_ponta || "-"}</td>
                      <td style={tdStyle}>{item.secao || "-"}</td>
                      <td style={tdStyle}>{item.tipo_ponta || "-"}</td>
                      <td style={tdStyle}>{item.categoria || "-"}</td>
                      <td style={tdStyle}>{item.codigo_produto || "-"}</td>
                      <td style={tdStyle}>{item.descricao_produto || "-"}</td>
                      <td style={tdStyle}>{formatNumber(item.media_venda_un_dia, 3)}</td>
                      <td style={tdStyle}>{formatNumber(toNumber(item.participacao) * 100, 2)}%</td>
                      <td style={tdStyle}>{formatNumber(item.m3_capacidade, 6)}</td>
                      <td style={tdStyle}>{formatNumber(item.unidade_sugerida, 2)}</td>
                      <td style={tdStyle}>{formatNumber(item.caixas_sugeridas, 2)}</td>
                      <td style={tdStyle}>{formatNumber(item.estoque_cd, 0)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function PontoExtraAcompanhamento() {
  return <Placeholder titulo="Acompanhamento de Abastecimento" descricao="Controle por loja da implantacao e abastecimento das pontas de gondola." />;
}

export function PontoExtraRelatorio() {
  return <Placeholder titulo="Relatorio Comercial" descricao="Visao consolidada para validar loja, ponta, categoria, codigo e sugestao de abastecimento." />;
}
