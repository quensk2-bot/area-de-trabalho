import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../styles";
import type { Usuario } from "../../types";

type Props = { perfil: Usuario };

const appBasePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const appHref = (path: string) => `${appBasePath}${path}` || path;

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
  uf?: string | null;
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
  alterado_na_ultima_importacao: boolean | null;
  campos_alterados: Record<string, { de: unknown; para: unknown }> | null;
  ultima_importacao_id: string | null;
  ultima_atualizacao_importacao: string | null;
  created_at: string | null;
  fornecedor_whatsapp?: string | null;
  fornecedor_email?: string | null;
  transportadora_whatsapp?: string | null;
  transportadora_email?: string | null;
};

type GestaoAgendaRowCampoReimportacao =
  | "notas_fiscais"
  | "horario"
  | "doca"
  | "deposito"
  | "tipo_carga"
  | "qtd_veiculos"
  | "tipo_veiculo"
  | "tipo_volume"
  | "volumes"
  | "sku"
  | "unidade_negocios"
  | "fornecedor_nome"
  | "transportadora_nome";

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

type LinhaTempoAgenda = {
  id: string;
  agendamento_id: string;
  tipo: string;
  descricao: string;
  usuario_id: string | null;
  created_at: string | null;
  usuario_nome?: string | null;
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
  fornecedor_contato_id: string | null;
  transportadora_contato_id: string | null;
  contato_origem: string | null;
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
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return null;
};

const parseMonthNumber = (value: string | undefined) => {
  const trimmed = (value ?? "").trim();
  const monthByName: Record<string, number> = {
    JANEIRO: 1,
    FEVEREIRO: 2,
    MARCO: 3,
    MARÇO: 3,
    ABRIL: 4,
    MAIO: 5,
    JUNHO: 6,
    JULHO: 7,
    AGOSTO: 8,
    SETEMBRO: 9,
    OUTUBRO: 10,
    NOVEMBRO: 11,
    DEZEMBRO: 12,
  };
  const upper = trimmed.toUpperCase();
  if (monthByName[upper]) return monthByName[upper];
  const match = trimmed.match(/(\d{1,2})/);
  if (!match) return null;
  return Number(match[1]);
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

const parseWorkbookSheetRows = (workbook: XLSX.WorkBook, sheetName: string, requiredHeaders: string[]) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [] as Record<string, string>[];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  const headerRow = rows.find((row) =>
    row.some((cell) => requiredHeaders.includes(normalizeHeader(String(cell ?? ""))))
  );
  if (!headerRow) return [] as Record<string, string>[];
  const startIndex = rows.indexOf(headerRow) + 1;
  const headers = headerRow.map((cell) => String(cell ?? "").trim());
  return rows.slice(startIndex).filter((row) => row.some((cell) => String(cell ?? "").trim() !== "")).map((row) => {
    const normalizedRow: Record<string, string> = {};
    headers.forEach((header, index) => {
      normalizedRow[normalizeHeader(header)] = String(row[index] ?? "").trim();
    });
    return normalizedRow;
  });
};

const getFirstDateYear = (value: string | null | undefined) => {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Number(iso[1]);
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return Number(br[3]);
  return null;
};

const parseDiaMesWithYear = (value: string | undefined, year?: number) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const explicit = parseDateBR(trimmed);
  if (explicit) return explicit;
  const match = trimmed.match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
  if (!match) return null;
  const day = match[1];
  const month = match[2];
  const yearPart = match[3] ? Number(match[3]) : year;
  if (!yearPart) return null;
  return `${yearPart}-${month}-${day}`;
};

const parsePortalRow = (row: Record<string, string>) => {
  const status = row["STATUS_RECEBIMENTO"] ?? "";
  const statusLower = status.toLowerCase();
  const concluido = parseDecimal(row["CONCLUIDO"]) > 0 || statusIncludes(status, ["concluido", "concluido", "finalizado", "ok"]);
  const noShow = statusIncludes(status, ["no show", "noshow"]);
  const naoRealizado = parseDecimal(row["NAO_REALIZADO"]) > 0 || statusIncludes(status, ["nao realizado", "não realizado"]);
  const abandono = statusIncludes(status, ["abandono", "aband"]) || statusIncludes(row["ACOES_DO_ABASTECIMENTO"], ["aband"]);
  const observacao = [
    row["OCORRENCIA"],
    row["ACOES_DO_ABASTECIMENTO"],
    row["RETORNO"],
    row["CAUSAS_DA_NAO_DESCARGA"],
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    mes: row["MES"] || null,
    data_recebimento: parseDateBR(row["DATA"]) || parseDateBR(row["DATA_RECEBIMENTO"]) || null,
    uf: row["UF"] || null,
    dia_recebimento: row["DIA_RECEBIMENTO_MES"] || null,
    ticket: row["TICKET"] || null,
    hora: parseTime(row["HORA"] || row["HORARIO"]),
    numero_nota: row["N_NUMA_NOTA"] || row["N_NUMERO_NOTA"] || row["N_NOTA"] || null,
    pedidos: row["PEDIDOS"] || null,
    fornecedor_nome: row["FORNECEDOR"] || null,
    transportadora_nome: row["DESTINATARIO"] || row["EMPRESA"] || null,
    volumes: parseDecimal(row["VOLUMES"]),
    sku: parseDecimal(row["SKUS"]),
    status_recebimento: status || null,
    modalidade: row["PADRAO_DE_RECEBIMENTO"] || null,
    tipo_carga: row["GRUPO"] || null,
    tipo_veiculo: row["TIPO_VEICULO"] || null,
    perfil_carga: row["PERFIL_DA_CARGA"] || null,
    valor: parseDecimal(row["VALOR"]),
    paletes: parseDecimal(row["PALETES"]),
    caixas: parseDecimal(row["CAIXAS"]),
    concluido,
    no_show: noShow,
    nao_realizado: naoRealizado,
    abandono,
    observacao: observacao || null,
  };
};

const parsePlanejamentoRow = (row: Record<string, string>, yearOverride?: number) => {
  const agenda = row["AGENDAMENTO"] || "";
  const data_referencia = parseDiaMesWithYear(agenda, yearOverride) || parseDateBR(row["HORA_CHEGADA"]);
  const fornecedorMatch = agenda.match(/\d+\s+(.+)$/);
  const fornecedor_nome = fornecedorMatch ? fornecedorMatch[1].trim() : agenda.trim() || null;
  const tipoVeiculoParts: string[] = [];
  if (parseDecimal(row["CARRETA"]) > 0) tipoVeiculoParts.push("Carreta");
  if (parseDecimal(row["TRUCK"]) > 0) tipoVeiculoParts.push("Truck");
  if (parseDecimal(row["TOCO"]) > 0) tipoVeiculoParts.push("Toco");
  if (parseDecimal(row["VAN"]) > 0) tipoVeiculoParts.push("Van");

  return {
    data_referencia,
    uf: row["UF"] || null,
    fornecedor_nome,
    transportadora_nome: agenda || null,
    nro_carga: row["NRO_CARGA"] || null,
    hora_chegada: parseTime(row["HORA_CHEGADA"]),
    estivada: parseDecimal(row["ESTIVADA"]),
    repaletizada: parseDecimal(row["REPALETIZADA"]),
    paletizada: parseDecimal(row["PALETIZADA"]),
    itens: parseDecimal(row["ITENS"]),
    cross: parseDecimal(row["ITENS_CROSS"]),
    armaz: parseDecimal(row["ITENS_ARMAZ"]),
    paletes: parseDecimal(row["PALETES"]),
    percentual_palete: parseDecimal(row["PALETE"]),
    caixas: parseDecimal(row["CAIXAS"]),
    percentual_conferencia: parseDecimal(row["P_CONFERENCIA"]),
    tipo_veiculo: tipoVeiculoParts.join("/") || null,
    observacao: null,
  };
};

const parseMetaRow = (row: Record<string, string>) => {
  const mesNumber = parseMonthNumber(row["MES"] || row["MÊS"]) || null;
  const ano = Number(row["ANO"] || "") || getFirstDateYear(row["INICIO"]) || getFirstDateYear(row["FIM"]);
  const dias_recebimento = parseDecimal(row["DIAS_DE_RECEBIMENTO"] || row["DIAS_RECEBIMENTO"]);
  const capacidade_dia = parseDecimal(row["CAPACIDADE"] || row["CAPACIDADE_DIA"] || row["CAPACIDADE "]);
  const meta_recebimento_mes = parseDecimal(row["META_RECEBIMENTO_MES"]) || dias_recebimento * capacidade_dia;
  return {
    uf: row["UF"] || null,
    mes: mesNumber,
    ano: ano || null,
    dias_recebimento,
    feriados: parseDecimal(row["FERIADOS"]),
    capacidade_dia,
    meta_recebimento_mes,
    meta_no_show_percentual: 0,
    meta_no_show_dia: 0,
    observacao: row["OBSERVACAO"] || null,
  };
};

const parseNoShowMetaRows = (rows: Record<string, string>[]) => {
  const metaHeaders = ["UF", "MES", "ANO"];
  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0] ?? {});
  const hasMetaHeaders = metaHeaders.every((header) => headers.includes(header));
  if (!hasMetaHeaders) return null;
  return rows
    .filter((row) => (row["UF"] || row["MES"] || row["ANO"] || row["MÊS"]).trim() !== "")
    .map(parseMetaRow);
};

const parseNoShowPlanningText = (text: string) => {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return { portalRows: [], planejamentoRows: [], metasRows: [] };
  }

  const headers = splitImportLine(lines[0]).map((header) => header.trim().toUpperCase());
  const rawRows = lines.slice(1).map((line) => {
    const cells = splitImportLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });

  const metaRows = parseNoShowMetaRows(rawRows);
  if (metaRows) {
    return { portalRows: [], planejamentoRows: [], metasRows: metaRows };
  }

  const planningLikeHeaders = ["NROEMPRESA", "NRO_BOX", "AGENDA", "HORARIO", "TRANSPORTADORA", "NROCARGA"];
  const hasPlanningHeaders = planningLikeHeaders.some((header) => headers.includes(header));
  if (!hasPlanningHeaders) {
    throw new Error("O TXT selecionado não possui o layout esperado de planejamento.");
  }

  const grouped = groupBy(rawRows, (row) =>
    [row.NROEMPRESA || "", row.NRO_BOX || "", row.AGENDA || "", row.HORARIO || "", row.TRANSPORTADORA || "", row.NROCARGA || ""]
      .join("|")
  );

  const planejamentoRows = grouped.map(([, rows]) => {
    const first = rows[0];
    const dataReferencia = parseDateBR(first.AGENDA) ?? null;
    const horaChegada = parseTime(first.HORARIO);
    const uf = first.NROEMPRESA || null;
    const fornecedorNome = first.FORNECEDOR || first.TRANSPORTADORA || null;
    const transportadoraNome = first.TRANSPORTADORA || null;
    const sumField = (field: string) => rows.reduce((sum, row) => sum + parseDecimal(row[field]), 0);
    const itens = rows.length;
    const paletes = sumField("PALETE");
    const cross = rows.filter((row) => /cross/i.test(`${row.MODALIDADECD || ""} ${row.MODALIDADECOMPRA || ""}`)).length;
    const armaz = rows.filter((row) => /armazen/i.test(`${row.MODALIDADECD || ""} ${row.MODALIDADECOMPRA || ""}`)).length;

    return {
      data_referencia: dataReferencia,
      uf,
      fornecedor_nome: fornecedorNome,
      transportadora_nome: transportadoraNome,
      nro_carga: first.NROCARGA || null,
      hora_chegada: horaChegada,
      estivada: sumField("RECEBIDA"),
      repaletizada: sumField("CONFERIDA"),
      paletizada: sumField("GERADA"),
      itens,
      cross,
      armaz,
      paletes,
      percentual_palete: paletes,
      caixas: sumField("RECEBIDA"),
      percentual_conferencia: rows.length === 0 ? 0 : sumField("CONFERIDA") / rows.length,
      tipo_veiculo: first.MODALIDADECD || first.MODALIDADECOMPRA || null,
      observacao: first.STATUS_CARGA || null,
    };
  });
  const meses = Array.from(new Set(rawRows.map((row) => (row.AGENDA ? row.AGENDA.slice(3, 5) || null : null)).filter(Boolean)));
  const metasRows = meses.length === 0
    ? []
    : [{
        uf: planejamentoRows[0]?.uf || null,
        mes: Number(meses[0]) || null,
        ano: planejamentoRows[0]?.data_referencia ? Number(planejamentoRows[0].data_referencia.slice(0, 4)) : null,
        dias_recebimento: 0,
        feriados: 0,
        capacidade_dia: 0,
        meta_recebimento_mes: 0,
        meta_no_show_percentual: 0,
        meta_no_show_dia: 0,
        observacao: "Importado do TXT de planejamento",
      }];

  return { portalRows: [], planejamentoRows, metasRows };
};

const mapGestaoAgendaRowToNoShowPortalRow = (row: GestaoAgendaImportRow) => {
  const ufFromUnidade = row.unidade_negocios.match(/\b([A-Z]{2})\s+CD\b|\bCD\s+([A-Z]{2})\b/)?.[1] ?? row.unidade_negocios.match(/\b([A-Z]{2})\s+CD\b|\bCD\s+([A-Z]{2})\b/)?.[2] ?? null;
  const ufFromDeposito = row.deposito.match(/\b([A-Z]{2})\s+CD\b|\bCD\s+([A-Z]{2})\b/)?.[1] ?? row.deposito.match(/\b([A-Z]{2})\s+CD\b|\bCD\s+([A-Z]{2})\b/)?.[2] ?? null;
  return {
    mes: row.data_agenda ? row.data_agenda.slice(5, 7) : null,
    data_recebimento: row.data_agenda,
    uf: ufFromUnidade || ufFromDeposito,
    dia_recebimento: row.data_agenda ? row.data_agenda.slice(8, 10) : null,
    ticket: row.codigo_agenda,
    hora: row.horario,
    numero_nota: row.notas_fiscais || null,
    pedidos: row.doca || null,
    fornecedor_nome: row.fornecedor_nome,
    transportadora_nome: row.transportadora_nome,
    volumes: row.volumes,
    sku: row.sku,
    status_recebimento: row.tipo_carga || null,
    modalidade: row.tipo_volume || null,
    tipo_carga: row.tipo_carga || null,
    tipo_veiculo: row.tipo_veiculo || null,
    perfil_carga: row.deposito || row.doca || null,
    valor: 0,
    paletes: row.tipo_volume.toLowerCase().includes("palete") ? row.volumes : 0,
    caixas: row.tipo_volume.toLowerCase().includes("caixa") ? row.volumes : 0,
    concluido: false,
    no_show: false,
    nao_realizado: false,
    abandono: false,
    observacao: row.notas_fiscais || row.deposito || null,
  };
};

const UTF8_BOM = "\uFEFF";

const readTextFile = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes).replace(/^\uFEFF/, "");
  }
};

const parseNoShowWorkbook = async (file: File) => {
  if (/\.(txt|csv)$/i.test(file.name)) {
    return parseNoShowPlanningText(await readTextFile(file));
  }

  const gestaoAgendaRows = await parseGestaoAgendaRows(file);
  if (gestaoAgendaRows.length > 0) {
    const portalRows = gestaoAgendaRows.map(mapGestaoAgendaRowToNoShowPortalRow);
    const uf = portalRows.find((row) => row.uf)?.uf ?? null;
    const mes = portalRows.find((row) => row.mes)?.mes ?? null;
    const primeiraData = portalRows.find((row) => row.data_recebimento)?.data_recebimento ?? null;
    const ano = primeiraData ? getFirstDateYear(primeiraData) : null;
    const metasRows = uf && mes && ano
      ? [{
          uf,
          mes: Number(mes) || null,
          ano: ano || null,
          dias_recebimento: 0,
          feriados: 0,
          capacidade_dia: 0,
          meta_recebimento_mes: 0,
          meta_no_show_percentual: 0,
          meta_no_show_dia: 0,
          observacao: "Importado da planilha de agenda",
        }]
      : [];
    return { portalRows, planejamentoRows: [], metasRows };
  }

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

  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName) {
    const firstSheetRows = parseWorkbookSheetRows(workbook, firstSheetName, ["UF", "MES", "ANO"]);
    const standaloneMetas = parseNoShowMetaRows(firstSheetRows);
    if (standaloneMetas) {
      return { portalRows: [], planejamentoRows: [], metasRows: standaloneMetas };
    }
  }

  const portalRowsData = parseWorkbookSheetRows(workbook, "Base 1_portal", ["FORNECEDOR", "STATUS_RECEBIMENTO", "TICKET"]);
  const portalRows = portalRowsData.map(parsePortalRow);
  const portalYear = portalRows.map((row) => getFirstDateYear(row.data_recebimento)).find(Boolean) ?? undefined;

  const planejamentoRowsData = parseWorkbookSheetRows(workbook, "Base 2_planejamento", ["AGENDAMENTO", "NRO_CARGA"]);
  const planejamentoRows = planejamentoRowsData.map((row) => parsePlanejamentoRow(row, portalYear));

  const metasRowsData = parseWorkbookSheetRows(workbook, "UF", ["UF", "MES", "CAPACIDADE"]);
  const metasRows = metasRowsData.map(parseMetaRow);

  return { portalRows, planejamentoRows, metasRows };
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

type NoShowPortalRow = ReturnType<typeof parsePortalRow>;
type NoShowPlanejamentoRow = ReturnType<typeof parsePlanejamentoRow>;
type NoShowMetaRow = ReturnType<typeof parseMetaRow>;
type NoShowImportacaoHistorico = {
  id: string;
  created_at: string | null;
  nome_arquivo: string | null;
  mes_referencia: number | null;
  ano_referencia: number | null;
  uf: string | null;
  total_linhas: number | null;
  status: string | null;
  observacao: string | null;
};

type NoShowResumoMensalRow = {
  uf: string | null;
  mes: string | null;
  ano: number | null;
  agendas_mes: number | string | null;
  recebidas: number | string | null;
  nao_recebidas: number | string | null;
  total_no_show: number | string | null;
  percentual_no_show: number | string | null;
  media_recebidas_dia: number | string | null;
  media_no_show_dia: number | string | null;
  capacidade_dia: number | string | null;
  meta_recebimento_mes: number | string | null;
  percentual_recebido: number | string | null;
};

type NoShowDashboardResumoRow = {
  uf: string | null;
  mes: string | null;
  ano: number | null;
  produtos: number | string | null;
  paletes: number | string | null;
  caixas: number | string | null;
  valor_total: number | string | null;
  total_agendas: number | string | null;
  realizado: number | string | null;
  no_show: number | string | null;
  nao_realizado: number | string | null;
  abandono: number | string | null;
  eficiencia: number | string | null;
  acuracia: number | string | null;
};

type NoShowTopFornecedorRow = {
  uf: string | null;
  mes: string | null;
  ano: number | null;
  fornecedor_nome: string | null;
  agendas: number | string | null;
  recebidas: number | string | null;
  nao_recebidas: number | string | null;
  no_show: number | string | null;
  percentual_no_show: number | string | null;
  ranking: number | string | null;
};

type NoShowBasePortalDashboardRow = {
  id: string;
  mes: string | null;
  data_recebimento: string | null;
  uf: string | null;
  fornecedor_nome: string | null;
  status_recebimento: string | null;
  concluido: boolean | null;
  no_show: boolean | null;
  nao_realizado: boolean | null;
  abandono: boolean | null;
  sku: number | string | null;
  paletes: number | string | null;
  caixas: number | string | null;
  valor: number | string | null;
  volumes: number | string | null;
};

type NoShowMetaCapacidadeDashboardRow = {
  uf: string | null;
  mes: number | null;
  ano: number | null;
  capacidade_dia: number | string | null;
  meta_recebimento_mes: number | string | null;
};

type RecebimentoRealizadoAgendamentoRow = {
  id: string;
  data_agenda: string | null;
  horario: string | null;
  empresa: string | null;
  transportadora: string | null;
  fornecedor_nome: string | null;
  nro_box: string | null;
  nro_carga: string | null;
  status_carga: string | null;
  modalidade: string | null;
  total_paletes: number | string | null;
  total_caixas: number | string | null;
  total_itens: number | string | null;
  total_conferido: number | string | null;
  total_recebido: number | string | null;
  ruptura: number | string | null;
  nota_fiscal: string | null;
  confirmacao_status: string | null;
  confirmacao_observacao: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
};

type RecebimentoRealizadoGestaoRow = {
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
  tipo_veiculo: string | null;
  tipo_volume: string | null;
  volumes: number | string | null;
  sku: number | string | null;
  unidade_negocios: string | null;
  possui_nota: boolean | null;
  status_confirmacao: string | null;
  observacao: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
  created_at: string | null;
};

type RecebimentoRealizadoRow = DashboardRow & {
  uf: string | null;
  numero_agenda: string | null;
  numero_nota: string | null;
  volumes_realizados: number | string | null;
  sku_realizado: number | string | null;
  tipo_veiculo: string | null;
  tipo_carga: string | null;
  situacao: string | null;
  observacao_operacional: string | null;
  confirmacao_status_real: string | null;
  confirmacao_observacao_real: string | null;
  status_operacional: string | null;
};

