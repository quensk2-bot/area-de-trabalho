import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../styles";
import type { Usuario } from "../../types";

type Props = { perfil: Usuario };

type Agendamento = {
  id: string;
  data_agenda: string | null;
  status_recebimento: string | null;
  valor_total: number | string | null;
  total_paletes: number | string | null;
  total_caixas: number | string | null;
  total_conferido: number | string | null;
  total_recebido: number | string | null;
};

type DashboardRow = {
  agendamento_id: string;
  chave_importacao: string | null;
  empresa: string | null;
  nro_box: string | null;
  data_agenda: string | null;
  horario: string | null;
  transportadora: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  nro_carga: string | null;
  status_recebimento_calculado: string | null;
  total_itens: number | string | null;
  itens_cross: number | string | null;
  itens_armaz: number | string | null;
  total_paletes: number | string | null;
  total_caixas: number | string | null;
  total_conferido: number | string | null;
  total_recebido: number | string | null;
  valor_total: number | string | null;
  ruptura_total: number | string | null;
  secoes: string | null;
  perc_conferencia: number | string | null;
  perc_palete: number | string | null;
  modalidade_calculada: string | null;
  status_finalizada: string | null;
  qtd_cargas: number | string | null;
  perc_carga: number | string | null;
  ind_finalizada: number | string | null;
  ind_em_conferencia: number | string | null;
  ind_retirar_termo: number | string | null;
  ind_no_show: number | string | null;
  ind_recusada: number | string | null;
  ind_reentrega: number | string | null;
  ind_sem_agenda: number | string | null;
  ind_inconsistencia_agenda: number | string | null;
  ind_pendente: number | string | null;
  ind_abandono: number | string | null;
  hora_chegada: string | null;
  estivada: number | string | null;
  repaletizada: number | string | null;
  paletizada: number | string | null;
  ocorrencias_abertas: number | string | null;
  fornecedor_codigo: string | null;
  transportadora_id: string | null;
  transportadora_cadastro_nome: string | null;
  transportadora_whatsapp: string | null;
  transportadora_email: string | null;
  fornecedor_whatsapp: string | null;
  fornecedor_email: string | null;
  possui_nota: boolean | null;
  nota_fiscal: string | null;
  confirmacao_status: string | null;
  confirmacao_observacao: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
};

type GestaoAgendaRow = {
  id: string;
  codigo_agenda: string | null;
  transportadora_nome: string | null;
  fornecedor_nome: string | null;
  notas_fiscais: string | null;
  data_agenda: string | null;
  horario: string | null;
  doca: string | null;
  deposito: string | null;
  tipo_carga: string | null;
  qtd_veiculos: number | string | null;
  tipo_veiculo: string | null;
  tipo_volume: string | null;
  volumes: number | string | null;
  sku: number | string | null;
  unidade_negocios: string | null;
  fornecedor_id: string | null;
  transportadora_id: string | null;
  possui_nota: boolean | null;
  status_confirmacao: string | null;
  observacao: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
  created_at: string | null;
  fornecedor_whatsapp?: string | null;
  fornecedor_email?: string | null;
  transportadora_whatsapp?: string | null;
  transportadora_email?: string | null;
};

type DashboardItem = {
  id: string;
  agendamento_id: string;
  codigo_produto: string | null;
  descricao_produto: string | null;
  secao: string | null;
  modalidade_original: string | null;
  modalidade_compra: string | null;
  norma: string | null;
  palete: number | string | null;
  gerada: number | string | null;
  conferida: number | string | null;
  recebida: number | string | null;
  valor: number | string | null;
  ruptura: number | string | null;
};

type AgendamentoHistorico = {
  id: string;
  agendamento_id: string;
  acao: string | null;
  created_at: string | null;
  dados_anteriores: unknown;
  dados_novos: unknown;
};

type Ocorrencia = {
  id: string;
  agendamento_id: string;
  item_id: string | null;
  tipo: string;
  descricao: string | null;
  status: string | null;
  responsavel_id: string | null;
  created_at: string | null;
  resolvido_em: string | null;
  foto_url: string | null;
  foto_path: string | null;
  foto_nome: string | null;
};

type OcorrenciaFoto = {
  id: string;
  ocorrencia_id: string;
  storage_path: string;
  url: string;
  nome_arquivo: string | null;
  created_at: string | null;
};

type FornecedorContato = {
  id: string;
  fornecedor_id: string;
  nome: string;
  cargo: string | null;
  tipo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  principal: boolean | null;
  ativo: boolean | null;
  observacao: string | null;
};

type TransportadoraContato = {
  id: string;
  transportadora_id: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  principal: boolean | null;
  ativo: boolean | null;
  observacao: string | null;
};

type ConfirmacaoHistorico = {
  id: string;
  agendamento_id: string | null;
  gestao_agenda_id: string | null;
  usuario_id: string | null;
  canal: string | null;
  contato_nome: string | null;
  contato_tipo: string | null;
  resultado: string | null;
  observacao: string | null;
  created_at: string | null;
};

type Fornecedor = {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  contato_responsavel: string | null;
  ativo: boolean | null;
  observacao?: string | null;
};

type Transportadora = {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  contato_responsavel: string | null;
  ativo: boolean | null;
  observacao: string | null;
};

const db = () => (supabase as any).schema("recebimento");
const todayISO = () => new Date().toISOString().slice(0, 10);
const toNumber = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const statusIncludes = (status: string | null, terms: string[]) => {
  const normalized = (status ?? "").toLowerCase();
  return terms.some((term) => normalized.includes(term));
};
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const parseDecimal = (value: string | undefined) => {
  const normalized = (value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(normalized || 0);
  return Number.isFinite(n) ? n : 0;
};

const parseDateBR = (value: string | undefined) => {
  const trimmed = (value ?? "").trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const parseTime = (value: string | undefined) => {
  const trimmed = (value ?? "").trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
};

const splitImportLine = (line: string) => {
  const delimiter = line.includes(";") ? ";" : "\t";
  return line.split(delimiter).map((part) => part.trim());
};

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

const splitDelimitedLine = (line: string) => {
  const delimiter = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const parseDelimitedTable = (text: string) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitDelimitedLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cols = splitDelimitedLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cols[index] ?? ""]));
  });
};

const parseXlsxTable = async (file: File) => {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0] ?? "").includes("Bad uncompressed size")) return;
    originalConsoleError(...args);
  };
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false, WTF: false });
  } finally {
    console.error = originalConsoleError;
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });

  const headerRow = rows.find((row) => row.some((cell) => normalizeHeader(cell) === "CODIGO_AGENDA"));
  if (!headerRow) return [];
  const startIndex = rows.indexOf(headerRow) + 1;
  const headers = headerRow.map(normalizeHeader);
  return rows.slice(startIndex).filter((row) => row.some((cell) => cell.trim())).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
};

const parseExcelSerialDate = (value: string) => {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const date = new Date(Date.UTC(1899, 11, 30));
  date.setUTCDate(date.getUTCDate() + Math.floor(serial));
  const fraction = serial - Math.floor(serial);
  const seconds = Math.round(fraction * 24 * 60 * 60);
  return {
    data: date.toISOString().slice(0, 10),
    horario: `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:00`,
  };
};

const isHeaderLine = (cols: string[]) => {
  const first = (cols[0] ?? "").toUpperCase();
  return first === "EMPRESA" || first === "NROEMPRESA";
};

const extractStatusRecebimento = (transportadora: string, statusCarga: string) => {
  const match = transportadora.match(/\(([^)]+)\)/);
  return (match?.[1] ?? statusCarga ?? "").trim() || null;
};

const extractFornecedorNome = (fornecedor: string, transportadora: string) => {
  const explicit = fornecedor.trim();
  if (explicit) return explicit;
  return transportadora
    .replace(/\([^)]*\)/g, "")
    .replace(/^\d{2}\/\d{2}\s+\d+\s*/g, "")
    .replace(/^\d+\s+/, "")
    .trim();
};

const extractFornecedorCodigo = (fornecedor: string) => {
  const match = fornecedor.trim().match(/^(\d+)/);
  return match?.[1] ?? null;
};

const agendamentoKey = (cols: string[]) =>
  [
    cols[0],
    cols[1],
    parseDateBR(cols[2]) ?? "",
    parseTime(cols[3]) ?? "",
    cols[4],
    cols[8] || cols[4],
  ].join("|");

const pageStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};
const titleStyle: React.CSSProperties = {
  margin: 0,
  color: theme.colors.neonOrange,
  fontSize: 24,
  letterSpacing: 0.3,
};
const descStyle: React.CSSProperties = { margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 13 };
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const cardStyle: React.CSSProperties = {
  background: theme.colors.cardBg,
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 12,
  padding: 14,
};
const metricLabelStyle: React.CSSProperties = { color: theme.colors.textMuted, fontSize: 12 };
const metricValueStyle: React.CSSProperties = {
  marginTop: 8,
  color: theme.colors.text,
  fontSize: 24,
  fontWeight: 800,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: `1px solid ${theme.colors.borderSoft}`,
  background: theme.colors.bgElevated,
  color: theme.colors.text,
  padding: "9px 10px",
  boxSizing: "border-box",
};
const buttonPrimaryStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: theme.colors.neonGreen,
  color: "#022c22",
  fontWeight: 800,
  padding: "9px 14px",
  cursor: "pointer",
};
const buttonSecondaryStyle: React.CSSProperties = {
  border: `1px solid ${theme.colors.borderSoft}`,
  borderRadius: 999,
  background: "transparent",
  color: theme.colors.textSoft,
  fontWeight: 700,
  padding: "8px 12px",
  cursor: "pointer",
  textDecoration: "none",
};

const groupBy = <T,>(items: T[], keyFn: (item: T) => string) => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
};

