import React, { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../styles";
import type { Usuario } from "../../types";
import {
  calcularM3Alvo,
  calcularMinMaxSugerido,
  calcularOcupacaoProduto,
  calcularStatusSimulacao,
  percentualAbastecimentoOficial,
} from "./ponto-extra/pontoExtraOcupacaoUtils";
import {
  buildMediaLookup,
  chavePontaOperacional,
  chaveReparticaoPonta,
  isMesVigenciaValido,
  lookupMedia,
  mediaTemVenda,
  normalizeCodigoProduto,
  normalizeLojaKey,
  normalizeTipoPonta,
  TIPO_PONTA_PADRAO,
} from "./ponto-extra/pontoExtraSharedUtils";
import { PontoExtraAcompanhamentoGondola } from "./ponto-extra/PontoExtraAcompanhamentoGondola";
import { enriquecerRowsAcompanhamentoEstoque } from "./ponto-extra/pontoExtraAcompanhamentoUtils";
import { PontoExtraHub } from "./ponto-extra/PontoExtraHub";
import { PontoExtraPageShell } from "./ponto-extra/PontoExtraPageShell";
import {
  buildBasePontaRowsFromMatrix,
  formatResumoBasePonta,
  parseBasePontaComercial,
  type BasePontaParseResult,
} from "./ponto-extra/pontoExtraBasePontaImport";
import { fetchPontoExtraWorkflowSnapshot, getMesVigenciaPersistido, setMesVigenciaPersistido } from "./ponto-extra/pontoExtraWorkflow";

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
  loja?: string | null;
  mes?: string | null;
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

type PontaCodigoPonta = {
  id: string;
  loja: string;
  setor_codigo: string;
  setor_nome: string;
  mes_vigencia: string;
  descricao_ponta: string | null;
  cod_ponta: string | null;
  seq_vigencia?: string | null;
  dtavigenciainicio?: string | null;
  dtavigenciafim?: string | null;
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

const CAPA_TODAS_LOJAS = "TODAS";

const PONTO_EXTRA_IMPORT_CONFIG = [
  { tipo: "base_ponta", label: "Base Ponta", tabela: "ponta_base" },
  { tipo: "estoque_cd", label: "Estoque CDs", tabela: "ponta_estoque_cd" },
  { tipo: "media_venda", label: "Media de venda", tabela: "ponta_media_venda" },
  { tipo: "codigo_pontas", label: "Codigo das Pontas", tabela: "ponta_codigo_pontas" },
] as const;

const PONTO_EXTRA_IMPORT_TYPES = PONTO_EXTRA_IMPORT_CONFIG.map((item) => item.tipo);
type PontoExtraImportTipo = (typeof PONTO_EXTRA_IMPORT_CONFIG)[number]["tipo"];

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

function getRowValue(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim();
  if (!text) return 0;
  text = text.replace(/%/g, "").replace(/\s/g, "");

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  if (hasComma) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const parts = text.split(".");
    const looksLikeThousands = parts.length > 2 && parts.slice(1).every((part) => part.length === 3);
    if (looksLikeThousands) text = parts.join("");
  }

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function normalizarPercentual(value: unknown) {
  const percentual = toNumber(value);
  if (!percentual) return 100;
  if (percentual > 0 && percentual <= 2) return percentual * 100;
  return percentual;
}

function calcularM3Area(profundidade: number, frente: number, altura: number) {
  const m3 = profundidade * frente * altura;
  return Number.isFinite(m3) ? m3 : 0;
}

function calcularTotalM3(m3Area: number, percentual: number) {
  return m3Area * ((percentual || 100) / 100);
}

function totalM3Cubagem(cubagem: any) {
  return toNumber(cubagem?.total_m3);
}

function formatNumber(value: unknown, digits = 3) {
  const n = toNumber(value);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: unknown, digits = 2) {
  return `${formatNumber(toNumber(value) * 100, digits)}%`;
}

function splitCategoriaPath(value: unknown) {
  const parts = String(value ?? "")
    .split(/\s*\\\s*|[\\/>|]+/g)
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

function parseSetorCodigoNumerico(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (!text) continue;
    const matchPrefix = text.match(/^\s*(\d+)\s*[-\u2013]/);
    if (matchPrefix) return Number(matchPrefix[1]);
    const matchOnly = text.match(/^\s*(\d+)\s*$/);
    if (matchOnly) return Number(matchOnly[1]);
  }
  return null;
}

function parseCategoriaMedia(value: unknown) {
  const path = splitCategoriaPath(value);
  const setorN2 = path.setor || "";
  const match = setorN2.match(/^\s*(\d+)\s*[-\u2013]\s*(.+)$/);
  const setorCodigoNumero = parseSetorCodigoNumerico(setorN2, path.categoria, path.setor);
  const setorCodigo = setorCodigoNumero !== null ? String(setorCodigoNumero) : "SEM_SETOR";
  const setorNome = (match?.[2] || setorN2 || "SEM SETOR").trim().toUpperCase();

  return {
    categoria_n1: path.categoria,
    setor_n2: setorN2,
    grupo_n3: path.grupo,
    subgrupo_n4: path.subgrupo,
    tipo_n5: path.tipo,
    setor_codigo: setorCodigo,
    setor_codigo_numero: setorCodigoNumero,
    setor_nome: setorNome,
  };
}

const MESES_PT = [
  "JANEIRO",
  "FEVEREIRO",
  "MARCO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(monthKey: string) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  return `${MESES_PT[(month || 1) - 1] ?? ""} ${year || new Date().getFullYear()}`.trim();
}

function monthStart(monthKey: string) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function monthEnd(monthKey: string) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function vigenciaPadraoCapa(mesVigencia: string) {
  return {
    dtavigenciainicio: monthStart(mesVigencia),
    dtavigenciafim: monthEnd(mesVigencia),
  };
}

function formatDateInput(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return fallback;
}

function parseSetorInfo(raw: unknown, fallback?: unknown) {
  const path = splitCategoriaPath(raw);
  const source = path.setor || String(fallback ?? "").trim() || path.categoria;
  const match = source.match(/^\s*(\d+)\s*[-–]\s*(.+)$/);
  const codigo = match?.[1]?.trim() || normalizeHeader(source || "SEM_SETOR").slice(0, 20) || "SEM_SETOR";
  const nome = (match?.[2] || source || path.categoria || "SEM SETOR").trim().toUpperCase();
  return {
    codigo,
    nome,
    categoria: path.categoria || nome,
    grupo: path.grupo,
    subgrupo: path.subgrupo,
    tipo: path.tipo,
  };
}

function descricaoCapaPonta(mesVigencia: string, setorCodigo: string, setorNome: string) {
  return `PT MT ${monthLabel(mesVigencia)} SETOR ${setorCodigo} ${setorNome}`.trim();
}

function parseSetorInfoOperacional(raw: unknown, fallback?: unknown) {
  const path = splitCategoriaPath(raw);
  const candidates = [path.setor, path.categoria, path.grupo, path.subgrupo, path.tipo, String(fallback ?? "").trim()].filter(Boolean);
  const source = candidates.find((part) => /^\s*\d+\s*[-–]\s*.+$/.test(part)) || candidates[0] || "SEM SETOR";
  const match = source.match(/^\s*(\d+)\s*[-–]\s*(.+)$/);
  const codigo = match?.[1]?.trim() || normalizeHeader(source || "SEM_SETOR").slice(0, 20) || "SEM_SETOR";
  const nome = (match?.[2] || source || path.categoria || "SEM SETOR").trim().toUpperCase();
  return {
    codigo,
    nome,
    categoria: path.categoria || nome,
    grupo: path.grupo,
    subgrupo: path.subgrupo,
    tipo: path.tipo,
  };
}

function parseSetorCapa(raw: unknown, fallback?: unknown) {
  const path = splitCategoriaPath(raw);
  const candidates = [path.setor, path.categoria, path.grupo, path.subgrupo, path.tipo, String(fallback ?? "").trim()].filter(Boolean);
  const source = candidates.find((part) => /^\s*\d+\s*[-–]\s*.+$/.test(part));
  if (!source) {
    return {
      codigo: "SEM_SETOR",
      nome: "SEM SETOR",
      categoria: path.categoria || "SEM SETOR",
      grupo: path.grupo,
      subgrupo: path.subgrupo,
      tipo: path.tipo,
    };
  }
  const match = source.match(/^\s*(\d+)\s*[-–]\s*(.+)$/);
  return {
    codigo: match?.[1]?.trim() || "SEM_SETOR",
    nome: (match?.[2] || "SEM SETOR").trim().toUpperCase(),
    categoria: path.categoria || match?.[2]?.trim().toUpperCase() || "SEM SETOR",
    grupo: path.grupo,
    subgrupo: path.subgrupo,
    tipo: path.tipo,
  };
}

function parseSetorInfoMedia(raw: unknown) {
  const path = parseCategoriaMedia(raw);
  return {
    codigo: path.setor_codigo,
    nome: path.setor_nome,
    categoria: path.categoria_n1 || "SEM CATEGORIA",
    grupo: path.grupo_n3,
    subgrupo: path.subgrupo_n4,
    tipo: path.tipo_n5,
    categoria_n1: path.categoria_n1,
    setor_n2: path.setor_n2,
    grupo_n3: path.grupo_n3,
    subgrupo_n4: path.subgrupo_n4,
    tipo_n5: path.tipo_n5,
  };
}

function parseSetorInput(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^\s*([^-\u2013]+?)\s*[-\u2013]\s*(.+)$/);
  if (!match) {
    const codigo = text.toUpperCase();
    return { codigo, nome: "" };
  }
  return {
    codigo: String(match[1] ?? "").trim().toUpperCase(),
    nome: String(match[2] ?? "").trim().toUpperCase(),
  };
}

function normalizarBuscaCapa(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function chaveTexto(...partes: unknown[]) {
  return partes.map((parte) => String(parte ?? "").trim().toUpperCase()).join("|");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  const content = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function alertasPontoExtra(item: Record<string, any>) {
  const alertas = Array.isArray(item.alertas) ? [...item.alertas] : [];
  const add = (alerta: string, condition: boolean) => {
    if (condition && !alertas.includes(alerta)) alertas.push(alerta);
  };
  add("produto sem M3_UNID", toNumber(item.m3_unid) <= 0);
  add("unidade sugerida muito alta", toNumber(item.unidade_sugerida) > 1000);
  add("caixa sugerida zerada", toNumber(item.unidade_sugerida) > 0 && toNumber(item.caixas_sugeridas) <= 0);
  add("sem estoque CD", toNumber(item.estoque_cd) <= 0);
  add("sem codigo da ponta", !String(item.cod_ponta ?? "").trim());
  add("sem cubagem", toNumber(item.m3_ponta) <= 0);
  add("sem media", toNumber(item.media_venda_un_dia) <= 0);
  add("fora da reparticao", Boolean(item.fora_reparticao));
  add("m3 capacidade maior que total da ponta", toNumber(item.m3_capacidade) > toNumber(item.m3_ponta) && toNumber(item.m3_ponta) > 0);
  add("M3 unitario invalido", toNumber(item.m3_unid) <= 0);
  add("embalagem compra invalida", Boolean(item.embalagem_invalida) || toNumber(item.qtde_emb_compra) <= 0);
  add("produto com cadastro inconsistente", !String(item.codigo_produto ?? "").trim() || !String(item.descricao_produto ?? "").trim());
  return alertas;
}

async function insertInChunks(tableName: string, payload: Record<string, unknown>[], chunkSize = 800) {
  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await lojaDb.from(tableName).insert(chunk);
    if (error) throw error;
  }
}

async function obterUltimaImportacaoId(tipo: string) {
  const { data, error } = await lojaDb
    .from("ponta_importacoes")
    .select("id")
    .eq("tipo", tipo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function removerImportacoesAnteriores(tipo: string) {
  const { data, error } = await lojaDb.from("ponta_importacoes").select("id").eq("tipo", tipo);
  if (error) throw error;
  if (!data?.length) return;
  const { error: deleteError } = await lojaDb.from("ponta_importacoes").delete().in("id", data.map((row) => row.id));
  if (deleteError) throw deleteError;
}

function normalizeSetorCodigo(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "SEM_SETOR";
  const num = Number(text);
  if (Number.isFinite(num)) return String(Math.trunc(num));
  return text.toUpperCase();
}

async function carregarProdutosDaBase(importacaoId: string | null) {
  if (!importacaoId) {
    const pageSize = 1000;
    const produtos: Record<string, any>[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await lojaDb.from("ponta_produtos").select("*").range(from, from + pageSize - 1);
      if (error) throw error;
      produtos.push(...((data ?? []) as Record<string, any>[]));
      if (!data || data.length < pageSize) break;
    }
    return produtos;
  }

  const { data: bases, error: baseError } = await lojaDb
    .from("ponta_base")
    .select("id")
    .eq("importacao_id", importacaoId);
  if (baseError) throw baseError;

  const baseIds = (bases ?? []).map((base) => base.id);
  if (!baseIds.length) return [];

  const chunkSize = 100;
  const produtos: Record<string, any>[] = [];
  for (let index = 0; index < baseIds.length; index += chunkSize) {
    const chunk = baseIds.slice(index, index + chunkSize);
    const { data, error } = await lojaDb.from("ponta_produtos").select("*").in("ponta_base_id", chunk);
    if (error) throw error;
    produtos.push(...((data ?? []) as Record<string, any>[]));
  }
  return produtos;
}

async function carregarMediaPorProdutos(
  importacaoId: string | null,
  produtos: Array<{ loja: unknown; codigo_produto: unknown }>,
) {
  const porLoja = new Map<string, Set<string>>();
  for (const produto of produtos) {
    const loja = normalizeLojaKey(produto.loja);
    const codigo = normalizeCodigoProduto(produto.codigo_produto);
    if (!loja || !codigo) continue;
    if (!porLoja.has(loja)) porLoja.set(loja, new Set());
    porLoja.get(loja)!.add(codigo);
  }

  const chunkSize = 150;
  const rows: Record<string, any>[] = [];
  for (const [loja, codigos] of porLoja.entries()) {
    const lista = [...codigos];
    for (let index = 0; index < lista.length; index += chunkSize) {
      const chunk = lista.slice(index, index + chunkSize);
      let query = lojaDb
        .from("ponta_media_venda")
        .select("*")
        .eq("loja", loja)
        .in("codigo_produto", chunk);
      if (importacaoId) query = query.eq("importacao_id", importacaoId);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...((data ?? []) as Record<string, any>[]));
    }
  }
  return rows;
}

async function carregarEstoquePorCodigos(
  importacaoId: string | null,
  produtos: Array<{ codigo_produto: unknown }>,
) {
  const codigos = [...new Set(produtos.map((produto) => normalizeCodigoProduto(produto.codigo_produto)).filter(Boolean))];
  if (!codigos.length) return [];

  const chunkSize = 150;
  const rows: Record<string, any>[] = [];
  for (let index = 0; index < codigos.length; index += chunkSize) {
    const chunk = codigos.slice(index, index + chunkSize);
    let query = lojaDb.from("ponta_estoque_cd").select("*").in("codigo_produto", chunk);
    if (importacaoId) query = query.eq("importacao_id", importacaoId);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as Record<string, any>[]));
  }
  return rows;
}

async function carregarSetoresDaMedia(importacaoId: string | null) {
  let cacheError: { message?: string } | null = null;

  if (importacaoId) {
    const { data: cached, error } = await lojaDb
      .from("ponta_setores_media")
      .select("setor_codigo, setor_nome")
      .eq("importacao_id", importacaoId)
      .order("setor_codigo", { ascending: true });
    cacheError = error;
    if (!error && (cached?.length ?? 0) > 0) {
      return (cached ?? []).map((setor) => ({
        codigo: normalizeSetorCodigo(setor.setor_codigo),
        nome: String(setor.setor_nome ?? "").trim().toUpperCase(),
      }));
    }
  }

  const { data: rpcData, error: rpcError } = await lojaDb.rpc("ponto_extra_setores_da_media", {
    p_importacao_id: importacaoId,
  });
  if (!rpcError && (rpcData?.length ?? 0) > 0) {
    return (rpcData ?? []).map((setor: { setor_codigo: number; setor_nome: string }) => ({
      codigo: normalizeSetorCodigo(setor.setor_codigo),
      nome: String(setor.setor_nome ?? "").trim().toUpperCase(),
    }));
  }

  const cacheMessage = String(cacheError?.message ?? "");
  const rpcMessage = String(rpcError?.message ?? "");
  const cacheCode = String((cacheError as { code?: string } | null)?.code ?? "");
  const rpcCode = String((rpcError as { code?: string } | null)?.code ?? "");

  if (cacheCode === "42501" || rpcCode === "42501" || cacheMessage.includes("permission denied") || rpcMessage.includes("permission denied")) {
    throw new Error("Sem permissao para ler setores da media. Rode o SQL de GRANT no Supabase (veja instrucoes na tela).");
  }

  if (cacheMessage.includes("ponta_setores_media") && cacheMessage.includes("does not exist")) {
    throw new Error("Tabela de setores da media ainda nao existe no banco. Rode a migration mais recente do Ponto Extra.");
  }

  if (rpcMessage.includes("ponto_extra_setores_da_media") && rpcMessage.includes("does not exist")) {
    throw new Error("Funcao de setores da media ainda nao existe no banco. Rode a migration mais recente do Ponto Extra.");
  }

  // Fallback: usa qualquer setor ja cacheado no banco (importacao anterior ou backfill SQL).
  const { data: todosSetores, error: todosError } = await lojaDb
    .from("ponta_setores_media")
    .select("setor_codigo, setor_nome")
    .order("setor_codigo", { ascending: true });
  if (!todosError && (todosSetores?.length ?? 0) > 0) {
    const mapa = new Map<string, { codigo: string; nome: string }>();
    for (const setor of todosSetores ?? []) {
      const codigo = normalizeSetorCodigo(setor.setor_codigo);
      const nome = String(setor.setor_nome ?? "").trim().toUpperCase();
      if (!codigo || codigo === "SEM_SETOR" || !nome) continue;
      mapa.set(codigo, { codigo, nome });
    }
    if (mapa.size > 0) return Array.from(mapa.values());
  }

  if (cacheError) throw cacheError;
  if (rpcError) throw rpcError;

  return [];
}

async function gravarSetoresDaMedia(importacaoId: string, payload: Array<Record<string, unknown>>) {
  const setores = new Map<number, { importacao_id: string; setor_codigo: number; setor_nome: string }>();
  for (const row of payload) {
    const setorCodigo = Number(row.setor_codigo);
    const setorNome = String(row.setor_nome ?? "").trim().toUpperCase();
    if (!Number.isFinite(setorCodigo) || !setorNome) continue;
    setores.set(setorCodigo, {
      importacao_id: importacaoId,
      setor_codigo: Math.trunc(setorCodigo),
      setor_nome: setorNome,
    });
  }
  if (!setores.size) return;
  const { error } = await lojaDb.from("ponta_setores_media").upsert(Array.from(setores.values()), {
    onConflict: "importacao_id,setor_codigo",
  });
  if (error) throw error;
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

async function readRows(file: File, tipoImportacao = "base_ponta"): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (tipoImportacao === "base_ponta") {
      const comercial = buildBasePontaRowsFromMatrix(matrix);
      if (comercial.length) return comercial;
    }
    return buildRowsFromMatrix(matrix);
  }

  const text = new TextDecoder("windows-1252").decode(buffer);
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const sep = lines[0]?.includes(";") ? ";" : "\t";
  const matrix = lines.map((line) => line.split(sep));
  if (tipoImportacao === "base_ponta") {
    const comercial = buildBasePontaRowsFromMatrix(matrix);
    if (comercial.length) return comercial;
  }
  return buildRowsFromMatrix(matrix);
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
  return <PontoExtraHub />;
}