const importarNoShowWorkbook = async (
  nomeArquivo: string,
  portalRows: NoShowPortalRow[],
  planejamentoRows: NoShowPlanejamentoRow[],
  metasRows: NoShowMetaRow[]
) => {
  const uf = portalRows.find((row) => row.uf)?.uf ?? metasRows.find((row) => row.uf)?.uf ?? null;
  const mesReferencia = portalRows
    .map((row) => parseMonthNumber(row.mes))
    .find((value) => value != null) ?? metasRows.find((row) => row.mes != null)?.mes ?? null;
  const anoReferencia = portalRows
    .map((row) => (row.data_recebimento ? getFirstDateYear(row.data_recebimento) : null))
    .find((value) => value != null) ?? metasRows.find((row) => row.ano != null)?.ano ?? null;

  const { data: importacao, error: importacaoError } = await db()
    .from("noshow_importacoes")
    .insert({
      nome_arquivo: nomeArquivo,
      mes_referencia: mesReferencia,
      ano_referencia: anoReferencia,
      uf,
      total_linhas: portalRows.length + planejamentoRows.length + metasRows.length,
      status: "ativo",
    })
    .select("id")
    .single();
  if (importacaoError) throw importacaoError;
  const importacaoId = importacao.id as string;

  const portalChunks = chunkArray(portalRows, 500);
  for (const chunk of portalChunks) {
    const payload = chunk.map((row) => ({ importacao_id: importacaoId, ...row }));
    const { error } = await db().from("noshow_base_portal").insert(payload);
    if (error) throw error;
  }

  const planejamentoChunks = chunkArray(planejamentoRows, 500);
  for (const chunk of planejamentoChunks) {
    const payload = chunk.map((row) => ({ importacao_id: importacaoId, ...row }));
    const { error } = await db().from("noshow_planejamento").insert(payload);
    if (error) throw error;
  }

  const metasChunks = chunkArray(metasRows, 500);
  for (const chunk of metasChunks) {
    const payload = chunk.map((row) => ({ importacao_id: importacaoId, ...row }));
    const { error } = await db().from("noshow_metas_capacidade").insert(payload);
    if (error) throw error;
  }

  return {
    importacaoId,
    totalPortal: portalRows.length,
    totalPlanejamento: planejamentoRows.length,
    totalMetas: metasRows.length,
  };
};

