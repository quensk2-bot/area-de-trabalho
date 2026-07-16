import type { CompareResult } from "./compareTypes.ts";

export function formatarRelatorioDivergencias(resultado: CompareResult): string {
  const linhas: string[] = [];
  linhas.push("=== Relatório Excel × V7 ===");
  linhas.push(
    `Linhas: ${resultado.resumo.totalLinhas} | Campos: ${resultado.resumo.totalCampos} | Iguais: ${resultado.resumo.iguais} | Divergentes: ${resultado.resumo.divergentes}`,
  );
  linhas.push(
    `Ausente V7: ${resultado.resumo.ausentesNoV7} | Ausente Excel: ${resultado.resumo.ausentesNoExcel} | Não comparável: ${resultado.resumo.naoComparaveis} | Tolerância: ${resultado.resumo.toleranciaDecimal}`,
  );

  for (const linha of resultado.linhas) {
    const divergentes = linha.campos.filter((c) => c.status === "divergente" || c.status === "ausente_no_v7");
    if (divergentes.length === 0) continue;
    linhas.push(`\n[${linha.chave}]`);
    for (const campo of divergentes) {
      linhas.push(`  ${campo.campo}: ${campo.status} — Excel=${campo.valorExcel} V7=${campo.valorV7} (${campo.motivo})`);
    }
  }

  return linhas.join("\n");
}

export function filtrarDivergencias(resultado: CompareResult): CompareResult {
  const linhas = resultado.linhas
    .map((linha) => ({
      ...linha,
      campos: linha.campos.filter((c) => c.status === "divergente" || c.status === "ausente_no_v7"),
    }))
    .filter((linha) => linha.campos.length > 0);

  return {
    linhas,
    resumo: {
      ...resultado.resumo,
      totalLinhas: linhas.length,
      totalCampos: linhas.reduce((acc, l) => acc + l.campos.length, 0),
    },
  };
}
