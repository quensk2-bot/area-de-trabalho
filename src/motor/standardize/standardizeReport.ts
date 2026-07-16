import type { MotorStandardizeReport } from "./standardizeTypes.ts";

export function formatarRelatorioPadronizacao(report: MotorStandardizeReport): string {
  const linhas: string[] = [
    "=== Relatório de Padronização — Motor V7 ===",
    `Arquivo: ${report.arquivo}`,
    `Regional: ${report.regional}`,
    `Data: ${report.dataReferencia}`,
    `Tipo: ${report.tipo}`,
    `Hash SHA256: ${report.hashSha256}`,
    `Chave idempotência: ${report.chaveIdempotencia}`,
    `Status contrato: ${report.statusContrato}`,
    `Status final: ${report.statusFinal}`,
    `Dry-run: ${report.dryRun ? "sim" : "não"}`,
    "",
    "Abas encontradas: " + report.abasEncontradas.join(", "),
    "Abas usadas: " + report.abasUsadas.join(", "),
    "Abas ignoradas: " + report.abasIgnoradas.join(", "),
    "",
    `Fórmulas encontradas: ${report.formulasRemovidas}`,
    `Células mescladas: ${report.celulasMescladasEncontradas}`,
    `Colunas ocultas: ${report.colunasOcultasEncontradas}`,
    `Linhas vazias removidas: ${report.linhasVaziasRemovidas}`,
    `Colunas vazias removidas: ${report.colunasVaziasRemovidas}`,
    "",
    `Linhas lidas: ${report.linhasLidas}`,
    `Linhas válidas: ${report.linhasValidas}`,
    `Linhas rejeitadas: ${report.linhasRejeitadas}`,
    `Duplicidades removidas: ${report.duplicidadesRemovidas}`,
  ];

  if (report.arquivoPadraoGerado) {
    linhas.push(`Arquivo padrão: ${report.arquivoPadraoGerado}`);
  }
  linhas.push(`Drive (conceitual): ${report.caminhoDriveConceitual}`);

  if (report.avisos.length > 0) {
    linhas.push("", "Avisos:");
    for (const a of report.avisos) linhas.push(`  - ${a}`);
  }
  if (report.erros.length > 0) {
    linhas.push("", "Erros:");
    for (const e of report.erros) linhas.push(`  - ${e}`);
  }

  return linhas.join("\n");
}

export function serializarRelatorioJson(report: MotorStandardizeReport): string {
  return JSON.stringify(report, null, 2);
}