export function PontoExtraImportacao({ perfil }: Props) {
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [tipo, setTipo] = useState("base_ponta");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [historico, setHistorico] = useState<Record<string, any>[]>([]);
  const [orfaos, setOrfaos] = useState<Record<string, number>>({});
  const [importStatus, setImportStatus] = useState({ basePonta: 0, mediaVenda: 0, estoqueCd: 0 });
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [basePontaParse, setBasePontaParse] = useState<BasePontaParseResult | null>(null);

  function atualizarMes(value: string) {
    const mes = value || currentMonthKey();
    setMesVigencia(mes);
    setMesVigenciaPersistido(mes);
  }

  const preview = useMemo(() => rows.slice(0, 8), [rows]);
  const headers = useMemo(() => Object.keys(preview[0] ?? {}).slice(0, 8), [preview]);

  async function carregarHistorico() {
    const [historicoResult, baseOrfa, estoqueOrfa, mediaOrfa, codigoOrfa] = await Promise.all([
      lojaDb
        .from("ponta_importacoes")
        .select("id, tipo, nome_arquivo, total_linhas, usuario_id, created_at")
        .in("tipo", ["base_ponta", "estoque_cd", "media_venda", "codigo_pontas"])
        .order("created_at", { ascending: false })
        .limit(80),
      lojaDb.from("ponta_base").select("id", { count: "exact", head: true }).is("importacao_id", null),
      lojaDb.from("ponta_estoque_cd").select("id", { count: "exact", head: true }).is("importacao_id", null),
      lojaDb.from("ponta_media_venda").select("id", { count: "exact", head: true }).is("importacao_id", null),
      lojaDb.from("ponta_codigo_pontas").select("id", { count: "exact", head: true }).is("importacao_id", null),
    ]);
    const { data, error } = historicoResult;
    if (error) throw error;
    const countError = baseOrfa.error ?? estoqueOrfa.error ?? mediaOrfa.error ?? codigoOrfa.error;
    if (countError) throw countError;
    setHistorico((data ?? []) as Record<string, any>[]);
    setOrfaos({
      base_ponta: baseOrfa.count ?? 0,
      estoque_cd: estoqueOrfa.count ?? 0,
      media_venda: mediaOrfa.count ?? 0,
      codigo_pontas: codigoOrfa.count ?? 0,
    });
  }

  useEffect(() => {
    void carregarHistorico().catch((err) => {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar historico de importacoes.");
    });
    void fetchPontoExtraWorkflowSnapshot(mesVigencia)
      .then((snapshot) => {
        setImportStatus({
          basePonta: snapshot.details.basePonta,
          mediaVenda: snapshot.details.mediaVenda,
          estoqueCd: snapshot.details.estoqueCd,
        });
      })
      .catch(console.error);
  }, [mesVigencia]);

  async function selecionar(file: File | null) {
    setArquivo(file);
    setMensagem(null);
    setErro(null);
    setRows([]);
    setBasePontaParse(null);
    if (!file) return;
    try {
      const parsedRows = await readRows(file, tipo);
      setRows(parsedRows);
      if (tipo === "base_ponta") {
        const analise = parseBasePontaComercial(parsedRows);
        setBasePontaParse(analise);
        if (!analise.podeGravar) {
          setErro("Nenhuma linha valida para importar. Revise o resumo e os erros por linha.");
        }
      }
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

    let analiseBasePonta: BasePontaParseResult | null = null;
    if (effectiveTipo === "base_ponta") {
      analiseBasePonta = basePontaParse ?? parseBasePontaComercial(rows);
      setBasePontaParse(analiseBasePonta);
      if (!analiseBasePonta.podeGravar) {
        setErro("Importacao bloqueada: nenhuma linha valida. Corrija o arquivo e tente novamente.");
        return;
      }
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      await removerImportacoesAnteriores(effectiveTipo);

      const { data: importacao, error: importError } = await lojaDb
        .from("ponta_importacoes")
        .insert({
          tipo: effectiveTipo,
          nome_arquivo: arquivo.name,
          total_linhas: analiseBasePonta?.resumo.linhasValidas ?? rows.length,
          usuario_id: perfil.id,
        })
        .select("id")
        .single();

      if (importError) throw importError;

      if (effectiveTipo === "base_ponta") {
        const analise = analiseBasePonta!;
        const basePayload = analise.baseRows.map((base) => ({
          importacao_id: importacao.id,
          loja: base.loja,
          quantidade: base.quantidade,
          tipo_ponta: base.tipo_ponta,
          secao: base.secao,
          categoria: base.categoria,
          codigos_raw: base.codigos_raw,
        }));

        const { data: inserted, error } = await lojaDb
          .from("ponta_base")
          .insert(basePayload)
          .select("id, loja, quantidade, tipo_ponta, secao, categoria, codigos_raw");
        if (error) throw error;

        const baseIdPorPonta = new Map<string, string>();
        for (const base of inserted ?? []) {
          baseIdPorPonta.set(`${normalizeLojaKey(base.loja)}|${String(base.quantidade ?? "").trim()}`, base.id);
        }

        const produtoRows = analise.produtoRows.map((produto) => ({
          ponta_base_id: baseIdPorPonta.get(`${produto.loja}|${produto.numero_ponta}`),
          loja: produto.loja,
          numero_ponta: produto.numero_ponta,
          quantidade: produto.quantidade,
          tipo_ponta: produto.tipo_ponta,
          secao: produto.secao,
          categoria: produto.categoria,
          codigo_produto: produto.codigo_produto,
        }));

        if (produtoRows.length) {
          const { error: prodError } = await lojaDb.from("ponta_produtos").insert(produtoRows);
          if (prodError) throw prodError;
        }

        await lojaDb
          .from("ponta_importacoes")
          .update({ total_linhas: analise.resumo.linhasValidas })
          .eq("id", importacao.id);

        setMensagem(
          `Base comercial importada.\n${formatResumoBasePonta(analise.resumo)}\nGravados: ${basePayload.length} pontas e ${produtoRows.length} codigos unicos.`,
        );
      } else if (effectiveTipo === "estoque_cd") {
        const payload = rows
          .map((row) => {
            const estoque = toNumber(getRowValue(row, "QUANTIDADE_EM_ESTOQUE", "ESTOQUE", "ESTOQUE_DISPONIVEL", "QUANTIDADE"));
            const reservado = toNumber(getRowValue(row, "QUANTIDADE_RESERVADA", "RESERVADO", "QUANTIDADE_RESERVADA"));
            return {
              importacao_id: importacao.id,
              codigo_produto: normalizeCodigoProduto(getRowValue(row, "CODIGO_PRODUTO", "CODIGO", "SEQPRODUTO", "COD" )),
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
          .map((row) => {
            const categoriaRaw = String(getRowValue(row, "CATEGORIA", "CATEGORIAS", "CATEGORIA_SETOR"));
            const categoriaParsed = parseCategoriaMedia(categoriaRaw);
            const codigoProduto = normalizeCodigoProduto(getRowValue(row, "CODIGO_PRODUTO", "SEQPRODUTO", "CODPRODUTO", "CODIGO", "COD"));
            return {
              importacao_id: importacao.id,
              loja: normalizeLojaKey(getRowValue(row, "LOJA", "CODIGO_LOJA", "EMPRESA")),
              codigo_produto: codigoProduto,
              seqproduto: codigoProduto,
              descricao_produto: String(getRowValue(row, "DESCRICAO_PRODUTO", "DESCCOMPLETA", "PRODUTO", "DESCRICAO")),
              codigo_fornecedor: String(getRowValue(row, "CODIGO_FORNECEDOR", "COD_FORNECEDOR", "CODFORN")),
              fornecedor: String(getRowValue(row, "FORNECEDOR", "RAZAO")),
              status: String(getRowValue(row, "STATUS")),
              media_venda_un_dia: toNumber(getRowValue(row, "MEDIA_VENDA_UN_DIA", "MEDIAVENDAUNDIA", "MEDIA_VENDA", "MEDIA")),
              media_venda_gp: toNumber(getRowValue(row, "MEDIA_VENDA_GP", "MEDIAVENDAGP")),
              estoque: toNumber(getRowValue(row, "ESTOQUE")),
              par_min: toNumber(getRowValue(row, "PAR_MIN", "PARMIN")),
              par_max: toNumber(getRowValue(row, "PAR_MAX", "PARMAX")),
              pend_compra: toNumber(getRowValue(row, "PEND_COMPRA", "PENDCPA")),
              qtde_emb_compra: toNumber(getRowValue(row, "QTDE_EMBCPA", "QTDE_EMB_COMPRA", "QTD_EMB_COMPRA", "EMBCPA", "EMBALAGEM_COMPRA")),
              embalagem_compra: String(getRowValue(row, "EMBALAGEM_COMPRA", "EMBCPA")),
              categoria: categoriaRaw,
              setor: String(getRowValue(row, "SETOR", "SECAO", "SETOR_N2")),
              grupo: String(getRowValue(row, "GRUPO", "GRUPO_N3")),
              custo_liquido: toNumber(getRowValue(row, "CUSTO_LIQUIDO")),
              peso_unid: toNumber(getRowValue(row, "PESO_UNID", "PESOUNID")),
              m3_unid: toNumber(getRowValue(row, "M3_UNID", "M3_CX")),
              peso_cx: toNumber(getRowValue(row, "PESO_CX", "PESOCX")),
              m3_cx: toNumber(getRowValue(row, "M3_CX", "M3CX")),
              categoria_n1: categoriaParsed.categoria_n1,
              setor_n2: categoriaParsed.setor_n2,
              grupo_n3: categoriaParsed.grupo_n3,
              subgrupo_n4: categoriaParsed.subgrupo_n4,
              tipo_n5: categoriaParsed.tipo_n5,
              setor_codigo: categoriaParsed.setor_codigo_numero,
              setor_nome: categoriaParsed.setor_nome,
              payload: row,
            };
          })
          .filter((row) => row.codigo_produto);

        if (payload.length === 0) {
          setErro("Nenhuma linha valida de media de venda encontrada. Confira se existe SEQPRODUTO ou CODIGO_PRODUTO.");
          return;
        }

        await insertInChunks("ponta_media_venda", payload);
        try {
          await gravarSetoresDaMedia(importacao.id, payload);
        } catch (setorErr: any) {
          console.warn("Setores da media nao gravados no cache:", setorErr);
          setMensagem(
            `Media de venda importada: ${payload.length} produtos gravados. Aviso: cache de setores pendente (permissao no banco).`,
          );
          return;
        }
        setMensagem(`Media de venda importada: ${payload.length} produtos gravados.`);
      } else if (effectiveTipo === "codigo_pontas") {
        const payload = rows
          .map((row) => {
            const setor = parseSetorInfoOperacional(row.SETOR ?? row.SECAO ?? row.CATEGORIA ?? row.SETOR_NOME);
            const mes = String(row.MES_VIGENCIA ?? row.MES ?? row.MES_REFERENCIA ?? row.MES_REF ?? currentMonthKey()).trim();
            return {
              loja: String(row.LOJA ?? row.CODIGO_LOJA ?? row.EMPRESA ?? "").trim(),
              setor_codigo: String(row.SETOR_CODIGO ?? row.COD_SETOR ?? setor.codigo).trim(),
              setor_nome: String(row.SETOR_NOME ?? setor.nome).trim().toUpperCase(),
            mes_vigencia: /^\d{4}-\d{2}$/.test(mes) ? mes : currentMonthKey(),
            descricao_ponta: String(row.DESCRICAO_PONTA ?? row.DESCRICAO ?? row.DESCRICAO_DA_PONTA ?? "").trim(),
            cod_ponta: String(row.COD_PONTA ?? row.CODIGO_PONTA ?? row.PONTA ?? "").trim().toUpperCase(),
            seq_vigencia: String(row.SEQ_VIGENCIA ?? row.SEQVIGENCIA ?? row.SEQ_VIG ?? "").trim(),
            ativo: true,
            importacao_id: importacao.id,
          };
        })
          .filter((row) => row.loja && row.setor_codigo);

        if (payload.length === 0) {
          setErro("Nenhuma linha valida de Codigo das Pontas encontrada. Confira LOJA, SETOR e COD_PONTA.");
          return;
        }

        const { error } = await lojaDb
          .from("ponta_codigo_pontas")
          .upsert(payload, { onConflict: "loja,setor_codigo,mes_vigencia" });
        if (error) throw error;
        setMensagem(`Codigo das Pontas importado: ${payload.length} vinculos gravados.`);
      } else {
        setMensagem(`Importacao ${effectiveTipo} registrada. A carga detalhada sera ativada no proximo bloco.`);
      }
      await carregarHistorico();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao importar arquivo.");
    } finally {
      setLoading(false);
    }
  }

  async function excluirImportacao(item: Record<string, any>) {
    const nome = item.nome_arquivo || item.tipo;
    const confirmado = window.confirm(
      `Excluir a importacao "${nome}"?\n\nSomente os registros ligados a este arquivo serao removidos do Supabase. Esta acao nao apaga outras bases.`,
    );
    if (!confirmado) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const id = String(item.id);
      if (item.tipo === "base_ponta") {
        const { error } = await lojaDb.from("ponta_base").delete().eq("importacao_id", id);
        if (error) throw error;
      } else if (item.tipo === "estoque_cd") {
        const { error } = await lojaDb.from("ponta_estoque_cd").delete().eq("importacao_id", id);
        if (error) throw error;
      } else if (item.tipo === "media_venda") {
        const { error } = await lojaDb.from("ponta_media_venda").delete().eq("importacao_id", id);
        if (error) throw error;
      } else if (item.tipo === "codigo_pontas") {
        const { error } = await lojaDb.from("ponta_codigo_pontas").delete().eq("importacao_id", id);
        if (error) throw error;
      }

      const { error: importError } = await lojaDb.from("ponta_importacoes").delete().eq("id", id);
      if (importError) throw importError;

      setMensagem(`Importacao "${nome}" excluida. Reprocesse o Ponto Extra para atualizar os resultados.`);
      await carregarHistorico();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao excluir importacao.");
    } finally {
      setLoading(false);
    }
  }

  async function limparOrfaos(tipoOrfao: string) {
    const labels: Record<string, string> = {
      base_ponta: "Base Ponta",
      estoque_cd: "Estoque CDs",
      media_venda: "Media de venda",
      codigo_pontas: "Codigo das Pontas",
    };
    const tabelas: Record<string, string> = {
      base_ponta: "ponta_base",
      estoque_cd: "ponta_estoque_cd",
      media_venda: "ponta_media_venda",
      codigo_pontas: "ponta_codigo_pontas",
    };
    const total = orfaos[tipoOrfao] ?? 0;
    if (total <= 0) return;
    const confirmado = window.confirm(
      `Limpar ${total} registros sem importacao vinculada de ${labels[tipoOrfao]}?\n\nEsta acao apaga apenas registros com importacao_id vazio e nao mexe nas importacoes ativas.`,
    );
    if (!confirmado) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { error } = await lojaDb.from(tabelas[tipoOrfao]).delete().is("importacao_id", null);
      if (error) throw error;
      setMensagem(`${labels[tipoOrfao]}: ${total} registros orfaos removidos.`);
      await carregarHistorico();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao limpar registros orfaos.");
    } finally {
      setLoading(false);
    }
  }

  const arquivosCiclo = [
    { key: "base_ponta", label: "Base Ponta (comercial)", hint: "LOJA + Nº PONTA EQF + COD", count: importStatus.basePonta },
    { key: "media_venda", label: "Media de venda", hint: "media vd.txt", count: importStatus.mediaVenda },
    { key: "estoque_cd", label: "Estoque CDs", hint: "ESTOQUE CDS.txt", count: importStatus.estoqueCd },
  ] as const;

  return (
    <PontoExtraPageShell
      stepId="importar"
      mesVigencia={mesVigencia}
      onMesVigenciaChange={atualizarMes}
      title="Importar Mês"
      subtitle="Importe os 3 arquivos do ciclo. A base comercial exige LOJA, Nº PONTA EQF e COD (multiplos codigos por celula). SEÇÃO, DESCRIÇÃO e TIPO são ignorados na regra."
    >
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Checklist do passo 1</h2>
        <div style={gridStyle}>
          {arquivosCiclo.map((item) => (
            <div
              key={item.key}
              style={{
                ...cardStyle,
                margin: 0,
                padding: 14,
                borderColor: item.count > 0 ? theme.colors.neonGreen : theme.colors.borderSoft,
              }}
            >
              <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{item.hint}</div>
              <div style={{ marginTop: 6, fontWeight: 800 }}>{item.label}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: item.count > 0 ? theme.colors.neonGreen : "#fbbf24" }}>
                {item.count > 0 ? `✓ ${formatNumber(item.count, 0)} registros` : "Pendente"}
              </div>
              <button
                type="button"
                onClick={() => setTipo(item.key)}
                style={{ ...buttonStyle, marginTop: 10, padding: "6px 12px", fontSize: 12 }}
              >
                Selecionar este arquivo
              </button>
            </div>
          ))}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Tipo da base</span>
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setBasePontaParse(null);
                setRows([]);
                setArquivo(null);
                setErro(null);
                setMensagem(null);
              }}
              style={inputStyle}
            >
              <option value="base_ponta">Base Ponta</option>
              <option value="estoque_cd">Estoque CDs</option>
              <option value="media_venda">Media de venda</option>
            </select>
          </label>
          <label>
            <span style={descStyle}>Arquivo</span>
            <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => void selecionar(e.target.files?.[0] ?? null)} style={inputStyle} />
          </label>
          <button type="button" onClick={() => void importar()} disabled={loading || (tipo === "base_ponta" && basePontaParse !== null && !basePontaParse.podeGravar)} style={buttonStyle}>
            {loading ? "Importando..." : "Importar base"}
          </button>
        </div>
        {tipo === "base_ponta" && basePontaParse && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 10, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(2,6,23,0.45)" }}>
            <h3 style={{ margin: "0 0 8px", color: theme.colors.neonGreen, fontSize: 14 }}>Resumo da validacao (base comercial)</h3>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: theme.colors.text }}>{formatResumoBasePonta(basePontaParse.resumo)}</pre>
            {basePontaParse.resumo.errosPorLinha.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700 }}>Erros por linha</div>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {basePontaParse.resumo.errosPorLinha.map((item) => (
                    <li key={`${item.linha}-${item.mensagem}`}>Linha {item.linha}: {item.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Bases importadas</h2>
          <button
            type="button"
            onClick={() => void carregarHistorico()}
            disabled={loading}
            style={{ ...buttonStyle, background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}
          >
            Atualizar historico
          </button>
        </div>
        <div style={{ ...gridStyle, marginBottom: 16 }}>
          {[
            ["base_ponta", "Base Ponta"],
            ["estoque_cd", "Estoque CDs"],
            ["media_venda", "Media de venda"],
            ["codigo_pontas", "Codigo das Pontas"],
          ].map(([key, label]) => (
            <div key={key} style={{ ...cardStyle, margin: 0, padding: 14 }}>
              <div style={descStyle}>Orfaos - {label}</div>
              <strong style={{ display: "block", fontSize: 24, margin: "8px 0" }}>{formatNumber(orfaos[key] ?? 0, 0)}</strong>
              <button
                type="button"
                onClick={() => void limparOrfaos(key)}
                disabled={loading || (orfaos[key] ?? 0) === 0}
                style={{ ...buttonStyle, padding: "6px 10px", background: "#991b1b", color: "#fff" }}
              >
                Limpar orfaos
              </button>
            </div>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Tipo", "Arquivo", "Linhas", "Data/hora", "Usuario", "Acoes"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 && <tr><td style={tdStyle}>Nenhuma base importada encontrada.</td></tr>}
              {historico.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{String(item.tipo ?? "").replace(/_/g, " ").toUpperCase()}</td>
                  <td style={tdStyle}>{item.nome_arquivo || "-"}</td>
                  <td style={tdStyle}>{formatNumber(item.total_linhas, 0)}</td>
                  <td style={tdStyle}>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}</td>
                  <td style={tdStyle}>{item.usuario_id || "-"}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => void excluirImportacao(item)}
                      disabled={loading}
                      style={{ ...buttonStyle, padding: "6px 10px", background: "#991b1b", color: "#fff" }}
                    >
                      Excluir importacao
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PontoExtraPageShell>
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
    () => calcularTotalM3(m3Area, toNumber(cubagemForm.percentual_abastecimento || 100)),
    [cubagemForm.percentual_abastecimento, m3Area],
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
          const m3AreaCalculado = calcularM3Area(profundidade, frente, altura);
          const m3Area = m3AreaCalculado || toNumber(row.M3_AREA);
          const reparticao = toNumber(row.REPARTICAO) || 1;
          const percentual = normalizarPercentual(row.PERCETUAL_ABASTECIMENTO ?? row.PERCENTUAL_ABASTECIMENTO ?? row.PERC_ABASTECIMENTO);
          const totalM3 = m3Area ? calcularTotalM3(m3Area, percentual) : toNumber(row.TOTAL_M3);
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
    const m3AreaCalculado = calcularM3Area(profundidade, frente, altura);
    const m3Area = m3AreaCalculado || toNumber(editForm.m3_area);
    const reparticao = toNumber(editForm.reparticao) || 1;
    const percentual = normalizarPercentual(editForm.percentual_abastecimento);
    const totalM3 = m3Area ? calcularTotalM3(m3Area, percentual) : toNumber(editForm.total_m3);

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

export function PontoExtraCapas() {
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [linhas, setLinhas] = useState<PontaCodigoPonta[]>([]);
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroCodigoPonta, setFiltroCodigoPonta] = useState("");
  const [codigosColar, setCodigosColar] = useState("");
  const [setorOpcoes, setSetorOpcoes] = useState<Array<{ codigo: string; nome: string }>>([]);
  const [novaCapa, setNovaCapa] = useState(() => ({
    setor_codigo: "",
    setor_nome: "",
    descricao_ponta: "",
    ...vigenciaPadraoCapa(getMesVigenciaPersistido()),
  }));
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function atualizarMes(value: string) {
    const mes = value || currentMonthKey();
    setMesVigencia(mes);
    setMesVigenciaPersistido(mes);
  }

  async function carregarCapas() {
    setErro(null);
    const mediaImportId = await obterUltimaImportacaoId("media_venda");
    const [{ data: capas, error: capaError }, setores] = await Promise.all([
      lojaDb.from("ponta_codigo_pontas").select("*").eq("mes_vigencia", mesVigencia).order("setor_codigo", { ascending: true }),
      carregarSetoresDaMedia(mediaImportId),
    ]);
    if (capaError) throw capaError;

    setSetorOpcoes(setores);

    const vigenciaPadrao = vigenciaPadraoCapa(mesVigencia);
    const lista = ((capas ?? []) as PontaCodigoPonta[])
      .map((capa) => {
        const setorCodigo = String(capa.setor_codigo ?? "").trim().toUpperCase() || "SEM_SETOR";
        const setorNome = String(capa.setor_nome ?? "").trim().toUpperCase() || "SEM SETOR";
        return {
          ...capa,
          loja: CAPA_TODAS_LOJAS,
          setor_codigo: setorCodigo,
          setor_nome: setorNome,
          descricao_ponta: capa.descricao_ponta || descricaoCapaPonta(mesVigencia, setorCodigo, setorNome),
          cod_ponta: capa.cod_ponta ?? "",
          dtavigenciainicio: formatDateInput(capa.dtavigenciainicio, vigenciaPadrao.dtavigenciainicio),
          dtavigenciafim: formatDateInput(capa.dtavigenciafim, vigenciaPadrao.dtavigenciafim),
          ativo: capa.ativo ?? true,
        };
      })
      .filter((capa) => capa.setor_codigo !== "SEM_SETOR")
      .sort((a, b) => `${a.setor_codigo}`.localeCompare(`${b.setor_codigo}`, "pt-BR", { numeric: true }));

    setLinhas(lista);
  }

  useEffect(() => {
    void carregarCapas().catch((err) => {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar capas de ponta.");
    });
  }, [mesVigencia]);

  async function salvarTodas() {
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const payloadMap = new Map<string, {
        loja: string;
        setor_codigo: string;
        setor_nome: string;
        mes_vigencia: string;
        descricao_ponta: string | null | undefined;
        cod_ponta: string | null | undefined;
        seq_vigencia?: string | null | undefined;
        dtavigenciainicio?: string | null | undefined;
        dtavigenciafim?: string | null | undefined;
        ativo: boolean | null | undefined;
        updated_at: string;
      }>();
      const vigenciaPadrao = vigenciaPadraoCapa(mesVigencia);
      const now = new Date().toISOString();
      for (const linha of linhas) {
        const registro = {
          loja: String(linha.loja ?? "").trim().toUpperCase() || CAPA_TODAS_LOJAS,
          setor_codigo: String(linha.setor_codigo ?? "").trim().toUpperCase() || "SEM_SETOR",
          setor_nome: String(linha.setor_nome ?? "").trim().toUpperCase() || "SEM SETOR",
          mes_vigencia: linha.mes_vigencia,
          descricao_ponta: linha.descricao_ponta,
          cod_ponta: linha.cod_ponta,
          seq_vigencia: linha.seq_vigencia,
          dtavigenciainicio: formatDateInput(linha.dtavigenciainicio, vigenciaPadrao.dtavigenciainicio),
          dtavigenciafim: formatDateInput(linha.dtavigenciafim, vigenciaPadrao.dtavigenciafim),
          ativo: linha.ativo,
          updated_at: now,
        };
        const chave = `${registro.loja}|${registro.setor_codigo}|${registro.mes_vigencia}`;
        const atual = payloadMap.get(chave);
        if (!atual || (!String(atual.cod_ponta ?? "").trim() && String(registro.cod_ponta ?? "").trim())) {
          payloadMap.set(chave, registro);
        }
      }
      const payload = Array.from(payloadMap.values());
      const { error } = await lojaDb
        .from("ponta_codigo_pontas")
        .upsert(payload, { onConflict: "loja,setor_codigo,mes_vigencia" });
      if (error) throw error;
      setMensagem(`${payload.length} capas salvas para ${monthLabel(mesVigencia)}.`);
      await carregarCapas();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao salvar capas.");
    } finally {
      setLoading(false);
    }
  }

  function atualizarLinha(index: number, field: keyof PontaCodigoPonta, value: string | boolean) {
    setLinhas((prev) => prev.map((linha, i) => (i === index ? { ...linha, [field]: value } : linha)));
  }

  async function gerarSetoresDaMedia() {
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      let setores = setorOpcoes;
      if (!setores.length) {
        const mediaImportId = await obterUltimaImportacaoId("media_venda");
        setores = await carregarSetoresDaMedia(mediaImportId);
        setSetorOpcoes(setores);
      }
      if (!setores.length) {
        setErro("Importe a media de venda antes de gerar os setores.");
        return;
      }

      const vigenciaPadrao = vigenciaPadraoCapa(mesVigencia);
      const now = new Date().toISOString();
      const payload = setores.map((setor) => ({
        loja: CAPA_TODAS_LOJAS,
        setor_codigo: setor.codigo,
        setor_nome: setor.nome,
        mes_vigencia: mesVigencia,
        descricao_ponta: descricaoCapaPonta(mesVigencia, setor.codigo, setor.nome),
        cod_ponta: "",
        dtavigenciainicio: vigenciaPadrao.dtavigenciainicio,
        dtavigenciafim: vigenciaPadrao.dtavigenciafim,
        ativo: true,
        updated_at: now,
      }));
      const { error } = await lojaDb
        .from("ponta_codigo_pontas")
        .upsert(payload, { onConflict: "loja,setor_codigo,mes_vigencia" });
      if (error) throw error;
      setMensagem(`${payload.length} capas geradas por setor para ${monthLabel(mesVigencia)}.`);
      await carregarCapas();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao gerar setores da media.");
    } finally {
      setLoading(false);
    }
  }

  async function colarCodigosCom5() {
    const codigos = codigosColar
      .split(/[\n\r\t,;]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
    if (codigos.length === 0) {
      setErro("Cole os codigos do COM5, um por linha.");
      return;
    }
    const pendentes = linhas.filter((linha) => !String(linha.cod_ponta ?? "").trim());
    if (pendentes.length === 0) {
      setErro("Todas as capas ja possuem codigo.");
      return;
    }
    const atualizadas = linhas.map((linha, index) => {
      const pendentesIndex = linhas
        .map((item, i) => (!String(item.cod_ponta ?? "").trim() ? i : -1))
        .filter((i) => i >= 0);
      const posicao = pendentesIndex.indexOf(index);
      if (posicao < 0 || posicao >= codigos.length) return linha;
      return { ...linha, cod_ponta: codigos[posicao].toUpperCase() };
    });
    setLinhas(atualizadas);
    setCodigosColar("");
    setMensagem(`${Math.min(codigos.length, pendentes.length)} codigos aplicados. Clique em Salvar capas.`);
  }

  async function copiarTodasDescricoes() {
    const texto = linhas.map((linha) => linha.descricao_ponta ?? "").filter(Boolean).join("\n");
    if (!texto) {
      setErro("Nenhuma descricao para copiar.");
      return;
    }
    await navigator.clipboard?.writeText(texto);
    setMensagem("Todas as descricoes copiadas. Cole no COM5.");
  }

  async function adicionarDescricaoManual() {
    const setorDigitado = parseSetorInput(novaCapa.setor_codigo);
    const setorCodigo = setorDigitado.codigo || "SEM_SETOR";
    const setorNome = (novaCapa.setor_nome.trim() || setorDigitado.nome || "SEM SETOR").toUpperCase();
    const descricao = novaCapa.descricao_ponta.trim().toUpperCase() || descricaoCapaPonta(mesVigencia, setorCodigo, setorNome);
    if (setorCodigo === "SEM_SETOR") {
      setErro("Informe o setor para criar a capa.");
      return;
    }

    const chave = `${CAPA_TODAS_LOJAS}|${setorCodigo}|${mesVigencia}`;
    if (linhas.some((linha) => `${linha.loja}|${linha.setor_codigo}|${linha.mes_vigencia}` === chave)) {
      setErro("Essa capa ja existe para o setor e mes selecionados.");
      return;
    }

    const vigenciaPadrao = vigenciaPadraoCapa(mesVigencia);
    const inicio = formatDateInput(novaCapa.dtavigenciainicio, vigenciaPadrao.dtavigenciainicio);
    const fim = formatDateInput(novaCapa.dtavigenciafim, vigenciaPadrao.dtavigenciafim);
    if (!inicio || !fim) {
      setErro("Informe a data de inicio e fim da ponta.");
      return;
    }
    if (inicio > fim) {
      setErro("A data de inicio nao pode ser maior que a data de fim.");
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const { error } = await lojaDb
        .from("ponta_codigo_pontas")
        .upsert(
          {
            loja: CAPA_TODAS_LOJAS,
            setor_codigo: setorCodigo,
            setor_nome: setorNome,
            mes_vigencia: mesVigencia,
            descricao_ponta: descricao,
            cod_ponta: "",
            dtavigenciainicio: inicio,
            dtavigenciafim: fim,
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "loja,setor_codigo,mes_vigencia" },
        );
      if (error) throw error;
      setNovaCapa({
        setor_codigo: "",
        setor_nome: "",
        descricao_ponta: "",
        ...vigenciaPadraoCapa(mesVigencia),
      });
      setMensagem("Capa criada. Copie a descricao no COM5 e cole o codigo de volta.");
      await carregarCapas();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao salvar capa.");
    } finally {
      setLoading(false);
    }
  }

  async function copiarDescricao(descricao: string) {
    await navigator.clipboard?.writeText(descricao);
    setMensagem("Descricao copiada.");
  }

  const filtradas = useMemo(
    () =>
      linhas.filter((linha) => {
        const setorFiltro = normalizarBuscaCapa(filtroSetor);
        const codigoFiltro = normalizarBuscaCapa(filtroCodigoPonta);
        const setorBusca = normalizarBuscaCapa(`${linha.setor_codigo} ${linha.setor_nome}`);
        const codigoBusca = normalizarBuscaCapa(`${linha.descricao_ponta ?? ""} ${linha.cod_ponta ?? ""}`);
        const setorOk = !setorFiltro || setorBusca.includes(setorFiltro);
        const codigoOk = !codigoFiltro || codigoBusca.includes(codigoFiltro);
        return setorOk && codigoOk;
      }),
    [filtroCodigoPonta, filtroSetor, linhas],
  );

  function aplicarSetorNovaCapa(value: string) {
    const setor = parseSetorInput(value);
    const encontrado = setorOpcoes.find((item) => item.codigo === normalizeSetorCodigo(setor.codigo))
      || setorOpcoes.find((item) => `${item.codigo} - ${item.nome}` === value);
    const setorCodigo = normalizeSetorCodigo(encontrado?.codigo || setor.codigo || value);
    const setorNome = encontrado?.nome ?? setor.nome ?? "";
    const descricaoAtual = novaCapa.descricao_ponta.trim().toUpperCase();
    const descricaoPadraoAnterior = descricaoCapaPonta(mesVigencia, novaCapa.setor_codigo || "SEM_SETOR", novaCapa.setor_nome || "SEM SETOR");
    const descricaoPonta = !descricaoAtual || descricaoAtual === descricaoPadraoAnterior
      ? descricaoCapaPonta(mesVigencia, setorCodigo || "SEM_SETOR", setorNome || "SEM SETOR")
      : novaCapa.descricao_ponta;
    setNovaCapa((prev) => ({
      ...prev,
      setor_codigo: setorCodigo,
      setor_nome: setorNome || prev.setor_nome,
      descricao_ponta: descricaoPonta,
    }));
  }

  const setoresFiltro = useMemo(
    () =>
      Array.from(new Set([
        ...setorOpcoes.map((setor) => `${setor.codigo} - ${setor.nome}`),
        ...linhas.map((linha) => `${linha.setor_codigo} - ${linha.setor_nome}`).filter(Boolean),
      ])).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [linhas, setorOpcoes],
  );

  const capasPendentes = linhas.filter((linha) => !String(linha.cod_ponta ?? "").trim()).length;

  return (
    <PontoExtraPageShell
      stepId="capas"
      mesVigencia={mesVigencia}
      onMesVigenciaChange={atualizarMes}
      title="Capas COM5"
      subtitle="Cadastre uma capa por setor (como na planilha COD DAS PONTA). Copie as descricoes para o COM5 e cole os codigos oficiais de volta."
    >
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Passo 2A — Gerar capas por setor</h2>
        <p style={descStyle}>
          Clique em gerar setores para criar automaticamente as descricoes (PT MT + mes + setor). Depois copie e cadastre no COM5.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void gerarSetoresDaMedia()} disabled={loading} style={buttonStyle}>
            Gerar setores da media
          </button>
          <button type="button" onClick={() => void copiarTodasDescricoes()} disabled={linhas.length === 0} style={buttonStyle}>
            Copiar todas descricoes
          </button>
          {setorOpcoes.length > 0 && (
            <span style={{ ...descStyle, alignSelf: "center", color: theme.colors.neonGreen }}>
              {setorOpcoes.length} setores disponiveis da media
            </span>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Passo 2B — Adicionar setor manualmente</h2>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Cod. setor</span>
            <input value={novaCapa.setor_codigo} onChange={(e) => aplicarSetorNovaCapa(e.target.value)} placeholder="Ex.: 31" list="ponto-extra-capas-setores" style={inputStyle} />
          </label>
          <label>
            <span style={descStyle}>Nome setor</span>
            <input value={novaCapa.setor_nome} onChange={(e) => setNovaCapa((prev) => ({ ...prev, setor_nome: e.target.value }))} placeholder="Ex.: BASICA" style={inputStyle} />
          </label>
          <label>
            <span style={descStyle}>Descricao da ponta</span>
            <input
              value={novaCapa.descricao_ponta}
              onChange={(e) => setNovaCapa((prev) => ({ ...prev, descricao_ponta: e.target.value }))}
              placeholder="PT MT JULHO 2026 SETOR 31 BASICA"
              style={inputStyle}
            />
          </label>
          <label>
            <span style={descStyle}>Inicio da ponta</span>
            <input
              type="date"
              value={novaCapa.dtavigenciainicio}
              onChange={(e) => setNovaCapa((prev) => ({ ...prev, dtavigenciainicio: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            <span style={descStyle}>Fim da ponta</span>
            <input
              type="date"
              value={novaCapa.dtavigenciafim}
              onChange={(e) => setNovaCapa((prev) => ({ ...prev, dtavigenciafim: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <button type="button" onClick={() => void adicionarDescricaoManual()} style={buttonStyle}>
            Adicionar setor
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Passo 2C — Colar codigos do COM5</h2>
        <p style={descStyle}>
          Cole os codigos retornados pelo COM5, um por linha, na mesma ordem das capas pendentes ({capasPendentes} pendente{capasPendentes === 1 ? "" : "s"}).
        </p>
        <textarea
          value={codigosColar}
          onChange={(e) => setCodigosColar(e.target.value)}
          placeholder={"92698\n92699\n92700"}
          rows={4}
          style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical" }}
        />
        <button type="button" onClick={() => void colarCodigosCom5()} disabled={!codigosColar.trim()} style={{ ...buttonStyle, marginTop: 10 }}>
          Aplicar codigos colados
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Capas do mes</h2>
        <div style={{ ...gridStyle, alignItems: "end", marginBottom: 12 }}>
          <label>
            <span style={descStyle}>Filtrar setor</span>
            <input value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} placeholder="Codigo ou nome" list="ponto-extra-capas-setores" style={inputStyle} />
          </label>
          <label>
            <span style={descStyle}>Filtrar descricao/codigo</span>
            <input value={filtroCodigoPonta} onChange={(e) => setFiltroCodigoPonta(e.target.value)} placeholder="Descricao ou cod. ponta" style={inputStyle} />
          </label>
          <button type="button" disabled={loading || linhas.length === 0} onClick={() => void salvarTodas()} style={buttonStyle}>
            {loading ? "Salvando..." : "Salvar capas"}
          </button>
        </div>
        {mensagem && <div style={{ marginTop: 12, color: theme.colors.neonGreen }}>{mensagem}</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
        <datalist id="ponto-extra-capas-setores">
          {setoresFiltro.map((setor) => <option key={setor} value={setor} />)}
        </datalist>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Acoes", "Setor", "Nome setor", "Descricao da ponta", "Inicio", "Fim", "Cod. ponta", "Status"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && <tr><td colSpan={8} style={tdStyle}>Nenhuma capa. Clique em Gerar setores da media.</td></tr>}
              {filtradas.map((linha) => {
                const index = linhas.findIndex((item) => item.id === linha.id);
                const temCodigo = Boolean(String(linha.cod_ponta ?? "").trim());
                return (
                  <tr key={`${linha.setor_codigo}-${linha.mes_vigencia}`}>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => void copiarDescricao(linha.descricao_ponta ?? "")}
                        style={{ ...buttonStyle, padding: "8px 12px", background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}
                      >
                        Copiar
                      </button>
                    </td>
                    <td style={tdStyle}>{linha.setor_codigo}</td>
                    <td style={tdStyle}>{linha.setor_nome}</td>
                    <td style={tdStyle}>{linha.descricao_ponta}</td>
                    <td style={tdStyle}>
                      <input
                        type="date"
                        value={formatDateInput(linha.dtavigenciainicio, vigenciaPadraoCapa(mesVigencia).dtavigenciainicio)}
                        onChange={(e) => atualizarLinha(index, "dtavigenciainicio", e.target.value)}
                        style={{ ...inputStyle, minWidth: 130 }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="date"
                        value={formatDateInput(linha.dtavigenciafim, vigenciaPadraoCapa(mesVigencia).dtavigenciafim)}
                        onChange={(e) => atualizarLinha(index, "dtavigenciafim", e.target.value)}
                        style={{ ...inputStyle, minWidth: 130 }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={linha.cod_ponta ?? ""}
                        onChange={(e) => atualizarLinha(index, "cod_ponta", e.target.value.toUpperCase())}
                        placeholder="Cod. COM5"
                        style={{ ...inputStyle, minWidth: 100 }}
                      />
                    </td>
                    <td style={{ ...tdStyle, color: temCodigo ? theme.colors.neonGreen : "#fbbf24" }}>
                      {temCodigo ? "Pronto" : "Pendente"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PontoExtraPageShell>
  );
}

export function PontoExtraProcessamento() {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Record<string, any>[]>([]);
  const [lojaFiltro, setLojaFiltro] = useState("");
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [resumo, setResumo] = useState({
    produtosBase: 0,
    processados: 0,
    semMedia: 0,
    semCubagem: 0,
    semEstoque: 0,
    semCodigoPonta: 0,
    foraReparticao: 0,
  });
  const [diagnosticoJoin, setDiagnosticoJoin] = useState<{
    produtosBase: number;
    linhasMedia: number;
    comMedia: number;
    semMedia: number;
    exemplosSemMedia: string[];
  } | null>(null);

  async function carregarResultado() {
    const { data, error, count } = await lojaDb
      .from("ponta_processada")
      .select("*", { count: "exact" })
      .eq("mes_vigencia", mesVigencia)
      .order("loja", { ascending: true })
      .order("cod_ponta", { ascending: true })
      .limit(200);
    if (error) throw error;
    setResultado((data ?? []) as Record<string, any>[]);

    const [produtosCount, mediaCount, estoqueCount, cubagemCount, processados] = await Promise.all([
      lojaDb.from("ponta_produtos").select("*", { count: "exact", head: true }),
      lojaDb.from("ponta_media_venda").select("*", { count: "exact", head: true }),
      lojaDb.from("ponta_estoque_cd").select("*", { count: "exact", head: true }),
      lojaDb.from("ponta_cubagem").select("*", { count: "exact", head: true }),
      lojaDb
        .from("ponta_processada")
        .select("fora_reparticao, cod_ponta, media_venda_un_dia", { count: "exact" })
        .eq("mes_vigencia", mesVigencia),
    ]);

    const firstError = produtosCount.error ?? mediaCount.error ?? estoqueCount.error ?? cubagemCount.error ?? processados.error;
    if (firstError) throw firstError;

    const rows = (processados.data ?? []) as Record<string, any>[];

    setResumo((prev) => ({
      ...prev,
      produtosBase: produtosCount.count ?? 0,
      processados: rows.filter((item) => !item.fora_reparticao).length,
      semMedia: rows.filter((item) => toNumber(item.media_venda_un_dia) <= 0).length,
      semCubagem: cubagemCount.count ? prev.semCubagem : produtosCount.count ?? 0,
      semEstoque: estoqueCount.count ? prev.semEstoque : produtosCount.count ?? 0,
      semCodigoPonta: rows.filter((item) => !String(item.cod_ponta ?? "").trim()).length,
      foraReparticao: rows.filter((item) => Boolean(item.fora_reparticao)).length,
    }));
  }

  useEffect(() => {
    void carregarResultado().catch((err) => {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar processamento.");
    });
  }, [mesVigencia]);

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

  async function processar() {
    if (!isMesVigenciaValido(mesVigencia)) {
      setErro("Selecione o mes de vigencia antes de processar.");
      return;
    }
    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const [baseImportId, mediaImportId, estoqueImportId] = await Promise.all([
        obterUltimaImportacaoId("base_ponta"),
        obterUltimaImportacaoId("media_venda"),
        obterUltimaImportacaoId("estoque_cd"),
      ]);

      const [produtos, cubagens, capas] = await Promise.all([
        carregarProdutosDaBase(baseImportId),
        carregarTabela<any>("ponta_cubagem"),
        carregarTabela<any>("ponta_codigo_pontas"),
      ]);

      if (!produtos.length) {
        setErro("Nenhum produto da base ponta encontrado. Importe a base comercial antes de processar.");
        return;
      }

      const [medias, estoques] = await Promise.all([
        carregarMediaPorProdutos(mediaImportId, produtos),
        carregarEstoquePorCodigos(estoqueImportId, produtos),
      ]);

      if (!medias.length) {
        setErro("Nenhuma media encontrada para os produtos da base. Confira se a media foi importada e se os codigos da base batem com SEQPRODUTO da media.");
        return;
      }

      const mediaPorLojaCodigo = buildMediaLookup(medias);

      const estoquePorCodigo = new Map<string, number>();
      for (const estoque of estoques) {
        const codigo = normalizeCodigoProduto(estoque.codigo_produto);
        if (!codigo) continue;
        const chave = chaveTexto(codigo);
        estoquePorCodigo.set(chave, (estoquePorCodigo.get(chave) ?? 0) + toNumber(estoque.estoque_disponivel));
      }

      const cubagemPorTipo = new Map<string, any>();
      for (const cubagem of cubagens) {
        const tipo = normalizeTipoPonta(cubagem.tipo_ponta);
        if (toNumber(cubagem.total_m3) > 0) cubagemPorTipo.set(chaveTexto(tipo), cubagem);
      }

      const capaPorSetorMes = new Map<string, any>();
      for (const capa of capas) {
        if (!capa.ativo) continue;
        const setorCodigo = normalizeSetorCodigo(capa.setor_codigo);
        const mes = String(capa.mes_vigencia ?? "").trim();
        if (!setorCodigo || setorCodigo === "SEM_SETOR" || !mes) continue;
        capaPorSetorMes.set(chaveTexto(setorCodigo, mes), capa);
      }

      const candidatos = produtos.map((produto) => {
        const codigo = normalizeCodigoProduto(produto.codigo_produto);
        const loja = normalizeLojaKey(produto.loja);
        const numeroPonta = String(produto.numero_ponta ?? produto.quantidade ?? "").trim();
        const tipoPonta = normalizeTipoPonta(produto.tipo_ponta);
        const media = lookupMedia(mediaPorLojaCodigo, loja, codigo);
        const setorParsed = media?.categoria ? parseSetorInfoMedia(media.categoria) : parseSetorInfoMedia("");
        const setorCodigo = media?.setor_codigo != null && String(media.setor_codigo).trim() !== ""
          ? normalizeSetorCodigo(media.setor_codigo)
          : normalizeSetorCodigo(setorParsed.codigo ?? "SEM_SETOR");
        const setorNome = String(media?.setor_nome ?? setorParsed.nome ?? "SEM SETOR").trim().toUpperCase();
        const secao = String(media?.setor_n2 ?? setorParsed.setor_n2 ?? setorNome).trim();
        const categoria = String(media?.categoria_n1 ?? setorParsed.categoria_n1 ?? produto.categoria ?? "").trim();
        const cubagem = cubagemPorTipo.get(chaveTexto(tipoPonta));
        const estoqueCd = estoquePorCodigo.get(chaveTexto(codigo)) ?? 0;
        const capa = capaPorSetorMes.get(chaveTexto(setorCodigo, mesVigencia));
        const codPonta = String(capa?.cod_ponta ?? "").trim();
        return {
          produto,
          media,
          cubagem,
          capa,
          codPonta,
          codigo,
          loja,
          numeroPonta,
          tipoPonta,
          setorCodigo,
          setorNome,
          secao,
          categoria,
          categoriaN1: String(media?.categoria_n1 ?? setorParsed.categoria_n1 ?? "").trim(),
          setorN2: String(media?.setor_n2 ?? setorParsed.setor_n2 ?? "").trim(),
          grupoN3: String(media?.grupo_n3 ?? setorParsed.grupo_n3 ?? "").trim(),
          subgrupoN4: String(media?.subgrupo_n4 ?? setorParsed.subgrupo_n4 ?? "").trim(),
          tipoN5: String(media?.tipo_n5 ?? setorParsed.tipo_n5 ?? "").trim(),
          estoqueCd,
          mediaVenda: toNumber(media?.media_venda_un_dia),
        };
      });

      const comMediaJoin = candidatos.filter((item) => mediaTemVenda(item.media));
      const semMediaJoin = candidatos.filter((item) => !mediaTemVenda(item.media));
      setDiagnosticoJoin({
        produtosBase: produtos.length,
        linhasMedia: medias.length,
        comMedia: comMediaJoin.length,
        semMedia: semMediaJoin.length,
        exemplosSemMedia: semMediaJoin.slice(0, 8).map((item) => `Loja ${item.loja} | Cod. ${item.codigo}`),
      });

      const candidatosPorPonta = new Map<string, typeof candidatos>();
      for (const item of candidatos) {
        const grupo = chaveReparticaoPonta(item.loja, item.numeroPonta, item.tipoPonta);
        candidatosPorPonta.set(grupo, [...(candidatosPorPonta.get(grupo) ?? []), item]);
      }

      const baseCalculada = Array.from(candidatosPorPonta.values()).flatMap((grupo) => {
        const tipoPonta = grupo[0]?.tipoPonta ?? TIPO_PONTA_PADRAO;
        const cubagem = cubagemPorTipo.get(chaveTexto(tipoPonta)) ?? grupo[0]?.cubagem;
        const limiteSku = Math.max(1, Math.floor(toNumber(cubagem?.reparticao) || 7));

        const comMedia = [...grupo]
          .filter((item) => mediaTemVenda(item.media))
          .sort((a, b) => {
            const mediaDiff = b.mediaVenda - a.mediaVenda;
            if (mediaDiff !== 0) return mediaDiff;
            return a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true });
          });

        const semMedia = grupo.filter((item) => !mediaTemVenda(item.media));

        const elegiveis = comMedia.slice(0, limiteSku).map((item, index) => ({
          ...item,
          cubagem,
          limiteSku,
          ordemReparticao: index + 1,
          foraReparticao: false,
          statusReparticao: "ELEGIVEL",
        }));

        const foraLimite = comMedia.slice(limiteSku).map((item, index) => ({
          ...item,
          cubagem,
          limiteSku,
          ordemReparticao: limiteSku + index + 1,
          foraReparticao: true,
          statusReparticao: "FORA DA REPARTICAO",
        }));

        const semMediaRows = semMedia.map((item) => ({
          ...item,
          cubagem,
          limiteSku,
          ordemReparticao: 0,
          foraReparticao: true,
          statusReparticao: "SEM MEDIA",
        }));

        return [...elegiveis, ...foraLimite, ...semMediaRows];
      });
      const foraReparticao = baseCalculada.filter((item) => item.foraReparticao).length;

      const somaPorPonta = new Map<string, number>();
      for (const item of baseCalculada) {
        if (item.foraReparticao) continue;
        const grupo = chaveReparticaoPonta(item.loja, item.numeroPonta, item.tipoPonta);
        somaPorPonta.set(grupo, (somaPorPonta.get(grupo) ?? 0) + item.mediaVenda);
      }

      const payload = baseCalculada.map((item) => {
        const grupoPonta = chaveReparticaoPonta(item.loja, item.numeroPonta, item.tipoPonta);
        const somaMedia = item.foraReparticao ? 0 : somaPorPonta.get(grupoPonta) ?? 0;
        const participacao = !item.foraReparticao && somaMedia > 0 ? item.mediaVenda / somaMedia : 0;
        const m3Ponta = totalM3Cubagem(item.cubagem);
        const percentualAbast = percentualAbastecimentoOficial(item.cubagem);
        const m3Alvo = calcularM3Alvo(m3Ponta, percentualAbast);
        const m3Capacidade = m3Ponta * participacao;
        const m3Unid = toNumber(item.media?.m3_unid);
        const unidadeSugerida = m3Unid > 0 ? m3Capacidade / m3Unid : 0;
        const qtdeEmbCompraOriginal = toNumber(item.media?.qtde_emb_compra);
        const { estqMinimo, estqMaximo, qtdeEmbCompra, embalagemInvalida } = calcularMinMaxSugerido(unidadeSugerida, qtdeEmbCompraOriginal);
        const caixasSugeridas = qtdeEmbCompra > 0 ? unidadeSugerida / qtdeEmbCompra : 0;
        const parMin = toNumber(item.media?.par_min);
        const parMax = toNumber(item.media?.par_max);
        const codPonta = item.codPonta;
        const seqVigencia = String(item.capa?.seq_vigencia ?? "").trim();
        const ocupacao = calcularOcupacaoProduto({
          foraReparticao: item.foraReparticao,
          m3Capacidade,
          m3Alvo,
        });
        const rowBase = {
          m3_unid: m3Unid,
          unidade_sugerida: unidadeSugerida,
          caixas_sugeridas: caixasSugeridas,
          estoque_cd: item.estoqueCd,
          cod_ponta: codPonta,
          fora_reparticao: item.foraReparticao,
          m3_capacidade: m3Capacidade,
          m3_ponta: m3Ponta,
          m3_alvo: m3Alvo,
          m3_ocupado: ocupacao.m3_ocupado,
          percentual_ocupacao: ocupacao.percentual_ocupacao,
          codigo_produto: item.codigo,
          descricao_produto: item.media?.descricao_produto ?? "",
          media_venda_un_dia: item.mediaVenda,
          qtde_emb_compra: qtdeEmbCompra,
          embalagem_invalida: embalagemInvalida,
        };
        const alertas = alertasPontoExtra(rowBase);

        return {
          loja: item.loja,
          quant_ponta: item.numeroPonta,
          tipo_ponta: item.tipoPonta,
          secao: item.secao,
          setor_codigo: item.setorCodigo,
          setor_nome: item.setorNome,
          categoria: item.categoria,
          categoria_n1: item.categoriaN1,
          setor_n2: item.setorN2,
          grupo_n3: item.grupoN3,
          subgrupo_n4: item.subgrupoN4,
          tipo_n5: item.tipoN5,
          codigo_produto: item.codigo,
          descricao_produto: item.media?.descricao_produto ?? "",
          codigo_fornecedor: item.media?.codigo_fornecedor ?? "",
          fornecedor: item.media?.fornecedor ?? "",
          media_venda_un_dia: item.mediaVenda,
          soma_media_ponta: somaMedia,
          participacao,
          m3_ponta: m3Ponta,
          m3_alvo: m3Alvo,
          percentual_abastecimento: percentualAbast,
          m3_capacidade: m3Capacidade,
          m3_ocupado: ocupacao.m3_ocupado,
          percentual_ocupacao: ocupacao.percentual_ocupacao,
          m3_unid: m3Unid,
          unidade_sugerida: unidadeSugerida,
          qtde_emb_compra: qtdeEmbCompra,
          embalagem_invalida: embalagemInvalida,
          caixas_sugeridas: caixasSugeridas,
          estoque_cd: item.estoqueCd,
          cod_ponta: codPonta,
          seq_vigencia: seqVigencia || null,
          descricao_ponta: item.capa?.descricao_ponta ?? "",
          mes_vigencia: mesVigencia,
          status_codigo_ponta: codPonta ? "COM_CODIGO_PONTA" : "SEM_CODIGO_PONTA",
          status_reparticao: item.statusReparticao,
          fora_reparticao: item.foraReparticao,
          ordem_reparticao: item.ordemReparticao,
          limite_reparticao: item.limiteSku,
          alertas,
          aprovado: false,
          estqminimo_sugerido: estqMinimo,
          estqmaximo_sugerido: estqMaximo,
          dtavigenciainicio: formatDateInput(item.capa?.dtavigenciainicio, monthStart(mesVigencia)),
          dtavigenciafim: formatDateInput(item.capa?.dtavigenciafim, monthEnd(mesVigencia)),
          par_min_normal: parMin,
          par_max_normal: parMax,
          estoque_minimo_total: parMin + estqMinimo,
          estoque_maximo_total: parMax + estqMaximo,
        };
      });

      const utilizadoPorPonta = new Map<string, number>();
      for (const row of payload) {
        const key = chavePontaOperacional(row);
        if (row.fora_reparticao) continue;
        utilizadoPorPonta.set(key, (utilizadoPorPonta.get(key) ?? 0) + toNumber(row.m3_ocupado));
      }
      for (const row of payload) {
        const key = chavePontaOperacional(row);
        const m3Utilizado = utilizadoPorPonta.get(key) ?? 0;
        row.status_simulacao = calcularStatusSimulacao(m3Utilizado, toNumber(row.m3_alvo));
      }

      const { error: deleteError } = await lojaDb.from("ponta_processada").delete().eq("mes_vigencia", mesVigencia);
      if (deleteError) throw deleteError;
      if (payload.length) await insertInChunks("ponta_processada", payload, 600);

      const novoResumo = {
        produtosBase: produtos.length,
        processados: payload.filter((item) => !item.fora_reparticao).length,
        semMedia: baseCalculada.filter((item) => !mediaTemVenda(item.media)).length,
        semCubagem: baseCalculada.filter((item) => !item.cubagem).length,
        semEstoque: baseCalculada.filter((item) => item.estoqueCd <= 0).length,
        semCodigoPonta: payload.filter((item) => !item.cod_ponta).length,
        foraReparticao,
      };
      setResumo(novoResumo);
      setResultado(payload.slice(0, 200));
      setMensagem(
        `Processamento concluido: ${payload.length} produtos gravados para ${monthLabel(mesVigencia)}. Join media: ${comMediaJoin.length}/${produtos.length} | Media carregada: ${medias.length} linhas.`,
      );
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao processar Ponto Extra.");
    } finally {
      setLoading(false);
    }
  }

  const resultadoFiltrado = useMemo(() => resultado.filter((item) => !lojaFiltro.trim() || String(item.loja ?? "").includes(lojaFiltro.trim())), [lojaFiltro, resultado]);
  const preview = resultadoFiltrado.slice(0, 120);
  const gruposPreview = useMemo(() => {
    const grupos = new Map<string, Record<string, any>[]>();
    for (const item of preview) {
      const chave = chaveTexto(item.loja, item.cod_ponta, item.quant_ponta, item.setor_codigo, item.secao);
      grupos.set(chave, [...(grupos.get(chave) ?? []), item]);
    }
    return Array.from(grupos.entries()).map(([chave, itens]) => ({
      chave,
      loja: itens[0]?.loja ?? "-",
      ponta: itens[0]?.quant_ponta ?? "-",
      codPonta: itens[0]?.cod_ponta ?? "-",
      setor: itens[0]?.secao ?? "-",
      tipoPonta: itens[0]?.tipo_ponta ?? "-",
      itens,
      limite: itens[0]?.limite_reparticao ?? "-",
      elegiveis: itens.filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL").length,
      somaMedia: itens.filter((item) => !item.fora_reparticao).reduce((sum, item) => sum + toNumber(item.media_venda_un_dia), 0),
      estoqueCd: itens.reduce((sum, item) => sum + toNumber(item.estoque_cd), 0),
    }));
  }, [preview]);

  return (
    <PontoExtraPageShell
      stepId="processar"
      mesVigencia={mesVigencia}
      onMesVigenciaChange={(mes) => {
        setMesVigencia(mes);
        setMesVigenciaPersistido(mes);
      }}
      title="Processar Ponto Extra"
      subtitle="Execute o motor que cruza base ponta, media, estoque e cubagem — equivalente ao Power Query BASE 1."
    >
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
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
        {diagnosticoJoin && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(0,0,0,0.22)" }}>
            <div style={{ color: theme.colors.neonGreen, fontWeight: 800, marginBottom: 8 }}>Diagnostico do join (base x media)</div>
            <div style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 1.6 }}>
              Base: {diagnosticoJoin.produtosBase} SKUs | Media consultada: {diagnosticoJoin.linhasMedia} linhas | Com media: {diagnosticoJoin.comMedia} | Sem media: {diagnosticoJoin.semMedia}
            </div>
            {diagnosticoJoin.exemplosSemMedia.length > 0 && (
              <div style={{ marginTop: 8, color: "#fbbf24", fontSize: 12 }}>
                Exemplos sem media: {diagnosticoJoin.exemplosSemMedia.join(" · ")}
              </div>
            )}
          </div>
        )}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>

      <div style={gridStyle}>
        <MetricCard label="Produtos base" value={resumo.produtosBase || resultado.length} />
        <MetricCard label="Processados" value={resumo.processados || resultado.length} />
        <MetricCard label="Sem media" value={resumo.semMedia} />
        <MetricCard label="Sem cubagem" value={resumo.semCubagem} />
        <MetricCard label="Sem estoque CD" value={resumo.semEstoque} />
        <MetricCard label="Sem codigo da ponta" value={resumo.semCodigoPonta} />
        <MetricCard label="Fora da reparticao" value={resumo.foraReparticao} />
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Resultado processado</h2>
          <input value={lojaFiltro} onChange={(e) => setLojaFiltro(e.target.value)} placeholder="Filtrar loja" style={{ ...inputStyle, maxWidth: 220 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  "Loja",
                  "Ponta",
                  "Limite",
                  "Setor",
                  "Categoria N1",
                  "Setor N2",
                  "Grupo N3",
                  "Subgrupo N4",
                  "Tipo N5",
                  "Tipo ponta",
                  "Codigo",
                  "Descricao",
                  "Media",
                  "Participacao",
                  "M3 capacidade",
                  "Unid. sugerida",
                  "Caixas sugeridas",
                  "Estoque CD",
                  "Cod. ponta",
                  "Status",
                ].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposPreview.length === 0 && <tr><td style={tdStyle}>Nenhum resultado processado.</td></tr>}
              {gruposPreview.map((grupo) => (
                <Fragment key={grupo.chave}>
                  <tr>
                    <td
                      colSpan={20}
                      style={{
                        ...tdStyle,
                        background: "rgba(0,0,0,0.38)",
                        color: theme.colors.neonGreen,
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      Loja {grupo.loja} | Cod. ponta {grupo.codPonta || "-"} | Ponta {grupo.ponta} | Setor {grupo.setor} | {grupo.tipoPonta} | {grupo.elegiveis}/{grupo.limite} SKU elegiveis ({grupo.itens.length} total)
                    </td>
                  </tr>
                  {grupo.itens.map((item, index) => (
                    <tr key={`${grupo.chave}-${item.codigo_produto}-${index}`}>
                      <td style={tdStyle}>{item.loja || "-"}</td>
                      <td style={tdStyle}>{item.quant_ponta || "-"}</td>
                      <td style={tdStyle}>{item.limite_reparticao || "-"}</td>
                      <td style={tdStyle}>{item.secao || "-"}</td>
                      <td style={tdStyle}>{item.categoria_n1 || "-"}</td>
                      <td style={tdStyle}>{item.setor_n2 || "-"}</td>
                      <td style={tdStyle}>{item.grupo_n3 || "-"}</td>
                      <td style={tdStyle}>{item.subgrupo_n4 || "-"}</td>
                      <td style={tdStyle}>{item.tipo_n5 || "-"}</td>
                      <td style={tdStyle}>{item.tipo_ponta || "-"}</td>
                      <td style={tdStyle}>{item.codigo_produto || "-"}</td>
                      <td style={tdStyle}>{item.descricao_produto || "-"}</td>
                      <td style={tdStyle}>{formatNumber(item.media_venda_un_dia, 3)}</td>
                      <td style={tdStyle}>{formatNumber(toNumber(item.participacao) * 100, 2)}%</td>
                      <td style={tdStyle}>{formatNumber(item.m3_capacidade, 6)}</td>
                      <td style={tdStyle}>{formatNumber(item.unidade_sugerida, 2)}</td>
                      <td style={tdStyle}>{formatNumber(item.caixas_sugeridas, 2)}</td>
                      <td style={tdStyle}>{formatNumber(item.estoque_cd, 0)}</td>
                      <td style={tdStyle}>{item.cod_ponta || "-"}</td>
                      <td style={{ ...tdStyle, color: item.fora_reparticao ? "#fbbf24" : theme.colors.neonGreen }}>
                        {item.status_reparticao || "ELEGIVEL"}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PontoExtraPageShell>
  );
}

export function PontoExtraAnalise({ perfil }: { perfil?: Usuario }) {
  const [mesVigencia, setMesVigencia] = useState(currentMonthKey());
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [filtros, setFiltros] = useState({
    loja: "",
    setor: "",
    tipo: "",
    status: "",
    codPonta: "",
    descPonta: "",
    produto: "",
  });

  async function carregar() {
    if (!isMesVigenciaValido(mesVigencia)) {
      setRows([]);
      setErro("Selecione o mes de vigencia para analisar.");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await lojaDb
        .from("ponta_processada")
        .select("*")
        .eq("mes_vigencia", mesVigencia)
        .order("loja", { ascending: true })
        .order("cod_ponta", { ascending: true })
        .limit(1000);
      if (error) throw error;
      setRows((data ?? []) as Record<string, any>[]);
    } catch (err: any) {
      console.error(err);
      setErro(err?.message ?? "Erro ao carregar analise.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [mesVigencia]);

  async function aprovar(id: string, aprovado: boolean) {
    if (!isMesVigenciaValido(mesVigencia)) {
      setErro("Selecione o mes de vigencia antes de aprovar.");
      return;
    }
    const { error } = await lojaDb.from("ponta_processada").update({
      aprovado,
      aprovado_por: aprovado && perfil?.id ? perfil.id : null,
      aprovado_em: aprovado ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) {
      setErro(error.message);
      return;
    }
    setRows((prev) => prev.map((item) => (item.id === id ? { ...item, aprovado } : item)));
  }

  async function atualizarAprovacao(ids: string[], aprovado: boolean) {
    if (ids.length === 0) return;
    if (!isMesVigenciaValido(mesVigencia)) {
      setErro("Selecione o mes de vigencia antes de aprovar.");
      return;
    }
    setErro(null);
    const payload = {
      aprovado,
      aprovado_por: aprovado && perfil?.id ? perfil.id : null,
      aprovado_em: aprovado ? new Date().toISOString() : null,
    };
    for (let index = 0; index < ids.length; index += 300) {
      const chunk = ids.slice(index, index + 300);
      const { error } = await lojaDb.from("ponta_processada").update(payload).in("id", chunk);
      if (error) {
        setErro(error.message);
        return;
      }
    }
    const idSet = new Set(ids);
    setRows((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, aprovado } : item)));
  }

  function toggleExpandido(key: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtradas = useMemo(
    () =>
      rows.filter((item) => {
        const alertas = alertasPontoExtra(item).join(" ").toUpperCase();
        const status = `${item.status_reparticao ?? ""} ${item.status_codigo_ponta ?? ""} ${alertas}`.toUpperCase();
        const produto = `${item.codigo_produto ?? ""} ${item.descricao_produto ?? ""}`.toUpperCase();
        const descricaoPonta = String(item.descricao_ponta ?? "").toUpperCase();
        return (
          (!filtros.loja || String(item.loja ?? "").includes(filtros.loja)) &&
          (!filtros.setor || `${item.setor_codigo ?? ""} ${item.setor_nome ?? ""} ${item.secao ?? ""}`.toUpperCase().includes(filtros.setor.toUpperCase())) &&
          (!filtros.tipo || String(item.tipo_ponta ?? "").toUpperCase().includes(filtros.tipo.toUpperCase())) &&
          (!filtros.codPonta || String(item.cod_ponta ?? "").toUpperCase().includes(filtros.codPonta.toUpperCase())) &&
          (!filtros.descPonta || descricaoPonta.includes(filtros.descPonta.toUpperCase())) &&
          (!filtros.produto || produto.includes(filtros.produto.toUpperCase())) &&
          (!filtros.status || status.includes(filtros.status.toUpperCase()))
        );
      }),
    [filtros, rows],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, { key: string; codPonta: string; descricao: string; mes: string; itens: Record<string, any>[] }>();
    for (const item of filtradas) {
      const codPonta = String(item.cod_ponta ?? "").trim() || "-";
      const descricao = String(item.descricao_ponta ?? "").trim() || "Sem descricao da ponta";
      const mes = String(item.mes_vigencia ?? "").trim();
      const key = chaveTexto(codPonta, descricao, mes);
      const atual = mapa.get(key);
      if (atual) atual.itens.push(item);
      else mapa.set(key, { key, codPonta, descricao, mes, itens: [item] });
    }
    return Array.from(mapa.values()).sort((a, b) => `${a.codPonta} ${a.descricao}`.localeCompare(`${b.codPonta} ${b.descricao}`));
  }, [filtradas]);

  const metricas = useMemo(() => {
    const alertados = filtradas.filter((item) => alertasPontoExtra(item).length > 0);
    return {
      pontas: grupos.length,
      elegiveis: filtradas.filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL").length,
      aprovados: filtradas.filter((item) => item.aprovado).length,
      fora: filtradas.filter((item) => item.fora_reparticao).length,
      alertas: alertados.length,
      semCodigo: filtradas.filter((item) => !String(item.cod_ponta ?? "").trim()).length,
      caixas: filtradas.reduce((total, item) => total + toNumber(item.caixas_sugeridas), 0),
    };
  }, [filtradas, grupos.length]);

  function resumoGrupo(itens: Record<string, any>[]) {
    const alertados = itens.filter((item) => alertasPontoExtra(item).length > 0);
    const valoresUnicos = (campo: string) => Array.from(new Set(itens.map((item) => String(item[campo] ?? "").trim()).filter(Boolean)));
    const lojas = valoresUnicos("loja");
    const numerosPonta = valoresUnicos("quant_ponta");
    const setores = Array.from(new Set(itens.map((item) => `${item.setor_codigo || "-"} - ${item.setor_nome || item.secao || "-"}`)));
    const tipos = valoresUnicos("tipo_ponta");
    const limites = Array.from(new Set(itens.map((item) => Math.floor(toNumber(item.limite_reparticao))).filter((value) => value > 0)));
    return {
      loja: lojas.length === 1 ? lojas[0] : lojas.length > 1 ? "VARIAS" : "-",
      numeroPonta: numerosPonta.length === 1 ? numerosPonta[0] : numerosPonta.length > 1 ? "VARIAS" : "-",
      setor: setores.length === 1 ? setores[0] : setores.length > 1 ? "VARIOS" : "-",
      tipo: tipos.length === 1 ? tipos[0] : tipos.length > 1 ? "VARIOS" : "-",
      limite: limites.length === 1 ? limites[0] : limites.length > 1 ? "VARIOS" : "-",
      total: itens.length,
      elegiveis: itens.filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL").length,
      fora: itens.filter((item) => item.fora_reparticao).length,
      semEstoque: itens.filter((item) => toNumber(item.estoque_cd) <= 0).length,
      semCubagem: itens.filter((item) => toNumber(item.m3_ponta) <= 0).length,
      semMedia: itens.filter((item) => toNumber(item.media_venda_un_dia) <= 0).length,
      somaMedia: itens
        .filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL")
        .reduce((total, item) => total + toNumber(item.media_venda_un_dia), 0),
      caixas: itens.reduce((total, item) => total + toNumber(item.caixas_sugeridas), 0),
      unidades: itens.reduce((total, item) => total + toNumber(item.unidade_sugerida), 0),
      alertas: alertados.length,
    };
  }

  function gruposOperacionais(itens: Record<string, any>[]) {
    const mapa = new Map<
      string,
      {
        key: string;
        loja: string;
        numeroPonta: string;
        setor: string;
        setorCodigo: string;
        setorNome: string;
        tipoPonta: string;
        itens: Record<string, any>[];
      }
    >();
    for (const item of itens) {
      const loja = String(item.loja ?? "-").trim() || "-";
      const numeroPonta = String(item.quant_ponta ?? "-").trim() || "-";
      const setorCodigo = String(item.setor_codigo ?? "-").trim() || "-";
      const setorNome = String(item.setor_nome ?? item.secao ?? "-").trim() || "-";
      const tipoPonta = String(item.tipo_ponta ?? "-").trim() || "-";
      const key = chaveTexto(loja, numeroPonta, setorCodigo, tipoPonta);
      const atual = mapa.get(key);
      if (atual) atual.itens.push(item);
      else {
        mapa.set(key, {
          key,
          loja,
          numeroPonta,
          setor: `${setorCodigo} - ${setorNome}`,
          setorCodigo,
          setorNome,
          tipoPonta,
          itens: [item],
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) =>
      `${a.loja} ${a.numeroPonta} ${a.setor} ${a.tipoPonta}`.localeCompare(`${b.loja} ${b.numeroPonta} ${b.setor} ${b.tipoPonta}`, "pt-BR", { numeric: true }),
    );
  }

  const groupRowStyle: React.CSSProperties = {
    ...tdStyle,
    background: "rgba(2,6,23,0.95)",
    color: theme.colors.neonGreen,
    fontWeight: 800,
  };

  const nestedGroupStyle: React.CSSProperties = {
    ...tdStyle,
    background: "rgba(15,23,42,0.95)",
    color: theme.colors.neonOrange,
    fontWeight: 800,
  };

  const detailRowStyle: React.CSSProperties = {
    ...tdStyle,
    background: "rgba(30,41,59,0.72)",
  };

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={titleStyle}>Analise da Sugestao</h1>
        <p style={descStyle}>Valide as sugestoes agrupadas por codigo da ponta antes da exportacao.</p>
      </div>
      <div style={cardStyle}>
        <div style={{ ...gridStyle, alignItems: "end" }}>
          <label>
            <span style={descStyle}>Mes vigencia *</span>
            <input type="month" value={mesVigencia} onChange={(e) => setMesVigencia(e.target.value || currentMonthKey())} style={inputStyle} />
          </label>
          {[
            ["codPonta", "Cod. ponta"],
            ["descPonta", "Descricao da ponta"],
            ["loja", "Loja"],
            ["setor", "Setor"],
            ["tipo", "Tipo de ponta"],
            ["status", "Status/alerta"],
            ["produto", "Produto"],
          ].map(([key, label]) => (
            <label key={key}>
              <span style={descStyle}>{label}</span>
              <input
                value={(filtros as any)[key]}
                onChange={(e) => setFiltros((prev) => ({ ...prev, [key]: e.target.value }))}
                style={inputStyle}
              />
            </label>
          ))}
          <button type="button" onClick={() => void carregar()} disabled={loading || !isMesVigenciaValido(mesVigencia)} style={buttonStyle}>
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
        {!isMesVigenciaValido(mesVigencia) && (
          <div style={{ marginTop: 12, color: "#fbbf24" }}>Selecione o mes de vigencia para analisar e aprovar produtos.</div>
        )}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>
      <div style={gridStyle}>
        <MetricCard label="Cod. pontas analisados" value={metricas.pontas} />
        <MetricCard label="SKUs elegiveis" value={metricas.elegiveis} />
        <MetricCard label="SKUs aprovados" value={metricas.aprovados} />
        <MetricCard label="Fora da reparticao" value={metricas.fora} />
        <MetricCard label="Com alerta" value={metricas.alertas} />
        <MetricCard label="Sem codigo da ponta" value={metricas.semCodigo} />
        <MetricCard label="Caixas sugeridas total" value={formatNumber(metricas.caixas, 2)} />
      </div>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: theme.colors.neonGreen }}>Sugestoes por codigo da ponta</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  "",
                  "Cod. ponta",
                  "Descricao da ponta",
                  "Mes",
                  "Loja",
                  "Numero ponta",
                  "Setor",
                  "Tipo",
                  "Limite SKU",
                  "Total SKUs",
                  "Elegiveis",
                  "Fora repart.",
                  "Sem estoque",
                  "Sem cubagem",
                  "Sem media",
                  "Soma media",
                  "Caixas total",
                  "Unid. total",
                  "Alertas",
                  "Acoes",
                ].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.length === 0 && <tr><td style={tdStyle}>Nenhum item processado.</td></tr>}
              {grupos.map((grupo) => {
                const resumo = resumoGrupo(grupo.itens);
                const abertoCod = expandidos.has(grupo.key);
                const idsElegiveis = grupo.itens
                  .filter((item) => !item.fora_reparticao && String(item.status_reparticao ?? "").toUpperCase() === "ELEGIVEL")
                  .map((item) => item.id);
                const idsComAlerta = grupo.itens.filter((item) => alertasPontoExtra(item).length > 0).map((item) => item.id);
                return (
                  <Fragment key={grupo.key}>
                    <tr>
                      <td style={groupRowStyle}>
                        <button type="button" onClick={() => toggleExpandido(grupo.key)} style={{ ...buttonStyle, padding: "3px 9px" }}>
                          {abertoCod ? "-" : "+"}
                        </button>
                      </td>
                      <td style={groupRowStyle}>{grupo.codPonta}</td>
                      <td style={groupRowStyle}>{grupo.codPonta} - {grupo.descricao}</td>
                      <td style={groupRowStyle}>{monthLabel(grupo.mes)}</td>
                      <td style={groupRowStyle}>{resumo.loja}</td>
                      <td style={groupRowStyle}>{resumo.numeroPonta}</td>
                      <td style={groupRowStyle}>{resumo.setor}</td>
                      <td style={groupRowStyle}>{resumo.tipo}</td>
                      <td style={groupRowStyle}>{resumo.limite}</td>
                      <td style={groupRowStyle}>{resumo.total}</td>
                      <td style={groupRowStyle}>{resumo.elegiveis}</td>
                      <td style={groupRowStyle}>{resumo.fora}</td>
                      <td style={groupRowStyle}>{resumo.semEstoque}</td>
                      <td style={groupRowStyle}>{resumo.semCubagem}</td>
                      <td style={groupRowStyle}>{resumo.semMedia}</td>
                      <td style={groupRowStyle}>{formatNumber(resumo.somaMedia, 3)}</td>
                      <td style={groupRowStyle}>{formatNumber(resumo.caixas, 2)}</td>
                      <td style={groupRowStyle}>{formatNumber(resumo.unidades, 2)}</td>
                      <td style={{ ...groupRowStyle, color: resumo.alertas ? "#fbbf24" : theme.colors.neonGreen }}>{resumo.alertas}</td>
                      <td style={groupRowStyle}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => void atualizarAprovacao(idsElegiveis, true)} style={{ ...buttonStyle, padding: "6px 10px" }}>Aprovar elegiveis</button>
                          <button type="button" onClick={() => void atualizarAprovacao(idsComAlerta, false)} style={{ ...buttonStyle, padding: "6px 10px", background: "#f97316", color: "#111827" }}>Reprovar alertas</button>
                          <button type="button" onClick={() => void atualizarAprovacao(grupo.itens.map((item) => item.id), false)} style={{ ...buttonStyle, padding: "6px 10px", background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}>Limpar</button>
                        </div>
                      </td>
                    </tr>
                    {abertoCod && gruposOperacionais(grupo.itens).map((operacao) => {
                      const keyOperacao = `${grupo.key}|op|${operacao.key}`;
                      const abertoOperacao = expandidos.has(keyOperacao);
                      const resumoOperacao = resumoGrupo(operacao.itens);
                      return (
                        <Fragment key={keyOperacao}>
                          <tr>
                            <td style={nestedGroupStyle}>
                              <button type="button" onClick={() => toggleExpandido(keyOperacao)} style={{ ...buttonStyle, padding: "3px 9px" }}>
                                {abertoOperacao ? "-" : "+"}
                              </button>
                            </td>
                            <td style={nestedGroupStyle}>{grupo.codPonta}</td>
                            <td style={nestedGroupStyle}>{grupo.descricao}</td>
                            <td style={nestedGroupStyle}>{monthLabel(grupo.mes)}</td>
                            <td style={nestedGroupStyle}>{operacao.loja}</td>
                            <td style={nestedGroupStyle}>{operacao.numeroPonta}</td>
                            <td style={nestedGroupStyle}>{operacao.setor}</td>
                            <td style={nestedGroupStyle}>{operacao.tipoPonta}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.limite}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.total}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.elegiveis}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.fora}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.semEstoque}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.semCubagem}</td>
                            <td style={nestedGroupStyle}>{resumoOperacao.semMedia}</td>
                            <td style={nestedGroupStyle}>{formatNumber(resumoOperacao.somaMedia, 3)}</td>
                            <td style={nestedGroupStyle}>{formatNumber(resumoOperacao.caixas, 2)}</td>
                            <td style={nestedGroupStyle}>{formatNumber(resumoOperacao.unidades, 2)}</td>
                            <td style={{ ...nestedGroupStyle, color: resumoOperacao.alertas ? "#fbbf24" : theme.colors.neonGreen }}>{resumoOperacao.alertas}</td>
                            <td style={nestedGroupStyle}>Loja + ponta + setor + tipo</td>
                          </tr>
                          {abertoOperacao && (
                            <tr>
                              <td colSpan={20} style={{ ...tdStyle, background: "rgba(15,23,42,0.72)", padding: 12 }}>
                                <div style={{ overflowX: "auto" }}>
                                  <table style={tableStyle}>
                                    <thead>
                                      <tr>
                                        {[
                                          "Codigo produto",
                                          "Descricao",
                                          "Categoria N1",
                                          "Setor N2",
                                          "Grupo N3",
                                          "Subgrupo N4",
                                          "Tipo N5",
                                          "Setor codigo",
                                          "Setor nome",
                                          "Media venda",
                                          "Participacao",
                                          "M3 capacidade",
                                          "Unidade sugerida",
                                          "Caixa sugerida",
                                          "Estoque CD",
                                          "Status",
                                          "Alertas",
                                          "Aprovacao",
                                        ].map((header) => (
                                          <th key={header} style={thStyle}>{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {operacao.itens.map((item) => {
                                        const alertas = alertasPontoExtra(item);
                                        return (
                                          <tr key={item.id}>
                                            <td style={detailRowStyle}>{item.codigo_produto}</td>
                                            <td style={detailRowStyle}>{item.descricao_produto || "-"}</td>
                                            <td style={detailRowStyle}>{item.categoria_n1 || "-"}</td>
                                            <td style={detailRowStyle}>{item.setor_n2 || "-"}</td>
                                            <td style={detailRowStyle}>{item.grupo_n3 || "-"}</td>
                                            <td style={detailRowStyle}>{item.subgrupo_n4 || "-"}</td>
                                            <td style={detailRowStyle}>{item.tipo_n5 || "-"}</td>
                                            <td style={detailRowStyle}>{item.setor_codigo || "-"}</td>
                                            <td style={detailRowStyle}>{item.setor_nome || "-"}</td>
                                            <td style={detailRowStyle}>{formatNumber(item.media_venda_un_dia, 3)}</td>
                                            <td style={detailRowStyle}>{formatPercent(toNumber(item.participacao))}</td>
                                            <td style={detailRowStyle}>{formatNumber(item.m3_capacidade, 6)}</td>
                                            <td style={detailRowStyle}>{formatNumber(item.unidade_sugerida, 2)}</td>
                                            <td style={detailRowStyle}>{formatNumber(item.caixas_sugeridas, 2)}</td>
                                            <td style={detailRowStyle}>{formatNumber(item.estoque_cd, 0)}</td>
                                            <td style={{ ...detailRowStyle, color: item.fora_reparticao ? "#fbbf24" : theme.colors.neonGreen }}>{item.status_reparticao}</td>
                                            <td style={{ ...detailRowStyle, color: alertas.length ? "#fbbf24" : theme.colors.textMuted }}>{alertas.join(" | ") || "-"}</td>
                                            <td style={detailRowStyle}>
                                              <button
                                                type="button"
                                                onClick={() => void aprovar(item.id, !item.aprovado)}
                                                style={{ ...buttonStyle, padding: "6px 10px", background: item.aprovado ? "#991b1b" : theme.colors.neonGreen, color: item.aprovado ? "#fff" : "#022c22" }}
                                              >
                                                {item.aprovado ? "Reprovar" : "Aprovar"}
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function PontoExtraExportacao() {
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (!isMesVigenciaValido(mesVigencia)) {
      setRows([]);
      setErro("Selecione o mes de vigencia para exportar.");
      return;
    }
    const { data, error } = await lojaDb
      .from("ponta_processada")
      .select("*")
      .eq("mes_vigencia", mesVigencia)
      .eq("aprovado", true)
      .eq("fora_reparticao", false)
      .not("cod_ponta", "is", null)
      .order("loja", { ascending: true });
    if (error) {
      setErro(error.message);
      return;
    }
    setErro(null);
    setRows((data ?? []).filter((item: any) => String(item.cod_ponta ?? "").trim()));
  }

  useEffect(() => {
    void carregar();
  }, [mesVigencia]);

  function exportarProdutos() {
    if (!isMesVigenciaValido(mesVigencia)) {
      setErro("Selecione o mes de vigencia antes de exportar.");
      return;
    }
    downloadCsv(
      "ponto_extra_produtos.csv",
      ["SEQPONTOEXTRA", "SEQPRODUTO", "STATUS"],
      rows.map((item) => ({
        SEQPONTOEXTRA: item.cod_ponta,
        SEQPRODUTO: item.codigo_produto,
        STATUS: "A",
      })),
    );
  }

  function exportarQuantidade() {
    if (!isMesVigenciaValido(mesVigencia)) {
      setErro("Selecione o mes de vigencia antes de exportar.");
      return;
    }
    downloadCsv(
      "ponto_extra_quantidade.csv",
      ["SEQPONTOEXTRA", "SEQPRODUTO", "NROEMPRESA", "SEQVIGENCIA", "ESTQMINIMO", "ESTQMAXIMO", "DTAVIGENCIAINICIO", "DTAVIGENCIAFIM", "STATUS"],
      rows.map((item) => ({
        SEQPONTOEXTRA: item.cod_ponta,
        SEQPRODUTO: item.codigo_produto,
        NROEMPRESA: item.loja,
        SEQVIGENCIA: item.seq_vigencia || item.mes_vigencia,
        ESTQMINIMO: Math.ceil(toNumber(item.estqminimo_sugerido)),
        ESTQMAXIMO: Math.ceil(toNumber(item.estqmaximo_sugerido)),
        DTAVIGENCIAINICIO: item.dtavigenciainicio,
        DTAVIGENCIAFIM: item.dtavigenciafim,
        STATUS: "A",
      })),
    );
  }

  return (
    <PontoExtraPageShell
      stepId="exportar"
      mesVigencia={mesVigencia}
      onMesVigenciaChange={(mes) => {
        setMesVigencia(mes);
        setMesVigenciaPersistido(mes);
      }}
      title="Exportar COM5"
      subtitle="Gere os arquivos IMPORTAR PRODUTO e IMPORTAR QUANT com as sugestoes aprovadas no passo 4."
    >
      <div style={gridStyle}>
        <MetricCard label="Itens aprovados" value={rows.length} />
        <MetricCard label="Lojas" value={new Set(rows.map((item) => item.loja)).size} />
        <MetricCard label="Pontas" value={new Set(rows.map((item) => item.cod_ponta)).size} />
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={exportarProdutos} disabled={rows.length === 0 || !isMesVigenciaValido(mesVigencia)} style={buttonStyle}>Exportar Produtos</button>
          <button type="button" onClick={exportarQuantidade} disabled={rows.length === 0 || !isMesVigenciaValido(mesVigencia)} style={buttonStyle}>Exportar Quantidade</button>
          <button type="button" onClick={() => void carregar()} style={{ ...buttonStyle, background: "transparent", color: theme.colors.text, border: `1px solid ${theme.colors.borderSoft}` }}>Atualizar</button>
        </div>
        {!isMesVigenciaValido(mesVigencia) && <div style={{ marginTop: 12, color: "#fbbf24" }}>Selecione o mes de vigencia para exportar.</div>}
        {rows.length === 0 && isMesVigenciaValido(mesVigencia) && <div style={{ marginTop: 12, color: "#fbbf24" }}>Nenhum produto aprovado. Volte ao passo 4 e aprove as pontas.</div>}
        {erro && <div style={{ marginTop: 12, color: "#f87171" }}>{erro}</div>}
      </div>
    </PontoExtraPageShell>
  );
}

export function PontoExtraAcompanhamento() {
  const [mesVigencia, setMesVigencia] = useState(getMesVigenciaPersistido);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [filtroLoja, setFiltroLoja] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isMesVigenciaValido(mesVigencia)) {
      setRows([]);
      setErro("Selecione o mes de vigencia para acompanhar.");
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const pageSize = 1000;
        const allRows: Record<string, any>[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await lojaDb
            .from("ponta_processada")
            .select("*")
            .eq("mes_vigencia", mesVigencia)
            .eq("aprovado", true)
            .order("loja", { ascending: true })
            .order("cod_ponta", { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          allRows.push(...((data ?? []) as Record<string, any>[]));
          if (!data || data.length < pageSize) break;
        }

        const mediaImportId = await obterUltimaImportacaoId("media_venda");
        const medias = await carregarMediaPorProdutos(mediaImportId, allRows);
        const rowsEnriquecidas = enriquecerRowsAcompanhamentoEstoque(allRows, medias);

        setErro(null);
        setRows(rowsEnriquecidas);
      } catch (err: any) {
        setErro(err?.message ?? "Erro ao carregar acompanhamento.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [mesVigencia]);

  return (
    <PontoExtraPageShell
      stepId="acompanhar"
      mesVigencia={mesVigencia}
      onMesVigenciaChange={(mes) => {
        setMesVigencia(mes);
        setMesVigenciaPersistido(mes);
      }}
      title="Acompanhar Mês"
      subtitle="Visualize cada ponta aprovada como uma gondola. O percentual usa estoque da media de venda versus par_max + maximo da ponta."
    >
      <div style={cardStyle}>
        {!isMesVigenciaValido(mesVigencia) && <div style={{ color: "#fbbf24", marginBottom: 12 }}>Selecione o mes de vigencia para acompanhar.</div>}
        {erro && <div style={{ color: "#f87171", marginBottom: 12 }}>{erro}</div>}
        <PontoExtraAcompanhamentoGondola
          rows={rows}
          loading={loading}
          filtroLoja={filtroLoja}
          onFiltroLojaChange={setFiltroLoja}
        />
      </div>
    </PontoExtraPageShell>
  );
}

export function PontoExtraRelatorio() {
  return <Placeholder titulo="Relatorio Comercial" descricao="Visao consolidada para validar loja, ponta, categoria, codigo e sugestao de abastecimento." />;
}