const uniqueValues = (rows: DashboardRow[], field: keyof DashboardRow) =>
  Array.from(new Set(rows.map((r) => String(r[field] ?? "")).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

const sumRows = (rows: DashboardRow[], field: keyof DashboardRow) =>
  rows.reduce((sum, row) => sum + toNumber(row[field] as any), 0);

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const OCORRENCIA_BUCKET = "recebimento-ocorrencias";
const TIPOS_OCORRENCIA = [
  "Divergência de quantidade",
  "Produto avariado",
  "Nota fiscal divergente",
  "Atraso",
  "Falta de produto",
  "Produto não conforme",
  "Outros",
];
const STATUS_CONFIRMACAO = ["Pendente", "Confirmado", "Não confirmado", "Sem contato", "Reagendar", "Cancelado"];
const CANAIS_CONFIRMACAO = ["Telefone", "WhatsApp", "E-mail", "Presencial", "Outro"];
const cargaDisplayKey = (row: DashboardRow) =>
  row.chave_importacao || row.nro_carga
    ? `${row.chave_importacao ?? ""}|${row.nro_carga ?? ""}`
    : row.agendamento_id;

const uploadFotoOcorrencia = async (file: File, agendamentoId: string) => {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${agendamentoId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(OCORRENCIA_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(OCORRENCIA_BUCKET).getPublicUrl(path);
  return { foto_path: path, foto_url: data.publicUrl, foto_nome: file.name };
};

const uploadFotosOcorrencia = async (files: File[], agendamentoId: string) => {
  const uploaded = [];
  for (const file of files) {
    uploaded.push(await uploadFotoOcorrencia(file, agendamentoId));
  }
  return uploaded;
};

const onlyDigits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");
const whatsappHref = (numero: string | null | undefined, mensagem: string) => {
  const digits = onlyDigits(numero);
  if (!digits) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(mensagem)}`;
};
const mailtoHref = (email: string | null | undefined, mensagem: string) => {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent("Confirmação de agenda de recebimento")}&body=${encodeURIComponent(mensagem)}`;
};
const formatDateBR = (value: string | null | undefined) => {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

export function RecebimentoDashboard({ perfil: _perfil }: Props) {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [itensPorAgendamento, setItensPorAgendamento] = useState<Record<string, DashboardItem[]>>({});
  const [fotosPorOcorrencia, setFotosPorOcorrencia] = useState<Record<string, OcorrenciaFoto[]>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    data: todayISO(),
    dataFim: todayISO(),
    status: "",
    modalidade: "",
    transportadora: "",
    secao: "",
    empresa: "",
  });
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const carregarDashboard = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await db()
      .from("vw_recebimento_dashboard")
      .select("*")
      .eq("data_agenda", filtros.data)
      .order("status_recebimento_calculado", { ascending: true })
      .order("transportadora", { ascending: true })
      .order("nro_carga", { ascending: true });

    if (error) {
      console.error("Erro ao carregar dashboard de recebimento:", error);
      setErro("Erro ao carregar dados de recebimento.");
      setRows([]);
      setItensPorAgendamento({});
      setLoading(false);
      return;
    }

    const dashboardRows = (data ?? []) as DashboardRow[];
    setRows(dashboardRows);
    const ids = dashboardRows.map((row) => row.agendamento_id).filter(Boolean);
    if (ids.length === 0) {
      setItensPorAgendamento({});
      setLoading(false);
      return;
    }

    const { data: itens, error: itensError } = await db()
      .from("agendamento_itens")
      .select("id,agendamento_id,codigo_produto,descricao_produto,secao,modalidade_original,modalidade_compra,norma,palete,gerada,conferida,recebida,valor,ruptura")
      .in("agendamento_id", ids)
      .order("codigo_produto", { ascending: true });

    if (itensError) {
      console.error("Erro ao carregar itens do recebimento:", itensError);
      setItensPorAgendamento({});
    } else {
      const grouped: Record<string, DashboardItem[]> = {};
      for (const item of (itens ?? []) as DashboardItem[]) {
        if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
        grouped[item.agendamento_id].push(item);
      }
      setItensPorAgendamento(grouped);
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregarDashboard();
  }, [filtros.data]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (filtros.status && r.status_recebimento_calculado !== filtros.status) return false;
      if (filtros.modalidade && r.modalidade_calculada !== filtros.modalidade) return false;
      if (filtros.transportadora && !(r.transportadora ?? "").toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      if (filtros.empresa && r.empresa !== filtros.empresa) return false;
      if (filtros.secao && !(r.secoes ?? "").toLowerCase().includes(filtros.secao.toLowerCase())) return false;
      return true;
    });
  }, [rows, filtros]);

  const metrics = useMemo(() => {
    const cargas = sumRows(rowsFiltradas, "qtd_cargas");
    const finalizadas = sumRows(rowsFiltradas, "ind_finalizada");
    const emConferencia = sumRows(rowsFiltradas, "ind_em_conferencia");
    const noShow = sumRows(rowsFiltradas, "ind_no_show");
    const recusadas = sumRows(rowsFiltradas, "ind_recusada");
    const totalPaletes = sumRows(rowsFiltradas, "total_paletes");
    const totalCaixas = sumRows(rowsFiltradas, "total_caixas");
    const valorTotal = sumRows(rowsFiltradas, "valor_total");
    const rupturaTotal = sumRows(rowsFiltradas, "ruptura_total");
    const ocorrenciasAbertas = sumRows(rowsFiltradas, "ocorrencias_abertas");
    const totalConferido = sumRows(rowsFiltradas, "total_conferido");
    const percConf = totalCaixas > 0 ? totalConferido / totalCaixas : 0;
    return [
      ["Cargas do dia", String(cargas)],
      ["Finalizadas", String(finalizadas)],
      ["Em conferência", String(emConferencia)],
      ["No Show", String(noShow)],
      ["Recusadas", String(recusadas)],
      ["Total de paletes", totalPaletes.toLocaleString("pt-BR")],
      ["Total de caixas", totalCaixas.toLocaleString("pt-BR")],
      ["Valor total", formatCurrency(valorTotal)],
      ["Ruptura total", rupturaTotal.toLocaleString("pt-BR")],
      ["Ocorrências abertas", String(ocorrenciasAbertas)],
      ["% Conferência", percent(percConf)],
    ];
  }, [rowsFiltradas]);

  const toggle = (key: string) => setAbertos((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectStyle = inputStyle;
  const formatNumber = (value: number | string | null | undefined, decimals = 0) =>
    toNumber(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");
  const statusColor = (status: string) =>
    status === "Finalizada" || status === "Em conferência" ? theme.colors.neonGreen : theme.colors.neonOrange;
  const indicador = (row: DashboardRow, field: keyof DashboardRow) => formatNumber(row[field] as any);
  const summary = (sourceRows: DashboardRow[]) => ({
    qtd_cargas: sumRows(sourceRows, "qtd_cargas"),
    total_itens: sumRows(sourceRows, "total_itens"),
    itens_cross: sumRows(sourceRows, "itens_cross"),
    itens_armaz: sumRows(sourceRows, "itens_armaz"),
    total_paletes: sumRows(sourceRows, "total_paletes"),
    perc_palete: sumRows(sourceRows, "perc_palete"),
    total_caixas: sumRows(sourceRows, "total_caixas"),
    total_conferido: sumRows(sourceRows, "total_conferido"),
    perc_conferencia:
      sumRows(sourceRows, "total_caixas") > 0 ? sumRows(sourceRows, "total_conferido") / sumRows(sourceRows, "total_caixas") : 0,
    valor_total: sumRows(sourceRows, "valor_total"),
    ruptura_total: sumRows(sourceRows, "ruptura_total"),
    perc_carga: sumRows(sourceRows, "perc_carga"),
    ind_finalizada: sumRows(sourceRows, "ind_finalizada"),
    ind_em_conferencia: sumRows(sourceRows, "ind_em_conferencia"),
    ind_retirar_termo: sumRows(sourceRows, "ind_retirar_termo"),
    ind_no_show: sumRows(sourceRows, "ind_no_show"),
    ind_recusada: sumRows(sourceRows, "ind_recusada"),
    ind_reentrega: sumRows(sourceRows, "ind_reentrega"),
    ind_sem_agenda: sumRows(sourceRows, "ind_sem_agenda"),
    ind_inconsistencia_agenda: sumRows(sourceRows, "ind_inconsistencia_agenda"),
    ind_pendente: sumRows(sourceRows, "ind_pendente"),
    ind_abandono: sumRows(sourceRows, "ind_abandono"),
  });
  const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const exportarCsv = () => {
    const header = [
      "Status",
      "Transportadora",
      "Fornecedor",
      "Nro Carga",
      "Hora chegada",
      "Estivada",
      "Repaletizada",
      "Paletizada",
      "Itens",
      "Itens Cross",
      "Itens Armaz",
      "Paletes",
      "% Palete",
      "Caixas",
      "Conferencia",
      "% Conferencia",
      "Valor",
      "Ruptura",
      "Cargas",
      "%",
      "Finalizada",
      "Em conferencia",
      "Retirar Termo",
      "No Show",
      "Recusada",
      "Reentrega",
      "Sem agenda",
      "Inconsistencia agenda",
      "Pendente",
      "Abandono",
    ];
    const lines = rowsFiltradas.map((row) =>
      [
        row.status_recebimento_calculado,
        row.transportadora,
        row.fornecedor_nome,
        row.nro_carga,
        formatTime(row.hora_chegada ?? row.horario),
        row.estivada,
        row.repaletizada,
        row.paletizada,
        row.total_itens,
        row.itens_cross,
        row.itens_armaz,
        row.total_paletes,
        percent(toNumber(row.perc_palete)),
        row.total_caixas,
        row.total_conferido,
        percent(toNumber(row.perc_conferencia)),
        toNumber(row.valor_total).toFixed(2),
        row.ruptura_total,
        row.qtd_cargas,
        percent(toNumber(row.perc_carga)),
        row.ind_finalizada,
        row.ind_em_conferencia,
        row.ind_retirar_termo,
        row.ind_no_show,
        row.ind_recusada,
        row.ind_reentrega,
        row.ind_sem_agenda,
        row.ind_inconsistencia_agenda,
        row.ind_pendente,
        row.ind_abandono,
      ].map(csvEscape).join(";")
    );
    const blob = new Blob([[header.map(csvEscape).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `recebimento-dashboard-${filtros.data}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const thStyle: React.CSSProperties = { padding: 9, whiteSpace: "nowrap", borderBottom: `1px solid ${theme.colors.borderSoft}` };
  const tdStyle: React.CSSProperties = { padding: 8, whiteSpace: "nowrap", borderTop: `1px solid ${theme.colors.borderSoft}` };
  const firstColStyle: React.CSSProperties = {
    ...tdStyle,
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 340,
    maxWidth: 440,
    whiteSpace: "normal",
    background: "inherit",
    boxShadow: `1px 0 0 ${theme.colors.borderSoft}`,
  };
  const firstHeaderStyle: React.CSSProperties = {
    ...thStyle,
    position: "sticky",
    left: 0,
    zIndex: 3,
    minWidth: 340,
    background: "#020617",
    boxShadow: `1px 0 0 ${theme.colors.borderSoft}`,
  };
  const operationalCols = 28;
  const columns = [
    "Agendamento / Transportadora",
    "Hora chegada",
    "Estivada",
    "Repaletizada",
    "Paletizada",
    "Nro Carga",
    "Itens",
    "Itens Cross",
    "Itens Armaz",
    "Paletes",
    "% Palete",
    "Caixas",
    "Conferência",
    "% Conferência",
    "Valor",
    "Ruptura",
    "Cargas",
    "%",
    "Finalizada",
    "Em conferência",
    "Retirar Termo",
    "No Show",
    "Recusada",
    "Reentrega",
    "Sem agenda",
    "Inconsistência",
    "Pendente",
    "Abandono",
  ];

  const renderSummaryCells = (s: ReturnType<typeof summary>) => (
    <>
      <td style={tdStyle}>-</td>
      <td style={tdStyle}>-</td>
      <td style={tdStyle}>-</td>
      <td style={tdStyle}>-</td>
      <td style={tdStyle}>-</td>
      <td style={tdStyle}>{formatNumber(s.total_itens)}</td>
      <td style={tdStyle}>{formatNumber(s.itens_cross)}</td>
      <td style={tdStyle}>{formatNumber(s.itens_armaz)}</td>
      <td style={tdStyle}>{formatNumber(s.total_paletes)}</td>
      <td style={tdStyle}>{percent(s.perc_palete)}</td>
      <td style={tdStyle}>{formatNumber(s.total_caixas)}</td>
      <td style={tdStyle}>{formatNumber(s.total_conferido)}</td>
      <td style={tdStyle}>{percent(s.perc_conferencia)}</td>
      <td style={tdStyle}>{formatCurrency(s.valor_total)}</td>
      <td style={tdStyle}>{formatNumber(s.ruptura_total)}</td>
      <td style={tdStyle}>{formatNumber(s.qtd_cargas)}</td>
      <td style={tdStyle}>{percent(s.perc_carga)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_finalizada)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_em_conferencia)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_retirar_termo)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_no_show)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_recusada)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_reentrega)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_sem_agenda)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_inconsistencia_agenda)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_pendente)}</td>
      <td style={tdStyle}>{formatNumber(s.ind_abandono)}</td>
    </>
  );

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Dashboard Recebimento</h1>
          <p style={descStyle}>
            Painel operacional com status calculado, modalidades, totais e tabela expansível por status, transportadora e carga.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={buttonSecondaryStyle} onClick={() => void carregarDashboard()} disabled={loading}>
            Reprocessar indicadores
          </button>
          <button type="button" style={buttonPrimaryStyle} onClick={exportarCsv} disabled={loading || rowsFiltradas.length === 0}>
            Exportar CSV
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <input type="date" style={inputStyle} value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
        <select style={selectStyle} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Todos os status</option>
          {uniqueValues(rows, "status_recebimento_calculado").map((v) => <option key={v}>{v}</option>)}
        </select>
        <select style={selectStyle} value={filtros.modalidade} onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}>
          <option value="">Todas modalidades</option>
          {uniqueValues(rows, "modalidade_calculada").map((v) => <option key={v}>{v}</option>)}
        </select>
        <input
          style={inputStyle}
          placeholder="Transportadora"
          value={filtros.transportadora}
          onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })}
        />
        <input style={inputStyle} placeholder="Seção" value={filtros.secao} onChange={(e) => setFiltros({ ...filtros, secao: e.target.value })} />
        <select style={selectStyle} value={filtros.empresa} onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}>
          <option value="">Todos CD/empresa</option>
          {uniqueValues(rows, "empresa").map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      {loading && <div style={{ color: theme.colors.textMuted }}>Carregando recebimento...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(150px, 1fr))", gap: 12 }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ ...cardStyle, minWidth: 0 }}>
            <div style={metricLabelStyle}>{label}</div>
            <div style={{ ...metricValueStyle, fontSize: label === "Valor total" ? 20 : 24, overflowWrap: "anywhere" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", minWidth: 3400, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left", background: "#020617" }}>
              {columns.map((col, index) => <th key={col} style={index === 0 ? firstHeaderStyle : thStyle}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {groupBy(rowsFiltradas, (r) => r.status_recebimento_calculado ?? "Sem status").map(([status, statusRows]) => {
              const statusKey = `s:${status}`;
              const openStatus = !!abertos[statusKey];
              return (
                <React.Fragment key={statusKey}>
                  <tr style={{ background: "#000", color: statusColor(status), fontWeight: 900, fontSize: 13, cursor: "pointer" }} onClick={() => toggle(statusKey)}>
                    <td style={firstColStyle}>{openStatus ? "-" : "+"} {status}</td>
                    {renderSummaryCells(summary(statusRows))}
                  </tr>
                  {openStatus && groupBy(statusRows, (r) => `${r.transportadora ?? "-"} / ${r.fornecedor_nome ?? "Fornecedor não informado"}`).map(([transp, transpRows]) => {
                    const transpKey = `${statusKey}|t:${transp}`;
                    const openTransp = !!abertos[transpKey];
                    return (
                      <React.Fragment key={transpKey}>
                        <tr style={{ background: "rgba(15,23,42,0.98)", color: theme.colors.neonGreen, fontWeight: 700, cursor: "pointer" }} onClick={() => toggle(transpKey)}>
                          <td style={{ ...firstColStyle, paddingLeft: 28 }}>{openTransp ? "-" : "+"} {transp}</td>
                          {renderSummaryCells(summary(transpRows))}
                        </tr>
                        {openTransp && groupBy(transpRows, cargaDisplayKey).map(([displayKey, cargaRows]) => {
                          const row = cargaRows[0];
                          const cargaKey = `${transpKey}|c:${displayKey}`;
                          const openCarga = !!abertos[cargaKey];
                          const itens = cargaRows.flatMap((carga) => itensPorAgendamento[carga.agendamento_id] ?? []);
                          return (
                            <React.Fragment key={cargaKey}>
                              <tr style={{ background: "rgba(30,41,59,0.72)", cursor: "pointer" }} onClick={() => toggle(cargaKey)}>
                                <td style={{ ...firstColStyle, paddingLeft: 48 }}>{openCarga ? "-" : "+"} Box {row.nro_box ?? "-"} / {row.fornecedor_nome ?? "-"}</td>
                                <td style={tdStyle}>{formatTime(row.hora_chegada ?? row.horario)}</td>
                                <td style={tdStyle}>{formatNumber(row.estivada)}</td>
                                <td style={tdStyle}>{formatNumber(row.repaletizada)}</td>
                                <td style={tdStyle}>{formatNumber(row.paletizada)}</td>
                                <td style={tdStyle}>{row.nro_carga ?? "-"}</td>
                                <td style={tdStyle}>{formatNumber(row.total_itens)}</td>
                                <td style={tdStyle}>{formatNumber(row.itens_cross)}</td>
                                <td style={tdStyle}>{formatNumber(row.itens_armaz)}</td>
                                <td style={tdStyle}>{formatNumber(row.total_paletes)}</td>
                                <td style={tdStyle}>{percent(toNumber(row.perc_palete))}</td>
                                <td style={tdStyle}>{formatNumber(row.total_caixas)}</td>
                                <td style={tdStyle}>{formatNumber(row.total_conferido)}</td>
                                <td style={tdStyle}>{percent(toNumber(row.perc_conferencia))}</td>
                                <td style={tdStyle}>{formatCurrency(toNumber(row.valor_total))}</td>
                                <td style={tdStyle}>{formatNumber(row.ruptura_total)}</td>
                                <td style={tdStyle}>{formatNumber(row.qtd_cargas)}</td>
                                <td style={tdStyle}>{percent(toNumber(row.perc_carga))}</td>
                                <td style={tdStyle}>{indicador(row, "ind_finalizada")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_em_conferencia")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_retirar_termo")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_no_show")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_recusada")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_reentrega")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_sem_agenda")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_inconsistencia_agenda")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_pendente")}</td>
                                <td style={tdStyle}>{indicador(row, "ind_abandono")}</td>
                              </tr>
                              {openCarga && (
                                <tr>
                                  <td colSpan={operationalCols} style={{ padding: "10px 10px 14px 72px", background: "rgba(2,6,23,0.72)" }}>
                                    <div style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
                                      Modalidade: {row.modalidade_calculada ?? "-"} | Finalização: {row.status_finalizada ?? "-"}
                                    </div>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                      <thead>
                                        <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                                          {["Código produto", "Descrição produto", "Seção", "Modalidade original", "Modalidade compra", "Norma", "Palete", "Gerada", "Conferida", "Recebida", "Valor", "Ruptura"].map((col) => (
                                            <th key={col} style={{ padding: 7, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {itens.map((item) => (
                                          <tr key={item.id}>
                                            <td style={{ padding: 7 }}>{item.codigo_produto ?? "-"}</td>
                                            <td style={{ padding: 7 }}>{item.descricao_produto ?? "-"}</td>
                                            <td style={{ padding: 7 }}>{item.secao ?? "-"}</td>
                                            <td style={{ padding: 7 }}>{item.modalidade_original ?? "-"}</td>
                                            <td style={{ padding: 7 }}>{item.modalidade_compra ?? "-"}</td>
                                            <td style={{ padding: 7 }}>{item.norma ?? "-"}</td>
                                            <td style={{ padding: 7 }}>{formatNumber(item.palete)}</td>
                                            <td style={{ padding: 7 }}>{formatNumber(item.gerada)}</td>
                                            <td style={{ padding: 7 }}>{formatNumber(item.conferida)}</td>
                                            <td style={{ padding: 7 }}>{formatNumber(item.recebida)}</td>
                                            <td style={{ padding: 7 }}>{formatCurrency(toNumber(item.valor))}</td>
                                            <td style={{ padding: 7 }}>{formatNumber(item.ruptura)}</td>
                                          </tr>
                                        ))}
                                        {itens.length === 0 && (
                                          <tr>
                                            <td colSpan={12} style={{ padding: 10, color: theme.colors.textMuted }}>Nenhum item encontrado para esta carga.</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {rowsFiltradas.length > 0 && (
              <tr style={{ background: "#020617", color: theme.colors.neonOrange, fontWeight: 900, fontSize: 13 }}>
                <td style={firstColStyle}>Total Geral</td>
                {renderSummaryCells(summary(rowsFiltradas))}
              </tr>
            )}
            {rowsFiltradas.length === 0 && !loading && (
              <tr>
                <td colSpan={operationalCols} style={{ padding: 14, color: theme.colors.textMuted }}>Nenhum dado encontrado para os filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecebimentoDashboardOld({ perfil: _perfil }: Props) {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    data: todayISO(),
    status: "",
    modalidade: "",
    transportadora: "",
    secao: "",
    empresa: "",
  });
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setErro(null);
      const { data, error } = await db()
        .from("vw_recebimento_dashboard")
        .select("*")
        .eq("data_agenda", filtros.data)
        .order("status_recebimento_calculado", { ascending: true })
        .order("transportadora", { ascending: true })
        .order("nro_carga", { ascending: true });

      if (error) {
        console.error("Erro ao carregar dashboard de recebimento:", error);
        setErro("Erro ao carregar dados de recebimento.");
        setRows([]);
      } else {
        setRows((data ?? []) as DashboardRow[]);
      }
      setLoading(false);
    };
    void carregar();
  }, [filtros.data]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (filtros.status && r.status_recebimento_calculado !== filtros.status) return false;
      if (filtros.modalidade && r.modalidade_calculada !== filtros.modalidade) return false;
      if (filtros.transportadora && r.transportadora !== filtros.transportadora) return false;
      if (filtros.empresa && r.empresa !== filtros.empresa) return false;
      if (filtros.secao && !(r.secoes ?? "").toLowerCase().includes(filtros.secao.toLowerCase())) return false;
      return true;
    });
  }, [rows, filtros]);

  const metrics = useMemo(() => {
    const cargas = rowsFiltradas.length;
    const finalizadas = rowsFiltradas.filter((r) => r.status_recebimento_calculado === "Finalizada").length;
    const emConferencia = rowsFiltradas.filter((r) => r.status_recebimento_calculado === "Em conferência").length;
    const noShow = rowsFiltradas.filter((r) => r.status_recebimento_calculado === "No Show").length;
    const recusadas = rowsFiltradas.filter((r) => r.status_recebimento_calculado === "Recusada").length;
    const totalPaletes = sumRows(rowsFiltradas, "total_paletes");
    const totalCaixas = sumRows(rowsFiltradas, "total_caixas");
    const valorTotal = sumRows(rowsFiltradas, "valor_total");
    const totalConferido = sumRows(rowsFiltradas, "total_conferido");
    const percConf = totalCaixas > 0 ? totalConferido / totalCaixas : 0;
    return [
      ["Cargas do dia", String(cargas)],
      ["Finalizadas", String(finalizadas)],
      ["Em conferencia", String(emConferencia)],
      ["No Show", String(noShow)],
      ["Recusadas", String(recusadas)],
      ["Total de paletes", totalPaletes.toLocaleString("pt-BR")],
      ["Total de caixas", totalCaixas.toLocaleString("pt-BR")],
      ["Valor total", formatCurrency(valorTotal)],
      ["% Conferencia", percent(percConf)],
    ];
  }, [rowsFiltradas]);

  const toggle = (key: string) => setAbertos((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectStyle = inputStyle;

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Dashboard Recebimento</h1>
          <p style={descStyle}>
            Painel operacional com status calculado, modalidades, totais e tabela expansivel por status, fornecedor e carga.
          </p>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <input type="date" style={inputStyle} value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
        <select style={selectStyle} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Todos os status</option>
          {uniqueValues(rows, "status_recebimento_calculado").map((v) => <option key={v}>{v}</option>)}
        </select>
        <select style={selectStyle} value={filtros.modalidade} onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}>
          <option value="">Todas modalidades</option>
          {uniqueValues(rows, "modalidade_calculada").map((v) => <option key={v}>{v}</option>)}
        </select>
        <select style={selectStyle} value={filtros.transportadora} onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })}>
          <option value="">Todas transportadoras</option>
          {uniqueValues(rows, "transportadora").map((v) => <option key={v}>{v}</option>)}
        </select>
        <input style={inputStyle} placeholder="Secao" value={filtros.secao} onChange={(e) => setFiltros({ ...filtros, secao: e.target.value })} />
        <select style={selectStyle} value={filtros.empresa} onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}>
          <option value="">Todos CD/empresa</option>
          {uniqueValues(rows, "empresa").map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      {loading && <div style={{ color: theme.colors.textMuted }}>Carregando recebimento...</div>}

      <div style={gridStyle}>
        {metrics.map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <div style={metricLabelStyle}>{label}</div>
            <div style={metricValueStyle}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left", background: "#020617" }}>
              <th style={{ padding: 10 }}>Grupo</th>
              <th style={{ padding: 10 }}>Cargas</th>
              <th style={{ padding: 10 }}>Itens</th>
              <th style={{ padding: 10 }}>Paletes</th>
              <th style={{ padding: 10 }}>Caixas</th>
              <th style={{ padding: 10 }}>Conferido</th>
              <th style={{ padding: 10 }}>Valor</th>
              <th style={{ padding: 10 }}>% Conf.</th>
              <th style={{ padding: 10 }}>Finalizacao</th>
            </tr>
          </thead>
          <tbody>
            {groupBy(rowsFiltradas, (r) => r.status_recebimento_calculado ?? "Sem status").map(([status, statusRows]) => {
              const statusKey = `s:${status}`;
              const openStatus = !!abertos[statusKey];
              return (
                <React.Fragment key={statusKey}>
                  <tr style={{ background: "#000", color: theme.colors.neonOrange, fontWeight: 800, cursor: "pointer" }} onClick={() => toggle(statusKey)}>
                    <td style={{ padding: 10 }}>{openStatus ? "-" : "+"} {status}</td>
                    <td style={{ padding: 10 }}>{statusRows.length}</td>
                    <td style={{ padding: 10 }}>{sumRows(statusRows, "total_itens")}</td>
                    <td style={{ padding: 10 }}>{sumRows(statusRows, "total_paletes")}</td>
                    <td style={{ padding: 10 }}>{sumRows(statusRows, "total_caixas")}</td>
                    <td style={{ padding: 10 }}>{sumRows(statusRows, "total_conferido")}</td>
                    <td style={{ padding: 10 }}>{formatCurrency(sumRows(statusRows, "valor_total"))}</td>
                    <td style={{ padding: 10 }}>{percent(sumRows(statusRows, "total_caixas") > 0 ? sumRows(statusRows, "total_conferido") / sumRows(statusRows, "total_caixas") : 0)}</td>
                    <td style={{ padding: 10 }}>-</td>
                  </tr>
                  {openStatus && groupBy(statusRows, (r) => `${r.transportadora ?? "-"} / ${r.fornecedor_nome ?? "Fornecedor nao informado"}`).map(([transp, transpRows]) => {
                    const transpKey = `${statusKey}|t:${transp}`;
                    const openTransp = !!abertos[transpKey];
                    return (
                      <React.Fragment key={transpKey}>
                        <tr style={{ background: "rgba(15,23,42,0.98)", color: theme.colors.neonGreen, fontWeight: 700, cursor: "pointer" }} onClick={() => toggle(transpKey)}>
                          <td style={{ padding: "9px 10px 9px 28px" }}>{openTransp ? "-" : "+"} {transp}</td>
                          <td style={{ padding: 9 }}>{transpRows.length}</td>
                          <td style={{ padding: 9 }}>{sumRows(transpRows, "total_itens")}</td>
                          <td style={{ padding: 9 }}>{sumRows(transpRows, "total_paletes")}</td>
                          <td style={{ padding: 9 }}>{sumRows(transpRows, "total_caixas")}</td>
                          <td style={{ padding: 9 }}>{sumRows(transpRows, "total_conferido")}</td>
                          <td style={{ padding: 9 }}>{formatCurrency(sumRows(transpRows, "valor_total"))}</td>
                          <td style={{ padding: 9 }}>{percent(sumRows(transpRows, "total_caixas") > 0 ? sumRows(transpRows, "total_conferido") / sumRows(transpRows, "total_caixas") : 0)}</td>
                          <td style={{ padding: 9 }}>-</td>
                        </tr>
                        {openTransp && transpRows.map((row) => {
                          const cargaKey = `${transpKey}|c:${row.agendamento_id}`;
                          const openCarga = !!abertos[cargaKey];
                          return (
                            <React.Fragment key={cargaKey}>
                              <tr style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, cursor: "pointer" }} onClick={() => toggle(cargaKey)}>
                                <td style={{ padding: "8px 10px 8px 48px" }}>{openCarga ? "-" : "+"} Carga {row.nro_carga ?? "-"} - Box {row.nro_box ?? "-"}</td>
                                <td style={{ padding: 8 }}>1</td>
                                <td style={{ padding: 8 }}>{row.total_itens}</td>
                                <td style={{ padding: 8 }}>{toNumber(row.total_paletes)}</td>
                                <td style={{ padding: 8 }}>{toNumber(row.total_caixas)}</td>
                                <td style={{ padding: 8 }}>{toNumber(row.total_conferido)}</td>
                                <td style={{ padding: 8 }}>{formatCurrency(toNumber(row.valor_total))}</td>
                                <td style={{ padding: 8 }}>{percent(toNumber(row.perc_conferencia))}</td>
                                <td style={{ padding: 8 }}>{row.status_finalizada ?? "-"}</td>
                              </tr>
                              {openCarga && (
                                <tr>
                                  <td colSpan={9} style={{ padding: "8px 10px 12px 72px", color: theme.colors.textMuted, background: "rgba(2,6,23,0.72)" }}>
                                    Modalidade: {row.modalidade_calculada ?? "-"} | Cross: {row.itens_cross} | Armazenagem: {row.itens_armaz} | Ruptura: {toNumber(row.ruptura_total)}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {rowsFiltradas.length === 0 && !loading && (
              <tr>
                <td colSpan={9} style={{ padding: 14, color: theme.colors.textMuted }}>Nenhum dado encontrado para os filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RecebimentoConfirmacaoAgenda({ perfil }: Props) {
  const [rows, setRows] = useState<GestaoAgendaRow[]>([]);
  const [selecionada, setSelecionada] = useState<GestaoAgendaRow | null>(null);
  const [fornecedorContatos, setFornecedorContatos] = useState<FornecedorContato[]>([]);
  const [transportadoraContatos, setTransportadoraContatos] = useState<TransportadoraContato[]>([]);
  const [historico, setHistorico] = useState<ConfirmacaoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    data: todayISO(),
    dataFim: todayISO(),
    status: "",
    fornecedor: "",
    transportadora: "",
    unidade: "",
    possuiNota: "",
  });
  const [registro, setRegistro] = useState({ canal: "WhatsApp", contato_nome: "", contato_tipo: "", resultado: "Confirmado", observacao: "" });

  const formatNumber = (value: number | string | null | undefined) => toNumber(value).toLocaleString("pt-BR");
  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await db()
      .from("gestao_agenda")
      .select("*, fornecedores:fornecedor_id(whatsapp,email), transportadoras:transportadora_id(whatsapp,email)")
      .gte("data_agenda", filtros.data)
      .lte("data_agenda", filtros.dataFim || filtros.data)
      .order("data_agenda", { ascending: true })
      .order("horario", { ascending: true });
    if (error) {
      console.error("Erro ao carregar confirmação de agenda:", error);
      setErro("Erro ao carregar confirmação de agenda.");
      setRows([]);
    } else {
      setRows(
        (data ?? []).map((row: any) => ({
          ...row,
          fornecedor_whatsapp: row.fornecedores?.whatsapp ?? null,
          fornecedor_email: row.fornecedores?.email ?? null,
          transportadora_whatsapp: row.transportadoras?.whatsapp ?? null,
          transportadora_email: row.transportadoras?.email ?? null,
        })) as GestaoAgendaRow[]
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, [filtros.data, filtros.dataFim]);

  const aplicarPeriodo = (tipo: "amanha" | "48h" | "7d") => {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() + 1);
    const fim = new Date(inicio);
    if (tipo === "48h") fim.setDate(inicio.getDate() + 1);
    if (tipo === "7d") fim.setDate(inicio.getDate() + 6);
    setFiltros((prev) => ({ ...prev, data: inicio.toISOString().slice(0, 10), dataFim: fim.toISOString().slice(0, 10) }));
  };

  const rowsFiltradas = useMemo(() => {
    return rows.filter((row) => {
      if (filtros.status && row.status_confirmacao !== filtros.status) return false;
      if (filtros.fornecedor && !(row.fornecedor_nome ?? "").toLowerCase().includes(filtros.fornecedor.toLowerCase())) return false;
      if (filtros.transportadora && !(row.transportadora_nome ?? "").toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      if (filtros.unidade && row.unidade_negocios !== filtros.unidade) return false;
      if (filtros.possuiNota === "sim" && !row.possui_nota) return false;
      if (filtros.possuiNota === "nao" && row.possui_nota) return false;
      return true;
    });
  }, [rows, filtros]);

  const resumo = useMemo(() => {
    const byStatus = (status: string) => rowsFiltradas.filter((row) => row.status_confirmacao === status).length;
    return [
      ["Agendas a confirmar", String(rowsFiltradas.length)],
      ["Confirmadas", String(byStatus("Confirmado"))],
      ["Não confirmadas", String(byStatus("Não confirmado"))],
      ["Sem contato", String(byStatus("Sem contato"))],
      ["Reagendar", String(byStatus("Reagendar"))],
      ["Canceladas", String(byStatus("Cancelado"))],
      ["Com nota", String(rowsFiltradas.filter((row) => row.possui_nota).length)],
      ["Sem nota", String(rowsFiltradas.filter((row) => !row.possui_nota).length)],
    ];
  }, [rowsFiltradas]);

  const mensagemConfirmacaoAgenda = (row: GestaoAgendaRow, destino: "fornecedor" | "transportadora") =>
    [
      "Olá, tudo bem?",
      "",
      "Estamos confirmando a agenda de recebimento abaixo:",
      `Código da agenda: ${row.codigo_agenda ?? "-"}`,
      `Fornecedor: ${row.fornecedor_nome ?? "-"}`,
      `Transportadora: ${row.transportadora_nome ?? "-"}`,
      `CD/Unidade: ${row.unidade_negocios ?? row.deposito ?? "-"}`,
      `Data: ${formatDateBR(row.data_agenda)}`,
      `Horário agendado: ${formatTime(row.horario)}`,
      "Apresentação: favor se apresentar até as 10:00 da manhã ou dará No Show.",
      `Notas fiscais: ${row.notas_fiscais || "sem nota informada"}`,
      `Tipo de carga: ${row.tipo_carga || "-"}`,
      `Tipo de volume: ${row.tipo_volume || "-"}`,
      `Volumes: ${formatNumber(row.volumes)}`,
      `SKU: ${formatNumber(row.sku)}`,
      "",
      destino === "transportadora"
        ? "Pode confirmar se o veículo seguirá para entrega nessa data e horário?"
        : "Pode confirmar se a entrega será realizada e se as notas fiscais estão emitidas?",
    ].join("\n");
  const mensagemFornecedor = (row: GestaoAgendaRow) => mensagemConfirmacaoAgenda(row, "fornecedor");
  const mensagemTransportadora = (row: GestaoAgendaRow) => mensagemConfirmacaoAgenda(row, "transportadora");

  const abrirDetalhe = async (row: GestaoAgendaRow) => {
    setSelecionada(row);
    setRegistro({ canal: "WhatsApp", contato_nome: "", contato_tipo: "", resultado: "Confirmado", observacao: "" });
    const [fc, tc, hist] = await Promise.all([
      row.fornecedor_id
        ? db().from("fornecedor_contatos").select("*").eq("fornecedor_id", row.fornecedor_id).eq("ativo", true).order("principal", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      row.transportadora_id
        ? db().from("transportadora_contatos").select("*").eq("transportadora_id", row.transportadora_id).eq("ativo", true).order("principal", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      db().from("confirmacao_agenda_historico").select("*").eq("gestao_agenda_id", row.id).order("created_at", { ascending: false }),
    ]);
    setFornecedorContatos((fc.data ?? []) as FornecedorContato[]);
    setTransportadoraContatos((tc.data ?? []) as TransportadoraContato[]);
    setHistorico((hist.data ?? []) as ConfirmacaoHistorico[]);
  };

  const atualizarConfirmacao = async (row: GestaoAgendaRow, status: string, observacao = "", canal = "Outro", contatoNome = "", contatoTipo = "") => {
    setErro(null);
    const { error } = await db()
      .from("gestao_agenda")
      .update({
        status_confirmacao: status,
        observacao: observacao || row.observacao,
        confirmado_em: new Date().toISOString(),
        confirmado_por: perfil.id,
      })
      .eq("id", row.id);
    if (error) {
      console.error("Erro ao atualizar confirmação:", error);
      setErro("Erro ao atualizar confirmação.");
      return;
    }
    await db().from("confirmacao_agenda_historico").insert({
      gestao_agenda_id: row.id,
      usuario_id: perfil.id,
      canal,
      contato_nome: contatoNome || null,
      contato_tipo: contatoTipo || null,
      resultado: status,
      observacao: observacao || null,
    });
    await carregar();
    if (selecionada?.id === row.id) await abrirDetalhe({ ...row, status_confirmacao: status, observacao });
  };

  const salvarHistorico = async () => {
    if (!selecionada) return;
    await atualizarConfirmacao(selecionada, registro.resultado, registro.observacao, registro.canal, registro.contato_nome, registro.contato_tipo);
    await abrirDetalhe(selecionada);
  };

  const contactLinks = (row: GestaoAgendaRow) => ({
    fornecedorWa: whatsappHref(row.fornecedor_whatsapp, mensagemFornecedor(row)),
    transportadoraWa: whatsappHref(row.transportadora_whatsapp, mensagemTransportadora(row)),
    fornecedorEmail: mailtoHref(row.fornecedor_email, mensagemFornecedor(row)),
    transportadoraEmail: mailtoHref(row.transportadora_email, mensagemTransportadora(row)),
  });

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Confirmação de Agenda</h1>
          <p style={descStyle}>Gestão preventiva de cargas futuras por fornecedor, transportadora e status de confirmação.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/recebimento/importar-agenda-futura" style={buttonSecondaryStyle}>Importar agenda futura</a>
          <a href="/recebimento/fornecedores" style={buttonSecondaryStyle}>Fornecedores</a>
          <a href="/recebimento/transportadoras" style={buttonSecondaryStyle}>Transportadoras</a>
          <button type="button" style={buttonSecondaryStyle} onClick={() => void carregar()} disabled={loading}>Atualizar</button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <input type="date" style={inputStyle} value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value, dataFim: e.target.value })} />
        <button type="button" style={buttonSecondaryStyle} onClick={() => aplicarPeriodo("amanha")}>Amanhã</button>
        <button type="button" style={buttonSecondaryStyle} onClick={() => aplicarPeriodo("48h")}>Próximas 48h</button>
        <button type="button" style={buttonSecondaryStyle} onClick={() => aplicarPeriodo("7d")}>Próximos 7 dias</button>
        <select style={inputStyle} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Todos status</option>
          {STATUS_CONFIRMACAO.map((status) => <option key={status}>{status}</option>)}
        </select>
        <input style={inputStyle} placeholder="Fornecedor" value={filtros.fornecedor} onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })} />
        <input style={inputStyle} placeholder="Transportadora" value={filtros.transportadora} onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })} />
        <select style={inputStyle} value={filtros.unidade} onChange={(e) => setFiltros({ ...filtros, unidade: e.target.value })}>
          <option value="">Todos CD/unidade</option>
          {Array.from(new Set(rows.map((row) => row.unidade_negocios ?? "").filter(Boolean))).sort((a, b) => a.localeCompare(b)).map((value) => <option key={value}>{value}</option>)}
        </select>
        <select style={inputStyle} value={filtros.possuiNota} onChange={(e) => setFiltros({ ...filtros, possuiNota: e.target.value })}>
          <option value="">Nota: todos</option>
          <option value="sim">Com nota</option>
          <option value="nao">Sem nota</option>
        </select>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      <div style={gridStyle}>
        {resumo.map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <div style={metricLabelStyle}>{label}</div>
            <div style={metricValueStyle}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ ...cardStyle, overflowX: "auto", display: selecionada ? "none" : "block" }}>
          {loading && <div style={{ color: theme.colors.textMuted }}>Carregando...</div>}
          <table style={{ width: "100%", minWidth: 1380, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                {["Código agenda", "Data", "Horário", "Doca", "Fornecedor", "Transportadora", "Notas", "Tipo carga", "Tipo volume", "Volumes", "SKU", "Status confirmação", "Ações"].map((col) => (
                  <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsFiltradas.map((row) => {
                const links = contactLinks(row);
                return (
                  <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => void abrirDetalhe(row)}>
                    <td style={{ padding: 8 }}>{row.codigo_agenda ?? "-"}</td>
                    <td style={{ padding: 8 }}>{formatDateBR(row.data_agenda)}</td>
                    <td style={{ padding: 8 }}>{formatTime(row.horario)}</td>
                    <td style={{ padding: 8 }}>{row.doca ?? "-"}</td>
                    <td style={{ padding: 8 }}>{row.fornecedor_nome ?? "-"}</td>
                    <td style={{ padding: 8 }}>{row.transportadora_nome ?? "-"}</td>
                    <td style={{ padding: 8 }}>{row.notas_fiscais ?? "-"}</td>
                    <td style={{ padding: 8 }}>{row.tipo_carga ?? "-"}</td>
                    <td style={{ padding: 8 }}>{row.tipo_volume ?? "-"}</td>
                    <td style={{ padding: 8 }}>{formatNumber(row.volumes)}</td>
                    <td style={{ padding: 8 }}>{formatNumber(row.sku)}</td>
                    <td style={{ padding: 8, color: row.status_confirmacao === "Confirmado" ? theme.colors.neonGreen : theme.colors.neonOrange }}>{row.status_confirmacao ?? "Pendente"}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                        {["Confirmado", "Não confirmado", "Sem contato", "Reagendar", "Cancelado"].map((status) => (
                          <button key={status} type="button" style={buttonSecondaryStyle} onClick={() => void atualizarConfirmacao(row, status)}>{status}</button>
                        ))}
                        {links.fornecedorWa && <a style={buttonSecondaryStyle} href={links.fornecedorWa} target="_blank" rel="noreferrer">WhatsApp fornecedor</a>}
                        {links.transportadoraWa && <a style={buttonSecondaryStyle} href={links.transportadoraWa} target="_blank" rel="noreferrer">WhatsApp transportadora</a>}
                        <button type="button" style={buttonSecondaryStyle} onClick={() => void copyText(mensagemConfirmacaoAgenda(row, "transportadora"))}>Copiar msg</button>
                        {links.fornecedorEmail && <a style={buttonSecondaryStyle} href={links.fornecedorEmail}>E-mail forn.</a>}
                        {links.transportadoraEmail && <a style={buttonSecondaryStyle} href={links.transportadoraEmail}>E-mail transp.</a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rowsFiltradas.length === 0 && !loading && (
                <tr><td colSpan={13} style={{ padding: 12, color: theme.colors.textMuted }}>Nenhuma carga encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selecionada && (
          <aside style={{ ...cardStyle, overflow: "auto" }}>
            <div style={headerStyle}>
              <div>
                <h2 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 26 }}>Agenda {selecionada.codigo_agenda ?? "-"}</h2>
                <p style={descStyle}>
                  Centro de controle da confirmação | {formatDateBR(selecionada.data_agenda)} às {formatTime(selecionada.horario)}
                </p>
              </div>
              <button type="button" style={buttonSecondaryStyle} onClick={() => setSelecionada(null)}>Voltar para lista</button>
            </div>

            <div style={{ ...cardStyle, marginTop: 14, background: "rgba(2,6,23,0.42)" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Confirmado", "Não confirmado", "Sem contato", "Reagendar", "Cancelado"].map((status) => (
                  <button key={status} type="button" style={status === "Confirmado" ? buttonPrimaryStyle : buttonSecondaryStyle} onClick={() => void atualizarConfirmacao(selecionada, status)}>
                    {status}
                  </button>
                ))}
                <button type="button" style={buttonSecondaryStyle} onClick={() => void copyText(mensagemConfirmacaoAgenda(selecionada, "transportadora"))}>
                  Copiar mensagem
                </button>
                {whatsappHref(selecionada.fornecedor_whatsapp, mensagemFornecedor(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={whatsappHref(selecionada.fornecedor_whatsapp, mensagemFornecedor(selecionada))!} target="_blank" rel="noreferrer">
                    WhatsApp fornecedor
                  </a>
                )}
                {whatsappHref(selecionada.transportadora_whatsapp, mensagemTransportadora(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={whatsappHref(selecionada.transportadora_whatsapp, mensagemTransportadora(selecionada))!} target="_blank" rel="noreferrer">
                    WhatsApp transportadora
                  </a>
                )}
                {mailtoHref(selecionada.fornecedor_email, mensagemFornecedor(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={mailtoHref(selecionada.fornecedor_email, mensagemFornecedor(selecionada))!}>E-mail fornecedor</a>
                )}
                {mailtoHref(selecionada.transportadora_email, mensagemTransportadora(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={mailtoHref(selecionada.transportadora_email, mensagemTransportadora(selecionada))!}>E-mail transportadora</a>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 14 }}>
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 17 }}>Dados do fornecedor</h3>
                <div style={{ display: "grid", gap: 7, color: theme.colors.textSoft, fontSize: 13 }}>
                  <div><strong>Fornecedor:</strong> {selecionada.fornecedor_nome ?? "-"}</div>
                  <div><strong>Notas:</strong> {selecionada.notas_fiscais ?? "-"} ({selecionada.possui_nota ? "com nota" : "sem nota"})</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: theme.colors.text, fontWeight: 800, marginBottom: 8 }}>Representantes / contatos</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[...fornecedorContatos, ...(selecionada.fornecedor_whatsapp || selecionada.fornecedor_email ? [{ id: "fornecedor-base-card", fornecedor_id: selecionada.fornecedor_id ?? "", nome: selecionada.fornecedor_nome ?? "Fornecedor", cargo: null, tipo: "Cadastro", telefone: null, whatsapp: selecionada.fornecedor_whatsapp, email: selecionada.fornecedor_email, principal: true, ativo: true, observacao: null }] : [])].map((contato) => {
                      const wa = whatsappHref(contato.whatsapp || contato.telefone, mensagemFornecedor(selecionada));
                      return (
                        <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                          <div style={{ color: theme.colors.text, fontWeight: 800 }}>{contato.nome}</div>
                          <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{contato.tipo ?? contato.cargo ?? "Contato"} | {contato.whatsapp || contato.telefone || "-"}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {wa ? <a style={buttonSecondaryStyle} href={wa} target="_blank" rel="noreferrer">WhatsApp Web</a> : null}
                            {contato.email ? <a style={buttonSecondaryStyle} href={mailtoHref(contato.email, mensagemFornecedor(selecionada)) ?? "#"}>E-mail</a> : null}
                          </div>
                        </div>
                      );
                    })}
                    {fornecedorContatos.length === 0 && !selecionada.fornecedor_whatsapp && !selecionada.fornecedor_email && (
                      <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Nenhum contato cadastrado para este fornecedor.</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <a href={`/recebimento/fornecedores?fornecedor_id=${encodeURIComponent(selecionada.fornecedor_id ?? "")}&fornecedor_nome=${encodeURIComponent(selecionada.fornecedor_nome ?? "")}`} style={buttonSecondaryStyle}>Cadastrar fornecedor</a>
                  <a href={`/recebimento/fornecedores?fornecedor_id=${encodeURIComponent(selecionada.fornecedor_id ?? "")}&fornecedor_nome=${encodeURIComponent(selecionada.fornecedor_nome ?? "")}&acao=editar`} style={buttonSecondaryStyle}>Editar fornecedor</a>
                  <a href={`/recebimento/transportadoras?fornecedor_id=${encodeURIComponent(selecionada.fornecedor_id ?? "")}&fornecedor_nome=${encodeURIComponent(selecionada.fornecedor_nome ?? "")}&transportadora_id=${encodeURIComponent(selecionada.transportadora_id ?? "")}&transportadora_nome=${encodeURIComponent(selecionada.transportadora_nome ?? "")}&acao=vincular`} style={buttonSecondaryStyle}>Vincular transportadora</a>
                </div>
              </div>
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 17 }}>Dados da agenda</h3>
                <div style={{ display: "grid", gap: 7, color: theme.colors.textSoft, fontSize: 13 }}>
                  <div><strong>Transportadora:</strong> {selecionada.transportadora_nome ?? "-"}</div>
                  <div><strong>CD/Unidade:</strong> {selecionada.unidade_negocios ?? "-"}</div>
                  <div><strong>Depósito:</strong> {selecionada.deposito ?? "-"}</div>
                  <div><strong>Doca:</strong> {selecionada.doca ?? "-"}</div>
                  <div><strong>Data/Horário:</strong> {formatDateBR(selecionada.data_agenda)} às {formatTime(selecionada.horario)}</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: theme.colors.text, fontWeight: 800, marginBottom: 8 }}>Contatos da transportadora</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[...transportadoraContatos, ...(selecionada.transportadora_whatsapp || selecionada.transportadora_email ? [{ id: "transp-base-card", transportadora_id: selecionada.transportadora_id ?? "", nome: selecionada.transportadora_nome ?? "Transportadora", cargo: null, telefone: null, whatsapp: selecionada.transportadora_whatsapp, email: selecionada.transportadora_email, principal: true, ativo: true, observacao: null }] : [])].map((contato) => {
                      const wa = whatsappHref(contato.whatsapp || contato.telefone, mensagemTransportadora(selecionada));
                      return (
                        <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                          <div style={{ color: theme.colors.text, fontWeight: 800 }}>{contato.nome}</div>
                          <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{contato.cargo ?? "Contato"} | {contato.whatsapp || contato.telefone || "-"}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {wa ? <a style={buttonSecondaryStyle} href={wa} target="_blank" rel="noreferrer">WhatsApp Web</a> : null}
                            {contato.email ? <a style={buttonSecondaryStyle} href={mailtoHref(contato.email, mensagemTransportadora(selecionada)) ?? "#"}>E-mail</a> : null}
                          </div>
                        </div>
                      );
                    })}
                    {transportadoraContatos.length === 0 && !selecionada.transportadora_whatsapp && !selecionada.transportadora_email && (
                      <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Nenhum contato cadastrado para esta transportadora.</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <a href={`/recebimento/transportadoras?transportadora_id=${encodeURIComponent(selecionada.transportadora_id ?? "")}&transportadora_nome=${encodeURIComponent(selecionada.transportadora_nome ?? "")}`} style={buttonSecondaryStyle}>Cadastrar transportadora</a>
                  <a href={`/recebimento/transportadoras?transportadora_id=${encodeURIComponent(selecionada.transportadora_id ?? "")}&transportadora_nome=${encodeURIComponent(selecionada.transportadora_nome ?? "")}&acao=editar`} style={buttonSecondaryStyle}>Editar transportadora</a>
                  <a href="/recebimento/transportadoras" style={buttonSecondaryStyle}>Todas transportadoras</a>
                </div>
              </div>
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 17 }}>Carga</h3>
                <div style={{ display: "grid", gap: 7, color: theme.colors.textSoft, fontSize: 13 }}>
                  <div><strong>Tipo de carga:</strong> {selecionada.tipo_carga ?? "-"}</div>
                  <div><strong>Tipo de volume:</strong> {selecionada.tipo_volume ?? "-"}</div>
                  <div><strong>Volumes:</strong> {formatNumber(selecionada.volumes)}</div>
                  <div><strong>SKU:</strong> {formatNumber(selecionada.sku)}</div>
                  <div><strong>Status confirmação:</strong> {selecionada.status_confirmacao ?? "Pendente"}</div>
                  <div><strong>Observação:</strong> {selecionada.observacao ?? "-"}</div>
                </div>
              </div>
            </div>

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Mensagem de confirmação</h3>
            <textarea
              readOnly
              style={{ ...inputStyle, minHeight: 230, fontSize: 13, lineHeight: 1.45 }}
              value={mensagemConfirmacaoAgenda(selecionada, "transportadora")}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" style={buttonPrimaryStyle} onClick={() => void copyText(mensagemConfirmacaoAgenda(selecionada, "transportadora"))}>
                Copiar mensagem
              </button>
              {whatsappHref(selecionada.fornecedor_whatsapp, mensagemFornecedor(selecionada)) && (
                <a style={buttonSecondaryStyle} href={whatsappHref(selecionada.fornecedor_whatsapp, mensagemFornecedor(selecionada))!} target="_blank" rel="noreferrer">
                  WhatsApp fornecedor
                </a>
              )}
              {whatsappHref(selecionada.transportadora_whatsapp, mensagemTransportadora(selecionada)) && (
                <a style={buttonSecondaryStyle} href={whatsappHref(selecionada.transportadora_whatsapp, mensagemTransportadora(selecionada))!} target="_blank" rel="noreferrer">
                  WhatsApp transportadora
                </a>
              )}
            </div>

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Contatos do fornecedor</h3>
            {[...fornecedorContatos, ...(selecionada.fornecedor_whatsapp || selecionada.fornecedor_email ? [{ id: "fornecedor-base", fornecedor_id: selecionada.fornecedor_id ?? "", nome: selecionada.fornecedor_nome ?? "Fornecedor", cargo: null, tipo: "Cadastro", telefone: null, whatsapp: selecionada.fornecedor_whatsapp, email: selecionada.fornecedor_email, principal: true, ativo: true, observacao: null }] : [])].map((contato) => (
              <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8, marginTop: 8 }}>
                <div style={{ fontWeight: 800 }}>{contato.nome} {contato.tipo ? `- ${contato.tipo}` : ""}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {whatsappHref(contato.whatsapp, mensagemFornecedor(selecionada)) && <a style={buttonSecondaryStyle} href={whatsappHref(contato.whatsapp, mensagemFornecedor(selecionada))!} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {mailtoHref(contato.email, mensagemFornecedor(selecionada)) && <a style={buttonSecondaryStyle} href={mailtoHref(contato.email, mensagemFornecedor(selecionada))!}>E-mail</a>}
                  {contato.telefone && <a style={buttonSecondaryStyle} href={`tel:${onlyDigits(contato.telefone)}`}>Telefone</a>}
                </div>
              </div>
            ))}

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Contatos da transportadora</h3>
            {[...transportadoraContatos, ...(selecionada.transportadora_whatsapp || selecionada.transportadora_email ? [{ id: "transp-base", transportadora_id: selecionada.transportadora_id ?? "", nome: selecionada.transportadora_nome ?? "Transportadora", cargo: null, telefone: null, whatsapp: selecionada.transportadora_whatsapp, email: selecionada.transportadora_email, principal: true, ativo: true, observacao: null }] : [])].map((contato) => (
              <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8, marginTop: 8 }}>
                <div style={{ fontWeight: 800 }}>{contato.nome}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {whatsappHref(contato.whatsapp, mensagemTransportadora(selecionada)) && <a style={buttonSecondaryStyle} href={whatsappHref(contato.whatsapp, mensagemTransportadora(selecionada))!} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {mailtoHref(contato.email, mensagemTransportadora(selecionada)) && <a style={buttonSecondaryStyle} href={mailtoHref(contato.email, mensagemTransportadora(selecionada))!}>E-mail</a>}
                  {contato.telefone && <a style={buttonSecondaryStyle} href={`tel:${onlyDigits(contato.telefone)}`}>Telefone</a>}
                </div>
              </div>
            ))}

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Registrar contato</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <select style={inputStyle} value={registro.canal} onChange={(e) => setRegistro({ ...registro, canal: e.target.value })}>
                {CANAIS_CONFIRMACAO.map((canal) => <option key={canal}>{canal}</option>)}
              </select>
              <input style={inputStyle} placeholder="Contato usado" value={registro.contato_nome} onChange={(e) => setRegistro({ ...registro, contato_nome: e.target.value })} />
              <input style={inputStyle} placeholder="Tipo do contato" value={registro.contato_tipo} onChange={(e) => setRegistro({ ...registro, contato_tipo: e.target.value })} />
              <select style={inputStyle} value={registro.resultado} onChange={(e) => setRegistro({ ...registro, resultado: e.target.value })}>
                {STATUS_CONFIRMACAO.filter((status) => status !== "Pendente").map((status) => <option key={status}>{status}</option>)}
              </select>
              <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder="Observação" value={registro.observacao} onChange={(e) => setRegistro({ ...registro, observacao: e.target.value })} />
              <button type="button" style={buttonPrimaryStyle} onClick={() => void salvarHistorico()}>Salvar contato</button>
            </div>

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Histórico</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {historico.map((item) => (
                <div key={item.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                  <div style={{ color: theme.colors.neonGreen, fontWeight: 800 }}>{item.resultado ?? "-"}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"} | {item.canal ?? "-"}</div>
                  <div style={{ color: theme.colors.textSoft, fontSize: 12 }}>{item.contato_nome ?? "-"} {item.contato_tipo ? `(${item.contato_tipo})` : ""}</div>
                  {item.observacao && <div style={{ color: theme.colors.textSoft, fontSize: 12 }}>{item.observacao}</div>}
                </div>
              ))}
              {historico.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhum histórico encontrado.</div>}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export function RecebimentoAgenda({ perfil }: Props) {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [itensPorAgendamento, setItensPorAgendamento] = useState<Record<string, DashboardItem[]>>({});
  const [historicoPorAgendamento, setHistoricoPorAgendamento] = useState<Record<string, AgendamentoHistorico[]>>({});
  const [ocorrenciasPorAgendamento, setOcorrenciasPorAgendamento] = useState<Record<string, Ocorrencia[]>>({});
  const [fotosPorOcorrencia, setFotosPorOcorrencia] = useState<Record<string, OcorrenciaFoto[]>>({});
  const [selecionada, setSelecionada] = useState<DashboardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarNovaOcorrencia, setMostrarNovaOcorrencia] = useState(false);
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: TIPOS_OCORRENCIA[0], item_id: "", descricao: "" });
  const [novaOcorrenciaFotos, setNovaOcorrenciaFotos] = useState<File[]>([]);
  const [filtros, setFiltros] = useState({
    data: todayISO(),
    empresa: "",
    status: "",
    transportadora: "",
  });

  const formatNumber = (value: number | string | null | undefined, decimals = 0) =>
    toNumber(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");
  const cargaKey = (row: DashboardRow) => cargaDisplayKey(row);

  const carregarAgenda = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await db()
      .from("vw_recebimento_dashboard")
      .select("*")
      .eq("data_agenda", filtros.data)
      .order("horario", { ascending: true })
      .order("nro_box", { ascending: true });

    if (error) {
      console.error("Erro ao carregar agenda de recebimento:", error);
      setErro("Erro ao carregar agenda de recebimento.");
      setRows([]);
      setItensPorAgendamento({});
      setHistoricoPorAgendamento({});
      setOcorrenciasPorAgendamento({});
      setFotosPorOcorrencia({});
      setLoading(false);
      return;
    }

    const agendaRows = (data ?? []) as DashboardRow[];
    setRows(agendaRows);
    const ids = agendaRows.map((row) => row.agendamento_id).filter(Boolean);
    if (ids.length === 0) {
      setItensPorAgendamento({});
      setHistoricoPorAgendamento({});
      setOcorrenciasPorAgendamento({});
      setFotosPorOcorrencia({});
      setLoading(false);
      return;
    }

    const [
      { data: itens, error: itensError },
      { data: historico, error: historicoError },
      { data: ocorrencias, error: ocorrenciasError },
    ] = await Promise.all([
      db()
        .from("agendamento_itens")
        .select("id,agendamento_id,codigo_produto,descricao_produto,secao,modalidade_original,modalidade_compra,norma,palete,gerada,conferida,recebida,valor,ruptura")
        .in("agendamento_id", ids)
        .order("codigo_produto", { ascending: true }),
      db()
        .from("agendamento_historico")
        .select("id,agendamento_id,acao,created_at,dados_anteriores,dados_novos")
        .in("agendamento_id", ids)
        .order("created_at", { ascending: false }),
      db()
        .from("ocorrencias")
        .select("id,agendamento_id,item_id,tipo,descricao,status,responsavel_id,created_at,resolvido_em,foto_url,foto_path,foto_nome")
        .in("agendamento_id", ids)
        .order("created_at", { ascending: false }),
    ]);

    if (itensError) {
      console.error("Erro ao carregar itens da agenda:", itensError);
      setItensPorAgendamento({});
    } else {
      const grouped: Record<string, DashboardItem[]> = {};
      for (const item of (itens ?? []) as DashboardItem[]) {
        if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
        grouped[item.agendamento_id].push(item);
      }
      setItensPorAgendamento(grouped);
    }

    if (historicoError) {
      console.error("Erro ao carregar historico da agenda:", historicoError);
      setHistoricoPorAgendamento({});
    } else {
      const grouped: Record<string, AgendamentoHistorico[]> = {};
      for (const item of (historico ?? []) as AgendamentoHistorico[]) {
        if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
        grouped[item.agendamento_id].push(item);
      }
      setHistoricoPorAgendamento(grouped);
    }

    if (ocorrenciasError) {
      console.error("Erro ao carregar ocorrências da agenda:", ocorrenciasError);
      setOcorrenciasPorAgendamento({});
      setFotosPorOcorrencia({});
    } else {
      const ocorrenciaRows = (ocorrencias ?? []) as Ocorrencia[];
      const grouped: Record<string, Ocorrencia[]> = {};
      for (const item of ocorrenciaRows) {
        if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
        grouped[item.agendamento_id].push(item);
      }
      setOcorrenciasPorAgendamento(grouped);
      const ocorrenciaIds = ocorrenciaRows.map((item) => item.id);
      if (ocorrenciaIds.length > 0) {
        const { data: fotos, error: fotosError } = await db()
          .from("ocorrencia_fotos")
          .select("id,ocorrencia_id,storage_path,url,nome_arquivo,created_at")
          .in("ocorrencia_id", ocorrenciaIds)
          .order("created_at", { ascending: true });
        if (fotosError) {
          console.error("Erro ao carregar fotos das ocorrências:", fotosError);
          setFotosPorOcorrencia({});
        } else {
          const fotosGrouped: Record<string, OcorrenciaFoto[]> = {};
          for (const foto of (fotos ?? []) as OcorrenciaFoto[]) {
            if (!fotosGrouped[foto.ocorrencia_id]) fotosGrouped[foto.ocorrencia_id] = [];
            fotosGrouped[foto.ocorrencia_id].push(foto);
          }
          setFotosPorOcorrencia(fotosGrouped);
        }
      } else {
        setFotosPorOcorrencia({});
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void carregarAgenda();
  }, [filtros.data]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((row) => {
      if (filtros.empresa && row.empresa !== filtros.empresa) return false;
      if (filtros.status && row.status_recebimento_calculado !== filtros.status) return false;
      if (filtros.transportadora && !(row.transportadora ?? "").toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      return true;
    });
  }, [rows, filtros]);

  const cargas = useMemo(() => groupBy(rowsFiltradas, cargaKey).map(([, group]) => group[0]), [rowsFiltradas]);
  const boxes = useMemo(
    () => Array.from(new Set(cargas.map((row) => row.nro_box || "Sem box"))).sort((a, b) => a.localeCompare(b)),
    [cargas]
  );
  const horarios = useMemo(() => {
    const base = Array.from({ length: 17 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`);
    const extras = cargas.map((row) => `${formatTime(row.hora_chegada ?? row.horario).slice(0, 2)}:00`).filter((h) => h !== "-:00");
    return Array.from(new Set([...base, ...extras])).sort();
  }, [cargas]);

  const resumo = useMemo(() => {
    return [
      ["Cargas agendadas", String(sumRows(cargas, "qtd_cargas"))],
      ["Finalizadas", String(sumRows(cargas, "ind_finalizada"))],
      ["Em conferência", String(sumRows(cargas, "ind_em_conferencia"))],
      ["No Show", String(sumRows(cargas, "ind_no_show"))],
      ["Recusadas", String(sumRows(cargas, "ind_recusada"))],
      ["Total paletes", sumRows(cargas, "total_paletes").toLocaleString("pt-BR")],
    ];
  }, [cargas]);

  const statusStyle = (status: string | null): React.CSSProperties => {
    const key = status ?? "Agenda";
    const map: Record<string, { border: string; bg: string; color: string }> = {
      Agenda: { border: "#38bdf8", bg: "rgba(14,165,233,0.12)", color: "#bae6fd" },
      "Em conferência": { border: "#f59e0b", bg: "rgba(245,158,11,0.14)", color: "#fde68a" },
      Finalizada: { border: "#22c55e", bg: "rgba(34,197,94,0.14)", color: "#bbf7d0" },
      "No Show": { border: "#94a3b8", bg: "rgba(148,163,184,0.14)", color: "#e2e8f0" },
      Recusada: { border: "#ef4444", bg: "rgba(239,68,68,0.16)", color: "#fecaca" },
      "Veículos não presentes": { border: "#fb923c", bg: "rgba(251,146,60,0.16)", color: "#fed7aa" },
    };
    const current = map[key] ?? map.Agenda;
    return { borderColor: current.border, background: current.bg, color: current.color };
  };

  const cargasNoSlot = (hora: string, box: string) =>
    cargas.filter((row) => {
      const rowHour = `${formatTime(row.hora_chegada ?? row.horario).slice(0, 2)}:00`;
      return rowHour === hora && (row.nro_box || "Sem box") === box;
    });

  const itensSelecionados = selecionada ? itensPorAgendamento[selecionada.agendamento_id] ?? [] : [];
  const historicoSelecionado = selecionada ? historicoPorAgendamento[selecionada.agendamento_id] ?? [] : [];
  const ocorrenciasSelecionadas = selecionada ? ocorrenciasPorAgendamento[selecionada.agendamento_id] ?? [] : [];

  const salvarOcorrenciaAgenda = async () => {
    if (!selecionada) return;
    setErro(null);
    let fotosPayload: Awaited<ReturnType<typeof uploadFotosOcorrencia>> = [];
    try {
      if (novaOcorrenciaFotos.length > 0) {
        fotosPayload = await uploadFotosOcorrencia(novaOcorrenciaFotos, selecionada.agendamento_id);
      }
    } catch (error) {
      console.error("Erro ao enviar foto da ocorrência:", error);
      setErro("Erro ao enviar foto da ocorrência.");
      return;
    }
    const primeiraFoto = fotosPayload[0];
    const { data: criada, error } = await db().from("ocorrencias").insert({
      agendamento_id: selecionada.agendamento_id,
      item_id: novaOcorrencia.item_id || null,
      tipo: novaOcorrencia.tipo,
      descricao: novaOcorrencia.descricao.trim() || null,
      status: "Aberta",
      responsavel_id: perfil.id,
      ...(primeiraFoto ?? {}),
    }).select("id").single();
    if (error) {
      console.error("Erro ao salvar ocorrência:", error);
      setErro("Erro ao salvar ocorrência.");
      return;
    }
    if (fotosPayload.length > 0) {
      const { error: fotosError } = await db().from("ocorrencia_fotos").insert(
        fotosPayload.map((foto) => ({
          ocorrencia_id: criada.id,
          storage_path: foto.foto_path,
          url: foto.foto_url,
          nome_arquivo: foto.foto_nome,
        }))
      );
      if (fotosError) {
        console.error("Erro ao salvar fotos da ocorrência:", fotosError);
        setErro("Ocorrência criada, mas houve erro ao salvar as fotos.");
      }
    }
    setNovaOcorrencia({ tipo: TIPOS_OCORRENCIA[0], item_id: "", descricao: "" });
    setNovaOcorrenciaFotos([]);
    setMostrarNovaOcorrencia(false);
    await carregarAgenda();
  };

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Agenda de Recebimento</h1>
          <p style={descStyle}>Acompanhamento diário por horário e box/doca, com detalhe operacional da carga.</p>
        </div>
        <button type="button" style={buttonSecondaryStyle} onClick={() => void carregarAgenda()} disabled={loading}>
          Atualizar
        </button>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <input type="date" style={inputStyle} value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
        <select style={inputStyle} value={filtros.empresa} onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}>
          <option value="">Todos CD/empresa</option>
          {uniqueValues(rows, "empresa").map((value) => <option key={value}>{value}</option>)}
        </select>
        <select style={inputStyle} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Todos status</option>
          {uniqueValues(rows, "status_recebimento_calculado").map((value) => <option key={value}>{value}</option>)}
        </select>
        <input
          style={inputStyle}
          placeholder="Transportadora"
          value={filtros.transportadora}
          onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })}
        />
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      {loading && <div style={{ color: theme.colors.textMuted }}>Carregando agenda...</div>}

      <div style={gridStyle}>
        {resumo.map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <div style={metricLabelStyle}>{label}</div>
            <div style={metricValueStyle}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selecionada ? "minmax(0, 1fr) 420px" : "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ ...cardStyle, overflow: "auto", padding: 0 }}>
          <div style={{ minWidth: Math.max(900, boxes.length * 240 + 90) }}>
            <div style={{ display: "grid", gridTemplateColumns: `90px repeat(${Math.max(boxes.length, 1)}, minmax(220px, 1fr))`, position: "sticky", top: 0, zIndex: 2, background: "#020617" }}>
              <div style={{ padding: 10, color: theme.colors.textMuted, fontWeight: 800 }}>Horário</div>
              {(boxes.length ? boxes : ["Sem box"]).map((box) => (
                <div key={box} style={{ padding: 10, color: theme.colors.neonOrange, fontWeight: 900, borderLeft: `1px solid ${theme.colors.borderSoft}` }}>
                  Box / Doca {box}
                </div>
              ))}
            </div>
            {horarios.map((hora) => (
              <div key={hora} style={{ display: "grid", gridTemplateColumns: `90px repeat(${Math.max(boxes.length, 1)}, minmax(220px, 1fr))`, minHeight: 98, borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                <div style={{ padding: 10, color: theme.colors.textSoft, fontWeight: 800 }}>{hora}</div>
                {(boxes.length ? boxes : ["Sem box"]).map((box) => (
                  <div key={`${hora}-${box}`} style={{ padding: 8, borderLeft: `1px solid ${theme.colors.borderSoft}`, display: "flex", flexDirection: "column", gap: 8 }}>
                    {cargasNoSlot(hora, box).map((row) => (
                      <button
                        type="button"
                        key={cargaKey(row)}
                        onClick={() => setSelecionada(row)}
                        style={{
                          ...statusStyle(row.status_recebimento_calculado),
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderRadius: 10,
                          padding: 10,
                          textAlign: "left",
                          cursor: "pointer",
                          font: "inherit",
                        }}
                      >
                        <div style={{ fontWeight: 900, color: theme.colors.text }}>{row.transportadora ?? "Transportadora não informada"}</div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>Carga: {row.nro_carga ?? "-"} | {row.status_recebimento_calculado ?? "Agenda"}</div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          Paletes {formatNumber(row.total_paletes)} | Caixas {formatNumber(row.total_caixas)} | {percent(toNumber(row.perc_conferencia))}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>{formatCurrency(toNumber(row.valor_total))}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {selecionada && (
          <aside style={{ ...cardStyle, position: "sticky", top: 12, maxHeight: "calc(100vh - 90px)", overflow: "auto" }}>
            <div style={headerStyle}>
              <div>
                <h2 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 18 }}>Carga {selecionada.nro_carga ?? "-"}</h2>
                <p style={descStyle}>Box {selecionada.nro_box ?? "-"} | {formatTime(selecionada.hora_chegada ?? selecionada.horario)}</p>
              </div>
              <button type="button" style={buttonSecondaryStyle} onClick={() => setSelecionada(null)}>Fechar</button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12, color: theme.colors.textSoft, fontSize: 13 }}>
              <div><strong>Transportadora:</strong> {selecionada.transportadora ?? "-"}</div>
              <div><strong>Fornecedor:</strong> {selecionada.fornecedor_nome ?? "-"}</div>
              <div><strong>Status:</strong> {selecionada.status_recebimento_calculado ?? "-"}</div>
              <div><strong>Modalidade:</strong> {selecionada.modalidade_calculada ?? "-"}</div>
            </div>

            <div style={{ ...gridStyle, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14 }}>
              {[
                ["Itens", formatNumber(selecionada.total_itens)],
                ["Paletes", formatNumber(selecionada.total_paletes)],
                ["Caixas", formatNumber(selecionada.total_caixas)],
                ["Conferência", percent(toNumber(selecionada.perc_conferencia))],
                ["Valor", formatCurrency(toNumber(selecionada.valor_total))],
                ["Ruptura", formatNumber(selecionada.ruptura_total)],
              ].map(([label, value]) => (
                <div key={label} style={{ ...cardStyle, padding: 10 }}>
                  <div style={metricLabelStyle}>{label}</div>
                  <div style={{ ...metricValueStyle, fontSize: 16 }}>{value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Itens da carga</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                <thead>
                  <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                    {["Código", "Produto", "Seção", "Modalidade original", "Modalidade compra", "Norma", "Palete", "Gerada", "Conferida", "Recebida", "Valor", "Ruptura"].map((col) => (
                      <th key={col} style={{ padding: 7, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itensSelecionados.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: 7 }}>{item.codigo_produto ?? "-"}</td>
                      <td style={{ padding: 7 }}>{item.descricao_produto ?? "-"}</td>
                      <td style={{ padding: 7 }}>{item.secao ?? "-"}</td>
                      <td style={{ padding: 7 }}>{item.modalidade_original ?? "-"}</td>
                      <td style={{ padding: 7 }}>{item.modalidade_compra ?? "-"}</td>
                      <td style={{ padding: 7 }}>{item.norma ?? "-"}</td>
                      <td style={{ padding: 7 }}>{formatNumber(item.palete)}</td>
                      <td style={{ padding: 7 }}>{formatNumber(item.gerada)}</td>
                      <td style={{ padding: 7 }}>{formatNumber(item.conferida)}</td>
                      <td style={{ padding: 7 }}>{formatNumber(item.recebida)}</td>
                      <td style={{ padding: 7 }}>{formatCurrency(toNumber(item.valor))}</td>
                      <td style={{ padding: 7 }}>{formatNumber(item.ruptura)}</td>
                    </tr>
                  ))}
                  {itensSelecionados.length === 0 && (
                    <tr><td colSpan={12} style={{ padding: 10, color: theme.colors.textMuted }}>Nenhum item encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ ...headerStyle, marginTop: 16 }}>
              <h3 style={{ color: theme.colors.text, fontSize: 15, margin: 0 }}>Ocorrências</h3>
              <button type="button" style={buttonSecondaryStyle} onClick={() => setMostrarNovaOcorrencia((value) => !value)}>
                Nova ocorrência
              </button>
            </div>
            {mostrarNovaOcorrencia && (
              <div style={{ ...cardStyle, display: "grid", gap: 8, marginTop: 8 }}>
                <select style={inputStyle} value={novaOcorrencia.tipo} onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, tipo: e.target.value })}>
                  {TIPOS_OCORRENCIA.map((tipo) => <option key={tipo}>{tipo}</option>)}
                </select>
                <select style={inputStyle} value={novaOcorrencia.item_id} onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, item_id: e.target.value })}>
                  <option value="">Vincular à carga</option>
                  {itensSelecionados.map((item) => (
                    <option key={item.id} value={item.id}>{item.codigo_produto ?? "-"} - {item.descricao_produto ?? "Item"}</option>
                  ))}
                </select>
                <textarea
                  style={{ ...inputStyle, minHeight: 80 }}
                  placeholder="Descrição da ocorrência"
                  value={novaOcorrencia.descricao}
                  onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, descricao: e.target.value })}
                />
                <label style={{ color: theme.colors.textSoft, fontSize: 13 }}>
                  Foto da não conformidade
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ ...inputStyle, marginTop: 6 }}
                    onChange={(e) => setNovaOcorrenciaFotos(Array.from(e.target.files ?? []))}
                  />
                </label>
                <button type="button" style={buttonPrimaryStyle} onClick={salvarOcorrenciaAgenda}>Salvar ocorrência</button>
              </div>
            )}
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {ocorrenciasSelecionadas.map((item) => (
                <div key={item.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                  <div style={{ color: item.status === "Resolvida" ? theme.colors.neonGreen : theme.colors.neonOrange, fontWeight: 800 }}>
                    {item.tipo} - {item.status ?? "Aberta"}
                  </div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                  </div>
                  {item.descricao && <div style={{ color: theme.colors.textSoft, fontSize: 12, marginTop: 4 }}>{item.descricao}</div>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {(fotosPorOcorrencia[item.id] ?? (item.foto_url ? [{ id: item.id, ocorrencia_id: item.id, url: item.foto_url, storage_path: item.foto_path ?? "", nome_arquivo: item.foto_nome, created_at: item.created_at }] : [])).map((foto, index) => (
                      <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" style={{ color: theme.colors.neonGreen, fontSize: 12 }}>
                        Foto {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {ocorrenciasSelecionadas.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhuma ocorrência registrada.</div>}
            </div>

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Histórico da carga</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {historicoSelecionado.map((item) => (
                <div key={item.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                  <div style={{ color: theme.colors.neonGreen, fontWeight: 800 }}>{item.acao ?? "registro"}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}</div>
                </div>
              ))}
              {historicoSelecionado.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhum histórico encontrado.</div>}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export function RecebimentoOcorrencias({ perfil }: Props) {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [itensPorAgendamento, setItensPorAgendamento] = useState<Record<string, DashboardItem[]>>({});
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [fotosOcorrencia, setFotosOcorrencia] = useState<File[]>([]);
  const [filtros, setFiltros] = useState({ data: todayISO(), status: "", tipo: "", transportadora: "" });
  const [form, setForm] = useState({
    agendamento_id: "",
    item_id: "",
    tipo: TIPOS_OCORRENCIA[0],
    descricao: "",
  });

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    const { data: cargasData, error: cargasError } = await db()
      .from("vw_recebimento_dashboard")
      .select("*")
      .eq("data_agenda", filtros.data)
      .order("transportadora", { ascending: true })
      .order("nro_carga", { ascending: true });

    if (cargasError) {
      console.error("Erro ao carregar cargas para ocorrências:", cargasError);
      setErro("Erro ao carregar cargas.");
      setRows([]);
      setOcorrencias([]);
      setLoading(false);
      return;
    }

    const cargas = (cargasData ?? []) as DashboardRow[];
    setRows(cargas);
    const ids = cargas.map((row) => row.agendamento_id).filter(Boolean);
    if (ids.length === 0) {
      setOcorrencias([]);
      setItensPorAgendamento({});
      setLoading(false);
      return;
    }

    const [{ data: ocorrenciasData, error: ocorrenciasError }, { data: itensData, error: itensError }] = await Promise.all([
      db()
        .from("ocorrencias")
        .select("id,agendamento_id,item_id,tipo,descricao,status,responsavel_id,created_at,resolvido_em,foto_url,foto_path,foto_nome")
        .in("agendamento_id", ids)
        .order("created_at", { ascending: false }),
      db()
        .from("agendamento_itens")
        .select("id,agendamento_id,codigo_produto,descricao_produto,secao,modalidade_original,modalidade_compra,norma,palete,gerada,conferida,recebida,valor,ruptura")
        .in("agendamento_id", ids)
        .order("codigo_produto", { ascending: true }),
    ]);

    if (ocorrenciasError) {
      console.error("Erro ao carregar ocorrências:", ocorrenciasError);
      setErro("Erro ao carregar ocorrências.");
      setOcorrencias([]);
      setFotosPorOcorrencia({});
    } else {
      const ocorrenciaRows = (ocorrenciasData ?? []) as Ocorrencia[];
      setOcorrencias(ocorrenciaRows);
      const ocorrenciaIds = ocorrenciaRows.map((item) => item.id);
      if (ocorrenciaIds.length > 0) {
        const { data: fotos, error: fotosError } = await db()
          .from("ocorrencia_fotos")
          .select("id,ocorrencia_id,storage_path,url,nome_arquivo,created_at")
          .in("ocorrencia_id", ocorrenciaIds)
          .order("created_at", { ascending: true });
        if (fotosError) {
          console.error("Erro ao carregar fotos das ocorrências:", fotosError);
          setFotosPorOcorrencia({});
        } else {
          const grouped: Record<string, OcorrenciaFoto[]> = {};
          for (const foto of (fotos ?? []) as OcorrenciaFoto[]) {
            if (!grouped[foto.ocorrencia_id]) grouped[foto.ocorrencia_id] = [];
            grouped[foto.ocorrencia_id].push(foto);
          }
          setFotosPorOcorrencia(grouped);
        }
      } else {
        setFotosPorOcorrencia({});
      }
    }

    if (itensError) {
      console.error("Erro ao carregar itens para ocorrências:", itensError);
      setItensPorAgendamento({});
    } else {
      const grouped: Record<string, DashboardItem[]> = {};
      for (const item of (itensData ?? []) as DashboardItem[]) {
        if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
        grouped[item.agendamento_id].push(item);
      }
      setItensPorAgendamento(grouped);
    }

    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, [filtros.data]);

  const cargasPorId = useMemo(() => new Map(rows.map((row) => [row.agendamento_id, row])), [rows]);
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((item) => {
      const carga = cargasPorId.get(item.agendamento_id);
      if (filtros.status && item.status !== filtros.status) return false;
      if (filtros.tipo && item.tipo !== filtros.tipo) return false;
      if (filtros.transportadora && !(carga?.transportadora ?? "").toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      return true;
    });
  }, [ocorrencias, filtros, cargasPorId]);

  const itensForm = form.agendamento_id ? itensPorAgendamento[form.agendamento_id] ?? [] : [];

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.agendamento_id) {
      setErro("Selecione uma carga.");
      return;
    }
    setLoading(true);
    setErro(null);
    let fotosPayload: Awaited<ReturnType<typeof uploadFotosOcorrencia>> = [];
    try {
      if (fotosOcorrencia.length > 0) {
        fotosPayload = await uploadFotosOcorrencia(fotosOcorrencia, form.agendamento_id);
      }
    } catch (error) {
      console.error("Erro ao enviar foto da ocorrência:", error);
      setErro("Erro ao enviar foto da ocorrência.");
      setLoading(false);
      return;
    }
    const primeiraFoto = fotosPayload[0];
    const { data: criada, error } = await db().from("ocorrencias").insert({
      agendamento_id: form.agendamento_id,
      item_id: form.item_id || null,
      tipo: form.tipo,
      descricao: form.descricao.trim() || null,
      status: "Aberta",
      responsavel_id: perfil.id,
      ...(primeiraFoto ?? {}),
    }).select("id").single();
    if (error) {
      console.error("Erro ao salvar ocorrência:", error);
      setErro("Erro ao salvar ocorrência.");
      setLoading(false);
      return;
    }
    if (fotosPayload.length > 0) {
      const { error: fotosError } = await db().from("ocorrencia_fotos").insert(
        fotosPayload.map((foto) => ({
          ocorrencia_id: criada.id,
          storage_path: foto.foto_path,
          url: foto.foto_url,
          nome_arquivo: foto.foto_nome,
        }))
      );
      if (fotosError) {
        console.error("Erro ao salvar fotos da ocorrência:", fotosError);
        setErro("Ocorrência criada, mas houve erro ao salvar as fotos.");
      }
    }
    setForm({ agendamento_id: "", item_id: "", tipo: TIPOS_OCORRENCIA[0], descricao: "" });
    setFotosOcorrencia([]);
    setMostrarForm(false);
    await carregar();
  };

  const atualizarStatus = async (ocorrencia: Ocorrencia, status: string) => {
    setErro(null);
    const { error } = await db()
      .from("ocorrencias")
      .update({ status, resolvido_em: status === "Resolvida" ? new Date().toISOString() : null })
      .eq("id", ocorrencia.id);
    if (error) {
      console.error("Erro ao atualizar ocorrência:", error);
      setErro("Erro ao atualizar ocorrência.");
      return;
    }
    await carregar();
  };

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Ocorrências</h1>
          <p style={descStyle}>Controle de ocorrências por carga e por item do recebimento.</p>
        </div>
        <button type="button" style={buttonPrimaryStyle} onClick={() => setMostrarForm((value) => !value)}>
          {mostrarForm ? "Fechar" : "Nova ocorrência"}
        </button>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <input type="date" style={inputStyle} value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
        <select style={inputStyle} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Todos status</option>
          <option>Aberta</option>
          <option>Em tratativa</option>
          <option>Resolvida</option>
        </select>
        <select style={inputStyle} value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
          <option value="">Todos tipos</option>
          {TIPOS_OCORRENCIA.map((tipo) => <option key={tipo}>{tipo}</option>)}
        </select>
        <input style={inputStyle} placeholder="Transportadora" value={filtros.transportadora} onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })} />
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}

      {mostrarForm && (
        <form onSubmit={salvar} style={{ ...cardStyle, display: "grid", gap: 10 }}>
          <select style={inputStyle} value={form.agendamento_id} onChange={(e) => setForm({ ...form, agendamento_id: e.target.value, item_id: "" })}>
            <option value="">Selecione a carga</option>
            {rows.map((row) => (
              <option key={row.agendamento_id} value={row.agendamento_id}>
                {row.nro_carga ?? "-"} | Box {row.nro_box ?? "-"} | {row.transportadora ?? "-"}
              </option>
            ))}
          </select>
          <select style={inputStyle} value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
            <option value="">Vincular à carga inteira</option>
            {itensForm.map((item) => (
              <option key={item.id} value={item.id}>{item.codigo_produto ?? "-"} - {item.descricao_produto ?? "Item"}</option>
            ))}
          </select>
          <select style={inputStyle} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS_OCORRENCIA.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
          <textarea style={{ ...inputStyle, minHeight: 90 }} placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <label style={{ color: theme.colors.textSoft, fontSize: 13 }}>
            Foto da carga tombada ou não conforme
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ ...inputStyle, marginTop: 6 }}
              onChange={(e) => setFotosOcorrencia(Array.from(e.target.files ?? []))}
            />
          </label>
          <div>
            <button type="submit" style={buttonPrimaryStyle} disabled={loading}>Salvar ocorrência</button>
          </div>
        </form>
      )}

      <div style={{ ...cardStyle, overflowX: "auto" }}>
        {loading && <div style={{ color: theme.colors.textMuted }}>Carregando ocorrências...</div>}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              {["Criada em", "Carga", "Transportadora", "Tipo", "Status", "Descrição", "Item", "Foto", "Ações"].map((col) => (
                <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ocorrenciasFiltradas.map((item) => {
              const carga = cargasPorId.get(item.agendamento_id);
              const itemRelacionado = (itensPorAgendamento[item.agendamento_id] ?? []).find((i) => i.id === item.item_id);
              return (
                <tr key={item.id}>
                  <td style={{ padding: 8 }}>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}</td>
                  <td style={{ padding: 8 }}>{carga?.nro_carga ?? "-"}</td>
                  <td style={{ padding: 8 }}>{carga?.transportadora ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.tipo}</td>
                  <td style={{ padding: 8, color: item.status === "Resolvida" ? theme.colors.neonGreen : theme.colors.neonOrange }}>{item.status ?? "Aberta"}</td>
                  <td style={{ padding: 8 }}>{item.descricao ?? "-"}</td>
                  <td style={{ padding: 8 }}>{itemRelacionado ? `${itemRelacionado.codigo_produto ?? "-"} - ${itemRelacionado.descricao_produto ?? "Item"}` : "Carga"}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(fotosPorOcorrencia[item.id] ?? (item.foto_url ? [{ id: item.id, ocorrencia_id: item.id, url: item.foto_url, storage_path: item.foto_path ?? "", nome_arquivo: item.foto_nome, created_at: item.created_at }] : [])).map((foto, index) => (
                        <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" style={buttonSecondaryStyle}>Foto {index + 1}</a>
                      ))}
                      {!item.foto_url && !fotosPorOcorrencia[item.id]?.length && "-"}
                    </div>
                  </td>
                  <td style={{ padding: 8, display: "flex", gap: 6 }}>
                    <button type="button" style={buttonSecondaryStyle} onClick={() => atualizarStatus(item, "Em tratativa")}>Tratativa</button>
                    <button type="button" style={buttonSecondaryStyle} onClick={() => atualizarStatus(item, "Resolvida")}>Resolver</button>
                  </td>
                </tr>
              );
            })}
            {ocorrenciasFiltradas.length === 0 && !loading && (
              <tr><td colSpan={9} style={{ padding: 12, color: theme.colors.textMuted }}>Nenhuma ocorrência encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RecebimentoFornecedores({ perfil: _perfil }: Props) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selecionado, setSelecionado] = useState<Fornecedor | null>(null);
  const [contatos, setContatos] = useState<FornecedorContato[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [transportadoraVinculo, setTransportadoraVinculo] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    whatsapp: "",
    contato_responsavel: "",
    ativo: true,
    observacao: "",
  });
  const [contatoForm, setContatoForm] = useState({ nome: "", cargo: "", tipo: "", telefone: "", whatsapp: "", email: "", principal: false, observacao: "" });

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await db()
      .from("fornecedores")
      .select("id,nome,cnpj,email,telefone,whatsapp,contato_responsavel,ativo,observacao")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar fornecedores:", error);
      setErro("Erro ao carregar fornecedores.");
      setFornecedores([]);
    } else {
      setFornecedores((data ?? []) as Fornecedor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
    void db().from("transportadoras").select("id,nome,cnpj,telefone,whatsapp,email,contato_responsavel,ativo,observacao").order("nome", { ascending: true }).then(({ data }) => setTransportadoras((data ?? []) as Transportadora[]));
  }, []);

  useEffect(() => {
    if (fornecedores.length === 0 || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fornecedorId = params.get("fornecedor_id") ?? "";
    const fornecedorNome = params.get("fornecedor_nome") ?? "";
    const acao = params.get("acao") ?? "";
    if (!fornecedorId && !fornecedorNome) return;
    const found =
      fornecedores.find((item) => item.id === fornecedorId) ??
      fornecedores.find((item) => item.nome.toLowerCase() === fornecedorNome.toLowerCase());
    if (found) {
      setSelecionado(found);
      void carregarContatos(found);
      if (acao === "editar" || acao === "vincular") editar(found);
      return;
    }
    if (fornecedorNome) {
      setForm((prev) => ({ ...prev, nome: fornecedorNome }));
      setMostrarForm(true);
    }
  }, [fornecedores]);

  const carregarContatos = async (fornecedor: Fornecedor | null) => {
    setContatos([]);
    if (!fornecedor) return;
    const { data, error } = await db()
      .from("fornecedor_contatos")
      .select("*")
      .eq("fornecedor_id", fornecedor.id)
      .order("principal", { ascending: false })
      .order("nome", { ascending: true });
    if (error) setErro("Erro ao carregar contatos do fornecedor.");
    else setContatos((data ?? []) as FornecedorContato[]);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome do fornecedor.");
      return;
    }

    setLoading(true);
    setErro(null);
    const payload = {
      nome: form.nome.trim(),
      cnpj: form.cnpj.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      contato_responsavel: form.contato_responsavel.trim() || null,
      ativo: form.ativo,
      observacao: form.observacao.trim() || null,
    };
    const { error } = selecionado
      ? await db().from("fornecedores").update(payload).eq("id", selecionado.id)
      : await db().from("fornecedores").insert(payload);

    if (error) {
      console.error("Erro ao salvar fornecedor:", error);
      setErro("Erro ao salvar fornecedor.");
      setLoading(false);
      return;
    }

    setForm({ nome: "", cnpj: "", email: "", telefone: "", whatsapp: "", contato_responsavel: "", ativo: true, observacao: "" });
    setSelecionado(null);
    setMostrarForm(false);
    await carregar();
  };

  const editar = (fornecedor: Fornecedor) => {
    setSelecionado(fornecedor);
    setForm({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj ?? "",
      email: fornecedor.email ?? "",
      telefone: fornecedor.telefone ?? "",
      whatsapp: fornecedor.whatsapp ?? "",
      contato_responsavel: fornecedor.contato_responsavel ?? "",
      ativo: !!fornecedor.ativo,
      observacao: fornecedor.observacao ?? "",
    });
    setMostrarForm(true);
    void carregarContatos(fornecedor);
  };

  const salvarContato = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selecionado || !contatoForm.nome.trim()) return;
    const { error } = await db().from("fornecedor_contatos").insert({
      fornecedor_id: selecionado.id,
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo.trim() || null,
      tipo: contatoForm.tipo.trim() || null,
      telefone: contatoForm.telefone.trim() || null,
      whatsapp: contatoForm.whatsapp.trim() || null,
      email: contatoForm.email.trim() || null,
      principal: contatoForm.principal,
      ativo: true,
      observacao: contatoForm.observacao.trim() || null,
    });
    if (error) {
      setErro("Erro ao salvar contato do fornecedor.");
      return;
    }
    setContatoForm({ nome: "", cargo: "", tipo: "", telefone: "", whatsapp: "", email: "", principal: false, observacao: "" });
    await carregarContatos(selecionado);
  };

  const vincularTransportadora = async () => {
    if (!selecionado || !transportadoraVinculo) return;
    const { error } = await db()
      .from("fornecedor_transportadoras")
      .upsert({ fornecedor_id: selecionado.id, transportadora_id: transportadoraVinculo }, { onConflict: "fornecedor_id,transportadora_id" });
    if (error) setErro("Erro ao vincular transportadora.");
    else setTransportadoraVinculo("");
  };

  const whatsappLink = (whatsapp: string | null) => {
    const digits = (whatsapp ?? "").replace(/\D/g, "");
    if (!digits) return null;
    const numero = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${numero}`;
  };

  const fornecedoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return fornecedores;
    return fornecedores.filter((item) =>
      [item.nome, item.cnpj, item.email, item.telefone, item.whatsapp, item.contato_responsavel]
        .some((value) => (value ?? "").toLowerCase().includes(termo))
    );
  }, [fornecedores, busca]);

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Fornecedores</h1>
          <p style={descStyle}>Cadastro base de fornecedores usados na agenda de recebimento.</p>
        </div>
        <button type="button" style={buttonPrimaryStyle} onClick={() => { setSelecionado(null); setMostrarForm((v) => !v); }}>
          {mostrarForm ? "Fechar" : "Novo fornecedor"}
        </button>
      </div>
      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      <div style={cardStyle}>
        <input
          style={inputStyle}
          placeholder="Buscar fornecedor por nome, CNPJ, e-mail, telefone, WhatsApp ou contato"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {mostrarForm && (
        <form onSubmit={salvar} style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={gridStyle}>
            <input style={inputStyle} placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <input style={inputStyle} placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            <input style={inputStyle} placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <input style={inputStyle} placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <input style={inputStyle} placeholder="Contato responsavel" value={form.contato_responsavel} onChange={(e) => setForm({ ...form, contato_responsavel: e.target.value })} />
          </div>
          <textarea style={{ ...inputStyle, minHeight: 70 }} placeholder="Observacao" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          <label style={{ color: theme.colors.textSoft, fontSize: 13 }}>
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} style={{ marginRight: 8 }} />
            Ativo
          </label>
          <div>
            <button type="submit" style={buttonPrimaryStyle} disabled={loading}>
              Salvar fornecedor
            </button>
          </div>
        </form>
      )}
      <div style={{ display: "grid", gridTemplateColumns: selecionado ? "minmax(0,1fr) 390px" : "minmax(0,1fr)", gap: 14 }}>
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        {loading && <div style={{ color: theme.colors.textMuted }}>Carregando...</div>}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}>Nome</th>
              <th style={{ padding: "8px 10px" }}>CNPJ</th>
              <th style={{ padding: "8px 10px" }}>Contato</th>
              <th style={{ padding: "8px 10px" }}>E-mail</th>
              <th style={{ padding: "8px 10px" }}>Telefone</th>
              <th style={{ padding: "8px 10px" }}>Status</th>
              <th style={{ padding: "8px 10px" }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {fornecedoresFiltrados.map((f) => {
              const link = whatsappLink(f.whatsapp);
              return (
                <tr key={f.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                  <td style={{ padding: "10px" }}>{f.nome}</td>
                  <td style={{ padding: "10px" }}>{f.cnpj ?? "-"}</td>
                  <td style={{ padding: "10px" }}>{f.contato_responsavel ?? "-"}</td>
                  <td style={{ padding: "10px" }}>{f.email ?? "-"}</td>
                  <td style={{ padding: "10px" }}>{f.telefone ?? "-"}</td>
                  <td style={{ padding: "10px", color: f.ativo ? theme.colors.success : theme.colors.danger }}>{f.ativo ? "Ativo" : "Inativo"}</td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" style={buttonSecondaryStyle} onClick={() => editar(f)}>Editar</button>
                      <button type="button" style={buttonSecondaryStyle} onClick={() => { setSelecionado(f); void carregarContatos(f); }}>Contatos</button>
                      {link ? <a href={link} target="_blank" rel="noreferrer" style={buttonSecondaryStyle}>WhatsApp</a> : null}
                      {f.email ? <a href={`mailto:${f.email}`} style={buttonSecondaryStyle}>E-mail</a> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {fornecedoresFiltrados.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ padding: 14, color: theme.colors.textMuted }}>
                  Nenhum fornecedor cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selecionado && (
        <aside style={{ ...cardStyle, display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 17 }}>Contatos e transportadoras</h2>
          <div style={{ color: theme.colors.textSoft, fontWeight: 800 }}>{selecionado.nome}</div>
          <form onSubmit={salvarContato} style={{ display: "grid", gap: 8 }}>
            <input style={inputStyle} placeholder="Nome do contato" value={contatoForm.nome} onChange={(e) => setContatoForm({ ...contatoForm, nome: e.target.value })} />
            <input style={inputStyle} placeholder="Cargo" value={contatoForm.cargo} onChange={(e) => setContatoForm({ ...contatoForm, cargo: e.target.value })} />
            <input style={inputStyle} placeholder="Tipo" value={contatoForm.tipo} onChange={(e) => setContatoForm({ ...contatoForm, tipo: e.target.value })} />
            <input style={inputStyle} placeholder="Telefone" value={contatoForm.telefone} onChange={(e) => setContatoForm({ ...contatoForm, telefone: e.target.value })} />
            <input style={inputStyle} placeholder="WhatsApp" value={contatoForm.whatsapp} onChange={(e) => setContatoForm({ ...contatoForm, whatsapp: e.target.value })} />
            <input style={inputStyle} placeholder="E-mail" value={contatoForm.email} onChange={(e) => setContatoForm({ ...contatoForm, email: e.target.value })} />
            <label style={{ color: theme.colors.textSoft, fontSize: 13 }}><input type="checkbox" checked={contatoForm.principal} onChange={(e) => setContatoForm({ ...contatoForm, principal: e.target.checked })} style={{ marginRight: 8 }} />Principal</label>
            <textarea style={{ ...inputStyle, minHeight: 55 }} placeholder="Observacao" value={contatoForm.observacao} onChange={(e) => setContatoForm({ ...contatoForm, observacao: e.target.value })} />
            <button type="submit" style={buttonPrimaryStyle}>Adicionar contato</button>
            <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Depois de salvar, o painel continua aberto para incluir outro contato.</div>
          </form>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <select style={inputStyle} value={transportadoraVinculo} onChange={(e) => setTransportadoraVinculo(e.target.value)}>
              <option value="">Vincular transportadora</option>
              {transportadoras.map((transportadora) => <option key={transportadora.id} value={transportadora.id}>{transportadora.nome}</option>)}
            </select>
            <button type="button" style={buttonSecondaryStyle} onClick={() => void vincularTransportadora()}>Vincular</button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {contatos.map((contato) => (
              <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                <div style={{ fontWeight: 800 }}>{contato.nome} {contato.principal ? "(principal)" : ""}</div>
                <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{contato.tipo ?? contato.cargo ?? "-"} | {contato.email ?? "-"}</div>
              </div>
            ))}
            {contatos.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhum contato cadastrado.</div>}
          </div>
        </aside>
      )}
      </div>
    </section>
  );
}

export function RecebimentoTransportadoras({ perfil: _perfil }: Props) {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [selecionada, setSelecionada] = useState<Transportadora | null>(null);
  const [contatos, setContatos] = useState<TransportadoraContato[]>([]);
  const [fornecedorVinculo, setFornecedorVinculo] = useState<{ id: string; nome: string } | null>(null);
  const [transportadoraSelecionadaId, setTransportadoraSelecionadaId] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    email: "",
    contato_responsavel: "",
    ativo: true,
    observacao: "",
  });
  const [contatoForm, setContatoForm] = useState({ nome: "", cargo: "", telefone: "", whatsapp: "", email: "", principal: false, observacao: "" });

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await db()
      .from("transportadoras")
      .select("id,nome,cnpj,telefone,whatsapp,email,contato_responsavel,ativo,observacao")
      .order("nome", { ascending: true });
    if (error) {
      console.error("Erro ao carregar transportadoras:", error);
      setErro("Erro ao carregar transportadoras.");
      setTransportadoras([]);
    } else {
      setTransportadoras((data ?? []) as Transportadora[]);
    }
    setLoading(false);
  };

  const carregarContatos = async (transportadora: Transportadora | null) => {
    setSelecionada(transportadora);
    setContatos([]);
    if (!transportadora) return;
    const { data, error } = await db()
      .from("transportadora_contatos")
      .select("*")
      .eq("transportadora_id", transportadora.id)
      .order("principal", { ascending: false })
      .order("nome", { ascending: true });
    if (error) setErro("Erro ao carregar contatos da transportadora.");
    else setContatos((data ?? []) as TransportadoraContato[]);
  };

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    if (transportadoras.length === 0 || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const transportadoraId = params.get("transportadora_id") ?? "";
    const transportadoraNome = params.get("transportadora_nome") ?? "";
    const fornecedorId = params.get("fornecedor_id") ?? "";
    const fornecedorNome = params.get("fornecedor_nome") ?? "";
    const acao = params.get("acao") ?? "";
    if (fornecedorId || fornecedorNome) setFornecedorVinculo({ id: fornecedorId, nome: fornecedorNome });
    if (!transportadoraId && !transportadoraNome) return;
    const found =
      transportadoras.find((item) => item.id === transportadoraId) ??
      transportadoras.find((item) => item.nome.toLowerCase() === transportadoraNome.toLowerCase());
    if (found) {
      setTransportadoraSelecionadaId(found.id);
      setSelecionada(found);
      void carregarContatos(found);
      if (acao === "editar") editar(found);
      return;
    }
    if (transportadoraNome && transportadoraNome !== "N/A") {
      setForm((prev) => ({ ...prev, nome: transportadoraNome }));
      setMostrarForm(true);
    }
  }, [transportadoras]);

  const editar = (transportadora: Transportadora) => {
    setTransportadoraSelecionadaId(transportadora.id);
    setForm({
      nome: transportadora.nome,
      cnpj: transportadora.cnpj ?? "",
      telefone: transportadora.telefone ?? "",
      whatsapp: transportadora.whatsapp ?? "",
      email: transportadora.email ?? "",
      contato_responsavel: transportadora.contato_responsavel ?? "",
      ativo: !!transportadora.ativo,
      observacao: transportadora.observacao ?? "",
    });
    setSelecionada(transportadora);
    setMostrarForm(true);
    void carregarContatos(transportadora);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome da transportadora.");
      return;
    }
    setLoading(true);
    setErro(null);
    const payload = {
      nome: form.nome.trim(),
      cnpj: form.cnpj.trim() || null,
      telefone: form.telefone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      contato_responsavel: form.contato_responsavel.trim() || null,
      ativo: form.ativo,
      observacao: form.observacao.trim() || null,
    };
    const query = selecionada ? db().from("transportadoras").update(payload).eq("id", selecionada.id) : db().from("transportadoras").insert(payload);
    const { error } = await query;
    if (error) {
      console.error("Erro ao salvar transportadora:", error);
      setErro("Erro ao salvar transportadora.");
      setLoading(false);
      return;
    }
    setForm({ nome: "", cnpj: "", telefone: "", whatsapp: "", email: "", contato_responsavel: "", ativo: true, observacao: "" });
    setMostrarForm(false);
    setSelecionada(null);
    setContatos([]);
    await carregar();
  };

  const salvarContato = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selecionada || !contatoForm.nome.trim()) return;
    const { error } = await db().from("transportadora_contatos").insert({
      transportadora_id: selecionada.id,
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo.trim() || null,
      telefone: contatoForm.telefone.trim() || null,
      whatsapp: contatoForm.whatsapp.trim() || null,
      email: contatoForm.email.trim() || null,
      principal: contatoForm.principal,
      ativo: true,
      observacao: contatoForm.observacao.trim() || null,
    });
    if (error) {
      setErro("Erro ao salvar contato.");
      return;
    }
    setContatoForm({ nome: "", cargo: "", telefone: "", whatsapp: "", email: "", principal: false, observacao: "" });
    await carregarContatos(selecionada);
  };

  const vincularFornecedorAtual = async () => {
    const transportadoraParaVincular = transportadoras.find((item) => item.id === transportadoraSelecionadaId) ?? selecionada;
    if (!transportadoraParaVincular || !fornecedorVinculo?.id) {
      setErro("Fornecedor ou transportadora sem cadastro vinculado para criar o relacionamento.");
      return;
    }
    const { error } = await db()
      .from("fornecedor_transportadoras")
      .upsert({ fornecedor_id: fornecedorVinculo.id, transportadora_id: transportadoraParaVincular.id }, { onConflict: "fornecedor_id,transportadora_id" });
    if (error) setErro("Erro ao vincular fornecedor e transportadora.");
    else setErro(null);
  };

  const linkWhatsapp = (value: string | null) => {
    const digits = onlyDigits(value);
    if (!digits) return null;
    return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
  };

  const transportadorasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return transportadoras;
    return transportadoras.filter((item) =>
      [item.nome, item.cnpj, item.email, item.telefone, item.whatsapp, item.contato_responsavel]
        .some((value) => (value ?? "").toLowerCase().includes(termo))
    );
  }, [transportadoras, busca]);

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Transportadoras</h1>
          <p style={descStyle}>Cadastro de transportadoras e contatos para confirmacao da agenda futura.</p>
        </div>
        <button type="button" style={buttonPrimaryStyle} onClick={() => { setSelecionada(null); setMostrarForm((v) => !v); }}>
          {mostrarForm ? "Fechar" : "Nova transportadora"}
        </button>
      </div>
      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      {fornecedorVinculo && (
        <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ color: theme.colors.textSoft }}>
            Vinculo solicitado para fornecedor: <strong>{fornecedorVinculo.nome || fornecedorVinculo.id || "-"}</strong>
          </div>
          <button type="button" style={buttonPrimaryStyle} onClick={() => void vincularFornecedorAtual()} disabled={!transportadoraSelecionadaId}>
            {transportadoraSelecionadaId ? "Vincular transportadora selecionada" : "Selecione uma transportadora"}
          </button>
        </div>
      )}
      <div style={cardStyle}>
        <input
          style={inputStyle}
          placeholder="Buscar transportadora por nome, CNPJ, e-mail, telefone, WhatsApp ou contato"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {mostrarForm && (
        <form onSubmit={salvar} style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={gridStyle}>
            <input style={inputStyle} placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <input style={inputStyle} placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            <input style={inputStyle} placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <input style={inputStyle} placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <input style={inputStyle} placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="Contato responsavel" value={form.contato_responsavel} onChange={(e) => setForm({ ...form, contato_responsavel: e.target.value })} />
          </div>
          <textarea style={{ ...inputStyle, minHeight: 70 }} placeholder="Observacao" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          <label style={{ color: theme.colors.textSoft, fontSize: 13 }}>
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} style={{ marginRight: 8 }} />
            Ativo
          </label>
          <div><button type="submit" style={buttonPrimaryStyle} disabled={loading}>Salvar transportadora</button></div>
        </form>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 14 }}>
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          {loading && <div style={{ color: theme.colors.textMuted }}>Carregando...</div>}
          <div style={{ display: "grid", gap: 10 }}>
            {transportadorasFiltradas.map((t) => {
              const wa = linkWhatsapp(t.whatsapp);
              const selected = transportadoraSelecionadaId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setTransportadoraSelecionadaId(t.id);
                    void carregarContatos(t);
                  }}
                  style={{
                    ...cardStyle,
                    cursor: "pointer",
                    background: selected ? "rgba(34,197,94,0.10)" : theme.colors.cardBg,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <label style={{ display: "flex", gap: 8, alignItems: "center", color: theme.colors.text }}>
                    <input
                      type="radio"
                      name="transportadora-selecionada-card"
                      checked={selected}
                      onChange={() => {
                        setTransportadoraSelecionadaId(t.id);
                        void carregarContatos(t);
                      }}
                    />
                    <strong>{t.nome}</strong>
                  </label>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>CNPJ: {t.cnpj ?? "-"} | Contato: {t.contato_responsavel ?? "-"}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>E-mail: {t.email ?? "-"} | Telefone: {t.telefone ?? "-"}</div>
                  <div style={{ color: t.ativo ? theme.colors.success : theme.colors.danger, fontSize: 12 }}>{t.ativo ? "Ativo" : "Inativo"}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" style={buttonSecondaryStyle} onClick={(e) => { e.stopPropagation(); editar(t); }}>Editar</button>
                    <button type="button" style={buttonSecondaryStyle} onClick={(e) => { e.stopPropagation(); setTransportadoraSelecionadaId(t.id); void carregarContatos(t); }}>Contatos</button>
                    {wa && <a href={wa} target="_blank" rel="noreferrer" style={buttonSecondaryStyle} onClick={(e) => e.stopPropagation()}>WhatsApp</a>}
                    {t.email && <a href={`mailto:${t.email}`} style={buttonSecondaryStyle} onClick={(e) => e.stopPropagation()}>E-mail</a>}
                  </div>
                </div>
              );
            })}
            {transportadorasFiltradas.length === 0 && !loading && <div style={{ color: theme.colors.textMuted }}>Nenhuma transportadora cadastrada.</div>}
          </div>
          <table style={{ display: "none", width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                {["Selecionar", "Nome", "CNPJ", "Contato", "E-mail", "Telefone", "Status", "Acoes"].map((col) => <th key={col} style={{ padding: 8 }}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {transportadorasFiltradas.map((t) => {
                const wa = linkWhatsapp(t.whatsapp);
                return (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setTransportadoraSelecionadaId(t.id);
                      void carregarContatos(t);
                    }}
                    style={{
                      borderTop: `1px solid ${theme.colors.borderSoft}`,
                      cursor: "pointer",
                      background: transportadoraSelecionadaId === t.id ? "rgba(34,197,94,0.10)" : "transparent",
                    }}
                  >
                    <td style={{ padding: 9 }}>
                      <input
                        type="radio"
                        name="transportadora-selecionada"
                        checked={transportadoraSelecionadaId === t.id}
                        onChange={() => {
                          setTransportadoraSelecionadaId(t.id);
                          void carregarContatos(t);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ padding: 9 }}>{t.nome}</td>
                    <td style={{ padding: 9 }}>{t.cnpj ?? "-"}</td>
                    <td style={{ padding: 9 }}>{t.contato_responsavel ?? "-"}</td>
                    <td style={{ padding: 9 }}>{t.email ?? "-"}</td>
                    <td style={{ padding: 9 }}>{t.telefone ?? "-"}</td>
                    <td style={{ padding: 9, color: t.ativo ? theme.colors.success : theme.colors.danger }}>{t.ativo ? "Ativo" : "Inativo"}</td>
                    <td style={{ padding: 9 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" style={buttonSecondaryStyle} onClick={(e) => { e.stopPropagation(); editar(t); }}>Editar</button>
                        <button type="button" style={buttonSecondaryStyle} onClick={(e) => { e.stopPropagation(); setTransportadoraSelecionadaId(t.id); void carregarContatos(t); }}>Contatos</button>
                        {wa && <a href={wa} target="_blank" rel="noreferrer" style={buttonSecondaryStyle}>WhatsApp</a>}
                        {t.email && <a href={`mailto:${t.email}`} style={buttonSecondaryStyle}>E-mail</a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {transportadorasFiltradas.length === 0 && !loading && <tr><td colSpan={8} style={{ padding: 12, color: theme.colors.textMuted }}>Nenhuma transportadora cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
        {selecionada && (
          <aside style={{ ...cardStyle, display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, color: theme.colors.neonOrange, fontSize: 17 }}>Contatos</h2>
            <div style={{ color: theme.colors.textSoft, fontWeight: 800 }}>{selecionada.nome}</div>
            <form onSubmit={salvarContato} style={{ display: "grid", gap: 8 }}>
              <input style={inputStyle} placeholder="Nome do contato" value={contatoForm.nome} onChange={(e) => setContatoForm({ ...contatoForm, nome: e.target.value })} />
              <input style={inputStyle} placeholder="Cargo" value={contatoForm.cargo} onChange={(e) => setContatoForm({ ...contatoForm, cargo: e.target.value })} />
              <input style={inputStyle} placeholder="Telefone" value={contatoForm.telefone} onChange={(e) => setContatoForm({ ...contatoForm, telefone: e.target.value })} />
              <input style={inputStyle} placeholder="WhatsApp" value={contatoForm.whatsapp} onChange={(e) => setContatoForm({ ...contatoForm, whatsapp: e.target.value })} />
              <input style={inputStyle} placeholder="E-mail" value={contatoForm.email} onChange={(e) => setContatoForm({ ...contatoForm, email: e.target.value })} />
              <label style={{ color: theme.colors.textSoft, fontSize: 13 }}><input type="checkbox" checked={contatoForm.principal} onChange={(e) => setContatoForm({ ...contatoForm, principal: e.target.checked })} style={{ marginRight: 8 }} />Principal</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="Observacao" value={contatoForm.observacao} onChange={(e) => setContatoForm({ ...contatoForm, observacao: e.target.value })} />
              <button type="submit" style={buttonPrimaryStyle}>Adicionar contato</button>
              <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Depois de salvar, o painel continua aberto para incluir outro contato.</div>
            </form>
            <div style={{ display: "grid", gap: 8 }}>
              {contatos.map((contato) => (
                <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                  <div style={{ fontWeight: 800 }}>{contato.nome} {contato.principal ? "(principal)" : ""}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{contato.cargo ?? "-"} | {contato.email ?? "-"}</div>
                </div>
              ))}
              {contatos.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhum contato cadastrado.</div>}
            </div>
          </aside>
        )}
        {!selecionada && (
          <aside style={{ ...cardStyle, color: theme.colors.textMuted }}>
            Selecione uma transportadora na lista para visualizar contatos e vincular ao fornecedor.
          </aside>
        )}
      </div>
    </section>
  );
}

type GestaoAgendaImportRow = {
  codigo_agenda: string;
  transportadora_nome: string;
  fornecedor_nome: string;
  notas_fiscais: string;
  data_agenda: string | null;
  horario: string | null;
  doca: string;
  deposito: string;
  tipo_carga: string;
  qtd_veiculos: number;
  tipo_veiculo: string;
  tipo_volume: string;
  volumes: number;
  sku: number;
  unidade_negocios: string;
};

const getCell = (row: Record<string, string>, key: string) => row[normalizeHeader(key)]?.trim() ?? "";

const parseAgendaHorario = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { data: null, horario: null };
  const serial = parseExcelSerialDate(trimmed);
  if (serial) return serial;
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) {
    return {
      data: `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`,
      horario: br[4] ? `${br[4].padStart(2, "0")}:${br[5]}:${br[6] ?? "00"}` : null,
    };
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    return {
      data: `${iso[1]}-${iso[2]}-${iso[3]}`,
      horario: iso[4] ? `${iso[4].padStart(2, "0")}:${iso[5]}:${iso[6] ?? "00"}` : null,
    };
  }
  return { data: parseDateBR(trimmed), horario: parseTime(trimmed) };
};

const parseGestaoAgendaRows = async (file: File) => {
  const rows =
    file.name.toLowerCase().endsWith(".xlsx") || file.type.includes("spreadsheet")
      ? await parseXlsxTable(file)
      : parseDelimitedTable(await file.text());
  return rows
    .filter((row) => getCell(row, "CODIGO_AGENDA") || getCell(row, "FORNECEDOR") || getCell(row, "HORARIO"))
    .map((row): GestaoAgendaImportRow => {
      const agendaHorario = parseAgendaHorario(getCell(row, "HORARIO"));
      return {
        codigo_agenda: getCell(row, "CODIGO_AGENDA"),
        transportadora_nome: getCell(row, "TRANSPORTADORA"),
        fornecedor_nome: getCell(row, "FORNECEDOR"),
        notas_fiscais: getCell(row, "NOTAS"),
        data_agenda: agendaHorario.data,
        horario: agendaHorario.horario,
        doca: getCell(row, "DOCA"),
        deposito: getCell(row, "DEPOSITO"),
        tipo_carga: getCell(row, "TIPO_CARGA"),
        qtd_veiculos: parseDecimal(getCell(row, "QTD_VEICULOS")),
        tipo_veiculo: getCell(row, "TIPO_VEICULO"),
        tipo_volume: getCell(row, "TIPO_VOLUME"),
        volumes: parseDecimal(getCell(row, "VOLUMES")),
        sku: parseDecimal(getCell(row, "SKU")),
        unidade_negocios: getCell(row, "UNIDADE_NEGOCIOS"),
      };
    });
};

const isGestaoAgendaFile = async (file: File) => {
  if (file.name.toLowerCase().endsWith(".xlsx") || file.type.includes("spreadsheet")) {
    const rows = await parseXlsxTable(file);
    return rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], "CODIGO_AGENDA");
  }
  const firstLine = (await file.text()).split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  return splitDelimitedLine(firstLine).map(normalizeHeader).includes("CODIGO_AGENDA");
};

const importarGestaoAgendaRows = async (
  rowsGestao: GestaoAgendaImportRow[],
  onProgress?: (current: number, total: number) => void
) => {
  const fornecedoresCache = new Map<string, { id: string | null; criado: boolean }>();
  const transportadorasCache = new Map<string, { id: string | null; criado: boolean }>();
  const erros: string[] = [];
  let fornecedoresCriados = 0;
  let transportadorasCriadas = 0;
  let agendasNovas = 0;
  let agendasAtualizadas = 0;

  const buscarFornecedor = async (nome: string) => {
    const clean = nome.trim();
    if (!clean) return null;
    const cached = fornecedoresCache.get(clean);
    if (cached) return cached.id;
    const { data: existente, error: buscaError } = await db()
      .from("fornecedores")
      .select("id")
      .eq("nome", clean)
      .limit(1)
      .maybeSingle();
    if (buscaError) throw buscaError;
    if (existente?.id) {
      fornecedoresCache.set(clean, { id: existente.id, criado: false });
      return existente.id as string;
    }
    const { data: criado, error: createError } = await db()
      .from("fornecedores")
      .insert({ nome: clean, ativo: true })
      .select("id")
      .single();
    if (createError) throw createError;
    fornecedoresCache.set(clean, { id: criado.id, criado: true });
    fornecedoresCriados += 1;
    return criado.id as string;
  };

  const buscarTransportadora = async (nome: string) => {
    const clean = nome.trim();
    if (!clean) return null;
    const cached = transportadorasCache.get(clean);
    if (cached) return cached.id;
    const { data: existente, error: buscaError } = await db()
      .from("transportadoras")
      .select("id")
      .eq("nome", clean)
      .limit(1)
      .maybeSingle();
    if (buscaError) throw buscaError;
    if (existente?.id) {
      transportadorasCache.set(clean, { id: existente.id, criado: false });
      return existente.id as string;
    }
    const { data: criada, error: createError } = await db()
      .from("transportadoras")
      .insert({ nome: clean, ativo: true })
      .select("id")
      .single();
    if (createError) throw createError;
    transportadorasCache.set(clean, { id: criada.id, criado: true });
    transportadorasCriadas += 1;
    return criada.id as string;
  };

  for (const [index, row] of rowsGestao.entries()) {
    onProgress?.(index + 1, rowsGestao.length);
    try {
      if (!row.codigo_agenda) {
        erros.push(`Linha ${index + 2}: CODIGO_AGENDA vazio.`);
        continue;
      }
      const fornecedorId = await buscarFornecedor(row.fornecedor_nome);
      const transportadoraId = await buscarTransportadora(row.transportadora_nome);
      if (fornecedorId && transportadoraId) {
        await db()
          .from("fornecedor_transportadoras")
          .upsert({ fornecedor_id: fornecedorId, transportadora_id: transportadoraId }, { onConflict: "fornecedor_id,transportadora_id" });
      }

      const payload = {
        codigo_agenda: row.codigo_agenda,
        transportadora_nome: row.transportadora_nome || null,
        fornecedor_nome: row.fornecedor_nome || null,
        notas_fiscais: row.notas_fiscais || null,
        data_agenda: row.data_agenda,
        horario: row.horario,
        doca: row.doca || null,
        deposito: row.deposito || null,
        tipo_carga: row.tipo_carga || null,
        qtd_veiculos: row.qtd_veiculos,
        tipo_veiculo: row.tipo_veiculo || null,
        tipo_volume: row.tipo_volume || null,
        volumes: row.volumes,
        sku: row.sku,
        unidade_negocios: row.unidade_negocios || null,
        fornecedor_id: fornecedorId,
        transportadora_id: transportadoraId,
        possui_nota: row.notas_fiscais.trim().length > 0,
      };

      const { data: existente, error: existeError } = await db()
        .from("gestao_agenda")
        .select("id")
        .eq("codigo_agenda", row.codigo_agenda)
        .limit(1)
        .maybeSingle();
      if (existeError) throw existeError;

      const { error } = await db()
        .from("gestao_agenda")
        .upsert(payload, { onConflict: "codigo_agenda" });
      if (error) throw error;
      if (existente?.id) agendasAtualizadas += 1;
      else agendasNovas += 1;
    } catch (e: any) {
      erros.push(`Linha ${index + 2}: ${e?.message ?? "erro ao importar"}`);
    }
  }

  return {
    totalImportado: agendasNovas + agendasAtualizadas,
    fornecedoresCriados,
    transportadorasCriadas,
    agendasAtualizadas,
    agendasNovas,
    erros,
    rowsGestao,
  };
};

const importarGestaoAgendaFile = async (file: File, onProgress?: (current: number, total: number) => void) =>
  importarGestaoAgendaRows(await parseGestaoAgendaRows(file), onProgress);

export function RecebimentoImportarAgendaFutura({ perfil: _perfil }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [linhasImportacao, setLinhasImportacao] = useState<GestaoAgendaImportRow[]>([]);
  const [preview, setPreview] = useState<GestaoAgendaImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<{
    totalImportado: number;
    fornecedoresCriados: number;
    transportadorasCriadas: number;
    agendasAtualizadas: number;
    agendasNovas: number;
    erros: string[];
  } | null>(null);

  const handleArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setArquivo(file);
    setErro(null);
    setResumo(null);
    setPreview([]);
    setLinhasImportacao([]);
    setProgresso("");
    if (!file) return;
    try {
      if (!(await isGestaoAgendaFile(file))) {
        setErro("O arquivo selecionado nao possui o cabecalho CODIGO_AGENDA esperado.");
        return;
      }
      const linhas = await parseGestaoAgendaRows(file);
      setLinhasImportacao(linhas);
      setPreview(linhas.slice(0, 8));
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao analisar arquivo.");
    }
  };

  const importar = async () => {
    if (!arquivo) {
      setErro("Selecione um arquivo Excel, CSV ou TXT.");
      return;
    }
    setLoading(true);
    setErro(null);
    setResumo(null);
    setProgresso("Preparando importacao...");
    try {
      const linhas = linhasImportacao.length > 0 ? linhasImportacao : await parseGestaoAgendaRows(arquivo);
      setLinhasImportacao(linhas);
      const resultado = await importarGestaoAgendaRows(linhas, (current, total) => {
        if (current === 1 || current === total || current % 10 === 0) setProgresso(`Importando ${current} de ${total} agendas...`);
      });
      setResumo(resultado);
      setPreview(resultado.rowsGestao.slice(0, 8));
      setProgresso("");
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao importar agenda futura.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Importar Agenda Futura</h1>
          <p style={descStyle}>Importa a planilha de gestao de confirmacao de agenda para a tabela recebimento.gestao_agenda.</p>
        </div>
        <a href="/recebimento/confirmacao-agenda" style={buttonSecondaryStyle}>Voltar para confirmacao</a>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <input type="file" accept=".xlsx,.csv,.txt" onChange={handleArquivo} style={inputStyle} />
        <div>
          <button type="button" style={buttonPrimaryStyle} onClick={importar} disabled={loading || !arquivo}>
            {loading ? "Importando..." : "Importar agenda futura"}
          </button>
          {progresso && <span style={{ marginLeft: 12, color: theme.colors.textMuted, fontSize: 13 }}>{progresso}</span>}
        </div>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}

      {resumo && (
        <div style={gridStyle}>
          {[
            ["Total importado", resumo.totalImportado],
            ["Fornecedores criados", resumo.fornecedoresCriados],
            ["Transportadoras criadas", resumo.transportadorasCriadas],
            ["Agendas atualizadas", resumo.agendasAtualizadas],
            ["Agendas novas", resumo.agendasNovas],
            ["Erros", resumo.erros.length],
          ].map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <div style={metricLabelStyle}>{label}</div>
              <div style={metricValueStyle}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <h2 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 16 }}>Preview das primeiras linhas</h2>
        <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              {["Codigo agenda", "Data", "Horario", "Doca", "Fornecedor", "Transportadora", "Notas", "Tipo carga", "Tipo volume", "Volumes", "SKU", "Unidade"].map((col) => (
                <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, index) => (
              <tr key={`${row.codigo_agenda}-${index}`} style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                <td style={{ padding: 8 }}>{row.codigo_agenda || "-"}</td>
                <td style={{ padding: 8 }}>{formatDateBR(row.data_agenda)}</td>
                <td style={{ padding: 8 }}>{row.horario?.slice(0, 5) ?? "-"}</td>
                <td style={{ padding: 8 }}>{row.doca || "-"}</td>
                <td style={{ padding: 8 }}>{row.fornecedor_nome || "-"}</td>
                <td style={{ padding: 8 }}>{row.transportadora_nome || "-"}</td>
                <td style={{ padding: 8 }}>{row.notas_fiscais || "-"}</td>
                <td style={{ padding: 8 }}>{row.tipo_carga || "-"}</td>
                <td style={{ padding: 8 }}>{row.tipo_volume || "-"}</td>
                <td style={{ padding: 8 }}>{row.volumes.toLocaleString("pt-BR")}</td>
                <td style={{ padding: 8 }}>{row.sku.toLocaleString("pt-BR")}</td>
                <td style={{ padding: 8 }}>{row.unidade_negocios || "-"}</td>
              </tr>
            ))}
            {preview.length === 0 && (
              <tr><td colSpan={12} style={{ padding: 12, color: theme.colors.textMuted }}>Selecione um arquivo para visualizar o preview.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {resumo?.erros.length ? (
        <div style={{ ...cardStyle, color: theme.colors.danger }}>
          {resumo.erros.slice(0, 20).map((item) => <div key={item}>{item}</div>)}
        </div>
      ) : null}
    </section>
  );
}

export function RecebimentoImportacao({ perfil }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState({ linhas: 0, agendamentos: 0, itens: 0 });

  const analisarArquivo = async (file: File) => {
    if (await isGestaoAgendaFile(file)) {
      setErro("Este arquivo e de Agenda Futura. Use o menu Importar Agenda Futura.");
      return;
    }
    const text = await file.text();
    const linhas = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const grupos = new Set<string>();
    let itens = 0;
    for (const line of linhas) {
      const cols = splitImportLine(line);
      if (isHeaderLine(cols)) continue;
      grupos.add(agendamentoKey(cols));
      if ((cols[10] ?? "").trim()) itens += 1;
    }
    setPreview({ linhas: linhas.length, agendamentos: grupos.size, itens });
  };

  const handleArquivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setArquivo(file);
    setMensagem(null);
    setErro(null);
    setPreview({ linhas: 0, agendamentos: 0, itens: 0 });
    if (file) void analisarArquivo(file);
  };

  const importar = async () => {
    if (!arquivo) {
      setErro("Selecione um arquivo Excel, CSV ou TXT para importar.");
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);

    try {
      if (await isGestaoAgendaFile(arquivo)) {
        setErro("Este arquivo e de Agenda Futura. Use o menu Importar Agenda Futura.");
        setLoading(false);
        return;
      }

      const text = await arquivo.text();
      const linhas = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const grupos = new Map<string, { cols: string[]; itens: string[][] }>();

      for (const line of linhas) {
        const cols = splitImportLine(line);
        if (isHeaderLine(cols)) continue;
        while (cols.length < 23) cols.push("");
        const key = agendamentoKey(cols);
        if (!grupos.has(key)) grupos.set(key, { cols, itens: [] });
        if ((cols[10] ?? "").trim()) grupos.get(key)!.itens.push(cols);
      }

      const dataReferencia =
        Array.from(grupos.values()).map((g) => parseDateBR(g.cols[2])).find(Boolean) ?? null;
      const empresaImportacao = Array.from(grupos.values()).map((g) => g.cols[0]).find(Boolean) ?? null;
      const chavesArquivo = new Set(Array.from(grupos.keys()));

      const { data: importacao, error: importacaoCreateError } = await db()
        .from("importacoes")
        .insert({
          nome_arquivo: arquivo.name,
          data_referencia: dataReferencia,
          total_linhas: linhas.length,
          usuario_id: perfil.id,
          empresa: empresaImportacao,
        })
        .select("id")
        .single();
      if (importacaoCreateError) throw importacaoCreateError;
      const importacaoId = importacao.id as string;

      const { data: existentesData, error: existentesError } = await db()
        .from("agendamentos")
        .select("*")
        .eq("empresa", empresaImportacao)
        .eq("data_agenda", dataReferencia);
      if (existentesError) throw existentesError;

      const existentesPorChave = new Map<string, any>();
      for (const row of existentesData ?? []) {
        if (row.chave_importacao) existentesPorChave.set(row.chave_importacao, row);
      }

      const fornecedoresCache = new Map<string, string | null>();
      const transportadorasCache = new Map<string, string | null>();
      let totalItens = 0;
      let totalCriados = 0;
      let totalAtualizados = 0;
      let totalRemovidos = 0;
      let totalBacklog = 0;

      for (const [chave, grupo] of grupos.entries()) {
        const cols = grupo.cols;
        const fornecedorNome = extractFornecedorNome(cols[7] ?? "", cols[4] ?? "");
        const fornecedorCodigo = extractFornecedorCodigo(cols[7] ?? "");
        const transportadoraNome = (cols[4] ?? "").trim();
        let fornecedorId: string | null = null;
        let transportadoraId: string | null = null;

        if (fornecedorNome) {
          if (fornecedoresCache.has(fornecedorNome)) {
            fornecedorId = fornecedoresCache.get(fornecedorNome) ?? null;
          } else {
            const { data: existente, error: fornecedorBuscaError } = await db()
              .from("fornecedores")
              .select("id")
              .eq("nome", fornecedorNome)
              .limit(1)
              .maybeSingle();
            if (fornecedorBuscaError) throw fornecedorBuscaError;

            if (existente?.id) {
              fornecedorId = existente.id;
              if (fornecedorCodigo) {
                await db().from("fornecedores").update({ codigo_fornecedor: fornecedorCodigo }).eq("id", fornecedorId);
              }
            } else {
              const { data: criado, error: fornecedorCreateError } = await db()
                .from("fornecedores")
                .insert({ nome: fornecedorNome, codigo_fornecedor: fornecedorCodigo, ativo: true })
                .select("id")
                .single();
              if (fornecedorCreateError) throw fornecedorCreateError;
              fornecedorId = criado.id;
            }
            fornecedoresCache.set(fornecedorNome, fornecedorId);
          }
        }

        if (transportadoraNome) {
          if (transportadorasCache.has(transportadoraNome)) {
            transportadoraId = transportadorasCache.get(transportadoraNome) ?? null;
          } else {
            const { data: existente, error: transportadoraBuscaError } = await db()
              .from("transportadoras")
              .select("id")
              .eq("nome", transportadoraNome)
              .limit(1)
              .maybeSingle();
            if (transportadoraBuscaError) throw transportadoraBuscaError;

            if (existente?.id) {
              transportadoraId = existente.id;
            } else {
              const { data: criada, error: transportadoraCreateError } = await db()
                .from("transportadoras")
                .insert({ nome: transportadoraNome, ativo: true })
                .select("id")
                .single();
              if (transportadoraCreateError) throw transportadoraCreateError;
              transportadoraId = criada.id;
            }
            transportadorasCache.set(transportadoraNome, transportadoraId);
          }
        }

        if (fornecedorId && transportadoraId) {
          await db()
            .from("fornecedor_transportadoras")
            .upsert({ fornecedor_id: fornecedorId, transportadora_id: transportadoraId }, { onConflict: "fornecedor_id,transportadora_id" });
        }

        const totais = grupo.itens.reduce(
          (acc, item) => {
            acc.paletes += parseDecimal(item[16]);
            acc.caixas += parseDecimal(item[17]);
            acc.conferido += parseDecimal(item[18]);
            acc.recebido += parseDecimal(item[19]);
            acc.valor += parseDecimal(item[20]);
            acc.ruptura += parseDecimal(item[21]);
            return acc;
          },
          { paletes: 0, caixas: 0, conferido: 0, recebido: 0, valor: 0, ruptura: 0 }
        );

        const payloadAgendamento = {
          empresa: cols[0] || null,
          nro_box: cols[1] || null,
          data_agenda: parseDateBR(cols[2]),
          horario: parseTime(cols[3]),
          transportadora: cols[4] || null,
          fornecedor_id: fornecedorId,
          fornecedor_codigo: fornecedorCodigo,
          fornecedor_nome: fornecedorNome || null,
          transportadora_id: transportadoraId,
          nro_carga: cols[8] || null,
          status_carga: cols[9] || null,
          status_recebimento: extractStatusRecebimento(cols[4] ?? "", cols[9] ?? ""),
          modalidade: grupo.itens[0]?.[13] || null,
          valor_total: totais.valor,
          total_paletes: totais.paletes,
          total_caixas: totais.caixas,
          total_itens: grupo.itens.length,
          total_conferido: totais.conferido,
          total_recebido: totais.recebido,
          ruptura: totais.ruptura,
          ultima_importacao_id: importacaoId,
          status_importacao: "ativo",
          ultima_atualizacao_importacao_em: new Date().toISOString(),
          removido_da_ultima_importacao: false,
          backlog: false,
          data_finalizacao: cols[22] ? parseDateBR(cols[22]) : null,
        };

        const existente = existentesPorChave.get(chave);
        let agendamentoId: string;
        let acao = "criado";

        if (existente) {
          const { data: atualizado, error: updateError } = await db()
            .from("agendamentos")
            .update(payloadAgendamento)
            .eq("id", existente.id)
            .select("id")
            .single();
          if (updateError) throw updateError;
          agendamentoId = atualizado.id;
          acao = "atualizado";
          totalAtualizados += 1;
          await db().from("agendamento_itens").delete().eq("agendamento_id", agendamentoId);
        } else {
          const { data: criado, error: insertError } = await db()
            .from("agendamentos")
            .insert({ ...payloadAgendamento, chave_importacao: chave, criado_por: perfil.id })
            .select("id")
            .single();
          if (insertError) throw insertError;
          agendamentoId = criado.id;
          totalCriados += 1;
        }

        await db().from("agendamento_historico").insert({
          agendamento_id: agendamentoId,
          importacao_id: importacaoId,
          acao,
          dados_anteriores: existente ?? null,
          dados_novos: payloadAgendamento,
        });

        if (grupo.itens.length > 0) {
          const payloadItens = grupo.itens.map((item) => ({
            agendamento_id: agendamentoId,
            codigo_produto: item[10] || null,
            descricao_produto: item[11] || null,
            secao: item[12] || null,
            modalidade_original: item[13] || null,
            modalidade_compra: item[14] || null,
            norma: item[15] || null,
            palete: parseDecimal(item[16]),
            gerada: parseDecimal(item[17]),
            conferida: parseDecimal(item[18]),
            recebida: parseDecimal(item[19]),
            valor: parseDecimal(item[20]),
            ruptura: parseDecimal(item[21]),
          }));

          const { error: itensError } = await db().from("agendamento_itens").insert(payloadItens);
          if (itensError) throw itensError;
          totalItens += payloadItens.length;
        }
      }

      for (const row of existentesData ?? []) {
        if (!row.chave_importacao || chavesArquivo.has(row.chave_importacao)) continue;
        const finalizado = statusIncludes(row.status_recebimento, ["final", "conclu", "recebid", "cancel"]);
        const backlog = !finalizado && row.data_agenda && row.data_agenda < todayISO();
        const acao = backlog ? "backlog" : "removido_do_arquivo";
        if (backlog) totalBacklog += 1;
        else totalRemovidos += 1;

        const { error: remocaoError } = await db()
          .from("agendamentos")
          .update({
            status_importacao: acao,
            removido_da_ultima_importacao: true,
            backlog,
            ultima_importacao_id: importacaoId,
            ultima_atualizacao_importacao_em: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (remocaoError) throw remocaoError;

        await db().from("agendamento_historico").insert({
          agendamento_id: row.id,
          importacao_id: importacaoId,
          acao,
          dados_anteriores: row,
          dados_novos: { status_importacao: acao, removido_da_ultima_importacao: true, backlog },
        });
      }

      const { error: importacaoUpdateError } = await db()
        .from("importacoes")
        .update({
          total_criados: totalCriados,
          total_atualizados: totalAtualizados,
          total_removidos: totalRemovidos,
          total_backlog: totalBacklog,
        })
        .eq("id", importacaoId);
      if (importacaoUpdateError) throw importacaoUpdateError;

      setMensagem(
        `Importacao concluida: ${totalCriados} criados, ${totalAtualizados} atualizados, ${totalRemovidos} removidos do arquivo, ${totalBacklog} backlog e ${totalItens} itens.`
      );
      setPreview({ linhas: linhas.length, agendamentos: grupos.size, itens: totalItens });
    } catch (e: any) {
      console.error("Erro ao importar agenda:", e);
      setErro(e?.message ?? "Erro ao importar arquivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Importacao Agenda</h1>
        <p style={descStyle}>
          Importacao da agenda operacional/base antiga do recebimento realizado.
        </p>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <input type="file" accept=".txt,.csv" onChange={handleArquivo} style={inputStyle} />
        <div style={gridStyle}>
          <div style={cardStyle}>
            <div style={metricLabelStyle}>Linhas lidas</div>
            <div style={metricValueStyle}>{preview.linhas}</div>
          </div>
          <div style={cardStyle}>
            <div style={metricLabelStyle}>Agendas / Cargas</div>
            <div style={metricValueStyle}>{preview.agendamentos}</div>
          </div>
          <div style={cardStyle}>
            <div style={metricLabelStyle}>Itens</div>
            <div style={metricValueStyle}>{preview.itens}</div>
          </div>
        </div>
        <div>
          <button type="button" style={buttonPrimaryStyle} onClick={importar} disabled={loading}>
            {loading ? "Importando..." : "Importar agenda"}
          </button>
        </div>
      </div>

      {mensagem && <div style={{ ...cardStyle, color: theme.colors.success }}>{mensagem}</div>}
      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
    </section>
  );
}

export function RecebimentoPlaceholder({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>{titulo}</h1>
        <p style={descStyle}>{descricao}</p>
      </div>
      <div style={cardStyle}>
        <div style={metricLabelStyle}>Status</div>
        <div style={{ marginTop: 8, color: theme.colors.textSoft }}>
          Estrutura inicial criada. Esta tela sera detalhada nas proximas etapas do modulo Recebimento.
        </div>
      </div>
    </section>
  );
}

