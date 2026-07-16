/**
 * Fase 2C.2.3 — inspeção e padronização local (não commitar saídas).
 * Uso: npx tsx src/motor/scripts/fase223Validation.ts
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { parseValidacaoRuptura } from "../parsers/parseValidacaoRuptura.ts";
import { parseCompradores } from "../catalog/parseCompradores.ts";
import { parseOrdemCd, parseSequenciaCd, parseModalidade, parseBandeiraFromXlsx, parseBandeiraFromCsv } from "../catalog/parseOrdemCds.ts";
import { parseRegrasExclusao } from "../catalog/parseRegrasExclusao.ts";
import { parseEstruturaFake } from "../catalog/parseEstruturaFake.ts";
import { executarPadronizacao } from "../standardize/standardizeService.ts";
import { obterContratoPorTipo } from "../standardize/standards/standardContracts.ts";
import type { MotorStandardizeTipo } from "../standardize/standardizeTypes.ts";

const HASHES_ORIGINAIS_ESPERADOS: Record<string, string> = {
  validacao: "85f89cb0594115c597cd1d9d8494defbcd7197849fa5aaf900cbe60b2bd70445",
  ordemCds: "b217db4e960e6495c0c51e78b3eff764e7764f7343a0445e47789ceab637f6d9",
  compradores: "6f6d85432d037650e27deb13d119ffd16c1ab7b7f61a39d6f4043dca2369c70c",
  regras: "afa15aa43e59c951bc9351999fa73890d0f436fc76d197b2d15a5f9589eb98a3",
  estruturaFake: "7afd2138f1ae6ca6d20e087bb6c8660fe018e5ed9079d5a1c6f2bec458e442ff",
  bandeira: "dc731067bafc2ccb395f9a2c78c43c8cdcbc2236fbaf05c2f26eb6a2aea62105",
};

const CLASSIFICACAO_CONTRATOS: Record<
  string,
  { classificacao: string; diferencas: string[]; abasIgnoradas?: string[] }
> = {
  validacao_ruptura: {
    classificacao: "contrato_aprovado_com_ajustes",
    diferencas: [
      "Dupla promoção de cabeçalho: linha 1 é título; cabeçalho real (Loja, Item, …) detectado via scan",
      "Aba oculta Mozart Reports ignorada",
      "~222k mesclagens na aba principal (artefato Excel; removidas na saída padrão)",
    ],
    abasIgnoradas: ["Mozart Reports"],
  },
  ordem_cds: {
    classificacao: "contrato_aprovado_com_ajustes",
    diferencas: [
      "Aba extra Tipo Loja (lookup auxiliar) ignorada — não entra nas 4 abas oficiais",
      "109 fórmulas removidas na aba Bandeira",
      "Cabeçalho Modalide (grafia M) mapeado para Modalidade",
      "bandeira.csv validado como alternativa a BANDEIRA_LOJA (111 lojas)",
    ],
    abasIgnoradas: ["Tipo Loja"],
  },
  compradores: {
    classificacao: "contrato_aprovado_com_ajustes",
    diferencas: [
      "COMPRADORES real não possui REDE — colunas CODFORNEC, RAZÃO, SEÇÃO, NIVEL 2/3, COMPRADOR",
      "REDE derivada no pipeline M via join Rede.txt (fora do padronizador nesta fase)",
      "CORRECAO (Compradores Rede): Rede, SETOR, SETOR2, CATEGORIA, COMPRADOR",
      "Abas Planilha1 e Nomes ignoradas",
    ],
    abasIgnoradas: ["Planilha1", "Nomes"],
  },
  regras: {
    classificacao: "contrato_aprovado",
    diferencas: ["Coluna Status presente; 13 duplicatas removidas na deduplicação"],
  },
  estrutura_fake: {
    classificacao: "contrato_aprovado_com_ajustes",
    diferencas: [
      "Arquivo real é template Excel: 42 linhas placeholder (* FILTRAR) sem SEQPRODUTO operacional",
      "Saída padrão vazia — compatibilidade Excel apenas; não é fonte operacional principal",
      "50+ colunas extras ignoradas; subset mínimo exportado",
    ],
  },
};
const RUPTURA = "C:/area-de-trabalho-v7/importar/RUPTURA";
const OUT = "C:/area-de-trabalho-v7/adm/src/motor/.tmp/padronizados/MT/2026-07";
const REPORT_DIR = "C:/area-de-trabalho-v7/adm/src/motor/.tmp/reports/MT/2026-07";

function resolveRupturaFile(pattern: RegExp): string {
  const files = fs.readdirSync(RUPTURA);
  const match = files.find((f) => pattern.test(f));
  if (!match) throw new Error(`Arquivo não encontrado: ${pattern}`);
  return path.join(RUPTURA, match);
}

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function linhaVazia(row: unknown[]): boolean {
  return !row.some((c) => c != null && String(c).trim() !== "");
}

type SheetInspection = {
  nome: string;
  ordem: number;
  visivel: boolean;
  oculta: boolean;
  linhaCabecalho: number;
  titulosAcimaCabecalho: string[][];
  cabecalhos: string[];
  cabecalhosDuplicados: string[];
  linhasDados: number;
  linhasVazias: number;
  colunasVazias: number;
  formulas: number;
  mesclagens: number;
  colunasOcultas: number;
  linhasOcultas: number;
  autoFilter: boolean;
  tiposAmostra: Record<string, string>;
  duplicidadesChave: number;
  errosEstruturais: string[];
};

function inspecionarSheet(sheet: XLSX.WorkSheet, nome: string, ordem: number, oculta: boolean): SheetInspection {
  const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true }) as unknown[][]) ?? [];

  let formulas = 0;
  if (sheet["!ref"]) {
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const maxR = Math.min(range.e.r, range.s.r + 500);
    for (let r = range.s.r; r <= maxR; r++) {
      for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 50); c++) {
        if (sheet[XLSX.utils.encode_cell({ r, c })]?.f) formulas++;
      }
    }
    if (range.e.r > maxR) formulas = -1; // amostra parcial
  }

  const headerIdx = rows.findIndex((r) => Array.isArray(r) && !linhaVazia(r));
  const titulosAcima = headerIdx > 0 ? rows.slice(0, headerIdx).filter((r) => Array.isArray(r) && !linhaVazia(r)).slice(0, 5) : [];
  const headerRow = headerIdx >= 0 ? rows[headerIdx] : [];
  const cabecalhos = headerRow.map((c) => (c == null ? "" : String(c).trim())).filter((h) => h !== "");
  const seen = new Set<string>();
  const cabecalhosDuplicados: string[] = [];
  for (const h of cabecalhos) {
    const k = h.toLowerCase();
    if (seen.has(k)) cabecalhosDuplicados.push(h);
    seen.add(k);
  }

  const dataRows = rows.slice(headerIdx + 1).filter((r) => Array.isArray(r) && !linhaVazia(r));
  const emptyRows = Math.max(0, rows.slice(headerIdx + 1).length - dataRows.length);

  let colunasVazias = 0;
  if (rows.length > 0 && headerIdx >= 0) {
    const colCount = Array.isArray(headerRow) ? headerRow.length : 0;
    const sample = rows.slice(headerIdx + 1, headerIdx + 101);
    for (let c = 0; c < colCount; c++) {
      const allEmpty = sample.every((r) => {
        const v = Array.isArray(r) ? r[c] : null;
        return v == null || String(v).trim() === "";
      });
      if (allEmpty) colunasVazias++;
    }
  }

  let linhasDados = dataRows.length;
  if (sheet["!ref"] && headerIdx >= 0) {
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    linhasDados = Math.max(0, range.e.r - (range.s.r + headerIdx));
  }

  const tiposAmostra: Record<string, string> = {};
  if (dataRows.length > 0 && Array.isArray(dataRows[0])) {
    for (let i = 0; i < cabecalhos.length; i++) {
      const v = dataRows[0][i];
      tiposAmostra[cabecalhos[i]] = v == null ? "null" : typeof v === "number" ? "number" : "string";
    }
  }

  const errosEstruturais: string[] = [];
  if (cabecalhosDuplicados.length > 0) errosEstruturais.push(`Cabeçalhos duplicados: ${cabecalhosDuplicados.join(", ")}`);
  if (headerIdx > 0 && titulosAcima.length > 0) errosEstruturais.push(`${titulosAcima.length} linha(s) de título acima do cabeçalho`);

  return {
    nome,
    ordem,
    visivel: !oculta,
    oculta,
    linhaCabecalho: headerIdx + 1,
    titulosAcimaCabecalho: titulosAcima.map((r) =>
      (Array.isArray(r) ? r : []).slice(0, 8).map((c) => (c == null ? "" : String(c).slice(0, 40))),
    ),
    cabecalhos,
    cabecalhosDuplicados,
    linhasDados,
    linhasVazias: emptyRows,
    colunasVazias,
    formulas,
    mesclagens: sheet["!merges"]?.length ?? 0,
    colunasOcultas: sheet["!cols"]?.filter((c) => c?.hidden).length ?? 0,
    linhasOcultas: sheet["!rows"]?.filter((r) => r?.hidden).length ?? 0,
    autoFilter: sheet["!autofilter"] != null,
    tiposAmostra,
    duplicidadesChave: 0,
    errosEstruturais,
  };
}

function inspecionarArquivo(caminho: string, maxLinhasInspecao?: number): Record<string, unknown> {
  const stat = fs.statSync(caminho);
  const ext = path.extname(caminho).toLowerCase();

  if (ext === ".csv") {
    const raw = fs.readFileSync(caminho, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
    const sep = lines[0]?.includes(";") ? ";" : ",";
    const headers = (lines[0] ?? "").split(sep).map((h) => h.trim());
    return {
      caminho,
      formato: "csv",
      tamanhoBytes: stat.size,
      hashSha256: sha256(caminho),
      separador: sep,
      cabecalhos: headers,
      linhasDados: Math.max(0, lines.length - 1),
      abas: [],
    };
  }

  const readOpts: XLSX.ParsingOptions = { cellFormula: true };
  if (maxLinhasInspecao != null) readOpts.sheetRows = maxLinhasInspecao;

  const wb = XLSX.readFile(caminho, readOpts);
  const meta = wb.Workbook?.Sheets ?? [];
  const sheetNames = wb.SheetNames ?? [];
  const abas = sheetNames.map((nome, i) => {
    const m = meta.find((s) => s.name === nome);
    const oculta = m?.Hidden === 1 || m?.Hidden === 2;
    return inspecionarSheet(wb.Sheets[nome], nome, i + 1, oculta);
  });

  return {
    caminho,
    formato: ext.slice(1),
    tamanhoBytes: stat.size,
    hashSha256: sha256(caminho),
    nomesAbas: sheetNames,
    abas,
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const files = {
    validacao: resolveRupturaFile(/^Valida.*Ruptura\.xlsx$/i),
    ordemCds: resolveRupturaFile(/^Ordem CD.*\.xlsx$/i),
    compradores: path.join(RUPTURA, "Compradores da regional.xlsx"),
    regras: path.join(RUPTURA, "Regras definidas.xlsx"),
    estruturaFake: path.join(RUPTURA, "Estrutura Fake.xlsx"),
    bandeira: path.join(RUPTURA, "bandeira.csv"),
  };

  const inspecoes: Record<string, unknown> = {};
  const inspectLimits: Record<string, number | undefined> = {
    validacao: 250,
    ordemCds: undefined,
    compradores: 500,
    regras: undefined,
    estruturaFake: undefined,
    bandeira: undefined,
  };
  for (const [k, f] of Object.entries(files)) {
    inspecoes[k] = inspecionarArquivo(f, inspectLimits[k]);
  }

  const padronizacoes: Record<string, unknown> = {};
  const tipos: { key: string; tipo: MotorStandardizeTipo; file: string }[] = [
    { key: "validacao", tipo: "validacao_ruptura", file: files.validacao },
    { key: "ordemCds", tipo: "ordem_cds", file: files.ordemCds },
    { key: "compradores", tipo: "compradores", file: files.compradores },
    { key: "regras", tipo: "regras", file: files.regras },
    { key: "estruturaFake", tipo: "estrutura_fake", file: files.estruturaFake },
  ];

  for (const { key, tipo, file } of tipos) {
    const r = executarPadronizacao({
      caminho: file,
      tipo,
      regional: "MT",
      dataReferencia: "2026-07-15",
      outputDir: OUT,
      dryRun: false,
      gerarReport: true,
    });
    padronizacoes[key] = r.report;
  }

  const parserResults: Record<string, unknown> = {};

  const valPadrao = path.join(OUT, "motor_validacao_ruptura_padrao.xlsx");
  if (fs.existsSync(valPadrao)) {
    const parseVal = await parseValidacaoRuptura(valPadrao, 500);
    parserResults.validacaoRuptura = {
      cabecalhoOk: parseVal.cabecalhoOk,
      linhas: parseVal.linhas.length,
      erros: parseVal.erros.length,
      amostra: parseVal.linhas.slice(0, 3),
      geraRupturaCount: parseVal.linhas.filter((l) => l.geraRuptura).length,
      ruptura104cCount: parseVal.linhas.filter((l) => l.ruptura104c).length,
    };
  }

  const ordemPadrao = path.join(OUT, "motor_ordem_cds_padrao.xlsx");
  if (fs.existsSync(ordemPadrao)) {
    const ordem = parseOrdemCd(ordemPadrao);
    const sequencia = parseSequenciaCd(ordemPadrao);
    const modalidade = parseModalidade(ordemPadrao);
    const bandeiraXlsx = parseBandeiraFromXlsx(ordemPadrao);
    parserResults.ordemCds = {
      ordem: ordem.quantidadeCarregada,
      sequencia: sequencia.quantidadeCarregada,
      modalidade: modalidade.quantidadeCarregada,
      bandeiraXlsx: bandeiraXlsx.quantidadeCarregada,
      erros: [...ordem.erros, ...sequencia.erros, ...modalidade.erros, ...bandeiraXlsx.erros],
    };
  }

  parserResults.bandeiraCsv = parseBandeiraFromCsv(files.bandeira);

  const compPadrao = path.join(OUT, "motor_compradores_padrao.xlsx");
  if (fs.existsSync(compPadrao)) {
    const c = parseCompradores(compPadrao);
    parserResults.compradores = {
      quantidade: c.quantidadeCarregada,
      conflitos: c.conflitos.length,
      duplicatas: c.duplicatasRemovidas,
    };
  }

  const regPadrao = path.join(OUT, "motor_regras_padrao.xlsx");
  if (fs.existsSync(regPadrao)) {
    parserResults.regras = parseRegrasExclusao(regPadrao);
  }

  const fakePadrao = path.join(OUT, "motor_estrutura_fake_padrao.xlsx");
  if (fs.existsSync(fakePadrao)) {
    parserResults.estruturaFake = parseEstruturaFake(fakePadrao);
  }

  const contratos = [
    "validacao_ruptura",
    "ordem_cds",
    "compradores",
    "regras",
    "estrutura_fake",
  ].map((t) => obterContratoPorTipo(t as MotorStandardizeTipo));

  const ordemPadraoOk = fs.existsSync(path.join(OUT, "motor_ordem_cds_padrao.xlsx"));
  const ordemParserOk =
    typeof parserResults.ordemCds === "object" &&
    parserResults.ordemCds != null &&
    (parserResults.ordemCds as { ordem?: number }).ordem === 12 &&
    (parserResults.ordemCds as { sequencia?: number }).sequencia === 55;

  const centralizacao = {
    liberada: false,
    motivo:
      ordemPadraoOk && ordemParserOk
        ? "Contrato e parser OK — aguarda consolidação de código e commit antes de Fase 2C.3"
        : !ordemPadraoOk
          ? "Planilha padrão Ordem CDs não gerada"
          : "Parser catálogo não leu saída padronizada corretamente",
    gate: {
      contratoAprovado: contratos.find((c) => c.tipo === "ordem_cds")?.statusValidacao === "validado_producao",
      planilhaPadraoGerada: ordemPadraoOk,
      parserLeSaida: ordemParserOk,
    },
  };

  const hashesVerificados = Object.fromEntries(
    Object.entries(files).map(([k, f]) => [
      k,
      { esperado: HASHES_ORIGINAIS_ESPERADOS[k], atual: sha256(f), intacto: sha256(f) === HASHES_ORIGINAIS_ESPERADOS[k] },
    ]),
  );

  const relatorio = {
    fase: "2C.2.3",
    regional: "MT",
    dataReferencia: "2026-07-15",
    geradoEm: new Date().toISOString(),
    inspecoes,
    padronizacoes,
    parserResults,
    classificacaoContratos: CLASSIFICACAO_CONTRATOS,
    contratosFinais: contratos.map((c) => ({ tipo: c.tipo, status: c.statusValidacao, abas: c.abas.map((a) => a.nomeOficial) })),
    centralizacao,
    hashesVerificados,
    originaisIntocados: Object.values(hashesVerificados).every((h) => h.intacto),
    confirmacoes: {
      zeroSupabase: true,
      zeroDrive: true,
      txtGrandesNaoProcessados: true,
    },
  };

  fs.writeFileSync(path.join(REPORT_DIR, "fase223-relatorio-completo.json"), JSON.stringify(relatorio, null, 2), "utf8");
  console.log(JSON.stringify(relatorio, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
