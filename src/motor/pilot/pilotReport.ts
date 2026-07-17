import fs from "fs";
import path from "path";
import type { CompareFieldResult } from "../compare/compareTypes.ts";
import type { PilotDivergencia, PilotMetricas, PilotResultado } from "./pilotTypes.ts";
import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";

function writeJsonl(filePath: string, rows: unknown[]): void {
  const content = rows.map((r) => JSON.stringify(r)).join("\n");
  fs.writeFileSync(filePath, content, "utf8");
}

export function classificarDivergencia(campo: CompareFieldResult): PilotDivergencia["categoria"] {
  if (campo.status === "tolerancia_decimal") return "diferenca_decimal_permitida";
  if (campo.status === "ausente_no_excel" || campo.status === "ausente_no_v7") return "dado_ausente";
  if (/Curto|Médio|Longo|Dias Pedido|Ação/.test(campo.campo)) return "bre";
  if (/CD|Centraliz|Recebto|Estoque CDs|Solicitação/.test(campo.campo)) return "centralizacao";
  if (/Rede|Comprador|Base Limpa/.test(campo.campo)) return "catalogo";
  if (/Ruptura|Inventário|Soma_Estoque|Cross/.test(campo.campo)) return "transformacao";
  return "join";
}

export function severidadeDivergencia(campo: CompareFieldResult): PilotDivergencia["severidade"] {
  if (campo.status === "tolerancia_decimal") return "tolerada";
  if (campo.status === "nao_comparavel" || campo.status === "ausente_no_excel" || campo.status === "ausente_no_v7") {
    return "informativa";
  }
  if (campo.status === "divergente") return "critica";
  return "informativa";
}

export function escreverSaidasPiloto(outputDir: string, resultado: PilotResultado): void {
  fs.mkdirSync(outputDir, { recursive: true });

  writeJsonl(path.join(outputDir, "consolidado_loja_73.jsonl"), resultado.consolidado.itens);
  writeJsonl(path.join(outputDir, "amostra_300.jsonl"), resultado.amostra);
  fs.writeFileSync(path.join(outputDir, "metricas.json"), JSON.stringify(resultado.metricas, null, 2), "utf8");
  fs.writeFileSync(path.join(outputDir, "alertas.json"), JSON.stringify(resultado.consolidado.itens.flatMap((i) => i.alertas), null, 2), "utf8");

  const csvHeader = "loja;produto;campo;esperado_excel;encontrado_v7;categoria;severidade;observacao\n";
  const csvBody = resultado.divergencias
    .map((d) =>
      [d.loja, d.produto, d.campo, d.esperadoExcel, d.encontradoV7, d.categoria, d.severidade, d.observacao]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");
  fs.writeFileSync(path.join(outputDir, "divergencias.csv"), csvHeader + csvBody, "utf8");

  const resumo = [
    `Piloto MT Loja ${resultado.opcoes.loja}`,
    `Data referência: ${resultado.opcoes.dataReferencia}`,
    `Produtos consolidados: ${resultado.consolidado.itens.length}`,
    `Amostra: ${resultado.amostra.length}`,
    `Divergências: ${resultado.metricas.totalDivergencias} (críticas: ${resultado.metricas.divergenciasCriticas}, toleradas: ${resultado.metricas.divergenciasToleradas})`,
    `Excel: ${resultado.excelFonte.arquivo} / aba ${resultado.excelFonte.aba} / ${resultado.excelFonte.linhasLoja} linhas loja ${resultado.opcoes.loja}`,
    `Decisão: ${resultado.aprovado ? "APROVADO" : "BLOQUEADO — " + (resultado.bloqueioMotivo ?? "motivo não informado")}`,
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "resumo.txt"), resumo, "utf8");
}

export function resumirQualidade(itens: MotorProdutoLojaConsolidado[]): Pick<
  PilotMetricas,
  "qualidadeCompleta" | "qualidadeComAlertas" | "qualidadeIncompleta" | "qualidadeInvalida" | "cp" | "mp" | "lp" | "semRuptura" | "alertas" | "erros" | "linhasInvalidas"
> {
  let cp = 0;
  let mp = 0;
  let lp = 0;
  let semRuptura = 0;
  let qualidadeCompleta = 0;
  let qualidadeComAlertas = 0;
  let qualidadeIncompleta = 0;
  let qualidadeInvalida = 0;
  let alertas = 0;
  let erros = 0;
  let linhasInvalidas = 0;

  for (const item of itens) {
    if (item.curtoPrazo === 1) cp++;
    if (item.medioPrazo === 1) mp++;
    if (item.longoPrazo === 1) lp++;
    if (item.classificacaoPrazo === "sem_ruptura") semRuptura++;
    if (item.qualidadeDados === "completo") qualidadeCompleta++;
    if (item.qualidadeDados === "completo_com_alertas") qualidadeComAlertas++;
    if (item.qualidadeDados === "incompleto") qualidadeIncompleta++;
    if (item.qualidadeDados === "invalido") {
      qualidadeInvalida++;
      linhasInvalidas++;
    }
    alertas += item.alertas.length;
    erros += item.erros.length;
  }

  return { cp, mp, lp, semRuptura, qualidadeCompleta, qualidadeComAlertas, qualidadeIncompleta, qualidadeInvalida, alertas, erros, linhasInvalidas };
}