export function RecebimentoNoShowImportacao({ perfil }: Props) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [preview, setPreview] = useState({ portal: 0, planejamento: 0, metas: 0 });
  const [rowsPreview, setRowsPreview] = useState<{
    portal: NoShowPortalRow[];
    planejamento: NoShowPlanejamentoRow[];
    metas: NoShowMetaRow[];
  }>({ portal: [], planejamento: [], metas: [] });
  const [loading, setLoading] = useState(false);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState("");
  const [historicoImportacoes, setHistoricoImportacoes] = useState<NoShowImportacaoHistorico[]>([]);
  const [importacaoSelecionada, setImportacaoSelecionada] = useState<NoShowImportacaoHistorico | null>(null);

  const carregarHistorico = async () => {
    setHistoricoLoading(true);
    try {
      const { data, error } = await db()
        .from("noshow_importacoes")
        .select("id,created_at,nome_arquivo,mes_referencia,ano_referencia,uf,total_linhas,status,observacao")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHistoricoImportacoes((data ?? []) as NoShowImportacaoHistorico[]);
    } catch (e: any) {
      console.error("Erro ao carregar historico No Show:", e);
      setErro((current) => current ?? e?.message ?? "Erro ao carregar histórico de importações.");
    } finally {
      setHistoricoLoading(false);
    }
  };

  useEffect(() => {
    void carregarHistorico();
  }, []);

  const verDetalhesImportacao = async (item: NoShowImportacaoHistorico) => {
    setImportacaoSelecionada(item);
    setErro(null);
    try {
      const [{ count: totalPortal }, { count: totalPlanejamento }, { count: totalMetas }] = await Promise.all([
        db().from("noshow_base_portal").select("id", { count: "exact", head: true }).eq("importacao_id", item.id),
        db().from("noshow_planejamento").select("id", { count: "exact", head: true }).eq("importacao_id", item.id),
        db().from("noshow_metas_capacidade").select("id", { count: "exact", head: true }).eq("importacao_id", item.id),
      ]);
      setImportacaoSelecionada({
        ...item,
        observacao: [
          item.observacao,
          `Base 1_portal: ${totalPortal ?? 0}`,
          `Base 2_planejamento: ${totalPlanejamento ?? 0}`,
          `Metas: ${totalMetas ?? 0}`,
        ]
          .filter(Boolean)
          .join(" | "),
      });
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar detalhes da importação.");
    }
  };

  const excluirImportacao = async (item: NoShowImportacaoHistorico) => {
    const confirmado = window.confirm(
      `Excluir a importação "${item.nome_arquivo ?? item.id}"?\n\nEsta ação remove apenas os registros vinculados a esta importação.`
    );
    if (!confirmado) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { data, error } = await db().rpc("fn_excluir_noshow_importacao", { p_importacao_id: item.id });
      if (error) throw error;
      const resumo = Array.isArray(data) ? data[0] : data;
      setMensagem(
        `Importação excluída. Portal: ${resumo?.portal_excluidos ?? 0}, Planejamento: ${resumo?.planejamento_excluidos ?? 0}, Metas: ${resumo?.metas_excluidos ?? 0}.`
      );
      setImportacaoSelecionada(null);
      await carregarHistorico();
    } catch (e: any) {
      console.error("Erro ao excluir importação No Show:", e);
      setErro(e?.message ?? "Erro ao excluir importação.");
    } finally {
      setLoading(false);
    }
  };

  const handleArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setArquivos(files);
    setErro(null);
    setMensagem(null);
    setPreview({ portal: 0, planejamento: 0, metas: 0 });
    setRowsPreview({ portal: [], planejamento: [], metas: [] });

    if (files.length === 0) return;
    try {
      setProgresso("Analisando arquivo...");
      const resultados = await Promise.all(files.map((file) => parseNoShowWorkbook(file)));
      const portalRows = resultados.flatMap((resultado) => resultado.portalRows);
      const planejamentoRows = resultados.flatMap((resultado) => resultado.planejamentoRows);
      const metasRows = resultados.flatMap((resultado) => resultado.metasRows);
      setPreview({ portal: portalRows.length, planejamento: planejamentoRows.length, metas: metasRows.length });
      setRowsPreview({ portal: portalRows.slice(0, 8), planejamento: planejamentoRows.slice(0, 8), metas: metasRows.slice(0, 8) });
      setProgresso("");
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao analisar arquivo.");
      setProgresso("");
    }
  };

  const importar = async () => {
    if (arquivos.length === 0) {
      setErro("Selecione um ou mais arquivos XLSX/TXT para importar.");
      return;
    }
    setLoading(true);
    setErro(null);
    setMensagem(null);
    setProgresso("Preparando importação...");

    try {
      const resultados = await Promise.all(arquivos.map((file) => parseNoShowWorkbook(file)));
      const portalRows = resultados.flatMap((resultado) => resultado.portalRows);
      const planejamentoRows = resultados.flatMap((resultado) => resultado.planejamentoRows);
      const metasRows = resultados.flatMap((resultado) => resultado.metasRows);
      setPreview({ portal: portalRows.length, planejamento: planejamentoRows.length, metas: metasRows.length });
      setRowsPreview({ portal: portalRows.slice(0, 8), planejamento: planejamentoRows.slice(0, 8), metas: metasRows.slice(0, 8) });
      setProgresso("Importando registros...");
      const resultado = await importarNoShowWorkbook(arquivos.map((file) => file.name).join(" + "), portalRows, planejamentoRows, metasRows);
      setMensagem(`Importação concluída: ${resultado.totalPortal} registros Base 1_portal, ${resultado.totalPlanejamento} registros Base 2_planejamento, ${resultado.totalMetas} metas.`);
      await carregarHistorico();
    } catch (e: any) {
      console.error("Erro ao importar No Show:", e);
      setErro(e?.message ?? "Erro ao importar No Show.");
    } finally {
      setLoading(false);
      setProgresso("");
    }
  };

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Importar No Show</h1>
          <p style={descStyle}>
            Importa arquivos XLSX ou TXT de No Show para as tabelas recebimento.noshow_base_portal, recebimento.noshow_planejamento e recebimento.noshow_metas_capacidade.
          </p>
        </div>
        <a href={appHref("/recebimento/importacao")} style={buttonSecondaryStyle}>Voltar para importação de recebimento</a>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <input type="file" accept=".xlsx,.txt,.csv" multiple onChange={handleArquivo} style={inputStyle} />
        <div>
          <button type="button" style={buttonPrimaryStyle} onClick={importar} disabled={loading || arquivos.length === 0}>
            {loading ? "Importando..." : "Importar No Show"}
          </button>
          {progresso && <span style={{ marginLeft: 12, color: theme.colors.textMuted, fontSize: 13 }}>{progresso}</span>}
        </div>
      </div>

      {mensagem && <div style={{ ...cardStyle, color: theme.colors.success }}>{mensagem}</div>}
      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}

      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, color: theme.colors.text, fontSize: 16 }}>Histórico de Importações</h2>
            <p style={{ margin: "4px 0 0", color: theme.colors.textMuted, fontSize: 12 }}>
              {historicoLoading ? "Carregando histórico..." : "Últimas importações registradas no No Show."}
            </p>
          </div>
          <button type="button" style={buttonSecondaryStyle} onClick={() => void carregarHistorico()} disabled={historicoLoading}>
            Recarregar
          </button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                {[
                  "Data/Hora",
                  "Nome arquivo",
                  "Mês",
                  "Ano",
                  "UF",
                  "Total linhas",
                  "Status",
                  "Observação",
                  "Ações",
                ].map((col) => (
                  <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historicoImportacoes.map((item) => (
                <tr key={item.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                  <td style={{ padding: 8 }}>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}</td>
                  <td style={{ padding: 8 }}>{item.nome_arquivo || "-"}</td>
                  <td style={{ padding: 8 }}>{item.mes_referencia ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.ano_referencia ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.uf || "-"}</td>
                  <td style={{ padding: 8 }}>{item.total_linhas ?? 0}</td>
                  <td style={{ padding: 8 }}>{item.status || "-"}</td>
                  <td style={{ padding: 8 }}>{item.observacao || "-"}</td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => void verDetalhesImportacao(item)} style={{ marginRight: 8 }}>Visualizar detalhes</button>
                    <button type="button" onClick={() => void excluirImportacao(item)} style={{ color: theme.colors.danger }}>Excluir importação</button>
                  </td>
                </tr>
              ))}
              {historicoImportacoes.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 12, color: theme.colors.textMuted }}>
                    Nenhuma importação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {importacaoSelecionada && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${theme.colors.borderSoft}`, background: theme.colors.bgElevated }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ color: theme.colors.text }}>Detalhes da importação</strong>
              <button type="button" onClick={() => setImportacaoSelecionada(null)} style={buttonSecondaryStyle}>Fechar</button>
            </div>
            <div style={{ marginTop: 8, color: theme.colors.textSoft, fontSize: 13, lineHeight: 1.5 }}>
              <div><strong>Arquivo:</strong> {importacaoSelecionada.nome_arquivo || "-"}</div>
              <div><strong>Data/Hora:</strong> {importacaoSelecionada.created_at ? new Date(importacaoSelecionada.created_at).toLocaleString("pt-BR") : "-"}</div>
              <div><strong>Mês/Ano:</strong> {importacaoSelecionada.mes_referencia ?? "-"}/{importacaoSelecionada.ano_referencia ?? "-"}</div>
              <div><strong>UF:</strong> {importacaoSelecionada.uf || "-"}</div>
              <div><strong>Total linhas:</strong> {importacaoSelecionada.total_linhas ?? 0}</div>
              <div><strong>Status:</strong> {importacaoSelecionada.status || "-"}</div>
              <div><strong>Observação:</strong> {importacaoSelecionada.observacao || "-"}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
        {[
          ["Portal rows", preview.portal],
          ["Planejamento rows", preview.planejamento],
          ["Metas rows", preview.metas],
        ].map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <div style={metricLabelStyle}>{label}</div>
            <div style={metricValueStyle}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, overflowX: "auto", marginTop: 12 }}>
        <h2 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 16 }}>Preview Base 1_portal</h2>
        <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              {[
                "Data Recebimento",
                "UF",
                "Ticket",
                "Fornecedor",
                "Destinatario",
                "Status",
                "Perfil Carga",
                "Valor",
                "Paletes",
                "Caixas",
              ].map((col) => (
                <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsPreview.portal.map((row, index) => (
              <tr key={index} style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                <td style={{ padding: 8 }}>{formatDateBR(row.data_recebimento)}</td>
                <td style={{ padding: 8 }}>{row.uf || "-"}</td>
                <td style={{ padding: 8 }}>{row.ticket || "-"}</td>
                <td style={{ padding: 8 }}>{row.fornecedor_nome || "-"}</td>
                <td style={{ padding: 8 }}>{row.transportadora_nome || "-"}</td>
                <td style={{ padding: 8 }}>{row.status_recebimento || "-"}</td>
                <td style={{ padding: 8 }}>{row.perfil_carga || "-"}</td>
                <td style={{ padding: 8 }}>{formatCurrency(row.valor || 0)}</td>
                <td style={{ padding: 8 }}>{row.paletes?.toLocaleString?.("pt-BR") ?? row.paletes}</td>
                <td style={{ padding: 8 }}>{row.caixas?.toLocaleString?.("pt-BR") ?? row.caixas}</td>
              </tr>
            ))}
            {rowsPreview.portal.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 12, color: theme.colors.textMuted }}>Selecione um arquivo para visualizar o preview do portal.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ ...cardStyle, overflowX: "auto", marginTop: 12 }}>
        <h2 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 16 }}>Preview Base 2_planejamento</h2>
        <table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              {[
                "Data Referencia",
                "UF",
                "Fornecedor",
                "Nro Carga",
                "Hora Chegada",
                "Estivada",
                "Repaletizada",
                "Paletizada",
                "Itens",
                "Paletes",
              ].map((col) => (
                <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsPreview.planejamento.map((row, index) => (
              <tr key={index} style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                <td style={{ padding: 8 }}>{formatDateBR(row.data_referencia)}</td>
                <td style={{ padding: 8 }}>{row.uf || "-"}</td>
                <td style={{ padding: 8 }}>{row.fornecedor_nome || "-"}</td>
                <td style={{ padding: 8 }}>{row.nro_carga || "-"}</td>
                <td style={{ padding: 8 }}>{row.hora_chegada || "-"}</td>
                <td style={{ padding: 8 }}>{row.estivada?.toLocaleString?.("pt-BR") ?? row.estivada}</td>
                <td style={{ padding: 8 }}>{row.repaletizada?.toLocaleString?.("pt-BR") ?? row.repaletizada}</td>
                <td style={{ padding: 8 }}>{row.paletizada?.toLocaleString?.("pt-BR") ?? row.paletizada}</td>
                <td style={{ padding: 8 }}>{row.itens?.toLocaleString?.("pt-BR") ?? row.itens}</td>
                <td style={{ padding: 8 }}>{row.paletes?.toLocaleString?.("pt-BR") ?? row.paletes}</td>
              </tr>
            ))}
            {rowsPreview.planejamento.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 12, color: theme.colors.textMuted }}>Selecione um arquivo para visualizar o preview do planejamento.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ ...cardStyle, overflowX: "auto", marginTop: 12 }}>
        <h2 style={{ margin: "0 0 10px", color: theme.colors.text, fontSize: 16 }}>Preview UF / Metas</h2>
        <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              {[
                "UF",
                "Mês",
                "Ano",
                "Dias Recebimento",
                "Feriados",
                "Capacidade Dia",
                "Meta Recebimento Mes",
              ].map((col) => (
                <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsPreview.metas.map((row, index) => (
              <tr key={index} style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                <td style={{ padding: 8 }}>{row.uf || "-"}</td>
                <td style={{ padding: 8 }}>{row.mes ?? "-"}</td>
                <td style={{ padding: 8 }}>{row.ano ?? "-"}</td>
                <td style={{ padding: 8 }}>{row.dias_recebimento?.toLocaleString?.("pt-BR") ?? row.dias_recebimento}</td>
                <td style={{ padding: 8 }}>{row.feriados?.toLocaleString?.("pt-BR") ?? row.feriados}</td>
                <td style={{ padding: 8 }}>{row.capacidade_dia?.toLocaleString?.("pt-BR") ?? row.capacidade_dia}</td>
                <td style={{ padding: 8 }}>{row.meta_recebimento_mes?.toLocaleString?.("pt-BR") ?? row.meta_recebimento_mes}</td>
              </tr>
            ))}
            {rowsPreview.metas.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 12, color: theme.colors.textMuted }}>Selecione um arquivo para visualizar o preview de metas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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

const padMonth = (value: number | string | null | undefined) => {
  const parsed = parseMonthNumber(value == null ? undefined : String(value));
  return parsed == null ? "" : String(parsed).padStart(2, "0");
};

const noShowMonthValue = (row: { mes: string | null; data_recebimento: string | null }) => {
  const fromMes = padMonth(row.mes);
  if (fromMes) return fromMes;
  return row.data_recebimento ? row.data_recebimento.slice(5, 7) : "";
};

const noShowYearValue = (row: { data_recebimento: string | null }) =>
  row.data_recebimento ? row.data_recebimento.slice(0, 4) : "";

const noShowStatusLabel = (row: Pick<NoShowBasePortalDashboardRow, "concluido" | "no_show" | "nao_realizado" | "abandono" | "status_recebimento">) => {
  if (row.abandono) return "Abandono";
  if (row.no_show) return "No Show";
  if (row.nao_realizado) return "Não realizado";
  if (row.concluido) return "Realizado";
  return row.status_recebimento?.trim() || "Sem status";
};

const countDistinctNoShowDates = (rows: NoShowBasePortalDashboardRow[]) =>
  new Set(rows.map((row) => row.data_recebimento).filter(Boolean)).size;

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
const TIPOS_LINHA_TEMPO = ["Contato", "Transporte", "Recebimento", "Problema", "Fiscal", "Observação"];
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

const formatDateTimeBR = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("pt-BR") : "-");

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

const GESTAO_AGENDA_CAMPOS_REIMPORTACAO: GestaoAgendaRowCampoReimportacao[] = [
  "notas_fiscais",
  "horario",
  "doca",
  "deposito",
  "tipo_carga",
  "qtd_veiculos",
  "tipo_veiculo",
  "tipo_volume",
  "volumes",
  "sku",
  "unidade_negocios",
  "fornecedor_nome",
  "transportadora_nome",
];

const GESTAO_AGENDA_CAMPOS_REIMPORTACAO_LABELS: Record<GestaoAgendaRowCampoReimportacao, string> = {
  notas_fiscais: "Notas fiscais",
  horario: "Horário",
  doca: "Doca",
  deposito: "Depósito",
  tipo_carga: "Tipo de carga",
  qtd_veiculos: "Qtd veículos",
  tipo_veiculo: "Tipo veículo",
  tipo_volume: "Tipo volume",
  volumes: "Volumes",
  sku: "SKU",
  unidade_negocios: "Unidade de negócios",
  fornecedor_nome: "Fornecedor",
  transportadora_nome: "Transportadora",
};

const GESTAO_AGENDA_CAMPOS_NUMERICOS = new Set<GestaoAgendaRowCampoReimportacao>(["qtd_veiculos", "volumes", "sku"]);

const normalizarValorComparacaoGestaoAgenda = (campo: GestaoAgendaRowCampoReimportacao, valor: unknown) => {
  if (valor === null || valor === undefined) return "";
  if (GESTAO_AGENDA_CAMPOS_NUMERICOS.has(campo)) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }
  return String(valor).trim().replace(/\s+/g, " ").toLowerCase();
};

const formatarValorMudancaGestaoAgenda = (campo: GestaoAgendaRowCampoReimportacao, valor: unknown) => {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (campo === "horario" && typeof valor === "string") return valor.slice(0, 5);
  if (GESTAO_AGENDA_CAMPOS_NUMERICOS.has(campo)) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toLocaleString("pt-BR") : String(valor);
  }
  return String(valor);
};

const construirCamposAlteradosGestaoAgenda = (atual: Partial<GestaoAgendaRow>, novo: Partial<GestaoAgendaRow>) => {
  const alterados: Record<string, { de: unknown; para: unknown }> = {};
  for (const campo of GESTAO_AGENDA_CAMPOS_REIMPORTACAO) {
    const atualNormalizado = normalizarValorComparacaoGestaoAgenda(campo, atual[campo]);
    const novoNormalizado = normalizarValorComparacaoGestaoAgenda(campo, novo[campo]);
    if (atualNormalizado !== novoNormalizado) {
      alterados[campo] = { de: atual[campo] ?? null, para: novo[campo] ?? null };
    }
  }
  return alterados;
};

const normalizeJoinKey = (value: string | null | undefined) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const buildRealizadoJoinKey = (
  data: string | null | undefined,
  fornecedor: string | null | undefined,
  transportadora: string | null | undefined,
  horario: string | null | undefined
) => [data ?? "", normalizeJoinKey(fornecedor), normalizeJoinKey(transportadora), (horario ?? "").slice(0, 5)].join("|");

const RECEBIMENTO_STORAGE_PREFIX = "scc:v7:recebimento:";

const storageReadJson = <T,>(storage: Storage, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const storageWriteJson = (storage: Storage, key: string, value: unknown) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const storageReadObject = <T extends Record<string, unknown>>(storage: Storage, key: string, fallback: T): T => {
  const parsed = storageReadJson<unknown>(storage, key);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  return { ...fallback, ...(parsed as Partial<T>) };
};

const storageReadString = (storage: Storage, key: string): string | null => {
  const parsed = storageReadJson<unknown>(storage, key);
  return typeof parsed === "string" ? parsed : null;
};

const RECEBIMENTO_DASHBOARD_FILTERS_KEY = `${RECEBIMENTO_STORAGE_PREFIX}dashboardFilters`;
const RECEBIMENTO_DASHBOARD_ABERTOS_KEY = `${RECEBIMENTO_STORAGE_PREFIX}dashboardOpenRows`;
const RECEBIMENTO_AGENDA_FILTERS_KEY = `${RECEBIMENTO_STORAGE_PREFIX}agendaFilters`;
const RECEBIMENTO_AGENDA_SELECTION_KEY = `${RECEBIMENTO_STORAGE_PREFIX}agendaSelectedId`;
const RECEBIMENTO_CONFIRMACAO_FILTERS_KEY = `${RECEBIMENTO_STORAGE_PREFIX}confirmacaoFilters`;
const RECEBIMENTO_CONFIRMACAO_SELECTION_KEY = `${RECEBIMENTO_STORAGE_PREFIX}confirmacaoSelectedId`;

export function RecebimentoDashboard({ perfil: _perfil }: Props) {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [itensPorAgendamento, setItensPorAgendamento] = useState<Record<string, DashboardItem[]>>({});
  const [fotosPorOcorrencia, setFotosPorOcorrencia] = useState<Record<string, OcorrenciaFoto[]>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacaoDashboard, setUltimaAtualizacaoDashboard] = useState<string | null>(null);
  const [filtros, setFiltros] = useState(() => {
    const fallback = {
      data: todayISO(),
      dataFim: todayISO(),
      uf: "",
      fornecedor: "",
      status: "",
      modalidade: "",
      transportadora: "",
      secao: "",
      empresa: "",
    };
    if (typeof window === "undefined") return fallback;
    return storageReadObject(window.localStorage, RECEBIMENTO_DASHBOARD_FILTERS_KEY, fallback);
  });
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    return storageReadObject(window.localStorage, RECEBIMENTO_DASHBOARD_ABERTOS_KEY, {} as Record<string, boolean>);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, RECEBIMENTO_DASHBOARD_FILTERS_KEY, filtros);
  }, [filtros]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, RECEBIMENTO_DASHBOARD_ABERTOS_KEY, abertos);
  }, [abertos]);

  const carregarDashboard = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await db()
      .from("vw_recebimento_dashboard")
      .select("*")
      .gte("data_agenda", filtros.data)
      .lte("data_agenda", filtros.dataFim)
      .order("status_recebimento_calculado", { ascending: true })
      .order("data_agenda", { ascending: true })
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
      setUltimaAtualizacaoDashboard(new Date().toLocaleString("pt-BR"));
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
    setUltimaAtualizacaoDashboard(new Date().toLocaleString("pt-BR"));
    setLoading(false);
  };

  useEffect(() => {
    void carregarDashboard();
  }, [filtros.data, filtros.dataFim]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      const uf = String((r as any).uf ?? "").trim();
      if (filtros.uf && uf !== filtros.uf) return false;
      if (filtros.fornecedor && !(r.fornecedor_nome ?? "").toLowerCase().includes(filtros.fornecedor.toLowerCase())) return false;
      if (filtros.status && r.status_recebimento_calculado !== filtros.status) return false;
      if (filtros.modalidade && r.modalidade_calculada !== filtros.modalidade) return false;
      if (filtros.transportadora && !(r.transportadora ?? "").toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      if (filtros.empresa && r.empresa !== filtros.empresa) return false;
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

  const dashboardOnline = !loading && !erro;

  const indicadores = useMemo(() => {
    const cargas = sumRows(rowsFiltradas, "qtd_cargas");
    const finalizadas = sumRows(rowsFiltradas, "ind_finalizada");
    const emConferencia = sumRows(rowsFiltradas, "ind_em_conferencia");
    const noShow = sumRows(rowsFiltradas, "ind_no_show");
    const recusadas = sumRows(rowsFiltradas, "ind_recusada");
    const veiculosNaoPresentes = rowsFiltradas.filter((row) => (row.status_finalizada ?? "").toLowerCase().includes("veículos não presentes")).length;
    const totalPaletes = sumRows(rowsFiltradas, "total_paletes");
    const totalCaixas = sumRows(rowsFiltradas, "total_caixas");
    const valorTotal = sumRows(rowsFiltradas, "valor_total");
    const rupturaTotal = sumRows(rowsFiltradas, "ruptura_total");
    const ocorrenciasAbertas = sumRows(rowsFiltradas, "ocorrencias_abertas");
    const totalConferido = sumRows(rowsFiltradas, "total_conferido");
    const percConf = totalCaixas > 0 ? totalConferido / totalCaixas : 0;
    const totalItens = sumRows(rowsFiltradas, "total_itens");
    const itensCross = sumRows(rowsFiltradas, "itens_cross");
    const itensArmaz = sumRows(rowsFiltradas, "itens_armaz");

    return [
      {
        title: "Status das cargas",
        cards: [
          ["Cargas", String(cargas)],
          ["Finalizadas", String(finalizadas)],
          ["Em conferência", String(emConferencia)],
          ["No Show", String(noShow)],
          ["Recusadas", String(recusadas)],
          ["Veículos não presentes", String(veiculosNaoPresentes)],
        ],
      },
      {
        title: "Volume operacional",
        cards: [
          ["Itens / Produtos", totalItens.toLocaleString("pt-BR")],
          ["Cross", itensCross.toLocaleString("pt-BR")],
          ["Armazenagem", itensArmaz.toLocaleString("pt-BR")],
          ["Paletes", totalPaletes.toLocaleString("pt-BR")],
          ["Caixas", totalCaixas.toLocaleString("pt-BR")],
          ["Valor", formatCurrency(valorTotal)],
          ["Ruptura", rupturaTotal.toLocaleString("pt-BR")],
        ],
      },
      {
        title: "Performance",
        cards: [
          ["% Conferência", percent(percConf)],
          ["Ocorrências abertas", String(ocorrenciasAbertas)],
          ["Capacidade / ocupação", `${sumRows(rowsFiltradas, "qtd_cargas").toLocaleString("pt-BR")} | ${percent(sumRows(rowsFiltradas, "perc_carga") / Math.max(rowsFiltradas.length || 1, 1))}`],
          [
            "Última atualização",
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{ultimaAtualizacaoDashboard ?? "-"}</span>
              <span style={{ color: dashboardOnline ? theme.colors.neonGreen : theme.colors.danger, fontWeight: 900 }}>
                {dashboardOnline ? "🟢 Online" : "🔴 Offline"}
              </span>
            </span>,
          ],
        ],
      },
    ];
  }, [rowsFiltradas, ultimaAtualizacaoDashboard, dashboardOnline]);

  const toggle = (key: string) => setAbertos((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectStyle = inputStyle;
  const statusNormalizado = (status: string) => status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const formatNumber = (value: number | string | null | undefined, decimals = 0) =>
    toNumber(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");
  const statusColor = (status: string) => {
    const normalized = statusNormalizado(status);
    if (normalized.includes("finalizada")) return theme.colors.neonGreen;
    if (normalized.includes("em conferencia")) return theme.colors.neonYellow;
    if (normalized.includes("no show")) return theme.colors.danger;
    if (normalized.includes("recusada")) return "#b45309";
    if (normalized.includes("veiculos nao presentes")) return theme.colors.neonOrange;
    return theme.colors.textSoft;
  };
  const rupturaColor = (value: number | string | null | undefined) => {
    const ruptura = toNumber(value);
    if (ruptura <= 0) return theme.colors.neonGreen;
    if (ruptura <= 10) return theme.colors.neonYellow;
    if (ruptura <= 30) return theme.colors.neonOrange;
    return theme.colors.danger;
  };
  const cardIconMap: Record<string, string> = {
    Cargas: "📦",
    Finalizadas: "✅",
    "Em conferência": "🟡",
    "No Show": "🚫",
    Recusadas: "❌",
    "Veículos não presentes": "🚚",
    "Itens / Produtos": "📦",
    Cross: "🔀",
    Armazenagem: "🏢",
    Paletes: "🪵",
    Caixas: "📦",
    Valor: "💰",
    Ruptura: "⚠️",
    "% Conferência": "📈",
    "Ocorrências abertas": "📝",
    "Capacidade / ocupação": "🏭",
    "Última atualização": "🕒",
  };
  const resumoExecutivo = useMemo(
    () => [
      { icon: "📅", label: filtros.data === filtros.dataFim ? formatDateBR(filtros.data) : `${formatDateBR(filtros.data)} até ${formatDateBR(filtros.dataFim)}`, value: "" },
      { icon: "📦", label: `${sumRows(rowsFiltradas, "qtd_cargas").toLocaleString("pt-BR")} cargas`, value: "" },
      { icon: "🪵", label: `${sumRows(rowsFiltradas, "total_paletes").toLocaleString("pt-BR")} paletes`, value: "" },
      { icon: "📦", label: `${sumRows(rowsFiltradas, "total_caixas").toLocaleString("pt-BR")} caixas`, value: "" },
      { icon: "📦", label: `${sumRows(rowsFiltradas, "total_itens").toLocaleString("pt-BR")} produtos`, value: "" },
      { icon: "💰", label: formatCurrency(sumRows(rowsFiltradas, "valor_total")), value: "" },
    ],
    [rowsFiltradas, filtros.data, filtros.dataFim]
  );
  const getRowUf = (row: DashboardRow) => String((row as any).uf ?? "").trim();
  const ufsDisponiveis = useMemo(() => Array.from(new Set(rows.map((row) => getRowUf(row)).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);
  const eficienciaOperacional = rowsFiltradas.length > 0 ? sumRows(rowsFiltradas, "perc_carga") / rowsFiltradas.length : 0;
  const tempoMedioConferencia = "N/D";
  const kpiRows = useMemo(
    () => [
      {
        title: "Status",
        cards: [
          ["📦 Cargas", String(sumRows(rowsFiltradas, "qtd_cargas"))],
          ["✅ Finalizadas", String(sumRows(rowsFiltradas, "ind_finalizada"))],
          ["🟡 Em conferência", String(sumRows(rowsFiltradas, "ind_em_conferencia"))],
          ["🚫 No Show", String(sumRows(rowsFiltradas, "ind_no_show"))],
          ["❌ Recusadas", String(sumRows(rowsFiltradas, "ind_recusada"))],
        ],
      },
      {
        title: "Volume",
        cards: [
          ["🪵 Paletes", formatNumber(sumRows(rowsFiltradas, "total_paletes"))],
          ["📦 Caixas", formatNumber(sumRows(rowsFiltradas, "total_caixas"))],
          ["📦 Produtos", formatNumber(sumRows(rowsFiltradas, "total_itens"))],
          ["💰 Valor", formatCurrency(sumRows(rowsFiltradas, "valor_total"))],
        ],
      },
      {
        title: "Performance",
        cards: [
          ["✔ Eficiência", percent(eficienciaOperacional)],
          ["⏱ Tempo médio de conferência", tempoMedioConferencia],
          ["📝 Ocorrências", formatNumber(sumRows(rowsFiltradas, "ocorrencias_abertas"))],
        ],
      },
    ],
    [rowsFiltradas, eficienciaOperacional]
  );
  const modalidadeSeries = useMemo(() => {
    const grouped = new Map<string, number>();
    rowsFiltradas.forEach((row) => {
      const key = row.modalidade_calculada ?? "Sem modalidade";
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rowsFiltradas]);
  const situacaoSeries = useMemo(() => {
    const grouped = new Map<string, number>();
    rowsFiltradas.forEach((row) => {
      const key = row.status_recebimento_calculado ?? row.status_finalizada ?? "Sem situação";
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rowsFiltradas]);
  const tendenciaPorDia = useMemo(() => {
    const grouped = new Map<string, number>();
    rowsFiltradas.forEach((row) => {
      const key = row.data_agenda ?? "";
      if (!key) return;
      grouped.set(key, (grouped.get(key) ?? 0) + toNumber(row.qtd_cargas));
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }, [rowsFiltradas]);
  const faixaHorariaSeries = useMemo(() => {
    const grouped = new Map<string, number>([
      ["00h-05h", 0],
      ["06h-11h", 0],
      ["12h-17h", 0],
      ["18h-23h", 0],
    ]);
    rowsFiltradas.forEach((row) => {
      const source = row.hora_chegada ?? row.horario;
      const hour = Number((source ?? "").slice(0, 2));
      if (!Number.isFinite(hour)) return;
      const key = hour < 6 ? "00h-05h" : hour < 12 ? "06h-11h" : hour < 18 ? "12h-17h" : "18h-23h";
      grouped.set(key, (grouped.get(key) ?? 0) + toNumber(row.qtd_cargas || 1));
    });
    return Array.from(grouped.entries());
  }, [rowsFiltradas]);
  const rankingFornecedores = useMemo(() => {
    const grouped = new Map<string, { nome: string; cargas: number; valor: number; paletes: number }>();
    rowsFiltradas.forEach((row) => {
      const key = row.fornecedor_nome ?? "Fornecedor não informado";
      const current = grouped.get(key) ?? { nome: key, cargas: 0, valor: 0, paletes: 0 };
      current.cargas += toNumber(row.qtd_cargas || 1);
      current.valor += toNumber(row.valor_total);
      current.paletes += toNumber(row.total_paletes);
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.cargas - a.cargas || b.valor - a.valor).slice(0, 8);
  }, [rowsFiltradas]);
  const tabelaExecutiva = useMemo(() => {
    return rowsFiltradas
      .slice()
      .sort((a, b) => `${a.data_agenda ?? ""}${a.hora_chegada ?? a.horario ?? ""}`.localeCompare(`${b.data_agenda ?? ""}${b.hora_chegada ?? b.horario ?? ""}`));
  }, [rowsFiltradas]);
  const tendenciaPoints = useMemo(() => {
    const width = 520;
    const height = 180;
    const padding = 24;
    const max = Math.max(...tendenciaPorDia.map((item) => item.value), 1);
    return tendenciaPorDia
      .map((item, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(tendenciaPorDia.length - 1, 1);
        const y = height - padding - (item.value / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [tendenciaPorDia]);
  const sectionTitleStyle: React.CSSProperties = {
    color: theme.colors.neonOrange,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  };
  const sectionDescStyle: React.CSSProperties = {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  };
  const tableBadgeStyle = (color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${color}55`,
    background: `${color}18`,
    color,
    fontWeight: 800,
    fontSize: 11,
  });
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
    const blob = new Blob([UTF8_BOM, [header.map(csvEscape).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
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

      <div style={{ ...cardStyle, display: "grid", gap: 8, padding: 12 }}>
        <div style={sectionTitleStyle}>Filtros operacionais</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto" }}>
        <input type="date" style={{ ...inputStyle, minWidth: 150 }} value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
        <input type="date" style={{ ...inputStyle, minWidth: 150 }} value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} />
        <select style={{ ...selectStyle, minWidth: 110 }} value={filtros.uf} onChange={(e) => setFiltros({ ...filtros, uf: e.target.value })}>
          <option value="">UF</option>
          {ufsDisponiveis.map((v) => <option key={v}>{v}</option>)}
        </select>
        <select style={{ ...selectStyle, minWidth: 150 }} value={filtros.empresa} onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}>
          <option value="">CD</option>
          {uniqueValues(rows, "empresa").map((v) => <option key={v}>{v}</option>)}
        </select>
        <input
          style={{ ...inputStyle, minWidth: 210 }}
          placeholder="Fornecedor"
          value={filtros.fornecedor}
          onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
        />
        <input
          style={{ ...inputStyle, minWidth: 210 }}
          placeholder="Transportadora"
          value={filtros.transportadora}
          onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })}
        />
        <select style={{ ...selectStyle, minWidth: 170 }} value={filtros.modalidade} onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}>
          <option value="">Modalidade</option>
          {uniqueValues(rows, "modalidade_calculada").map((v) => <option key={v}>{v}</option>)}
        </select>
        <select style={{ ...selectStyle, minWidth: 170 }} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Situação</option>
          {uniqueValues(rows, "status_recebimento_calculado").map((v) => <option key={v}>{v}</option>)}
        </select>
        </div>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}
      {loading && <div style={{ color: theme.colors.textMuted }}>Carregando recebimento...</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {kpiRows.map((grupo) => (
          <div key={grupo.title} style={{ ...cardStyle, padding: 12 }}>
            <div style={sectionTitleStyle}>{grupo.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              {grupo.cards.map(([label, value]) => (
                <div key={label} style={{ ...cardStyle, padding: 10, minWidth: 0, background: "rgba(2,6,23,0.35)" }}>
                  <div style={{ ...metricValueStyle, marginTop: 0, fontSize: label === "Última atualização" ? 13 : 30, lineHeight: 1.05, fontWeight: 900, overflowWrap: "anywhere" }}>
                    {value}
                  </div>
                  <div style={{ ...metricLabelStyle, marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span>{cardIconMap[label] ?? "•"}</span>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto", whiteSpace: "nowrap", background: "rgba(2,6,23,0.36)" }}>
        {resumoExecutivo.map((item) => (
          <div key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 999, background: "rgba(15,23,42,0.82)", color: theme.colors.textSoft, fontSize: 12, fontWeight: 700 }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <div>
          <div style={sectionTitleStyle}>Leituras visuais</div>
          <div style={sectionDescStyle}>Distribuição operacional por modalidade, situação, data, faixa horária e fornecedores.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={sectionTitleStyle}>Gráfico por modalidade</div>
            <div style={sectionDescStyle}>Peso relativo das modalidades carregadas no período.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {modalidadeSeries.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem dados para exibir.</div>}
              {modalidadeSeries.map(([label, value]) => {
                const max = Math.max(...modalidadeSeries.map(([, itemValue]) => itemValue), 1);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.colors.textSoft }}>
                      <span>{label}</span>
                      <span>{value.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(51,65,85,0.55)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: theme.colors.neonOrange }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={sectionTitleStyle}>Gráfico por situação</div>
            <div style={sectionDescStyle}>Leitura rápida do mix de status operacionais.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {situacaoSeries.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem dados para exibir.</div>}
              {situacaoSeries.map(([label, value]) => {
                const max = Math.max(...situacaoSeries.map(([, itemValue]) => itemValue), 1);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.colors.textSoft }}>
                      <span>{label}</span>
                      <span>{value.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(51,65,85,0.55)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: statusColor(label) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={sectionTitleStyle}>Tendência por dia</div>
            <div style={sectionDescStyle}>Evolução das cargas no intervalo selecionado.</div>
            <svg viewBox="0 0 520 180" style={{ width: "100%", height: 200 }}>
              <line x1="24" y1="156" x2="496" y2="156" stroke={theme.colors.borderSoft} strokeWidth="1" />
              <polyline fill="none" stroke={theme.colors.neonGreen} strokeWidth="2.5" points={tendenciaPoints} />
            </svg>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: theme.colors.textMuted, fontSize: 11 }}>
              {tendenciaPorDia.map((item) => <span key={item.date}>{formatDateBR(item.date)}</span>)}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={sectionTitleStyle}>Faixa operacional</div>
            <div style={sectionDescStyle}>Concentração de cargas por janela horária.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {faixaHorariaSeries.map(([label, value]) => {
                const max = Math.max(...faixaHorariaSeries.map(([, itemValue]) => itemValue), 1);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.colors.textSoft }}>
                      <span>{label}</span>
                      <span>{value.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(51,65,85,0.55)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: theme.colors.neonYellow }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={sectionTitleStyle}>Ranking de fornecedores</div>
            <div style={sectionDescStyle}>Prioridade por volume de cargas no período filtrado.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {rankingFornecedores.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem dados para exibir.</div>}
              {rankingFornecedores.map((item, index) => {
                const max = Math.max(...rankingFornecedores.map((row) => row.cargas), 1);
                return (
                  <div key={`${item.nome}-${index}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.colors.textSoft, gap: 8 }}>
                      <span>{index + 1}. {item.nome}</span>
                      <span>{item.cargas.toLocaleString("pt-BR")} cargas</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(51,65,85,0.55)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${(item.cargas / max) * 100}%`, height: "100%", background: theme.colors.neonGreen }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.colors.borderSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: theme.colors.neonOrange, fontWeight: 900, fontSize: 14 }}>Tabela executiva</div>
            <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Leitura rápida das cargas com abertura dos detalhes operacionais abaixo.</div>
          </div>
          <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Clique na linha para expandir</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1480, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: theme.colors.textMuted, textAlign: "left", background: "#020617" }}>
                {[
                  "Data",
                  "Hora",
                  "Status",
                  "CD",
                  "Fornecedor",
                  "Transportadora",
                  "Modalidade",
                  "Carga",
                  "Paletes",
                  "Produtos",
                  "Valor",
                  "Ocorrências",
                  "Ações",
                ].map((col) => (
                  <th key={col} style={{ padding: 10, borderBottom: `1px solid ${theme.colors.borderSoft}`, whiteSpace: "nowrap" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabelaExecutiva.map((row) => {
                const rowKey = `dashboard:${row.agendamento_id}`;
                const open = !!abertos[rowKey];
                const itens = itensPorAgendamento[row.agendamento_id] ?? [];
                const rowStatus = row.status_recebimento_calculado ?? row.status_finalizada ?? "Agenda";
                return (
                  <React.Fragment key={row.agendamento_id}>
                    <tr style={{ cursor: "pointer", background: open ? "rgba(15,23,42,0.9)" : "rgba(2,6,23,0.18)", transition: "background 120ms ease" }} onClick={() => toggle(rowKey)}>
                      <td style={{ padding: 10 }}>{formatDateBR(row.data_agenda)}</td>
                      <td style={{ padding: 10 }}>{formatTime(row.hora_chegada ?? row.horario)}</td>
                      <td style={{ padding: 10 }}><span style={tableBadgeStyle(statusColor(rowStatus))}>{rowStatus}</span></td>
                      <td style={{ padding: 10 }}>{row.empresa ?? "-"}</td>
                      <td style={{ padding: 10 }}>{row.fornecedor_nome ?? "-"}</td>
                      <td style={{ padding: 10 }}>{row.transportadora ?? "-"}</td>
                      <td style={{ padding: 10 }}><span style={{ ...tableBadgeStyle(theme.colors.neonOrange), color: theme.colors.textSoft }}>{row.modalidade_calculada ?? "-"}</span></td>
                      <td style={{ padding: 10 }}>{row.nro_carga ?? "-"}</td>
                      <td style={{ padding: 10 }}>{formatNumber(row.total_paletes)}</td>
                      <td style={{ padding: 10 }}>{formatNumber(row.total_itens)}</td>
                      <td style={{ padding: 10 }}>{formatCurrency(toNumber(row.valor_total))}</td>
                      <td style={{ padding: 10 }}><span style={tableBadgeStyle(toNumber(row.ocorrencias_abertas) > 0 ? theme.colors.neonYellow : theme.colors.neonGreen)}>{formatNumber(row.ocorrencias_abertas)}</span></td>
                      <td style={{ padding: 10 }}>
                        <span style={{ color: theme.colors.neonGreen, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 0.2 }}>
                          <span>{open ? "👁" : "▶"}</span>
                          Detalhes
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={12} style={{ padding: 12, borderBottom: `1px solid ${theme.colors.borderSoft}`, background: "rgba(2,6,23,0.72)" }}>
                          <div style={{ display: "grid", gap: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                              {[
                                ["Estivada", formatNumber(row.estivada)],
                                ["Repaletizada", formatNumber(row.repaletizada)],
                                ["Paletizada", formatNumber(row.paletizada)],
                                ["Itens Cross", formatNumber(row.itens_cross)],
                                ["Itens Armaz", formatNumber(row.itens_armaz)],
                                ["% Conferência", percent(toNumber(row.perc_conferencia))],
                                ["% Carga", percent(toNumber(row.perc_carga))],
                                ["Ocorrências abertas", formatNumber(row.ocorrencias_abertas)],
                              ].map(([label, value]) => (
                                <div key={label} style={{ ...cardStyle, padding: 10 }}>
                                  <div style={metricLabelStyle}>{label}</div>
                                  <div style={{ ...metricValueStyle, fontSize: 16 }}>{value}</div>
                                </div>
                              ))}
                            </div>

                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                                    {[
                                      "Código produto",
                                      "Descrição produto",
                                      "Seção",
                                      "Modalidade original",
                                      "Modalidade compra",
                                      "Norma",
                                      "Palete",
                                      "Gerada",
                                      "Conferida",
                                      "Recebida",
                                      "Valor",
                                      "Ruptura",
                                    ].map((col) => (
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
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {rowsFiltradas.length === 0 && !loading && (
                <tr>
                  <td colSpan={12} style={{ padding: 14, color: theme.colors.textMuted }}>Nenhum dado encontrado para os filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <details style={{ ...cardStyle, overflowX: "auto", padding: 0, marginTop: 12 }}>
        <summary style={{ padding: 12, cursor: "pointer", color: theme.colors.neonOrange, fontWeight: 900 }}>Visão consolidada</summary>
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
      </details>
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
  const [selectedFornecedorContatoId, setSelectedFornecedorContatoId] = useState<string | null>(null);
  const [selectedTransportadoraContatoId, setSelectedTransportadoraContatoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState(() => {
    const fallback = {
      data: todayISO(),
      dataFim: todayISO(),
      status: "",
      fornecedor: "",
      transportadora: "",
      unidade: "",
      possuiNota: "",
    };
    if (typeof window === "undefined") return fallback;
    return storageReadObject(window.localStorage, RECEBIMENTO_CONFIRMACAO_FILTERS_KEY, fallback);
  });
  const [selecionadaPersistidaId, setSelecionadaPersistidaId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return storageReadString(window.sessionStorage, RECEBIMENTO_CONFIRMACAO_SELECTION_KEY);
  });
  const [registro, setRegistro] = useState({
    canal: "WhatsApp",
    contato_nome: "",
    contato_tipo: "",
    resultado: "Confirmado",
    observacao: "",
    fornecedor_contato_id: null as string | null,
    transportadora_contato_id: null as string | null,
    contato_origem: null as string | null,
  });

  const formatNumber = (value: number | string | null | undefined) => toNumber(value).toLocaleString("pt-BR");
  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, RECEBIMENTO_CONFIRMACAO_FILTERS_KEY, filtros);
  }, [filtros]);

  useEffect(() => {
    if (!selecionadaPersistidaId) return;
    const encontrada = rows.find((row) => row.id === selecionadaPersistidaId) ?? null;
    if (!encontrada) {
      if (selecionada) {
        setSelecionada(null);
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(RECEBIMENTO_CONFIRMACAO_SELECTION_KEY);
      }
      return;
    }
    if (selecionada?.id !== encontrada.id || selecionada !== encontrada) {
      setSelecionada(encontrada);
    }
  }, [rows, selecionadaPersistidaId]);

  const limparSelecaoConfirmacao = () => {
    setSelecionada(null);
    setSelecionadaPersistidaId(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RECEBIMENTO_CONFIRMACAO_SELECTION_KEY);
    }
  };

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
      "Apresentação: favor se apresentar conforme a prioridade operacional do CD e manter contato na chegada.",
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
    setSelecionadaPersistidaId(row.id);
    if (typeof window !== "undefined") {
      storageWriteJson(window.sessionStorage, RECEBIMENTO_CONFIRMACAO_SELECTION_KEY, row.id);
    }
    setSelectedFornecedorContatoId(null);
    setSelectedTransportadoraContatoId(null);
    setRegistro({
      canal: "WhatsApp",
      contato_nome: "",
      contato_tipo: "",
      resultado: "Confirmado",
      observacao: "",
      fornecedor_contato_id: null,
      transportadora_contato_id: null,
      contato_origem: null,
    });
    const [fc, tc, hist] = await Promise.all([
      row.fornecedor_id
        ? db().from("fornecedor_contatos").select("*").eq("fornecedor_id", row.fornecedor_id).eq("ativo", true).order("principal", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      row.transportadora_id
        ? db().from("transportadora_contatos").select("*").eq("transportadora_id", row.transportadora_id).eq("ativo", true).order("principal", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      db().from("confirmacao_agenda_historico").select("*").eq("gestao_agenda_id", row.id).order("created_at", { ascending: false }),
    ]);
    const fornecedorContatos = (fc.data ?? []) as FornecedorContato[];
    const transportadoraContatos = (tc.data ?? []) as TransportadoraContato[];
    setFornecedorContatos(fornecedorContatos);
    setTransportadoraContatos(transportadoraContatos);
    setHistorico((hist.data ?? []) as ConfirmacaoHistorico[]);

    if (fornecedorContatos.length > 0) {
      setSelectedFornecedorContatoId(fornecedorContatos.find((c) => c.principal)?.id ?? fornecedorContatos[0].id);
    }
    if (transportadoraContatos.length > 0) {
      setSelectedTransportadoraContatoId(transportadoraContatos.find((c) => c.principal)?.id ?? transportadoraContatos[0].id);
    }
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
        alterado_na_ultima_importacao: false,
        campos_alterados: null,
      })
      .eq("id", row.id);
    if (error) {
      console.error("Erro ao atualizar confirmação:", error);
      setErro("Erro ao atualizar confirmação.");
      return;
    }

    const payload: any = {
      gestao_agenda_id: row.id,
      usuario_id: perfil.id,
      canal,
      contato_nome: contatoNome || null,
      contato_tipo: contatoTipo || null,
      resultado: status,
      observacao: observacao || null,
    };

    if (selecionada?.id === row.id) {
      if (selectedFornecedorContatoId) {
        payload.fornecedor_contato_id = selectedFornecedorContatoId;
        payload.contato_origem = "contato_fornecedor";
      } else if (row.fornecedor_whatsapp || row.fornecedor_email) {
        payload.contato_origem = "base_fornecedor";
      }

      if (selectedTransportadoraContatoId) {
        payload.transportadora_contato_id = selectedTransportadoraContatoId;
        payload.contato_origem = payload.contato_origem ? payload.contato_origem : "contato_transportadora";
      } else if (row.transportadora_whatsapp || row.transportadora_email) {
        payload.contato_origem = payload.contato_origem ? payload.contato_origem : "base_transportadora";
      }
    } else {
      if (row.fornecedor_whatsapp || row.fornecedor_email) {
        payload.contato_origem = "base_fornecedor";
      }
      if (row.transportadora_whatsapp || row.transportadora_email) {
        payload.contato_origem = payload.contato_origem ? payload.contato_origem : "base_transportadora";
      }
    }

    await db().from("confirmacao_agenda_historico").insert(payload);
    await carregar();
    if (selecionada?.id === row.id) await abrirDetalhe({ ...row, status_confirmacao: status, observacao });
  };

  const salvarHistorico = async () => {
    if (!selecionada) return;
    await atualizarConfirmacao(
      selecionada,
      registro.resultado,
      registro.observacao,
      registro.canal,
      registro.contato_nome,
      registro.contato_tipo
    );
    await abrirDetalhe(selecionada);
  };

  const contactLinks = (row: GestaoAgendaRow) => ({
    fornecedorWa: whatsappHref(row.fornecedor_whatsapp, mensagemFornecedor(row)),
    transportadoraWa: whatsappHref(row.transportadora_whatsapp, mensagemTransportadora(row)),
    fornecedorEmail: mailtoHref(row.fornecedor_email, mensagemFornecedor(row)),
    transportadoraEmail: mailtoHref(row.transportadora_email, mensagemTransportadora(row)),
  });

  const getSelectedFornecedorContato = (row: GestaoAgendaRow) => {
    const selected = fornecedorContatos.find((contato) => contato.id === selectedFornecedorContatoId);
    if (selected) return selected;
    if (row.fornecedor_whatsapp || row.fornecedor_email) {
      return {
        id: "base_fornecedor",
        fornecedor_id: row.fornecedor_id ?? "",
        nome: row.fornecedor_nome ?? "Fornecedor",
        cargo: null,
        tipo: "Cadastro",
        telefone: null,
        whatsapp: row.fornecedor_whatsapp,
        email: row.fornecedor_email,
        principal: true,
        ativo: true,
        observacao: null,
      } as FornecedorContato;
    }
    return null;
  };

  const getSelectedTransportadoraContato = (row: GestaoAgendaRow) => {
    const selected = transportadoraContatos.find((contato) => contato.id === selectedTransportadoraContatoId);
    if (selected) return selected;
    if (row.transportadora_whatsapp || row.transportadora_email) {
      return {
        id: "base_transportadora",
        transportadora_id: row.transportadora_id ?? "",
        nome: row.transportadora_nome ?? "Transportadora",
        cargo: null,
        telefone: null,
        whatsapp: row.transportadora_whatsapp,
        email: row.transportadora_email,
        principal: true,
        ativo: true,
        observacao: null,
      } as TransportadoraContato;
    }
    return null;
  };

  const selectedFornecedorContato = selecionada ? getSelectedFornecedorContato(selecionada) : null;
  const selectedTransportadoraContato = selecionada ? getSelectedTransportadoraContato(selecionada) : null;
  const selectedCamposAlterados = selecionada?.campos_alterados ?? null;
  const selectedCamposAlteradosEntries = Object.entries(selectedCamposAlterados ?? {}) as Array<[
    GestaoAgendaRowCampoReimportacao,
    { de: unknown; para: unknown }
  ]>;
  const highlightCellStyle = (campo: GestaoAgendaRowCampoReimportacao): React.CSSProperties =>
    selectedCamposAlterados?.[campo]
      ? { background: "rgba(239,68,68,0.14)", boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.35)", borderRadius: 6 }
      : {};

  const handlePrefillRegistro = (canal: string, contato: { nome: string; tipo?: string | null; cargo?: string | null; id: string }, origem: string) => {
    setRegistro((prev) => ({
      ...prev,
      canal,
      contato_nome: contato.nome,
      contato_tipo: contato.tipo || contato.cargo || "",
      fornecedor_contato_id: origem === "contato_fornecedor" ? (contato.id.startsWith("base_") ? null : contato.id) : null,
      transportadora_contato_id: origem === "contato_transportadora" ? (contato.id.startsWith("base_") ? null : contato.id) : null,
      contato_origem: origem,
    }));

    if (origem === "contato_fornecedor") {
      setSelectedFornecedorContatoId(contato.id.startsWith("base_") ? null : contato.id);
    }
    if (origem === "contato_transportadora") {
      setSelectedTransportadoraContatoId(contato.id.startsWith("base_") ? null : contato.id);
    }
  };

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Confirmação de Agenda</h1>
          <p style={descStyle}>Gestão preventiva de cargas futuras por fornecedor, transportadora e status de confirmação.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={appHref("/recebimento/importar-agenda-futura")} style={buttonSecondaryStyle}>Importar agenda futura</a>
          <a href={appHref("/recebimento/fornecedores")} style={buttonSecondaryStyle}>Fornecedores</a>
          <a href={appHref("/recebimento/transportadoras")} style={buttonSecondaryStyle}>Transportadoras</a>
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
                const rowAlterado = !!row.alterado_na_ultima_importacao;
                return (
                  <tr key={row.id} style={{ cursor: "pointer", background: rowAlterado ? "rgba(239,68,68,0.06)" : undefined }} onClick={() => void abrirDetalhe(row)}>
                    <td style={{ padding: 8, ...highlightCellStyle("notas_fiscais") }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>{row.codigo_agenda ?? "-"}</span>
                        {rowAlterado && (
                          <span style={{ padding: "3px 8px", borderRadius: 999, background: "rgba(239,68,68,0.14)", color: "#fecaca", fontSize: 11, fontWeight: 800 }}>
                            Alterado
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 8, ...highlightCellStyle("horario") }}>{formatDateBR(row.data_agenda)}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("horario") }}>{formatTime(row.horario)}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("doca") }}>{row.doca ?? "-"}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("fornecedor_nome") }}>{row.fornecedor_nome ?? "-"}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("transportadora_nome") }}>{row.transportadora_nome ?? "-"}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("notas_fiscais") }}>{row.notas_fiscais ?? "-"}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("tipo_carga") }}>{row.tipo_carga ?? "-"}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("tipo_volume") }}>{row.tipo_volume ?? "-"}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("volumes") }}>{formatNumber(row.volumes)}</td>
                    <td style={{ padding: 8, ...highlightCellStyle("sku") }}>{formatNumber(row.sku)}</td>
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
              <button type="button" style={buttonSecondaryStyle} onClick={() => limparSelecaoConfirmacao()}>Voltar para lista</button>
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
                {whatsappHref(selectedFornecedorContato?.whatsapp ?? selecionada.fornecedor_whatsapp, mensagemFornecedor(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={whatsappHref(selectedFornecedorContato?.whatsapp ?? selecionada.fornecedor_whatsapp, mensagemFornecedor(selecionada))!} target="_blank" rel="noreferrer">
                    WhatsApp fornecedor
                  </a>
                )}
                {whatsappHref(selectedTransportadoraContato?.whatsapp ?? selecionada.transportadora_whatsapp, mensagemTransportadora(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={whatsappHref(selectedTransportadoraContato?.whatsapp ?? selecionada.transportadora_whatsapp, mensagemTransportadora(selecionada))!} target="_blank" rel="noreferrer">
                    WhatsApp transportadora
                  </a>
                )}
                {mailtoHref(selectedFornecedorContato?.email ?? selecionada.fornecedor_email, mensagemFornecedor(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={mailtoHref(selectedFornecedorContato?.email ?? selecionada.fornecedor_email, mensagemFornecedor(selecionada))!}>E-mail fornecedor</a>
                )}
                {mailtoHref(selectedTransportadoraContato?.email ?? selecionada.transportadora_email, mensagemTransportadora(selecionada)) && (
                  <a style={buttonSecondaryStyle} href={mailtoHref(selectedTransportadoraContato?.email ?? selecionada.transportadora_email, mensagemTransportadora(selecionada))!}>E-mail transportadora</a>
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
                  <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <label style={{ fontSize: 13, color: theme.colors.textSoft }}>
                      Contato selecionado:
                      <select
                        style={{ ...inputStyle, marginTop: 6 }}
                        value={selectedFornecedorContatoId ?? ""}
                        onChange={(e) => setSelectedFornecedorContatoId(e.target.value || null)}
                      >
                        {fornecedorContatos.map((contato) => (
                          <option key={contato.id} value={contato.id}>
                            {contato.nome} {contato.principal ? "(principal)" : ""}
                          </option>
                        ))}
                        {selecionada.fornecedor_whatsapp || selecionada.fornecedor_email ? (
                          <option value="">Base do fornecedor</option>
                        ) : null}
                      </select>
                    </label>
                    {[...fornecedorContatos, ...(selecionada.fornecedor_whatsapp || selecionada.fornecedor_email ? [{ id: "fornecedor-base-card", fornecedor_id: selecionada.fornecedor_id ?? "", nome: selecionada.fornecedor_nome ?? "Fornecedor", cargo: null, tipo: "Cadastro", telefone: null, whatsapp: selecionada.fornecedor_whatsapp, email: selecionada.fornecedor_email, principal: true, ativo: true, observacao: null }] : [])].map((contato) => {
                      const wa = whatsappHref(contato.whatsapp || contato.telefone, mensagemFornecedor(selecionada));
                      return (
                        <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                          <div style={{ color: theme.colors.text, fontWeight: 800 }}>{contato.nome}</div>
                          <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{contato.tipo ?? contato.cargo ?? "Contato"} | {contato.whatsapp || contato.telefone || "-"}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {wa ? <a style={buttonSecondaryStyle} href={wa} target="_blank" rel="noreferrer">WhatsApp Web</a> : null}
                            {contato.email ? <a style={buttonSecondaryStyle} href={mailtoHref(contato.email, mensagemFornecedor(selecionada)) ?? "#"}>E-mail</a> : null}
                            <button
                              type="button"
                              style={buttonSecondaryStyle}
                              onClick={() => handlePrefillRegistro(contato.whatsapp ? "WhatsApp" : contato.email ? "E-mail" : "Outro", contato, "contato_fornecedor")}
                            >
                              Usar contato
                            </button>
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
                  <a href={appHref(`/recebimento/fornecedores?fornecedor_id=${encodeURIComponent(selecionada.fornecedor_id ?? "")}&fornecedor_nome=${encodeURIComponent(selecionada.fornecedor_nome ?? "")}`)} style={buttonSecondaryStyle}>Cadastrar fornecedor</a>
                  <a href={appHref(`/recebimento/fornecedores?fornecedor_id=${encodeURIComponent(selecionada.fornecedor_id ?? "")}&fornecedor_nome=${encodeURIComponent(selecionada.fornecedor_nome ?? "")}&acao=editar`)} style={buttonSecondaryStyle}>Editar fornecedor</a>
                  <a href={appHref(`/recebimento/transportadoras?fornecedor_id=${encodeURIComponent(selecionada.fornecedor_id ?? "")}&fornecedor_nome=${encodeURIComponent(selecionada.fornecedor_nome ?? "")}&transportadora_id=${encodeURIComponent(selecionada.transportadora_id ?? "")}&transportadora_nome=${encodeURIComponent(selecionada.transportadora_nome ?? "")}&acao=vincular`)} style={buttonSecondaryStyle}>Vincular transportadora</a>
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
                {selectedCamposAlteradosEntries.length > 0 && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(239,68,68,0.08)" }}>
                    <div style={{ color: theme.colors.danger, fontWeight: 900, marginBottom: 8 }}>Campos alterados na última importação</div>
                    <div style={{ display: "grid", gap: 8, color: theme.colors.textSoft, fontSize: 13 }}>
                      {selectedCamposAlteradosEntries.map(([campo, valores]) => (
                        <div key={campo}>
                          <strong>{GESTAO_AGENDA_CAMPOS_REIMPORTACAO_LABELS[campo]}:</strong> {formatarValorMudancaGestaoAgenda(campo, valores.de)} → {formatarValorMudancaGestaoAgenda(campo, valores.para)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: theme.colors.text, fontWeight: 800, marginBottom: 8 }}>Contatos da transportadora</div>
                  <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <label style={{ fontSize: 13, color: theme.colors.textSoft }}>
                      Contato selecionado:
                      <select
                        style={{ ...inputStyle, marginTop: 6 }}
                        value={selectedTransportadoraContatoId ?? ""}
                        onChange={(e) => setSelectedTransportadoraContatoId(e.target.value || null)}
                      >
                        {transportadoraContatos.map((contato) => (
                          <option key={contato.id} value={contato.id}>
                            {contato.nome} {contato.principal ? "(principal)" : ""}
                          </option>
                        ))}
                        {selecionada.transportadora_whatsapp || selecionada.transportadora_email ? (
                          <option value="">Base da transportadora</option>
                        ) : null}
                      </select>
                    </label>
                    {[...transportadoraContatos, ...(selecionada.transportadora_whatsapp || selecionada.transportadora_email ? [{ id: "transp-base-card", transportadora_id: selecionada.transportadora_id ?? "", nome: selecionada.transportadora_nome ?? "Transportadora", cargo: null, telefone: null, whatsapp: selecionada.transportadora_whatsapp, email: selecionada.transportadora_email, principal: true, ativo: true, observacao: null }] : [])].map((contato) => {
                      const wa = whatsappHref(contato.whatsapp || contato.telefone, mensagemTransportadora(selecionada));
                      return (
                        <div key={contato.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                          <div style={{ color: theme.colors.text, fontWeight: 800 }}>{contato.nome}</div>
                          <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{contato.cargo ?? "Contato"} | {contato.whatsapp || contato.telefone || "-"}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {wa ? <a style={buttonSecondaryStyle} href={wa} target="_blank" rel="noreferrer">WhatsApp Web</a> : null}
                            {contato.email ? <a style={buttonSecondaryStyle} href={mailtoHref(contato.email, mensagemTransportadora(selecionada)) ?? "#"}>E-mail</a> : null}
                            <button
                              type="button"
                              style={buttonSecondaryStyle}
                              onClick={() => handlePrefillRegistro(contato.whatsapp ? "WhatsApp" : contato.email ? "E-mail" : "Outro", contato, "contato_transportadora")}
                            >
                              Usar contato
                            </button>
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
                  <a href={appHref(`/recebimento/transportadoras?transportadora_id=${encodeURIComponent(selecionada.transportadora_id ?? "")}&transportadora_nome=${encodeURIComponent(selecionada.transportadora_nome ?? "")}`)} style={buttonSecondaryStyle}>Cadastrar transportadora</a>
                  <a href={appHref(`/recebimento/transportadoras?transportadora_id=${encodeURIComponent(selecionada.transportadora_id ?? "")}&transportadora_nome=${encodeURIComponent(selecionada.transportadora_nome ?? "")}&acao=editar`)} style={buttonSecondaryStyle}>Editar transportadora</a>
                  <a href={appHref("/recebimento/transportadoras")} style={buttonSecondaryStyle}>Todas transportadoras</a>
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
  const [linhaTempoPorAgendamento, setLinhaTempoPorAgendamento] = useState<Record<string, LinhaTempoAgenda[]>>({});
  const [ocorrenciasPorAgendamento, setOcorrenciasPorAgendamento] = useState<Record<string, Ocorrencia[]>>({});
  const [fotosPorOcorrencia, setFotosPorOcorrencia] = useState<Record<string, OcorrenciaFoto[]>>({});
  const [selecionada, setSelecionada] = useState<DashboardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarNovaOcorrencia, setMostrarNovaOcorrencia] = useState(false);
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: TIPOS_OCORRENCIA[0], item_id: "", descricao: "" });
  const [novaOcorrenciaFotos, setNovaOcorrenciaFotos] = useState<File[]>([]);
  const [novaLinhaTempo, setNovaLinhaTempo] = useState({ tipo: TIPOS_LINHA_TEMPO[0], descricao: "" });
  const [salvandoLinhaTempo, setSalvandoLinhaTempo] = useState(false);
  const [filtros, setFiltros] = useState(() => {
    const fallback = {
      data: todayISO(),
      empresa: "",
      status: "",
      transportadora: "",
    };
    if (typeof window === "undefined") return fallback;
    return storageReadObject(window.localStorage, RECEBIMENTO_AGENDA_FILTERS_KEY, fallback);
  });

  const [selecionadaPersistidaId, setSelecionadaPersistidaId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return storageReadString(window.sessionStorage, RECEBIMENTO_AGENDA_SELECTION_KEY);
  });

  const formatNumber = (value: number | string | null | undefined, decimals = 0) =>
    toNumber(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");
  const cargaKey = (row: DashboardRow) => cargaDisplayKey(row);

  const selecionarAgenda = (row: DashboardRow | null) => {
    setSelecionada(row);
    const nextId = row?.agendamento_id ?? null;
    setSelecionadaPersistidaId(nextId);
    if (typeof window !== "undefined") {
      if (nextId) storageWriteJson(window.sessionStorage, RECEBIMENTO_AGENDA_SELECTION_KEY, nextId);
      else window.sessionStorage.removeItem(RECEBIMENTO_AGENDA_SELECTION_KEY);
    }
  };

  const limparSelecaoAgenda = () => selecionarAgenda(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    storageWriteJson(window.localStorage, RECEBIMENTO_AGENDA_FILTERS_KEY, filtros);
  }, [filtros]);

  useEffect(() => {
    if (!selecionadaPersistidaId) return;
    const encontrada = rows.find((row) => row.agendamento_id === selecionadaPersistidaId) ?? null;
    if (!encontrada) {
      if (selecionada) selecionarAgenda(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(RECEBIMENTO_AGENDA_SELECTION_KEY);
      }
      return;
    }
    if (selecionada?.agendamento_id !== encontrada.agendamento_id || selecionada !== encontrada) {
      setSelecionada(encontrada);
    }
  }, [rows, selecionadaPersistidaId]);

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
      setLinhaTempoPorAgendamento({});
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
      setLinhaTempoPorAgendamento({});
      setOcorrenciasPorAgendamento({});
      setFotosPorOcorrencia({});
      setLoading(false);
      return;
    }

    const [
      { data: itens, error: itensError },
      { data: historico, error: historicoError },
      { data: linhaTempo, error: linhaTempoError },
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
        .from("agendamento_linha_tempo")
        .select("id,agendamento_id,tipo,descricao,usuario_id,created_at")
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

    if (linhaTempoError) {
      console.error("Erro ao carregar linha do tempo da agenda:", linhaTempoError);
      setLinhaTempoPorAgendamento({});
    } else {
      const timelineRows = (linhaTempo ?? []) as LinhaTempoAgenda[];
      const usuarioIds = Array.from(new Set(timelineRows.map((item) => item.usuario_id).filter((value): value is string => !!value)));
      const usuariosPorId: Record<string, string> = {};

      if (usuarioIds.length > 0) {
        const { data: usuarios, error: usuariosError } = await db()
          .from("usuarios")
          .select("id,nome")
          .in("id", usuarioIds);
        if (usuariosError) {
          console.error("Erro ao carregar usuários da linha do tempo:", usuariosError);
        } else {
          for (const usuario of (usuarios ?? []) as Array<{ id: string; nome: string }>) {
            usuariosPorId[usuario.id] = usuario.nome;
          }
        }
      }

      const grouped: Record<string, LinhaTempoAgenda[]> = {};
      for (const item of timelineRows) {
        if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
        grouped[item.agendamento_id].push({
          ...item,
          usuario_nome: item.usuario_id ? usuariosPorId[item.usuario_id] ?? null : null,
        });
      }
      setLinhaTempoPorAgendamento(grouped);
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

  const salvarLinhaTempo = async () => {
    if (!selecionada) return;
    const descricao = novaLinhaTempo.descricao.trim();
    if (!descricao) {
      setErro("Informe a descrição da linha do tempo.");
      return;
    }

    setSalvandoLinhaTempo(true);
    setErro(null);
    const { error } = await db().from("agendamento_linha_tempo").insert({
      agendamento_id: selecionada.agendamento_id,
      tipo: novaLinhaTempo.tipo,
      descricao,
      usuario_id: perfil.id,
    });

    if (error) {
      console.error("Erro ao salvar linha do tempo:", error);
      setErro("Erro ao salvar linha do tempo.");
      setSalvandoLinhaTempo(false);
      return;
    }

    setNovaLinhaTempo({ tipo: TIPOS_LINHA_TEMPO[0], descricao: "" });
    await carregarAgenda();
    setSalvandoLinhaTempo(false);
  };

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
  const linhaTempoSelecionada = selecionada ? linhaTempoPorAgendamento[selecionada.agendamento_id] ?? [] : [];
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
                        onClick={() => selecionarAgenda(row)}
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
              <button type="button" style={buttonSecondaryStyle} onClick={() => limparSelecaoAgenda()}>Fechar</button>
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

            <h3 style={{ color: theme.colors.text, fontSize: 15, margin: "16px 0 8px" }}>Linha do Tempo da Carga</h3>
            <div style={{ ...cardStyle, padding: 12, display: "grid", gap: 10 }}>
              <select
                style={inputStyle}
                value={novaLinhaTempo.tipo}
                onChange={(e) => setNovaLinhaTempo({ ...novaLinhaTempo, tipo: e.target.value })}
              >
                {TIPOS_LINHA_TEMPO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              <textarea
                style={{ ...inputStyle, minHeight: 88 }}
                placeholder="Registrar observação operacional, contato, problema ou andamento da carga"
                value={novaLinhaTempo.descricao}
                onChange={(e) => setNovaLinhaTempo({ ...novaLinhaTempo, descricao: e.target.value })}
              />
              <button type="button" style={buttonPrimaryStyle} onClick={() => void salvarLinhaTempo()} disabled={salvandoLinhaTempo}>
                {salvandoLinhaTempo ? "Salvando..." : "Salvar registro"}
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {linhaTempoSelecionada.map((item) => (
                <div key={item.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                  <div style={{ color: theme.colors.neonOrange, fontWeight: 800 }}>{item.tipo}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{formatDateTimeBR(item.created_at)}</div>
                  <div style={{ color: theme.colors.textSoft, fontSize: 13, marginTop: 4 }}>{item.descricao}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    {item.usuario_nome ?? item.usuario_id ?? "-"}
                  </div>
                </div>
              ))}
              {linhaTempoSelecionada.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhum registro na linha do tempo.</div>}
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
  const [contatoEditId, setContatoEditId] = useState<string | null>(null);
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

    setErro(null);
    if (contatoForm.principal) {
      const { error: resetError } = await db()
        .from("fornecedor_contatos")
        .update({ principal: false })
        .eq("fornecedor_id", selecionado.id)
        .eq("principal", true);
      if (resetError) {
        setErro("Erro ao atualizar contato principal do fornecedor.");
        return;
      }
    }

    const payload = {
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo.trim() || null,
      tipo: contatoForm.tipo.trim() || null,
      telefone: contatoForm.telefone.trim() || null,
      whatsapp: contatoForm.whatsapp.trim() || null,
      email: contatoForm.email.trim() || null,
      principal: contatoForm.principal,
      ativo: true,
      observacao: contatoForm.observacao.trim() || null,
    };

    const query = contatoEditId
      ? db().from("fornecedor_contatos").update(payload).eq("id", contatoEditId)
      : db().from("fornecedor_contatos").insert({ fornecedor_id: selecionado.id, ...payload });

    const { error } = await query;
    if (error) {
      setErro("Erro ao salvar contato do fornecedor.");
      return;
    }

    setContatoForm({ nome: "", cargo: "", tipo: "", telefone: "", whatsapp: "", email: "", principal: false, observacao: "" });
    setContatoEditId(null);
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

  const editarContato = (contato: FornecedorContato) => {
    setContatoEditId(contato.id);
    setContatoForm({
      nome: contato.nome,
      cargo: contato.cargo ?? "",
      tipo: contato.tipo ?? "",
      telefone: contato.telefone ?? "",
      whatsapp: contato.whatsapp ?? "",
      email: contato.email ?? "",
      principal: !!contato.principal,
      observacao: contato.observacao ?? "",
    });
  };

  const toggleFornecedorContatoAtivo = async (contato: FornecedorContato) => {
    const { error } = await db().from("fornecedor_contatos").update({ ativo: !contato.ativo }).eq("id", contato.id);
    if (error) {
      setErro("Erro ao atualizar status do contato.");
      return;
    }
    if (selecionado) await carregarContatos(selecionado);
  };

  const definirContatoPrincipalFornecedor = async (contato: FornecedorContato) => {
    if (!selecionado) return;
    const { error: resetError } = await db()
      .from("fornecedor_contatos")
      .update({ principal: false })
      .eq("fornecedor_id", selecionado.id)
      .eq("principal", true);
    if (resetError) {
      setErro("Erro ao atualizar contato principal.");
      return;
    }
    const { error } = await db().from("fornecedor_contatos").update({ principal: true }).eq("id", contato.id);
    if (error) {
      setErro("Erro ao definir contato principal.");
      return;
    }
    await carregarContatos(selecionado);
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
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <button type="button" style={buttonSecondaryStyle} onClick={() => editarContato(contato)}>Editar</button>
                  <button type="button" style={buttonSecondaryStyle} onClick={() => toggleFornecedorContatoAtivo(contato)}>
                    {contato.ativo ? "Desativar" : "Ativar"}
                  </button>
                  {!contato.principal && (
                    <button type="button" style={buttonSecondaryStyle} onClick={() => definirContatoPrincipalFornecedor(contato)}>
                      Definir principal
                    </button>
                  )}
                </div>
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
  const [contatoEditIdTransportadora, setContatoEditIdTransportadora] = useState<string | null>(null);

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

    setErro(null);
    if (contatoForm.principal) {
      const { error: resetError } = await db()
        .from("transportadora_contatos")
        .update({ principal: false })
        .eq("transportadora_id", selecionada.id)
        .eq("principal", true);
      if (resetError) {
        setErro("Erro ao atualizar contato principal da transportadora.");
        return;
      }
    }

    const payload = {
      transportadora_id: selecionada.id,
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo.trim() || null,
      telefone: contatoForm.telefone.trim() || null,
      whatsapp: contatoForm.whatsapp.trim() || null,
      email: contatoForm.email.trim() || null,
      principal: contatoForm.principal,
      ativo: true,
      observacao: contatoForm.observacao.trim() || null,
    };

    const query = contatoEditIdTransportadora
      ? db().from("transportadora_contatos").update(payload).eq("id", contatoEditIdTransportadora)
      : db().from("transportadora_contatos").insert(payload);

    const { error } = await query;
    if (error) {
      setErro("Erro ao salvar contato.");
      return;
    }

    setContatoForm({ nome: "", cargo: "", telefone: "", whatsapp: "", email: "", principal: false, observacao: "" });
    setContatoEditIdTransportadora(null);
    await carregarContatos(selecionada);
  };

  const editarContatoTransportadora = (contato: TransportadoraContato) => {
    setContatoEditIdTransportadora(contato.id);
    setContatoForm({
      nome: contato.nome,
      cargo: contato.cargo ?? "",
      telefone: contato.telefone ?? "",
      whatsapp: contato.whatsapp ?? "",
      email: contato.email ?? "",
      principal: !!contato.principal,
      observacao: contato.observacao ?? "",
    });
  };

  const toggleTransportadoraContatoAtivo = async (contato: TransportadoraContato) => {
    const { error } = await db().from("transportadora_contatos").update({ ativo: !contato.ativo }).eq("id", contato.id);
    if (error) {
      setErro("Erro ao atualizar status do contato.");
      return;
    }
    if (selecionada) await carregarContatos(selecionada);
  };

  const definirContatoPrincipalTransportadora = async (contato: TransportadoraContato) => {
    if (!selecionada) return;
    const { error: resetError } = await db()
      .from("transportadora_contatos")
      .update({ principal: false })
      .eq("transportadora_id", selecionada.id)
      .eq("principal", true);
    if (resetError) {
      setErro("Erro ao atualizar contato principal.");
      return;
    }
    const { error } = await db().from("transportadora_contatos").update({ principal: true }).eq("id", contato.id);
    if (error) {
      setErro("Erro ao definir contato principal.");
      return;
    }
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
      : parseDelimitedTable(await readTextFile(file));
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
  const firstLine = (await readTextFile(file)).split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  return splitDelimitedLine(firstLine).map(normalizeHeader).includes("CODIGO_AGENDA");
};

const importarGestaoAgendaRows = async (
  rowsGestao: GestaoAgendaImportRow[],
  nomeArquivo: string,
  usuarioId: string,
  onProgress?: (current: number, total: number) => void
) => {
  const primeiraData = rowsGestao.find((row) => row.data_agenda)?.data_agenda ?? null;
  const { data: importacao, error: importacaoError } = await db()
    .from("importacoes")
    .insert({
      nome_arquivo: nomeArquivo,
      data_referencia: primeiraData,
      total_linhas: rowsGestao.length,
      usuario_id: usuarioId,
      tipo_importacao: "agenda_futura",
      quantidade_linhas: rowsGestao.length,
      quantidade_processadas: 0,
      quantidade_erro: 0,
      status: "Importando",
    })
    .select("id")
    .single();
  if (importacaoError) throw importacaoError;
  const importacaoId = importacao.id as string;

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

      const payloadBase = {
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
        importacao_id: importacaoId,
        ultima_importacao_id: importacaoId,
        ultima_atualizacao_importacao: new Date().toISOString(),
      };

      const { data: existente, error: existeError } = await db()
        .from("gestao_agenda")
        .select("id")
        .eq("codigo_agenda", row.codigo_agenda)
        .limit(1)
        .maybeSingle();
      if (existeError) throw existeError;

      const { data: existenteCompleto } = await db()
        .from("gestao_agenda")
        .select("*")
        .eq("codigo_agenda", row.codigo_agenda)
        .maybeSingle();

      if (existente?.id && existenteCompleto) {
        const camposAlterados = construirCamposAlteradosGestaoAgenda(existenteCompleto as GestaoAgendaRow, payloadBase as GestaoAgendaRow);
        const updatePayload = {
          ...payloadBase,
          alterado_na_ultima_importacao: Object.keys(camposAlterados).length > 0,
          campos_alterados: Object.keys(camposAlterados).length > 0 ? camposAlterados : null,
        };

        const { error } = await db()
          .from("gestao_agenda")
          .update(updatePayload)
          .eq("id", existente.id);
        if (error) throw error;
        agendasAtualizadas += 1;
      } else {
        const insertPayload = {
          ...payloadBase,
          alterado_na_ultima_importacao: false,
          campos_alterados: null,
        };
        const { error } = await db().from("gestao_agenda").insert(insertPayload);
        if (error) throw error;
        agendasNovas += 1;
      }
    } catch (e: any) {
      erros.push(`Linha ${index + 2}: ${e?.message ?? "erro ao importar"}`);
    }
  }

  const { error: importacaoUpdateError } = await db()
    .from("importacoes")
    .update({
      quantidade_processadas: agendasNovas + agendasAtualizadas,
      quantidade_erro: erros.length,
      status: erros.length > 0 ? "Erro" : "Concluída",
      data_finalizacao: new Date().toISOString(),
      observacao: erros.length > 0 ? `Importacao concluida com ${erros.length} erro(s).` : null,
    })
    .eq("id", importacaoId);
  if (importacaoUpdateError) throw importacaoUpdateError;

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

const importarGestaoAgendaFile = async (
  file: File,
  usuarioId: string,
  onProgress?: (current: number, total: number) => void
) => importarGestaoAgendaRows(await parseGestaoAgendaRows(file), file.name, usuarioId, onProgress);

export function RecebimentoImportarAgendaFutura({ perfil }: Props) {
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
      const resultado = await importarGestaoAgendaRows(linhas, arquivo.name, perfil.id, (current, total) => {
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
        <a href={appHref("/recebimento/confirmacao-agenda")} style={buttonSecondaryStyle}>Voltar para confirmacao</a>
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
  const [importacoes, setImportacoes] = useState<any[]>([]);

  const analisarArquivo = async (file: File) => {
    if (await isGestaoAgendaFile(file)) {
      setErro("Este arquivo e de Agenda Futura. Use o menu Importar Agenda Futura.");
      return;
    }
    const text = await readTextFile(file);
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

  async function carregarHistorico() {
    try {
      const { data, error } = await db()
        .from('importacoes')
        .select('id,nome_arquivo,tipo_importacao,data_importacao,quantidade_linhas,quantidade_processadas,quantidade_erro,status,observacao')
        .order('data_importacao', { ascending: false });
      if (error) throw error;
      setImportacoes(data ?? []);
    } catch (err: any) {
      console.error('Erro ao carregar historico de importacoes.', err);
    }
  }

  useEffect(() => {
    void carregarHistorico();
  }, []);

  async function excluirImportacao(item: any) {
    const nome = item.nome_arquivo || item.tipo_importacao || item.id;
    const confirmado = window.confirm(
      `Excluir a importacao "${nome}"?\n\nSomente os registros ligados a este arquivo serao removidos do Supabase. Esta acao nao apaga outras bases.`,
    );
    if (!confirmado) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const id = String(item.id);

      // verificar se existem registros vinculados
      const counts = await Promise.all([
        db().from('agendamento_itens').select('id', { count: 'exact', head: true }).eq('importacao_id', id),
        db().from('agendamento_historico').select('id', { count: 'exact', head: true }).eq('importacao_id', id),
        db().from('agendamentos').select('id', { count: 'exact', head: true }).eq('importacao_id', id),
        db().from('gestao_agenda').select('id', { count: 'exact', head: true }).eq('importacao_id', id),
      ]);

      const totalLinked = counts.reduce((acc: number, r: any) => acc + (r?.count ?? 0), 0);
      if (totalLinked === 0) {
        window.alert('Importacao antiga sem vínculo rastreável. Exclusão bloqueada.');
        return;
      }

      // chamar a função SQL para exclusão segura
      const { data: rpcData, error: rpcError } = await db().rpc('fn_excluir_importacao', { p_importacao_id: id });
      if (rpcError) throw rpcError;
      setMensagem(`Importacao "${nome}" excluida. Resumo: ${JSON.stringify(rpcData?.[0] ?? rpcData)}`);
      await carregarHistorico();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? 'Erro ao excluir importacao.');
    } finally {
      setLoading(false);
    }
  }

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
      <div style={{ ...cardStyle }}>
        <h2 style={{ margin: 0, color: theme.colors.neonGreen }}>Histórico de Importações</h2>
        {importacoes.length === 0 ? (
          <div style={{ marginTop: 8, color: theme.colors.textSoft }}>Nenhuma importação registrada.</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Data/Hora</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Arquivo</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Linhas</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Processadas</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Erros</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {importacoes.map((it) => (
                  <tr key={it.id}>
                    <td style={{ padding: 8 }}>{it.data_importacao ? new Date(it.data_importacao).toLocaleString() : ''}</td>
                    <td style={{ padding: 8 }}>{it.tipo_importacao}</td>
                    <td style={{ padding: 8 }}>{it.nome_arquivo}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{it.quantidade_linhas ?? it.total_linhas ?? 0}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{it.quantidade_processadas ?? 0}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{it.quantidade_erro ?? 0}</td>
                    <td style={{ padding: 8 }}>{it.status}</td>
                    <td style={{ padding: 8 }}>
                      <button type="button" onClick={() => window.alert(JSON.stringify(it, null, 2))} style={{ marginRight: 8 }}>Visualizar</button>
                      <button type="button" onClick={() => void excluirImportacao(it)} style={{ color: theme.colors.danger }}>Excluir</button>
                      <button type="button" disabled style={{ marginLeft: 8 }}>Reprocessar (Em breve)</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function RecebimentoNoShowDashboard({ perfil: _perfil }: Props) {
  const [resumoRows, setResumoRows] = useState<NoShowResumoMensalRow[]>([]);
  const [dashboardRows, setDashboardRows] = useState<NoShowDashboardResumoRow[]>([]);
  const [topRows, setTopRows] = useState<NoShowTopFornecedorRow[]>([]);
  const [baseRows, setBaseRows] = useState<NoShowBasePortalDashboardRow[]>([]);
  const [metaRows, setMetaRows] = useState<NoShowMetaCapacidadeDashboardRow[]>([]);
  const [abertosExec, setAbertosExec] = useState<Record<string, boolean>>({});
  const [ultimaAtualizacaoNoShow, setUltimaAtualizacaoNoShow] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    mes: "",
    ano: "",
    uf: "",
    fornecedor: "",
    status: "",
    empresa: "",
    grupo: "",
  });

  const carregarDashboard = async () => {
    setLoading(true);
    setErro(null);

    const [resumoResult, dashboardResult, topResult, baseResult, metaResult] = await Promise.all([
      db().from("vw_noshow_resumo_mensal").select("*").order("ano", { ascending: false }).order("mes", { ascending: false }).order("uf", { ascending: true }),
      db().from("vw_noshow_dashboard").select("*").order("ano", { ascending: false }).order("mes", { ascending: false }).order("uf", { ascending: true }),
      db().from("vw_noshow_top_fornecedores").select("*").order("ranking", { ascending: true }),
      db()
        .from("noshow_base_portal")
        .select("id,mes,data_recebimento,uf,fornecedor_nome,status_recebimento,concluido,no_show,nao_realizado,abandono,sku,paletes,caixas,valor,volumes")
        .order("data_recebimento", { ascending: false }),
      db().from("noshow_metas_capacidade").select("uf,mes,ano,capacidade_dia,meta_recebimento_mes").order("ano", { ascending: false }).order("mes", { ascending: false }).order("uf", { ascending: true }),
    ]);

    const firstError = resumoResult.error ?? dashboardResult.error ?? topResult.error ?? baseResult.error ?? metaResult.error;
    if (firstError) {
      console.error("Erro ao carregar dashboard No Show:", firstError);
      setErro("Erro ao carregar os dados do dashboard No Show.");
      setResumoRows([]);
      setDashboardRows([]);
      setTopRows([]);
      setBaseRows([]);
      setMetaRows([]);
      setLoading(false);
      return;
    }

    const nextResumoRows = (resumoResult.data ?? []) as NoShowResumoMensalRow[];
    const nextDashboardRows = (dashboardResult.data ?? []) as NoShowDashboardResumoRow[];
    const nextTopRows = (topResult.data ?? []) as NoShowTopFornecedorRow[];
    const nextBaseRows = (baseResult.data ?? []) as NoShowBasePortalDashboardRow[];
    const nextMetaRows = (metaResult.data ?? []) as NoShowMetaCapacidadeDashboardRow[];

    setResumoRows(nextResumoRows);
    setDashboardRows(nextDashboardRows);
    setTopRows(nextTopRows);
    setBaseRows(nextBaseRows);
    setMetaRows(nextMetaRows);
    setUltimaAtualizacaoNoShow(new Date().toLocaleString("pt-BR"));

    setFiltros((prev) => {
      if (prev.mes || prev.ano) return prev;
      const latestRow = nextBaseRows.find((row) => row.data_recebimento) ?? null;
      if (!latestRow?.data_recebimento) return prev;
      return {
        ...prev,
        mes: latestRow.data_recebimento.slice(5, 7),
        ano: latestRow.data_recebimento.slice(0, 4),
      };
    });

    setLoading(false);
  };

  useEffect(() => {
    void carregarDashboard();
  }, []);

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => noShowMonthValue(row)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [baseRows]
  );
  const anosDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => noShowYearValue(row)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [baseRows]
  );
  const ufsDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => (row.uf ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [baseRows]
  );
  const statusDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => noShowStatusLabel(row)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [baseRows]
  );
  const empresasDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          baseRows
            .map((row) => String((row as any).empresa ?? (row as any).cd ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [baseRows]
  );
  const gruposDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          baseRows
            .map((row) => String((row as any).grupo ?? (row as any).tipo_carga ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [baseRows]
  );

  const baseRowsFiltradas = useMemo(() => {
    const fornecedorFiltro = filtros.fornecedor.trim().toLowerCase();
    return baseRows.filter((row) => {
      const mes = noShowMonthValue(row);
      const ano = noShowYearValue(row);
      const uf = (row.uf ?? "").trim();
      const fornecedor = (row.fornecedor_nome ?? "").toLowerCase();
      const status = noShowStatusLabel(row);
      const empresa = String((row as any).empresa ?? (row as any).cd ?? "").trim();
      const grupo = String((row as any).grupo ?? (row as any).tipo_carga ?? "").trim();

      if (filtros.mes && mes !== filtros.mes) return false;
      if (filtros.ano && ano !== filtros.ano) return false;
      if (filtros.uf && uf !== filtros.uf) return false;
      if (fornecedorFiltro && !fornecedor.includes(fornecedorFiltro)) return false;
      if (filtros.status && status !== filtros.status) return false;
      if (filtros.empresa && empresa !== filtros.empresa) return false;
      if (filtros.grupo && grupo !== filtros.grupo) return false;
      return true;
    });
  }, [baseRows, filtros]);

  const metasFiltradas = useMemo(
    () =>
      metaRows.filter((row) => {
        if (filtros.mes && padMonth(row.mes) !== filtros.mes) return false;
        if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return false;
        if (filtros.uf && (row.uf ?? "") !== filtros.uf) return false;
        return true;
      }),
    [metaRows, filtros]
  );

  const resumoConsolidado = useMemo(() => {
    if (!filtros.fornecedor && !filtros.status && !filtros.empresa && !filtros.grupo) {
      return resumoRows.filter((row) => {
        if (filtros.mes && padMonth(row.mes) !== filtros.mes) return false;
        if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return false;
        if (filtros.uf && (row.uf ?? "") !== filtros.uf) return false;
        return true;
      });
    }

    const grouped = new Map<string, NoShowResumoMensalRow>();
    for (const row of baseRowsFiltradas) {
      const uf = row.uf ?? "-";
      const mes = noShowMonthValue(row);
      const ano = Number(noShowYearValue(row) || 0);
      const key = `${uf}|${mes}|${ano}`;
      const current = grouped.get(key) ?? {
        uf,
        mes,
        ano,
        agendas_mes: 0,
        recebidas: 0,
        nao_recebidas: 0,
        total_no_show: 0,
        percentual_no_show: 0,
        media_recebidas_dia: 0,
        media_no_show_dia: 0,
        capacidade_dia: 0,
        meta_recebimento_mes: 0,
        percentual_recebido: 0,
      };

      const agendas = toNumber(current.agendas_mes) + 1;
      const recebidas = toNumber(current.recebidas) + (row.concluido ? 1 : 0);
      const totalNoShow = toNumber(current.total_no_show) + (row.no_show ? 1 : 0);
      const naoRecebidas = agendas - recebidas;
      grouped.set(key, {
        ...current,
        agendas_mes: agendas,
        recebidas,
        nao_recebidas: naoRecebidas,
        total_no_show: totalNoShow,
      });
    }

    return Array.from(grouped.values())
      .map((row) => {
        const dias = countDistinctNoShowDates(
          baseRowsFiltradas.filter(
            (item) =>
              (item.uf ?? "-") === row.uf &&
              noShowMonthValue(item) === padMonth(row.mes) &&
              Number(noShowYearValue(item) || 0) === Number(row.ano ?? 0)
          )
        );
        const meta = metaRows.find(
          (item) =>
            (item.uf ?? "") === (row.uf ?? "") &&
            padMonth(item.mes) === padMonth(row.mes) &&
            String(item.ano ?? "") === String(row.ano ?? "")
        );
        const agendas = toNumber(row.agendas_mes);
        const recebidas = toNumber(row.recebidas);
        const noShow = toNumber(row.total_no_show);
        const metaRecebimentoMes = toNumber(meta?.meta_recebimento_mes);
        return {
          ...row,
          media_recebidas_dia: dias > 0 ? recebidas / dias : 0,
          media_no_show_dia: dias > 0 ? noShow / dias : 0,
          capacidade_dia: toNumber(meta?.capacidade_dia),
          meta_recebimento_mes: metaRecebimentoMes,
          percentual_no_show: agendas > 0 ? noShow / agendas : 0,
          percentual_recebido: metaRecebimentoMes > 0 ? recebidas / metaRecebimentoMes : agendas > 0 ? recebidas / agendas : 0,
        };
      })
      .sort((a, b) => `${b.ano ?? 0}${padMonth(b.mes)}`.localeCompare(`${a.ano ?? 0}${padMonth(a.mes)}`));
  }, [baseRowsFiltradas, filtros, metaRows, resumoRows]);

  const top5Fornecedores = useMemo(() => {
    if (!filtros.fornecedor && !filtros.status && !filtros.empresa && !filtros.grupo) {
      return topRows
        .filter((row) => {
          if (filtros.mes && padMonth(row.mes) !== filtros.mes) return false;
          if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return false;
          if (filtros.uf && (row.uf ?? "") !== filtros.uf) return false;
          return true;
        })
        .slice()
        .sort((a, b) => toNumber(b.no_show) - toNumber(a.no_show) || toNumber(b.agendas) - toNumber(a.agendas))
        .slice(0, 5);
    }

    const grouped = new Map<string, NoShowTopFornecedorRow>();
    for (const row of baseRowsFiltradas) {
      const fornecedor = row.fornecedor_nome?.trim() || "Não informado";
      const key = fornecedor;
      const current = grouped.get(key) ?? {
        uf: filtros.uf || row.uf,
        mes: filtros.mes,
        ano: filtros.ano ? Number(filtros.ano) : null,
        fornecedor_nome: fornecedor,
        agendas: 0,
        recebidas: 0,
        nao_recebidas: 0,
        no_show: 0,
        percentual_no_show: 0,
        ranking: 0,
      };
      const agendas = toNumber(current.agendas) + 1;
      const recebidas = toNumber(current.recebidas) + (row.concluido ? 1 : 0);
      const noShow = toNumber(current.no_show) + (row.no_show ? 1 : 0);
      const naoRecebidas = agendas - recebidas;
      grouped.set(key, {
        ...current,
        agendas,
        recebidas,
        nao_recebidas: naoRecebidas,
        no_show: noShow,
        percentual_no_show: agendas > 0 ? noShow / agendas : 0,
      });
    }

    return Array.from(grouped.values())
      .sort((a, b) => toNumber(b.no_show) - toNumber(a.no_show) || toNumber(b.agendas) - toNumber(a.agendas))
      .slice(0, 5)
      .map((row, index) => ({ ...row, ranking: index + 1 }));
  }, [baseRowsFiltradas, filtros, topRows]);

  const indicadores = useMemo(() => {
    const totalAgendas = baseRowsFiltradas.length;
    const recebidas = baseRowsFiltradas.filter((row) => row.concluido).length;
    const totalNoShow = baseRowsFiltradas.filter((row) => row.no_show).length;
    const naoRealizado = baseRowsFiltradas.filter((row) => row.nao_realizado).length;
    const abandono = baseRowsFiltradas.filter((row) => row.abandono).length;
    const naoRecebidas = totalAgendas - recebidas;
    const diasAtivos = countDistinctNoShowDates(baseRowsFiltradas);
    const capacidadeDia = metasFiltradas.reduce((sum, row) => sum + toNumber(row.capacidade_dia), 0);
    const metaRecebimentoMes = metasFiltradas.reduce((sum, row) => sum + toNumber(row.meta_recebimento_mes), 0);
    const percentualNoShow = totalAgendas > 0 ? totalNoShow / totalAgendas : 0;
    const percentualRecebido = metaRecebimentoMes > 0 ? recebidas / metaRecebimentoMes : totalAgendas > 0 ? recebidas / totalAgendas : 0;
    const eficiencia = totalAgendas > 0 ? recebidas / totalAgendas : 0;
    const acuraciaDenominador = recebidas + totalNoShow + naoRealizado + abandono;
    const acuracia = acuraciaDenominador > 0 ? recebidas / acuraciaDenominador : 0;
    const produtos = baseRowsFiltradas.reduce((sum, row) => sum + toNumber(row.sku), 0);
    const paletes = baseRowsFiltradas.reduce((sum, row) => sum + toNumber(row.paletes), 0);
    const caixas = baseRowsFiltradas.reduce((sum, row) => sum + toNumber(row.caixas), 0);
    const valorTotal = baseRowsFiltradas.reduce((sum, row) => sum + toNumber(row.valor), 0);

    return {
      totalAgendas,
      recebidas,
      naoRecebidas,
      totalNoShow,
      percentualNoShow,
      mediaRecebidasDia: diasAtivos > 0 ? recebidas / diasAtivos : 0,
      mediaNoShowDia: diasAtivos > 0 ? totalNoShow / diasAtivos : 0,
      capacidadeDia,
      metaRecebimentoMes,
      percentualRecebido,
      eficiencia,
      acuracia,
      realizado: recebidas,
      naoRealizado,
      abandono,
      produtos,
      paletes,
      caixas,
      valorTotal,
    };
  }, [baseRowsFiltradas, metasFiltradas]);

  const consolidadoOperacional = useMemo(() => {
    if (filtros.fornecedor || filtros.status || filtros.empresa || filtros.grupo) {
      return {
        produtos: indicadores.produtos,
        paletes: indicadores.paletes,
        caixas: indicadores.caixas,
        valor_total: indicadores.valorTotal,
      };
    }

    const rows = dashboardRows.filter((row) => {
      if (filtros.mes && padMonth(row.mes) !== filtros.mes) return false;
      if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return false;
      if (filtros.uf && (row.uf ?? "") !== filtros.uf) return false;
      return true;
    });

    return rows.reduce(
      (acc, row) => ({
        produtos: acc.produtos + toNumber(row.produtos),
        paletes: acc.paletes + toNumber(row.paletes),
        caixas: acc.caixas + toNumber(row.caixas),
        valor_total: acc.valor_total + toNumber(row.valor_total),
      }),
      { produtos: 0, paletes: 0, caixas: 0, valor_total: 0 }
    );
  }, [dashboardRows, filtros, indicadores]);

  const noShowStatusColor = (value: number) => {
    if (value <= 0.05) return theme.colors.neonGreen;
    if (value <= 0.1) return theme.colors.neonYellow;
    if (value <= 0.2) return theme.colors.neonOrange;
    return theme.colors.danger;
  };

  const statusFornecedor = (percentual: number) => {
    if (percentual <= 0.05) return "Controlado";
    if (percentual <= 0.1) return "Atenção";
    if (percentual <= 0.2) return "Alerta";
    return "Crítico";
  };

  const dashboardOnline = !loading && !erro;
  const mesAnoLabel = filtros.mes && filtros.ano ? `${filtros.mes}/${filtros.ano}` : "Período geral";
  const fornecedoresCriticos = top5Fornecedores.filter((row) => toNumber(row.percentual_no_show) > 0.1).length;

  const kpiGrupos = [
    {
      title: "Status",
      cards: [
        ["📅 Agendas", indicadores.totalAgendas.toLocaleString("pt-BR")],
        ["✅ Recebidas", indicadores.recebidas.toLocaleString("pt-BR")],
        ["❌ Não recebidas", indicadores.naoRecebidas.toLocaleString("pt-BR")],
        ["🚫 No Show", indicadores.totalNoShow.toLocaleString("pt-BR")],
        ["⚫ Não realizado", indicadores.naoRealizado.toLocaleString("pt-BR")],
        ["⚠ Abandono", indicadores.abandono.toLocaleString("pt-BR")],
      ],
    },
    {
      title: "Volume",
      cards: [
        ["📦 Produtos", consolidadoOperacional.produtos.toLocaleString("pt-BR")],
        ["🪵 Paletes", consolidadoOperacional.paletes.toLocaleString("pt-BR")],
        ["📦 Caixas", consolidadoOperacional.caixas.toLocaleString("pt-BR")],
        ["💰 Valor", formatCurrency(consolidadoOperacional.valor_total)],
      ],
    },
    {
      title: "Performance",
      cards: [
        ["📈 % Recebido", percent(indicadores.percentualRecebido)],
        ["🎯 Meta", indicadores.metaRecebimentoMes.toLocaleString("pt-BR")],
        ["🏭 Capacidade", indicadores.capacidadeDia.toLocaleString("pt-BR")],
        ["📊 Média recebidas/dia", indicadores.mediaRecebidasDia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })],
        ["📉 Média No Show/dia", indicadores.mediaNoShowDia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })],
        ["✔ Eficiência", percent(indicadores.eficiencia)],
        ["✔ Acurácia", percent(indicadores.acuracia)],
        ["🟢 Última atualização", `${ultimaAtualizacaoNoShow ?? "-"} | ${dashboardOnline ? "🟢 Online" : "🔴 Offline"}`],
      ],
    },
  ];

  const resumoBarra = [
    `📅 ${mesAnoLabel}`,
    `${indicadores.totalAgendas.toLocaleString("pt-BR")} agendas`,
    `${indicadores.capacidadeDia.toLocaleString("pt-BR")} capacidade`,
    `${indicadores.metaRecebimentoMes.toLocaleString("pt-BR")} meta`,
    `${indicadores.mediaRecebidasDia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} média recebidas`,
    `${indicadores.mediaNoShowDia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} média No Show`,
    `${fornecedoresCriticos.toLocaleString("pt-BR")} fornecedores críticos`,
  ];

  const seriesRecebimentoMeta = useMemo(() => {
    const grouped = new Map<string, { label: string; recebidas: number; meta: number }>();
    for (const row of resumoConsolidado) {
      const month = padMonth(row.mes);
      const key = `${row.ano ?? "-"}-${month}`;
      const current = grouped.get(key) ?? { label: `${month}/${row.ano ?? "-"}`, recebidas: 0, meta: 0 };
      current.recebidas += toNumber(row.recebidas);
      current.meta += toNumber(row.meta_recebimento_mes);
      grouped.set(key, current);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value)
      .slice(-8);
  }, [resumoConsolidado]);

  const seriesNoShowDia = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of baseRowsFiltradas) {
      if (!row.data_recebimento) continue;
      const key = row.data_recebimento;
      const current = grouped.get(key) ?? 0;
      grouped.set(key, current + (row.no_show ? 1 : 0));
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ label: formatDateBR(date), value }))
      .slice(-10);
  }, [baseRowsFiltradas]);

  const modalidadePie = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of baseRowsFiltradas) {
      const key = String((row as any).modalidade ?? (row as any).tipo_carga ?? noShowStatusLabel(row) ?? "Sem modalidade").trim() || "Sem modalidade";
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
    const entries = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = entries.reduce((acc, [, value]) => acc + value, 0) || 1;
    const palette = [theme.colors.neonGreen, theme.colors.neonOrange, theme.colors.neonYellow, "#38bdf8", "#a78bfa"];
    let cursor = 0;
    const slices = entries.map(([label, value], index) => {
      const pct = (value / total) * 100;
      const start = cursor;
      const end = cursor + pct;
      cursor = end;
      return { label, value, color: palette[index % palette.length], start, end };
    });
    return {
      slices,
      gradient: slices.map((slice) => `${slice.color} ${slice.start.toFixed(2)}% ${slice.end.toFixed(2)}%`).join(", ") || `${theme.colors.borderSoft} 0% 100%`,
    };
  }, [baseRowsFiltradas]);

  const tabelaExecutiva = useMemo(() => {
    const grouped = new Map<string, {
      fornecedor: string;
      agendas: number;
      recebidas: number;
      naoRecebidas: number;
      noShow: number;
      ultimoRecebimento: string | null;
      datas: Set<string>;
      paletes: number;
      caixas: number;
      valor: number;
      ufs: Set<string>;
      statusBreakdown: Map<string, number>;
    }>();

    for (const row of baseRowsFiltradas) {
      const fornecedor = (row.fornecedor_nome ?? "Não informado").trim() || "Não informado";
      const current = grouped.get(fornecedor) ?? {
        fornecedor,
        agendas: 0,
        recebidas: 0,
        naoRecebidas: 0,
        noShow: 0,
        ultimoRecebimento: null,
        datas: new Set<string>(),
        paletes: 0,
        caixas: 0,
        valor: 0,
        ufs: new Set<string>(),
        statusBreakdown: new Map<string, number>(),
      };
      current.agendas += 1;
      if (row.concluido) current.recebidas += 1;
      if (row.no_show) current.noShow += 1;
      current.paletes += toNumber(row.paletes);
      current.caixas += toNumber(row.caixas);
      current.valor += toNumber(row.valor);
      if (row.data_recebimento) current.datas.add(row.data_recebimento);
      if (row.uf) current.ufs.add(row.uf);
      const status = noShowStatusLabel(row);
      current.statusBreakdown.set(status, (current.statusBreakdown.get(status) ?? 0) + 1);
      if (row.concluido && row.data_recebimento && (!current.ultimoRecebimento || row.data_recebimento > current.ultimoRecebimento)) {
        current.ultimoRecebimento = row.data_recebimento;
      }
      grouped.set(fornecedor, current);
    }

    return Array.from(grouped.values())
      .map((item) => {
        const naoRecebidas = item.agendas - item.recebidas;
        const percentual = item.agendas > 0 ? item.noShow / item.agendas : 0;
        const dias = Math.max(item.datas.size, 1);
        const mediaDiaria = item.recebidas / dias;
        const statusPrincipal = Array.from(item.statusBreakdown.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sem status";
        return {
          ...item,
          naoRecebidas,
          percentual,
          mediaDiaria,
          statusPrincipal,
        };
      })
      .sort((a, b) => b.percentual - a.percentual || b.noShow - a.noShow);
  }, [baseRowsFiltradas]);

  const lineChart = (
    labels: string[],
    seriesA: number[],
    seriesB?: number[],
    colorA = theme.colors.neonGreen,
    colorB = theme.colors.neonOrange
  ) => {
    const width = 520;
    const height = 180;
    const padding = 24;
    const allValues = [...seriesA, ...(seriesB ?? [])];
    const max = Math.max(...allValues, 1);
    const toPoints = (values: number[]) =>
      values
        .map((value, index) => {
          const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
          const y = height - padding - (value / max) * (height - padding * 2);
          return `${x},${y}`;
        })
        .join(" ");

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 200 }}>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={theme.colors.borderSoft} strokeWidth={1} />
          <polyline fill="none" stroke={colorA} strokeWidth={2.5} points={toPoints(seriesA)} />
          {seriesB && <polyline fill="none" stroke={colorB} strokeWidth={2.5} points={toPoints(seriesB)} />}
        </svg>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: theme.colors.textMuted, fontSize: 11 }}>
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Dashboard No Show</h1>
        <p style={descStyle}>Painel consolidado do No Show com filtros operacionais, metas e ranking de fornecedores.</p>
      </div>

      <div style={{ ...cardStyle, display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto" }}>
        <select style={{ ...inputStyle, minWidth: 120 }} value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}>
          <option value="">Mês</option>
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>
              {mes}
            </option>
          ))}
        </select>
        <select style={{ ...inputStyle, minWidth: 120 }} value={filtros.ano} onChange={(e) => setFiltros({ ...filtros, ano: e.target.value })}>
          <option value="">Ano</option>
          {anosDisponiveis.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <select style={{ ...inputStyle, minWidth: 100 }} value={filtros.uf} onChange={(e) => setFiltros({ ...filtros, uf: e.target.value })}>
          <option value="">UF</option>
          {ufsDisponiveis.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <input
          style={{ ...inputStyle, minWidth: 220 }}
          placeholder="Fornecedor"
          value={filtros.fornecedor}
          onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
        />
        <select style={{ ...inputStyle, minWidth: 180 }} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Status</option>
          {statusDisponiveis.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, minWidth: 160 }}
          value={filtros.empresa}
          onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}
          disabled={empresasDisponiveis.length === 0}
        >
          <option value="">Empresa (CD)</option>
          {empresasDisponiveis.map((empresa) => (
            <option key={empresa} value={empresa}>
              {empresa}
            </option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, minWidth: 140 }}
          value={filtros.grupo}
          onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
          disabled={gruposDisponiveis.length === 0}
        >
          <option value="">Grupo</option>
          {gruposDisponiveis.map((grupo) => (
            <option key={grupo} value={grupo}>
              {grupo}
            </option>
          ))}
        </select>
        <button type="button" style={{ ...buttonSecondaryStyle, whiteSpace: "nowrap" }} onClick={() => setFiltros({ mes: "", ano: "", uf: "", fornecedor: "", status: "", empresa: "", grupo: "" })}>
          Limpar filtros
        </button>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {kpiGrupos.map((grupo) => (
          <div key={grupo.title} style={{ ...cardStyle, padding: 12 }}>
            <div style={{ color: theme.colors.neonOrange, fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>
              {grupo.title}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              {grupo.cards.map(([label, value]) => (
                <div key={label} style={{ ...cardStyle, padding: 10, minWidth: 0 }}>
                  <div style={{ ...metricValueStyle, marginTop: 0, fontSize: label.includes("Última atualização") ? 13 : 30, lineHeight: 1.05, fontWeight: 900, overflowWrap: "anywhere" }}>
                    {value}
                  </div>
                  <div style={{ ...metricLabelStyle, marginTop: 6, fontSize: 11 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto", whiteSpace: "nowrap", border: "none", background: "rgba(2,6,23,0.35)" }}>
        {resumoBarra.map((item) => (
          <span key={item} style={{ color: theme.colors.textSoft, fontSize: 12, fontWeight: 700, padding: "3px 2px" }}>
            {item}
          </span>
        ))}
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={{ ...metricLabelStyle, marginBottom: 8 }}>Recebimento x Meta (linha)</div>
            {lineChart(
              seriesRecebimentoMeta.map((item) => item.label),
              seriesRecebimentoMeta.map((item) => item.recebidas),
              seriesRecebimentoMeta.map((item) => item.meta),
              theme.colors.neonGreen,
              theme.colors.neonOrange
            )}
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={{ ...metricLabelStyle, marginBottom: 8 }}>No Show por dia (linha)</div>
            {lineChart(
              seriesNoShowDia.map((item) => item.label),
              seriesNoShowDia.map((item) => item.value),
              undefined,
              theme.colors.danger
            )}
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={{ ...metricLabelStyle, marginBottom: 10 }}>Recebidas x Não recebidas (barra)</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Recebidas", value: indicadores.recebidas, color: theme.colors.neonGreen },
                { label: "Não recebidas", value: indicadores.naoRecebidas, color: theme.colors.danger },
              ].map((item) => {
                const total = Math.max(indicadores.totalAgendas, 1);
                const width = (item.value / total) * 100;
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.colors.textSoft }}>
                      <span>{item.label}</span>
                      <span>{item.value.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(51,65,85,0.55)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${width}%`, height: "100%", background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={{ ...metricLabelStyle, marginBottom: 10 }}>Modalidade (pizza)</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 130, height: 130, borderRadius: "50%", background: `conic-gradient(${modalidadePie.gradient})` }} />
              <div style={{ display: "grid", gap: 6 }}>
                {modalidadePie.slices.map((slice) => (
                  <div key={slice.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.colors.textSoft }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: slice.color, display: "inline-block" }} />
                    <span>{slice.label}</span>
                    <span style={{ color: theme.colors.textMuted }}>({slice.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 10 }}>
            <div style={{ ...metricLabelStyle, marginBottom: 10 }}>Top fornecedores (barra horizontal)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {top5Fornecedores.map((row) => {
                const pct = toNumber(row.percentual_no_show);
                return (
                  <div key={`${row.fornecedor_nome}-${row.ranking}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.colors.textSoft }}>
                      <span>{row.fornecedor_nome ?? "Não informado"}</span>
                      <span>{percent(pct)}</span>
                    </div>
                    <div style={{ marginTop: 4, height: 8, borderRadius: 999, background: "rgba(51,65,85,0.55)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: noShowStatusColor(pct) }} />
                    </div>
                  </div>
                );
              })}
              {top5Fornecedores.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem dados para o gráfico.</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
        <div style={{ ...metricValueStyle, marginTop: 0, fontSize: 18 }}>Top fornecedores (executivo)</div>
        <div style={{ display: "grid", gap: 8 }}>
          {top5Fornecedores.map((row, index) => {
            const pct = toNumber(row.percentual_no_show);
            return (
              <div key={`${row.fornecedor_nome ?? "fornecedor"}-${index}`} style={{ ...cardStyle, padding: 10, borderColor: noShowStatusColor(pct), background: "rgba(2,6,23,0.5)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: theme.colors.text }}>{toNumber(row.ranking) || index + 1}. {row.fornecedor_nome ?? "Não informado"}</strong>
                  <span style={{ color: noShowStatusColor(pct), fontWeight: 900 }}>{percent(pct)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginTop: 8, fontSize: 12, color: theme.colors.textSoft }}>
                  <span>Agendas: {toNumber(row.agendas).toLocaleString("pt-BR")}</span>
                  <span>No Show: {toNumber(row.no_show).toLocaleString("pt-BR")}</span>
                  <span>Recebidas: {toNumber(row.recebidas).toLocaleString("pt-BR")}</span>
                  <span>Não recebidas: {toNumber(row.nao_recebidas).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            );
          })}
          {top5Fornecedores.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Nenhum fornecedor encontrado para os filtros selecionados.</div>}
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.colors.borderSoft}`, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: theme.colors.neonOrange, fontWeight: 900, fontSize: 14 }}>Tabela executiva</div>
            <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Visão resumida por fornecedor com abertura de detalhes completos.</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1150, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: theme.colors.textMuted, textAlign: "left", background: "#020617" }}>
                <th style={{ padding: 10 }}>Fornecedor</th>
                <th style={{ textAlign: "right", padding: 8 }}>Agendas</th>
                <th style={{ textAlign: "right", padding: 8 }}>Recebidas</th>
                <th style={{ textAlign: "right", padding: 8 }}>Não recebidas</th>
                <th style={{ textAlign: "right", padding: 8 }}>No Show</th>
                <th style={{ textAlign: "right", padding: 8 }}>%</th>
                <th style={{ textAlign: "right", padding: 8 }}>Média diária</th>
                <th style={{ textAlign: "center", padding: 8 }}>Último recebimento</th>
                <th style={{ textAlign: "center", padding: 8 }}>Status</th>
                <th style={{ textAlign: "center", padding: 8 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tabelaExecutiva.map((row) => {
                const key = row.fornecedor;
                const aberto = !!abertosExec[key];
                const status = statusFornecedor(row.percentual);
                const color = noShowStatusColor(row.percentual);
                return (
                  <React.Fragment key={key}>
                    <tr style={{ borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                      <td style={{ padding: 10 }}>{row.fornecedor}</td>
                      <td style={{ padding: 10, textAlign: "right" }}>{row.agendas.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: 10, textAlign: "right" }}>{row.recebidas.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: 10, textAlign: "right" }}>{row.naoRecebidas.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: 10, textAlign: "right" }}>{row.noShow.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: 10, textAlign: "right", color, fontWeight: 900 }}>{percent(row.percentual)}</td>
                      <td style={{ padding: 10, textAlign: "right" }}>{row.mediaDiaria.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td style={{ padding: 10, textAlign: "center" }}>{row.ultimoRecebimento ? formatDateBR(row.ultimoRecebimento) : "-"}</td>
                      <td style={{ padding: 10, textAlign: "center", color, fontWeight: 800 }}>{status}</td>
                      <td style={{ padding: 10, textAlign: "center" }}>
                        <button type="button" style={{ ...buttonSecondaryStyle, padding: "4px 10px" }} onClick={() => setAbertosExec((prev) => ({ ...prev, [key]: !prev[key] }))}>
                          {aberto ? "👁 Detalhes" : "▶ Detalhes"}
                        </button>
                      </td>
                    </tr>
                    {aberto && (
                      <tr>
                        <td colSpan={10} style={{ padding: 12, background: "rgba(2,6,23,0.72)", borderTop: `1px solid ${theme.colors.borderSoft}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                            <div style={cardStyle}><div style={metricLabelStyle}>UFs</div><div style={{ ...metricValueStyle, marginTop: 4, fontSize: 14 }}>{Array.from(row.ufs).join(", ") || "-"}</div></div>
                            <div style={cardStyle}><div style={metricLabelStyle}>Paletes</div><div style={{ ...metricValueStyle, marginTop: 4, fontSize: 16 }}>{row.paletes.toLocaleString("pt-BR")}</div></div>
                            <div style={cardStyle}><div style={metricLabelStyle}>Caixas</div><div style={{ ...metricValueStyle, marginTop: 4, fontSize: 16 }}>{row.caixas.toLocaleString("pt-BR")}</div></div>
                            <div style={cardStyle}><div style={metricLabelStyle}>Valor</div><div style={{ ...metricValueStyle, marginTop: 4, fontSize: 16 }}>{formatCurrency(row.valor)}</div></div>
                            <div style={cardStyle}><div style={metricLabelStyle}>Status principal</div><div style={{ ...metricValueStyle, marginTop: 4, fontSize: 14 }}>{row.statusPrincipal}</div></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {tabelaExecutiva.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} style={{ padding: 12, color: theme.colors.textSoft }}>
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function RecebimentoNoShowTop5({ perfil: _perfil }: Props) {
  const [topRows, setTopRows] = useState<NoShowTopFornecedorRow[]>([]);
  const [dashboardRows, setDashboardRows] = useState<NoShowDashboardResumoRow[]>([]);
  const [baseRows, setBaseRows] = useState<NoShowBasePortalDashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    mes: "",
    ano: "",
    uf: "",
    fornecedor: "",
  });

  const carregarTop5 = async () => {
    setLoading(true);
    setErro(null);

    const [topResult, dashboardResult, baseResult] = await Promise.all([
      db().from("vw_noshow_top_fornecedores").select("*").order("ranking", { ascending: true }),
      db().from("vw_noshow_dashboard").select("*").order("ano", { ascending: false }).order("mes", { ascending: false }).order("uf", { ascending: true }),
      db()
        .from("noshow_base_portal")
        .select("id,mes,data_recebimento,uf,fornecedor_nome,status_recebimento,concluido,no_show,nao_realizado,abandono")
        .order("data_recebimento", { ascending: false }),
    ]);

    const firstError = topResult.error ?? dashboardResult.error ?? baseResult.error;
    if (firstError) {
      console.error("Erro ao carregar Top 5 No Show:", firstError);
      setErro("Erro ao carregar os dados do Top 5 No Show.");
      setTopRows([]);
      setDashboardRows([]);
      setBaseRows([]);
      setLoading(false);
      return;
    }

    const nextTopRows = (topResult.data ?? []) as NoShowTopFornecedorRow[];
    const nextDashboardRows = (dashboardResult.data ?? []) as NoShowDashboardResumoRow[];
    const nextBaseRows = (baseResult.data ?? []) as NoShowBasePortalDashboardRow[];

    setTopRows(nextTopRows);
    setDashboardRows(nextDashboardRows);
    setBaseRows(nextBaseRows);

    setFiltros((prev) => {
      if (prev.mes || prev.ano) return prev;
      const latestRow = nextBaseRows.find((row) => row.data_recebimento) ?? null;
      if (!latestRow?.data_recebimento) return prev;
      return {
        ...prev,
        mes: latestRow.data_recebimento.slice(5, 7),
        ano: latestRow.data_recebimento.slice(0, 4),
      };
    });

    setLoading(false);
  };

  useEffect(() => {
    void carregarTop5();
  }, []);

  const fornecedoresDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => (row.fornecedor_nome ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [baseRows]
  );
  const ufsDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => (row.uf ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [baseRows]
  );
  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => noShowMonthValue(row)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [baseRows]
  );
  const anosDisponiveis = useMemo(
    () => Array.from(new Set(baseRows.map((row) => noShowYearValue(row)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [baseRows]
  );

  const baseFiltrada = useMemo(() => {
    const fornecedorFiltro = filtros.fornecedor.trim().toLowerCase();
    return baseRows.filter((row) => {
      const mes = noShowMonthValue(row);
      const ano = noShowYearValue(row);
      const uf = (row.uf ?? "").trim();
      const fornecedor = (row.fornecedor_nome ?? "").toLowerCase();

      if (filtros.mes && mes !== filtros.mes) return false;
      if (filtros.ano && ano !== filtros.ano) return false;
      if (filtros.uf && uf !== filtros.uf) return false;
      if (fornecedorFiltro && !fornecedor.includes(fornecedorFiltro)) return false;
      return true;
    });
  }, [baseRows, filtros]);

  const totalFornecedores = useMemo(
    () => new Set(baseFiltrada.map((row) => (row.fornecedor_nome ?? "").trim()).filter(Boolean)).size,
    [baseFiltrada]
  );

  const totalAgendas = useMemo(() => {
    if (!filtros.fornecedor) {
      return dashboardRows.reduce((sum, row) => {
        if (filtros.mes && padMonth(row.mes) !== filtros.mes) return sum;
        if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return sum;
        if (filtros.uf && (row.uf ?? "") !== filtros.uf) return sum;
        return sum + toNumber(row.total_agendas);
      }, 0);
    }
    return baseFiltrada.length;
  }, [baseFiltrada, dashboardRows, filtros]);

  const totalNoShow = useMemo(() => {
    if (!filtros.fornecedor) {
      return dashboardRows.reduce((sum, row) => {
        if (filtros.mes && padMonth(row.mes) !== filtros.mes) return sum;
        if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return sum;
        if (filtros.uf && (row.uf ?? "") !== filtros.uf) return sum;
        return sum + toNumber(row.no_show);
      }, 0);
    }
    return baseFiltrada.filter((row) => row.no_show).length;
  }, [baseFiltrada, dashboardRows, filtros]);

  const top5Rows = useMemo(() => {
    if (!filtros.fornecedor) {
      return topRows
        .filter((row) => {
          if (filtros.mes && padMonth(row.mes) !== filtros.mes) return false;
          if (filtros.ano && String(row.ano ?? "") !== filtros.ano) return false;
          if (filtros.uf && (row.uf ?? "") !== filtros.uf) return false;
          return true;
        })
        .slice()
        .sort((a, b) => toNumber(b.no_show) - toNumber(a.no_show) || toNumber(b.agendas) - toNumber(a.agendas))
        .slice(0, 5);
    }

    const grouped = new Map<string, NoShowTopFornecedorRow>();
    for (const row of baseFiltrada) {
      const fornecedor = row.fornecedor_nome?.trim() || "Não informado";
      const current = grouped.get(fornecedor) ?? {
        uf: filtros.uf || row.uf,
        mes: filtros.mes,
        ano: filtros.ano ? Number(filtros.ano) : null,
        fornecedor_nome: fornecedor,
        agendas: 0,
        recebidas: 0,
        nao_recebidas: 0,
        no_show: 0,
        percentual_no_show: 0,
        ranking: 0,
      };
      const agendas = toNumber(current.agendas) + 1;
      const recebidas = toNumber(current.recebidas) + (row.concluido ? 1 : 0);
      const noShow = toNumber(current.no_show) + (row.no_show ? 1 : 0);
      const naoRecebidas = agendas - recebidas;
      grouped.set(fornecedor, {
        ...current,
        agendas,
        recebidas,
        nao_recebidas: naoRecebidas,
        no_show: noShow,
        percentual_no_show: agendas > 0 ? noShow / agendas : 0,
      });
    }

    return Array.from(grouped.values())
      .sort((a, b) => toNumber(b.no_show) - toNumber(a.no_show) || toNumber(b.agendas) - toNumber(a.agendas))
      .slice(0, 5)
      .map((row, index) => ({ ...row, ranking: index + 1 }));
  }, [baseFiltrada, filtros, topRows]);

  const percentualNoShow = totalAgendas > 0 ? totalNoShow / totalAgendas : 0;
  const maiorNoShow = top5Rows[0]?.fornecedor_nome ?? "-";

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Top 5 No Show</h1>
        <p style={descStyle}>Ranking dos fornecedores com maior impacto de No Show no Recebimento.</p>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <select style={inputStyle} value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}>
          <option value="">Mês</option>
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>
              {mes}
            </option>
          ))}
        </select>
        <select style={inputStyle} value={filtros.ano} onChange={(e) => setFiltros({ ...filtros, ano: e.target.value })}>
          <option value="">Ano</option>
          {anosDisponiveis.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <select style={inputStyle} value={filtros.uf} onChange={(e) => setFiltros({ ...filtros, uf: e.target.value })}>
          <option value="">UF</option>
          {ufsDisponiveis.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <select style={inputStyle} value={filtros.fornecedor} onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}>
          <option value="">Fornecedor</option>
          {fornecedoresDisponiveis.map((fornecedor) => (
            <option key={fornecedor} value={fornecedor}>
              {fornecedor}
            </option>
          ))}
        </select>
        <button type="button" style={buttonSecondaryStyle} onClick={() => setFiltros({ mes: "", ano: "", uf: "", fornecedor: "" })}>
          Limpar filtros
        </button>
      </div>

      {erro && <div style={{ ...cardStyle, color: theme.colors.danger }}>{erro}</div>}

      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={metricLabelStyle}>Total fornecedores</div>
          <div style={metricValueStyle}>{totalFornecedores.toLocaleString("pt-BR")}</div>
        </div>
        <div style={cardStyle}>
          <div style={metricLabelStyle}>Total agendas</div>
          <div style={metricValueStyle}>{totalAgendas.toLocaleString("pt-BR")}</div>
        </div>
        <div style={cardStyle}>
          <div style={metricLabelStyle}>Total No Show</div>
          <div style={metricValueStyle}>{totalNoShow.toLocaleString("pt-BR")}</div>
        </div>
        <div style={cardStyle}>
          <div style={metricLabelStyle}>% No Show</div>
          <div style={metricValueStyle}>{percent(percentualNoShow)}</div>
        </div>
        <div style={cardStyle}>
          <div style={metricLabelStyle}>Fornecedor com maior No Show</div>
          <div style={{ ...metricValueStyle, fontSize: 18, overflowWrap: "anywhere" }}>{maiorNoShow}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ ...metricValueStyle, marginTop: 0, fontSize: 18 }}>Tabela principal</div>
            <div style={descStyle}>Ordenação do maior No Show para o menor.</div>
          </div>
          <button type="button" style={buttonSecondaryStyle} onClick={() => void carregarTop5()} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Rank</th>
              <th style={{ textAlign: "left", padding: 8 }}>Fornecedor</th>
              <th style={{ textAlign: "right", padding: 8 }}>Agendas</th>
              <th style={{ textAlign: "right", padding: 8 }}>Recebidas</th>
              <th style={{ textAlign: "right", padding: 8 }}>Não recebidas</th>
              <th style={{ textAlign: "right", padding: 8 }}>No Show</th>
              <th style={{ textAlign: "right", padding: 8 }}>% No Show</th>
            </tr>
          </thead>
          <tbody>
            {top5Rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, color: theme.colors.textSoft }}>
                  Nenhum dado encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              top5Rows.map((row, index) => (
                <tr key={`${row.fornecedor_nome ?? "fornecedor"}-${index}`}>
                  <td style={{ padding: 8 }}>{toNumber(row.ranking) || index + 1}</td>
                  <td style={{ padding: 8 }}>{row.fornecedor_nome ?? "Não informado"}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{toNumber(row.agendas).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{toNumber(row.recebidas).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{toNumber(row.nao_recebidas).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{toNumber(row.no_show).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{percent(toNumber(row.percentual_no_show))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RecebimentoRealizado({ perfil }: Props) {
  const [rows, setRows] = useState<RecebimentoRealizadoRow[]>([]);
  const [itensPorAgendamento, setItensPorAgendamento] = useState<Record<string, DashboardItem[]>>({});
  const [historicoPorAgendamento, setHistoricoPorAgendamento] = useState<Record<string, ConfirmacaoHistorico[]>>({});
  const [gestaoPorChave, setGestaoPorChave] = useState<Record<string, RecebimentoRealizadoGestaoRow>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    dataInicial: todayISO(),
    dataFinal: todayISO(),
    uf: "",
    fornecedor: "",
    transportadora: "",
    status: "",
    numeroAgenda: "",
    numeroNota: "",
    buscaRapida: "",
  });

  const carregar = async () => {
    setLoading(true);
    setErro(null);

    const [dashboardResult, agendamentosResult, gestaoResult] = await Promise.all([
      db()
        .from("vw_recebimento_dashboard")
        .select("*")
        .gte("data_agenda", filtros.dataInicial)
        .lte("data_agenda", filtros.dataFinal)
        .order("data_agenda", { ascending: true })
        .order("horario", { ascending: true }),
      db()
        .from("agendamentos")
        .select("id,data_agenda,horario,empresa,nro_box,nro_carga,status_carga,modalidade,total_paletes,total_caixas,total_itens,total_conferido,total_recebido,ruptura,nota_fiscal,confirmacao_status,confirmacao_observacao,confirmado_em,confirmado_por,fornecedor_nome,transportadora")
        .gte("data_agenda", filtros.dataInicial)
        .lte("data_agenda", filtros.dataFinal)
        .order("data_agenda", { ascending: true })
        .order("horario", { ascending: true }),
      db()
        .from("gestao_agenda")
        .select("id,codigo_agenda,transportadora_nome,fornecedor_nome,notas_fiscais,data_agenda,horario,doca,deposito,tipo_carga,tipo_veiculo,tipo_volume,volumes,sku,unidade_negocios,possui_nota,status_confirmacao,observacao,confirmado_em,confirmado_por,created_at")
        .gte("data_agenda", filtros.dataInicial)
        .lte("data_agenda", filtros.dataFinal)
        .order("data_agenda", { ascending: true })
        .order("horario", { ascending: true }),
    ]);

    const firstError = dashboardResult.error ?? agendamentosResult.error ?? gestaoResult.error;
    if (firstError) {
      console.error("Erro ao carregar recebimento realizado:", firstError);
      setErro("Erro ao carregar os dados do recebimento realizado.");
      setRows([]);
      setItensPorAgendamento({});
      setHistoricoPorAgendamento({});
      setGestaoPorChave({});
      setLoading(false);
      return;
    }

    const baseRows = (dashboardResult.data ?? []) as DashboardRow[];
    const agendamentoRows = (agendamentosResult.data ?? []) as RecebimentoRealizadoAgendamentoRow[];
    const gestaoRows = (gestaoResult.data ?? []) as RecebimentoRealizadoGestaoRow[];

    const agendaById = new Map<string, RecebimentoRealizadoAgendamentoRow>();
    for (const row of agendamentoRows) agendaById.set(row.id, row);

    const gestaoByKey = new Map<string, RecebimentoRealizadoGestaoRow>();
    for (const row of gestaoRows) {
      gestaoByKey.set(buildRealizadoJoinKey(row.data_agenda, row.fornecedor_nome, row.transportadora_nome, row.horario), row);
      if (row.codigo_agenda) {
        gestaoByKey.set(row.codigo_agenda, row);
      }
    }

    const mergedRows: RecebimentoRealizadoRow[] = baseRows.map((row) => {
      const agenda = agendaById.get(row.agendamento_id);
      const gestao =
        gestaoByKey.get(buildRealizadoJoinKey(row.data_agenda, row.fornecedor_nome, row.transportadora, row.hora_chegada ?? row.horario)) ??
        gestaoByKey.get(row.nro_carga ?? "") ??
        null;

      return {
        ...row,
        uf: gestao?.unidade_negocios ?? agenda?.empresa ?? row.empresa ?? null,
        numero_agenda: row.nro_carga ?? agenda?.nro_carga ?? gestao?.codigo_agenda ?? null,
        numero_nota: agenda?.nota_fiscal ?? row.nota_fiscal ?? gestao?.notas_fiscais ?? null,
        volumes_realizados: gestao?.volumes ?? agenda?.total_recebido ?? row.total_recebido,
        sku_realizado: gestao?.sku ?? row.total_itens,
        tipo_veiculo: gestao?.tipo_veiculo ?? agenda?.modalidade ?? null,
        tipo_carga: gestao?.tipo_carga ?? agenda?.status_carga ?? row.modalidade_calculada ?? null,
        situacao: agenda?.confirmacao_status ?? row.status_finalizada ?? row.status_recebimento_calculado ?? null,
        observacao_operacional: agenda?.confirmacao_observacao ?? gestao?.observacao ?? row.confirmacao_observacao ?? null,
        confirmacao_status_real: agenda?.confirmacao_status ?? row.confirmacao_status ?? null,
        confirmacao_observacao_real: agenda?.confirmacao_observacao ?? row.confirmacao_observacao ?? null,
        status_operacional: row.status_recebimento_calculado,
      };
    });

    const ids = mergedRows.map((row) => row.agendamento_id).filter(Boolean);
    if (ids.length > 0) {
      const [itensResult, historicoResult] = await Promise.all([
        db()
          .from("agendamento_itens")
          .select("id,agendamento_id,codigo_produto,descricao_produto,secao,modalidade_original,modalidade_compra,norma,palete,gerada,conferida,recebida,valor,ruptura")
          .in("agendamento_id", ids)
          .order("codigo_produto", { ascending: true }),
        db()
          .from("confirmacao_agenda_historico")
          .select("id,agendamento_id,usuario_id,canal,contato_nome,contato_tipo,resultado,observacao,created_at")
          .in("agendamento_id", ids)
          .order("created_at", { ascending: false }),
      ]);

      if (itensResult.error) {
        console.error("Erro ao carregar itens do recebimento realizado:", itensResult.error);
        setItensPorAgendamento({});
      } else {
        const grouped: Record<string, DashboardItem[]> = {};
        for (const item of (itensResult.data ?? []) as DashboardItem[]) {
          if (!grouped[item.agendamento_id]) grouped[item.agendamento_id] = [];
          grouped[item.agendamento_id].push(item);
        }
        setItensPorAgendamento(grouped);
      }

      if (historicoResult.error) {
        console.error("Erro ao carregar histórico da confirmação:", historicoResult.error);
        setHistoricoPorAgendamento({});
      } else {
        const grouped: Record<string, ConfirmacaoHistorico[]> = {};
        for (const item of (historicoResult.data ?? []) as ConfirmacaoHistorico[]) {
          if (!grouped[item.agendamento_id ?? ""]) grouped[item.agendamento_id ?? ""] = [];
          if (item.agendamento_id) grouped[item.agendamento_id].push(item);
        }
        setHistoricoPorAgendamento(grouped);
      }
    } else {
      setItensPorAgendamento({});
      setHistoricoPorAgendamento({});
    }

    const gestaoMap: Record<string, RecebimentoRealizadoGestaoRow> = {};
    for (const row of gestaoRows) {
      const key = buildRealizadoJoinKey(row.data_agenda, row.fornecedor_nome, row.transportadora_nome, row.horario);
      gestaoMap[key] = row;
      if (row.codigo_agenda) gestaoMap[row.codigo_agenda] = row;
    }

    setRows(mergedRows);
    setGestaoPorChave(gestaoMap);
    setExpandedId((current) => (current && mergedRows.some((row) => row.agendamento_id === current) ? current : mergedRows[0]?.agendamento_id ?? null));
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, [filtros.dataInicial, filtros.dataFinal]);

  const rowsFiltradas = useMemo(() => {
    const pesquisa = filtros.buscaRapida.trim().toLowerCase();
    return rows.filter((row) => {
      if (filtros.uf && (row.uf ?? "") !== filtros.uf) return false;
      if (filtros.fornecedor && !(row.fornecedor_nome ?? "").toLowerCase().includes(filtros.fornecedor.toLowerCase())) return false;
      if (filtros.transportadora && !(row.transportadora ?? "").toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      if (filtros.status && row.status_operacional !== filtros.status) return false;
      if (filtros.numeroAgenda && !(row.numero_agenda ?? "").toLowerCase().includes(filtros.numeroAgenda.toLowerCase())) return false;
      if (filtros.numeroNota && !(row.numero_nota ?? "").toLowerCase().includes(filtros.numeroNota.toLowerCase())) return false;
      if (pesquisa) {
        const bag = [
          row.data_agenda,
          row.hora_chegada,
          row.uf,
          row.fornecedor_nome,
          row.transportadora,
          row.numero_agenda,
          row.numero_nota,
          row.status_operacional,
          row.situacao,
          row.observacao_operacional,
          row.tipo_carga,
          row.tipo_veiculo,
        ]
          .map((value) => (value ?? "").toLowerCase())
          .join(" |");
        if (!bag.includes(pesquisa)) return false;
      }
      return true;
    });
  }, [rows, filtros]);

  useEffect(() => {
    if (!expandedId) return;
    if (!rowsFiltradas.some((row) => row.agendamento_id === expandedId)) {
      setExpandedId(rowsFiltradas[0]?.agendamento_id ?? null);
    }
  }, [expandedId, rowsFiltradas]);

  const ufOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => (row.uf ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.status_operacional ?? "").filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const resumo = useMemo(() => {
    const recebido = rowsFiltradas.filter((row) => toNumber(row.total_recebido) > 0).length;
    const naoRecebido = rowsFiltradas.length - recebido;
    const finalizadas = rowsFiltradas.filter((row) => statusIncludes(row.status_operacional, ["finaliz"])).length;
    const conferencia = rowsFiltradas.filter((row) => statusIncludes(row.status_operacional, ["conferên", "conferencia"])).length;
    const noShow = rowsFiltradas.filter((row) => statusIncludes(row.status_operacional, ["no show", "noshow"])).length;
    const abandono = rowsFiltradas.filter((row) => statusIncludes(row.status_operacional, ["abandono"])).length;
    const recusadas = rowsFiltradas.filter((row) => statusIncludes(row.status_operacional, ["recus"])).length;
    return [
      ["Agendas", String(rowsFiltradas.length)],
      ["Recebidas", String(recebido)],
      ["Não Recebidas", String(naoRecebido)],
      ["No Show", String(noShow)],
      ["Abandono", String(abandono)],
      ["Recusadas", String(recusadas)],
      ["Em Conferência", String(conferencia)],
      ["Finalizadas", String(finalizadas)],
    ];
  }, [rowsFiltradas]);

  const statusBadgeStyle = (status: string | null): React.CSSProperties => {
    const text = (status ?? "").toLowerCase();
    if (text.includes("finaliz")) return { borderColor: "#22c55e", background: "rgba(34,197,94,0.14)", color: "#bbf7d0" };
    if (text.includes("confer")) return { borderColor: "#38bdf8", background: "rgba(56,189,248,0.14)", color: "#bae6fd" };
    if (text.includes("no show")) return { borderColor: "#ef4444", background: "rgba(239,68,68,0.14)", color: "#fecaca" };
    if (text.includes("recus")) return { borderColor: "#fb923c", background: "rgba(251,146,60,0.14)", color: "#fed7aa" };
    return { borderColor: theme.colors.textMuted, background: "rgba(148,163,184,0.10)", color: theme.colors.textSoft };
  };

  const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : "-");
  const formatNumber = (value: number | string | null | undefined, decimals = 0) =>
    toNumber(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const copyRow = async (row: RecebimentoRealizadoRow) => {
    const payload = {
      data: formatDateBR(row.data_agenda),
      hora: formatTime(row.horario),
      uf: row.uf,
      fornecedor: row.fornecedor_nome,
      transportadora: row.transportadora,
      numero_agenda: row.numero_agenda,
      numero_nota: row.numero_nota,
      volumes: row.volumes_realizados,
      sku: row.sku_realizado,
      paletes: row.total_paletes,
      caixas: row.total_caixas,
      tipo_veiculo: row.tipo_veiculo,
      tipo_carga: row.tipo_carga,
      status: row.status_operacional,
      situacao: row.situacao,
      observacao: row.observacao_operacional,
    };
    await copyText(JSON.stringify(payload, null, 2));
  };

  const selectedRow = rowsFiltradas.find((row) => row.agendamento_id === expandedId) ?? null;
  const selectedItems = selectedRow ? itensPorAgendamento[selectedRow.agendamento_id] ?? [] : [];
  const selectedHistorico = selectedRow ? historicoPorAgendamento[selectedRow.agendamento_id] ?? [] : [];
  const selectedGestao = selectedRow ? gestaoPorChave[buildRealizadoJoinKey(selectedRow.data_agenda, selectedRow.fornecedor_nome, selectedRow.transportadora, selectedRow.hora_chegada ?? selectedRow.horario)] ?? null : null;

  return (
    <section style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Recebimento Realizado</h1>
          <p style={descStyle}>Painel operacional do recebimento realizado com detalhamento por carga, item e histórico de confirmação.</p>
        </div>
        <button type="button" style={buttonSecondaryStyle} onClick={() => void carregar()} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <input type="date" style={inputStyle} value={filtros.dataInicial} onChange={(e) => setFiltros({ ...filtros, dataInicial: e.target.value })} />
        <input type="date" style={inputStyle} value={filtros.dataFinal} onChange={(e) => setFiltros({ ...filtros, dataFinal: e.target.value })} />
        <select style={inputStyle} value={filtros.uf} onChange={(e) => setFiltros({ ...filtros, uf: e.target.value })}>
          <option value="">UF</option>
          {ufOptions.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <input style={inputStyle} placeholder="Fornecedor" value={filtros.fornecedor} onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })} />
        <input
          style={inputStyle}
          placeholder="Transportadora"
          value={filtros.transportadora}
          onChange={(e) => setFiltros({ ...filtros, transportadora: e.target.value })}
        />
        <select style={inputStyle} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
          <option value="">Status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input style={inputStyle} placeholder="Nº Agenda" value={filtros.numeroAgenda} onChange={(e) => setFiltros({ ...filtros, numeroAgenda: e.target.value })} />
        <input style={inputStyle} placeholder="Nº Nota" value={filtros.numeroNota} onChange={(e) => setFiltros({ ...filtros, numeroNota: e.target.value })} />
        <input style={inputStyle} placeholder="Pesquisa rápida" value={filtros.buscaRapida} onChange={(e) => setFiltros({ ...filtros, buscaRapida: e.target.value })} />
        <button type="button" style={buttonSecondaryStyle} onClick={() => setFiltros({ dataInicial: todayISO(), dataFinal: todayISO(), uf: "", fornecedor: "", transportadora: "", status: "", numeroAgenda: "", numeroNota: "", buscaRapida: "" })}>
          Limpar filtros
        </button>
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

      <div style={{ ...cardStyle, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", minWidth: 1540, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
              {[
                "Data",
                "Hora",
                "UF",
                "Fornecedor",
                "Transportadora",
                "Número Agenda",
                "Número Nota",
                "Volumes",
                "SKU",
                "Paletes",
                "Caixas",
                "Tipo Veículo",
                "Tipo Carga",
                "Status",
                "Situação",
                "Observação",
                "Ações",
              ].map((col) => (
                <th key={col} style={{ padding: 8, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsFiltradas.length === 0 ? (
              <tr>
                <td colSpan={17} style={{ padding: 12, color: theme.colors.textMuted }}>
                  Nenhum recebimento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              rowsFiltradas.map((row) => {
                const isExpanded = expandedId === row.agendamento_id;
                const badge = statusBadgeStyle(row.status_operacional);
                return (
                  <React.Fragment key={row.agendamento_id}>
                    <tr
                      style={{ cursor: "pointer", background: isExpanded ? "rgba(15,23,42,0.85)" : "transparent" }}
                      onClick={() => setExpandedId((current) => (current === row.agendamento_id ? null : row.agendamento_id))}
                    >
                      <td style={{ padding: 8 }}>{formatDateBR(row.data_agenda)}</td>
                      <td style={{ padding: 8 }}>{formatTime(row.hora_chegada ?? row.horario)}</td>
                      <td style={{ padding: 8 }}>{row.uf ?? row.empresa ?? "-"}</td>
                      <td style={{ padding: 8 }}>{row.fornecedor_nome ?? "-"}</td>
                      <td style={{ padding: 8 }}>{row.transportadora ?? row.transportadora_cadastro_nome ?? "-"}</td>
                      <td style={{ padding: 8 }}>{row.numero_agenda ?? row.nro_carga ?? "-"}</td>
                      <td style={{ padding: 8 }}>{row.numero_nota ?? row.nota_fiscal ?? "-"}</td>
                      <td style={{ padding: 8 }}>{formatNumber(row.volumes_realizados)}</td>
                      <td style={{ padding: 8 }}>{formatNumber(row.sku_realizado)}</td>
                      <td style={{ padding: 8 }}>{formatNumber(row.total_paletes)}</td>
                      <td style={{ padding: 8 }}>{formatNumber(row.total_caixas)}</td>
                      <td style={{ padding: 8 }}>{row.tipo_veiculo ?? "-"}</td>
                      <td style={{ padding: 8 }}>{row.tipo_carga ?? "-"}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ ...badge, borderWidth: 1, borderStyle: "solid", borderRadius: 999, padding: "4px 10px", fontWeight: 800 }}>
                          {row.status_operacional ?? "Agenda"}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{row.situacao ?? row.status_finalizada ?? "-"}</td>
                      <td style={{ padding: 8, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.observacao_operacional ?? "-"}</td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                          <button type="button" style={buttonSecondaryStyle} onClick={() => setExpandedId((current) => (current === row.agendamento_id ? null : row.agendamento_id))}>
                            {isExpanded ? "Ocultar" : "Visualizar"}
                          </button>
                          <button type="button" style={buttonSecondaryStyle} onClick={() => void copyRow(row)}>
                            Copiar dados
                          </button>
                          <button type="button" style={buttonSecondaryStyle} onClick={() => window.alert("Exportar Excel em breve")}>Exportar Excel</button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={17} style={{ padding: 0, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>
                          <div style={{ padding: 14, background: "rgba(2,6,23,0.56)" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                              {[
                                ["Fornecedor", row.fornecedor_nome ?? "-"],
                                ["Transportadora", row.transportadora ?? row.transportadora_cadastro_nome ?? "-"],
                                ["Notas", row.numero_nota ?? row.nota_fiscal ?? selectedGestao?.notas_fiscais ?? "-"],
                                ["Volumes", formatNumber(row.volumes_realizados)],
                                ["Itens", formatNumber(row.total_itens)],
                                ["Status operacional", row.status_operacional ?? "-"],
                                ["Situação", row.situacao ?? row.status_finalizada ?? "-"],
                                ["UF", row.uf ?? row.empresa ?? "-"],
                              ].map(([label, value]) => (
                                <div key={label} style={cardStyle}>
                                  <div style={metricLabelStyle}>{label}</div>
                                  <div style={{ ...metricValueStyle, fontSize: 16, overflowWrap: "anywhere" }}>{String(value)}</div>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)", gap: 12, marginTop: 12 }}>
                              <div style={cardStyle}>
                                <div style={{ ...metricValueStyle, marginTop: 0, fontSize: 18 }}>Dados completos</div>
                                <div style={{ display: "grid", gap: 8, marginTop: 10, color: theme.colors.textSoft, fontSize: 13 }}>
                                  <div><strong>Data/Hora:</strong> {formatDateBR(row.data_agenda)} {formatTime(row.hora_chegada ?? row.horario)}</div>
                                  <div><strong>Fornecedor:</strong> {row.fornecedor_nome ?? "-"}</div>
                                  <div><strong>Transportadora:</strong> {row.transportadora ?? row.transportadora_cadastro_nome ?? "-"}</div>
                                  <div><strong>Notas:</strong> {row.numero_nota ?? row.nota_fiscal ?? selectedGestao?.notas_fiscais ?? "-"}</div>
                                  <div><strong>Volumes:</strong> {formatNumber(row.volumes_realizados)}</div>
                                  <div><strong>Itens:</strong> {formatNumber(row.total_itens)}</div>
                                  <div><strong>Status operacional:</strong> {row.status_operacional ?? "-"}</div>
                                  <div><strong>Observação:</strong> {row.observacao_operacional ?? selectedGestao?.observacao ?? "-"}</div>
                                </div>
                              </div>

                              <div style={cardStyle}>
                                <div style={{ ...metricValueStyle, marginTop: 0, fontSize: 18 }}>Botões</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                                  <button type="button" style={buttonSecondaryStyle} onClick={() => setExpandedId((current) => (current === row.agendamento_id ? null : row.agendamento_id))}>
                                    Visualizar
                                  </button>
                                  <button type="button" style={buttonSecondaryStyle} onClick={() => void copyRow(row)}>
                                    Copiar dados
                                  </button>
                                  <button type="button" style={buttonSecondaryStyle} onClick={() => window.alert("Exportar Excel em breve")}>Exportar Excel</button>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                  <div style={{ ...metricLabelStyle, marginBottom: 6 }}>Status operacional</div>
                                  <span style={{ ...badge, borderWidth: 1, borderStyle: "solid", borderRadius: 999, padding: "4px 10px", fontWeight: 800 }}>
                                    {row.status_operacional ?? "Agenda"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
                              <div style={cardStyle}>
                                <div style={{ ...metricValueStyle, marginTop: 0, fontSize: 18 }}>Itens</div>
                                <div style={{ overflowX: "auto", marginTop: 10 }}>
                                  <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ color: theme.colors.textMuted, textAlign: "left" }}>
                                        {[
                                          "Código",
                                          "Produto",
                                          "Seção",
                                          "Modalidade original",
                                          "Modalidade compra",
                                          "Norma",
                                          "Palete",
                                          "Gerada",
                                          "Conferida",
                                          "Recebida",
                                          "Valor",
                                          "Ruptura",
                                        ].map((col) => (
                                          <th key={col} style={{ padding: 7, borderBottom: `1px solid ${theme.colors.borderSoft}` }}>{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedItems.map((item) => (
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
                                      {selectedItems.length === 0 && (
                                        <tr>
                                          <td colSpan={12} style={{ padding: 10, color: theme.colors.textMuted }}>Nenhum item encontrado.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div style={cardStyle}>
                                <div style={{ ...metricValueStyle, marginTop: 0, fontSize: 18 }}>Histórico da confirmação</div>
                                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                                  {selectedHistorico.map((item) => (
                                    <div key={item.id} style={{ borderTop: `1px solid ${theme.colors.borderSoft}`, paddingTop: 8 }}>
                                      <div style={{ color: theme.colors.neonGreen, fontWeight: 800 }}>{item.resultado ?? "-"}</div>
                                      <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                                        {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"} | {item.canal ?? "-"}
                                      </div>
                                      <div style={{ color: theme.colors.textSoft, fontSize: 12 }}>
                                        {item.contato_nome ?? "-"} {item.contato_tipo ? `(${item.contato_tipo})` : ""}
                                      </div>
                                      {item.observacao && <div style={{ color: theme.colors.textSoft, fontSize: 12 }}>{item.observacao}</div>}
                                    </div>
                                  ))}
                                  {selectedHistorico.length === 0 && <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhum histórico encontrado.</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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
