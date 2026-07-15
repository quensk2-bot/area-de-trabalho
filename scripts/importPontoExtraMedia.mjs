/**
 * Importa media vd.txt no Supabase (uso local/CI).
 * Uso: node scripts/importPontoExtraMedia.mjs [caminho-do-arquivo]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_FILE = "C:/area-de-trabalho-v7/importar/loja/ponta/media vd.txt";
const EMAIL = process.env.PONTO_EXTRA_EMAIL ?? "adm@teste.com";
const PASSWORD = process.env.PONTO_EXTRA_PASSWORD ?? "V7Adm@2026!";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (!process.env[key]) process.env[key] = raw.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile();

const url = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_KEY;
if (!url || !key) {
  console.error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env");
  process.exit(1);
}

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim();
  if (!text) return 0;
  text = text.replace(/%/g, "").replace(/\s/g, "");
  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  if (hasComma) text = text.replace(/\./g, "").replace(",", ".");
  else if (hasDot) {
    const parts = text.split(".");
    if (parts.length > 2 && parts.slice(1).every((part) => part.length === 3)) text = parts.join("");
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLojaKey(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text.replace(",", "."));
  if (Number.isFinite(num)) return String(Math.trunc(num));
  return text;
}

function normalizeCodigoProduto(value) {
  let text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d+,\d+$/.test(text)) text = text.replace(",", ".");
  const num = Number(text);
  if (Number.isFinite(num)) return String(Math.trunc(num));
  return text.replace(/\s/g, "");
}

function splitCategoriaPath(value) {
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

function parseSetorCodigoNumerico(...candidates) {
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

function parseCategoriaMedia(value) {
  const path = splitCategoriaPath(value);
  const setorN2 = path.setor || "";
  const match = setorN2.match(/^\s*(\d+)\s*[-\u2013]\s*(.+)$/);
  const setorCodigoNumero = parseSetorCodigoNumerico(setorN2, path.categoria, path.setor);
  const setorNome = (match?.[2] || setorN2 || "SEM SETOR").trim().toUpperCase();
  return {
    categoria_n1: path.categoria,
    setor_n2: setorN2,
    grupo_n3: path.grupo,
    subgrupo_n4: path.subgrupo,
    tipo_n5: path.tipo,
    setor_codigo_numero: setorCodigoNumero,
    setor_nome: setorNome,
  };
}

function getRowValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}

function mapMediaRow(row, importacaoId) {
  const categoriaRaw = String(getRowValue(row, ["CATEGORIA", "CATEGORIAS", "CATEGORIA_SETOR"]));
  const parsed = parseCategoriaMedia(categoriaRaw);
  const codigoProduto = normalizeCodigoProduto(
    getRowValue(row, ["CODIGO_PRODUTO", "SEQPRODUTO", "CODPRODUTO", "CODIGO", "COD"]),
  );
  if (!codigoProduto) return null;
  return {
    importacao_id: importacaoId,
    loja: normalizeLojaKey(getRowValue(row, ["LOJA", "CODIGO_LOJA", "EMPRESA"])),
    codigo_produto: codigoProduto,
    seqproduto: codigoProduto,
    descricao_produto: String(getRowValue(row, ["DESCRICAO_PRODUTO", "DESCCOMPLETA", "PRODUTO", "DESCRICAO"])),
    codigo_fornecedor: String(getRowValue(row, ["CODIGO_FORNECEDOR", "COD_FORNECEDOR", "CODFORN"])),
    fornecedor: String(getRowValue(row, ["FORNECEDOR", "RAZAO"])),
    status: String(getRowValue(row, ["STATUS"])),
    media_venda_un_dia: toNumber(getRowValue(row, ["MEDIA_VENDA_UN_DIA", "MEDIAVENDAUNDIA", "MEDIA_VENDA", "MEDIA"])),
    media_venda_gp: toNumber(getRowValue(row, ["MEDIA_VENDA_GP", "MEDIAVENDAGP"])),
    estoque: toNumber(getRowValue(row, ["ESTOQUE"])),
    par_min: toNumber(getRowValue(row, ["PAR_MIN", "PARMIN"])),
    par_max: toNumber(getRowValue(row, ["PAR_MAX", "PARMAX"])),
    pend_compra: toNumber(getRowValue(row, ["PEND_COMPRA", "PENDCPA"])),
    qtde_emb_compra: toNumber(getRowValue(row, ["QTDE_EMBCPA", "QTDE_EMB_COMPRA", "QTD_EMB_COMPRA", "EMBCPA", "EMBALAGEM_COMPRA"])),
    embalagem_compra: String(getRowValue(row, ["EMBALAGEM_COMPRA", "EMBCPA"])),
    categoria: categoriaRaw,
    setor: parsed.setor_n2,
    grupo: parsed.grupo_n3,
    custo_liquido: toNumber(getRowValue(row, ["CUSTO_LIQUIDO"])),
    peso_unid: toNumber(getRowValue(row, ["PESO_UNID", "PESOUNID"])),
    m3_unid: toNumber(getRowValue(row, ["M3_UNID", "M3_CX"])),
    peso_cx: toNumber(getRowValue(row, ["PESO_CX", "PESOCX"])),
    m3_cx: toNumber(getRowValue(row, ["M3_CX", "M3CX"])),
    categoria_n1: parsed.categoria_n1,
    setor_n2: parsed.setor_n2,
    grupo_n3: parsed.grupo_n3,
    subgrupo_n4: parsed.subgrupo_n4,
    tipo_n5: parsed.tipo_n5,
    setor_codigo: parsed.setor_codigo_numero,
    setor_nome: parsed.setor_nome,
  };
}

async function insertChunks(lojaDb, tableName, payload, chunkSize = 500) {
  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await lojaDb.from(tableName).insert(chunk);
    if (error) throw error;
  }
}

async function main() {
  const filePath = process.argv[2] ?? DEFAULT_FILE;
  if (!fs.existsSync(filePath)) {
    console.error("Arquivo nao encontrado:", filePath);
    process.exit(1);
  }

  const sb = createClient(url, key);
  const login = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (login.error) throw login.error;
  const loja = sb.schema("loja");
  const userId = login.data.user.id;

  console.log("Usuario:", EMAIL);
  console.log("Arquivo:", filePath);

  const oldImports = await loja.from("ponta_importacoes").select("id").eq("tipo", "media_venda");
  if (oldImports.error) throw oldImports.error;
  if (oldImports.data?.length) {
    const { error } = await loja.from("ponta_importacoes").delete().in("id", oldImports.data.map((row) => row.id));
    if (error) throw error;
    console.log("Importacoes anteriores de media removidas:", oldImports.data.length);
  }

  const text = new TextDecoder("windows-1252").decode(fs.readFileSync(filePath));
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const sep = lines[0]?.includes(";") ? ";" : "\t";
  const headers = lines[0].split(sep).map(normalizeHeader);

  const { data: importacao, error: importError } = await loja
    .from("ponta_importacoes")
    .insert({
      tipo: "media_venda",
      nome_arquivo: path.basename(filePath),
      total_linhas: lines.length - 1,
      usuario_id: userId,
    })
    .select("id")
    .single();
  if (importError) throw importError;

  const importacaoId = importacao.id;
  let gravados = 0;
  const batchRows = [];
  const INSERT_BATCH = 5000;
  const INSERT_CHUNK = 500;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const row = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cols[index] ?? "";
    });
    const mapped = mapMediaRow(row, importacaoId);
    if (!mapped?.loja || !mapped.codigo_produto) continue;
    batchRows.push(mapped);
    if (batchRows.length >= INSERT_BATCH) {
      await insertChunks(loja, "ponta_media_venda", batchRows, INSERT_CHUNK);
      gravados += batchRows.length;
      batchRows.length = 0;
      process.stdout.write(`\rGravados: ${gravados}`);
    }
  }

  if (batchRows.length) {
    await insertChunks(loja, "ponta_media_venda", batchRows, INSERT_CHUNK);
    gravados += batchRows.length;
  }
  console.log(`\nTotal gravado: ${gravados}`);

  const rebuild = await loja.rpc("ponto_extra_rebuild_setores_cache", { p_importacao_id: importacaoId });
  if (rebuild.error) throw rebuild.error;
  console.log("Setores no cache:", rebuild.data);

  const hit = await loja
    .from("ponta_media_venda")
    .select("loja,codigo_produto,descricao_produto")
    .eq("loja", "73")
    .eq("codigo_produto", "2505088")
    .limit(1);
  console.log("Teste join 73/2505088:", hit.data?.[0] ?? "NAO ENCONTRADO");
  console.log("Importacao concluida:", importacaoId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
