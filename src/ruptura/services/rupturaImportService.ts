import fs from "fs";
import path from "path";
import type { TipoArquivoRuptura } from "../types/rupturaTypes";
import { HEADER_GRUPO_RUPTURA_57 } from "../constants/headers";
import { sha256Hex } from "../utils/hash";
import { validateHeaders } from "../parsers/headerValidation";
import { parseTxtSemicolon, readTxtWin1252 } from "../parsers/rupturaTxtParser";
import { parseXlsxSheet } from "../parsers/rupturaXlsxParser";
import { normalizarCdGrupo1, normalizarCdGrupo2 } from "../normalizers/cdProdutoNormalizer";
import { createRupturaDb } from "./rupturaDb";

type Paths = Partial<Record<TipoArquivoRuptura, string | undefined>>;
type Db = ReturnType<typeof createRupturaDb>;

const RAW_TABLE: Record<TipoArquivoRuptura, string> = {
  grupo_ruptura_1: "raw_grupo_ruptura_1",
  grupo_cds_2: "raw_grupo_cds_2",
  validacao_ruptura: "raw_validacao_ruptura",
  inventario_lojas: "raw_inventario_lojas",
};

function mapRawRow(tipo: TipoArquivoRuptura, execucaoId: string, arquivoId: string, r: { numeroLinha: number; payload: Record<string, string> }) {
  const base = { execucao_id: execucaoId, arquivo_id: arquivoId, numero_linha: r.numeroLinha, payload: r.payload };
  if (tipo === "grupo_ruptura_1") return { ...base, loja: r.payload.LOJA ?? null, seqproduto: r.payload.SEQPRODUTO ?? null };
  if (tipo === "grupo_cds_2") return { ...base, seqproduto: r.payload.SEQPRODUTO ?? null };
  if (tipo === "validacao_ruptura") return { ...base, loja: r.payload.LOJA ?? r.payload.Loja ?? null, item: r.payload.Item ?? null };
  return { ...base, loja: r.payload.LOJA ?? r.payload.Loja ?? r.payload["Código Empresa"] ?? null, produto: r.payload["Código Produto"] ?? r.payload.SEQPRODUTO ?? null };
}

export async function importarPacoteRuptura(opts: {
  regional: string; bandeira?: string; dataReferencia: string; paths: Paths;
}) {
  const db = createRupturaDb();
  const hashes = Object.values(opts.paths).filter(Boolean).map((p) => sha256Hex(fs.readFileSync(p!)));
  const hashPacote = sha256Hex(hashes.join("|"));

  const { data: exec, error: execErr } = await db.from("importacao_execucao").insert({
    regional: opts.regional,
    bandeira: opts.bandeira ?? null,
    data_referencia: opts.dataReferencia,
    status: "importando",
    hash_pacote: hashPacote,
  }).select("id").single();
  if (execErr) throw execErr;
  const execucaoId = exec.id as string;

  const resumo: Record<string, unknown> = { execucaoId };
  for (const [tipo, filePath] of Object.entries(opts.paths) as [TipoArquivoRuptura, string | undefined][]) {
    if (!filePath) continue;
    resumo[tipo] = await importarArquivo(db, execucaoId, tipo, filePath, opts.regional);
  }

  await db.from("importacao_execucao").update({ status: "concluida", finalizado_em: new Date().toISOString() }).eq("id", execucaoId);
  return resumo;
}

async function importarArquivo(db: Db, execucaoId: string, tipo: TipoArquivoRuptura, filePath: string, regional: string) {
  const buf = fs.readFileSync(filePath);
  const hash = sha256Hex(buf);
  const { data: arq, error: arqErr } = await db.from("importacao_arquivo").insert({
    execucao_id: execucaoId, tipo_arquivo: tipo, nome_arquivo: path.basename(filePath), hash_arquivo: hash, status: "importando",
  }).select("id").single();
  if (arqErr) throw arqErr;
  const arquivoId = arq.id as string;

  let rows: { numeroLinha: number; payload: Record<string, string> }[] = [];
  let headerCheck = { ok: true, missing: [] as string[], extra: [] as string[], headers: [] as string[] };

  if (tipo === "validacao_ruptura") {
    rows = parseXlsxSheet(filePath, "Validaçao Ruptura");
    headerCheck = { ok: true, missing: [], extra: [], headers: Object.keys(rows[0]?.payload ?? {}) };
  } else {
    const content = readTxtWin1252(filePath);
    rows = parseTxtSemicolon(content);
    const headers = Object.keys(rows[0]?.payload ?? {});
    if (tipo === "grupo_ruptura_1" || tipo === "grupo_cds_2") headerCheck = validateHeaders(HEADER_GRUPO_RUPTURA_57, headers);
    else headerCheck = { ok: headers.length > 0, missing: [], extra: [], headers };
  }

  let ok = 0; let erros = 0;
  const batch = 200;
  const rawTable = RAW_TABLE[tipo];
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const payloadRows = chunk.map((r) => mapRawRow(tipo, execucaoId, arquivoId, r));
    const { error } = await db.from(rawTable).insert(payloadRows);
    if (error) {
      erros += chunk.length;
      await db.from("importacao_erro_linha").insert({ arquivo_id: arquivoId, numero_linha: chunk[0].numeroLinha, mensagem: error.message });
    } else {
      ok += chunk.length;
      if (tipo === "grupo_ruptura_1") {
        const cds = chunk.flatMap((r) => normalizarCdGrupo1(r.payload, regional, String(r.payload.LOJA ?? ""), String(r.payload.SEQPRODUTO ?? ""), execucaoId, arquivoId));
        if (cds.length) await db.from("raw_cd_produto").insert(cds);
      }
      if (tipo === "grupo_cds_2") {
        const cds = chunk.flatMap((r) => normalizarCdGrupo2(r.payload, regional, String(r.payload.SEQPRODUTO ?? ""), execucaoId, arquivoId));
        if (cds.length) await db.from("raw_cd_produto").insert(cds);
      }
    }
  }

  await db.from("importacao_arquivo").update({
    total_linhas: rows.length, linhas_ok: ok, linhas_erro: erros, status: erros ? "erro" : "concluida",
    cabecalho_validado: headerCheck.ok, cabecalho_snapshot: headerCheck, finalizado_em: new Date().toISOString(),
  }).eq("id", arquivoId);

  return { arquivoId, total: rows.length, ok, erros, header: headerCheck };
}
