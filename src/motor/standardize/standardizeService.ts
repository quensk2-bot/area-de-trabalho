import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import {
  calcularHashSha256Arquivo,
  caminhoDriveConceitual,
  extrairAnoMes,
  formatarChaveIdempotencia,
  montarChaveIdempotencia,
  normalizarRegional,
} from "../workflow/motorWorkflowUtils.ts";
import { obterContratoPorTipo } from "./standards/standardContracts.ts";
import { formatarRelatorioPadronizacao, serializarRelatorioJson } from "./standardizeReport.ts";
import type {
  MotorStandardizeAbaResultado,
  MotorStandardizeEntrada,
  MotorStandardizeReport,
  MotorStandardizeResultado,
} from "./standardizeTypes.ts";
import { limparAba, linhasParaSheet } from "./workbookCleaner.ts";
import { validarContratoCompleto } from "./workbookValidator.ts";
import {
  abrirWorkbook,
  encontrarAbaOrigem,
  extrairLinhasComoValores,
  inspecionarWorkbook,
} from "./workbookInspector.ts";

export class MotorStandardizeError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
  ) {
    super(message);
    this.name = "MotorStandardizeError";
  }
}

export function executarPadronizacao(entrada: MotorStandardizeEntrada): MotorStandardizeResultado {
  const regional = normalizarRegional(entrada.regional);
  extrairAnoMes(entrada.dataReferencia);

  if (!fs.existsSync(entrada.caminho)) {
    throw new MotorStandardizeError(`Arquivo não encontrado: ${entrada.caminho}`, "ARQUIVO_AUSENTE");
  }

  const contrato = obterContratoPorTipo(entrada.tipo);
  const hashSha256 = calcularHashSha256Arquivo(entrada.caminho);
  const chaveIdempotencia = formatarChaveIdempotencia(
    montarChaveIdempotencia({
      regional,
      dataReferencia: entrada.dataReferencia,
      tipoArquivo: entrada.tipo,
      hashSha256,
    }),
  );

  const aberto = abrirWorkbook(entrada.caminho);
  const inspecao = inspecionarWorkbook(aberto);

  const resultadosMap = new Map<
    string,
    { resultado: ReturnType<typeof limparAba> | null; abaOrigem: string | null }
  >();
  const abasResultado: MotorStandardizeAbaResultado[] = [];
  const abasUsadas: string[] = [];
  const avisos: string[] = [];
  const erros: string[] = [];

  let formulasTotal = 0;
  let mergesTotal = 0;
  let hiddenColsTotal = 0;
  let emptyRowsTotal = 0;
  let emptyColsTotal = 0;
  let linhasLidasTotal = 0;
  let linhasValidasTotal = 0;
  let linhasRejeitadasTotal = 0;
  let duplicidadesTotal = 0;
  const cabecalhosGlobal: Record<string, string> = {};

  for (const abaContrato of contrato.abas) {
    const abaOrigem = encontrarAbaOrigem(aberto.workbook, abaContrato.nomesOrigem);
    if (!abaOrigem) {
      if (!abaContrato.opcional) {
        erros.push(`Aba de origem não encontrada para ${abaContrato.nomeOficial}`);
      }
      resultadosMap.set(abaContrato.nomeOficial, { resultado: null, abaOrigem: null });
      continue;
    }

    abasUsadas.push(abaOrigem);
    const sheet = aberto.workbook.Sheets[abaOrigem];
    const rows = extrairLinhasComoValores(sheet);
    const sheetInfo = inspecao.abas.find((a) => a.nome === abaOrigem);
    if (sheetInfo) {
      formulasTotal += sheetInfo.formulasEncontradas;
      mergesTotal += sheetInfo.celulasMescladas;
      hiddenColsTotal += sheetInfo.colunasOcultas;
    }

    const limpeza = limparAba(rows, abaContrato);
    resultadosMap.set(abaContrato.nomeOficial, { resultado: limpeza, abaOrigem });

    emptyRowsTotal += limpeza.linhasVaziasRemovidas;
    emptyColsTotal += limpeza.colunasVaziasRemovidas;
    linhasLidasTotal += limpeza.linhasLidas;
    linhasValidasTotal += limpeza.linhas.length;
    linhasRejeitadasTotal += limpeza.linhasRejeitadas.length;
    duplicidadesTotal += limpeza.duplicidadesRemovidas;
    Object.assign(cabecalhosGlobal, limpeza.cabecalhosNormalizados);

    abasResultado.push({
      nomeOficial: abaContrato.nomeOficial,
      abaOrigem,
      linhasLidas: limpeza.linhasLidas,
      linhasValidas: limpeza.linhas.length,
      linhasRejeitadas: limpeza.linhasRejeitadas.map((r) => ({
        aba: abaContrato.nomeOficial,
        numeroLinha: r.numeroLinha,
        motivo: r.motivo,
      })),
      duplicidadesRemovidas: limpeza.duplicidadesRemovidas,
      cabecalhosNormalizados: limpeza.cabecalhosNormalizados,
    });
  }

  const abasIgnoradas = inspecao.abas
    .map((a) => a.nome)
    .filter((n) => !abasUsadas.includes(n));

  const validacao = validarContratoCompleto(contrato, resultadosMap);
  avisos.push(...validacao.avisos);
  erros.push(...validacao.erros);

  const { ano, mes } = extrairAnoMes(entrada.dataReferencia);
  const drivePath = caminhoDriveConceitual({
    regional,
    ano,
    mes,
    subpasta: "padronizados",
    nomeArquivo: contrato.nomeArquivoPadrao,
  });

  let arquivoPadraoGerado: string | null = null;

  if (!entrada.dryRun && validacao.valido) {
    if (!fs.existsSync(entrada.outputDir)) {
      fs.mkdirSync(entrada.outputDir, { recursive: true });
    }
    arquivoPadraoGerado = path.join(entrada.outputDir, contrato.nomeArquivoPadrao);

    const wbOut = XLSX.utils.book_new();
    for (const abaContrato of contrato.abas) {
      const entry = resultadosMap.get(abaContrato.nomeOficial);
      const linhas = entry?.resultado?.linhas ?? [];
      const colunas = abaContrato.colunas.map((c) => c.nome);
      const sheetData = linhasParaSheet(linhas, colunas);
      const sheet =
        sheetData.length > 0
          ? XLSX.utils.json_to_sheet(sheetData, { header: colunas })
          : XLSX.utils.aoa_to_sheet([colunas]);
      XLSX.utils.book_append_sheet(wbOut, sheet, abaContrato.nomeOficial);
    }
    XLSX.writeFile(wbOut, arquivoPadraoGerado);
  }

  const statusFinal: MotorStandardizeReport["statusFinal"] = entrada.dryRun
    ? "dry_run"
    : erros.length > 0
      ? "erro"
      : avisos.length > 0
        ? "sucesso_com_alertas"
        : "sucesso";

  const report: MotorStandardizeReport = {
    arquivo: entrada.caminho,
    regional,
    dataReferencia: entrada.dataReferencia,
    tipo: entrada.tipo,
    hashSha256,
    chaveIdempotencia,
    abasEncontradas: inspecao.abas.map((a) => a.nome),
    abasUsadas,
    abasIgnoradas,
    formulasRemovidas: formulasTotal,
    celulasMescladasEncontradas: mergesTotal,
    colunasOcultasEncontradas: hiddenColsTotal,
    linhasVaziasRemovidas: emptyRowsTotal,
    colunasVaziasRemovidas: emptyColsTotal,
    linhasLidas: linhasLidasTotal,
    linhasValidas: linhasValidasTotal,
    linhasRejeitadas: linhasRejeitadasTotal,
    duplicidadesRemovidas: duplicidadesTotal,
    cabecalhosNormalizados: cabecalhosGlobal,
    abas: abasResultado,
    avisos,
    erros,
    statusFinal,
    statusContrato: contrato.statusValidacao,
    arquivoPadraoGerado,
    caminhoDriveConceitual: drivePath,
    dryRun: entrada.dryRun,
  };

  if (entrada.gerarReport) {
    const reportPath = path.join(
      entrada.outputDir,
      `padronizacao_${entrada.tipo}_${regional}_${entrada.dataReferencia}.json`,
    );
    if (!fs.existsSync(entrada.outputDir)) {
      fs.mkdirSync(entrada.outputDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, serializarRelatorioJson(report), "utf8");
  }

  return {
    report,
    sucesso: statusFinal === "sucesso" || statusFinal === "sucesso_com_alertas" || statusFinal === "dry_run",
  };
}

export { formatarRelatorioPadronizacao, serializarRelatorioJson };
