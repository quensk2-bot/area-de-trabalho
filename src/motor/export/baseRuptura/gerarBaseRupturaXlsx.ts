import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { CABECALHOS_BASE_RUPTURA } from "./baseRupturaColumns.ts";
import type { BaseRupturaLinha, ErroValidacaoExport, ResumoProcessamentoBase } from "./baseRupturaTypes.ts";
import { gerarResumoProcessamento } from "./baseRupturaTypes.ts";

export type GerarBaseRupturaXlsxInput = {
  outputDir: string;
  filename: string;
  linhas: BaseRupturaLinha[];
  resumo: ResumoProcessamentoBase;
  errosValidacao?: ErroValidacaoExport[];
  cdsDinamicos?: BaseRupturaLinha[];
  lojasSelecionadas?: Array<{ loja: number; bandeira: string; publicada?: boolean }>;
};

export type GerarBaseRupturaXlsxResultado = {
  caminho: string;
  linhasBase: number;
  abas: string[];
};

/** Gera XLSX oficial — aba BASE linha 1 = cabeçalho, sem fórmulas/PQ. */
export function gerarBaseRupturaXlsx(input: GerarBaseRupturaXlsxInput): GerarBaseRupturaXlsxResultado {
  if (!fs.existsSync(input.outputDir)) fs.mkdirSync(input.outputDir, { recursive: true });
  const caminho = path.join(input.outputDir, input.filename);

  const rowsBase = input.linhas.map((linha) => {
    const row: (string | number | boolean | null)[] = [];
    for (const h of CABECALHOS_BASE_RUPTURA) row.push(linha[h] ?? null);
    return row;
  });

  const wsBase = XLSX.utils.aoa_to_sheet([CABECALHOS_BASE_RUPTURA, ...rowsBase]);

  const resumoRows = gerarResumoProcessamento(input.resumo);
  const wsResumo = XLSX.utils.json_to_sheet(resumoRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsBase, "BASE");
  XLSX.utils.book_append_sheet(wb, wsResumo, "RESUMO_PROCESSAMENTO");

  const abas = ["BASE", "RESUMO_PROCESSAMENTO"];

  if (input.lojasSelecionadas?.length) {
    const wsLojas = XLSX.utils.json_to_sheet(
      input.lojasSelecionadas.map((l) => ({
        loja: l.loja,
        bandeira: l.bandeira,
        publicada: l.publicada === false ? "nao" : "sim",
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsLojas, "LOJAS_SELECIONADAS");
    abas.push("LOJAS_SELECIONADAS");
  }

  if (input.resumo.camposAusentes.length > 0) {
    const wsCampos = XLSX.utils.json_to_sheet(
      input.resumo.camposAusentes.map((coluna) => ({ coluna, tipo: "ausente_v7_ou_sem_fonte" })),
    );
    XLSX.utils.book_append_sheet(wb, wsCampos, "CAMPOS_AUSENTES");
    abas.push("CAMPOS_AUSENTES");
  }

  if (input.cdsDinamicos && input.cdsDinamicos.length > 0) {
    const wsCds = XLSX.utils.json_to_sheet(input.cdsDinamicos);
    XLSX.utils.book_append_sheet(wb, wsCds, "CDS_DINAMICOS");
    abas.push("CDS_DINAMICOS");
  }

  const erros = input.errosValidacao ?? [];
  if (erros.length > 0) {
    const wsErros = XLSX.utils.json_to_sheet(
      erros.map((e) => ({
        etapa: e.etapa,
        arquivo: e.arquivo,
        linha: e.linha,
        produto: e.produto,
        codigo: e.codigo,
        severidade: e.severidade,
        mensagem: e.mensagem,
        acao_recomendada: e.acaoRecomendada,
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsErros, "ERROS_VALIDACAO");
    abas.push("ERROS_VALIDACAO");
  }

  XLSX.writeFile(wb, caminho, { bookType: "xlsx", compression: true });

  return { caminho, linhasBase: input.linhas.length, abas };
}

export function gerarBaseRupturaCsv(input: {
  outputDir: string;
  filename: string;
  linhas: BaseRupturaLinha[];
}): string {
  if (!fs.existsSync(input.outputDir)) fs.mkdirSync(input.outputDir, { recursive: true });
  const caminho = path.join(input.outputDir, input.filename);

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const linhasCsv = [
    CABECALHOS_BASE_RUPTURA.join(";"),
    ...input.linhas.map((row) => CABECALHOS_BASE_RUPTURA.map((h) => escape(row[h])).join(";")),
  ];
  fs.writeFileSync(caminho, "\ufeff" + linhasCsv.join("\r\n"), "utf8");
  return caminho;
}
