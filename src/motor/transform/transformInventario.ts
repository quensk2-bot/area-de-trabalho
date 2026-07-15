import type { MotorErroValidacao } from "../types/motorTypes.ts";
import type { MotorInventarioAgrupado, MotorLinhaInventario } from "../types/motorLinhaTypes.ts";
import { parseNumeroFlexivel } from "./parseNumbers.ts";
import { normalizeCodigoNumerico } from "./parseText.ts";

export const INVENTARIO_FILTRO_MINIMO = 2;

export function agruparInventario(
  linhas: MotorLinhaInventario[],
): { itens: MotorInventarioAgrupado[]; erros: MotorErroValidacao[]; alertas: string[] } {
  const erros: MotorErroValidacao[] = [];
  const alertas: string[] = [];
  const mapa = new Map<string, number>();

  for (const linha of linhas) {
    const loja = normalizeCodigoNumerico(linha.loja);
    const produto = normalizeCodigoNumerico(linha.produto);
    const qtd = parseNumeroFlexivel(linha.qtdSaidaOutras);

    if (loja == null || produto == null) {
      alertas.push(`Linha ${linha.numeroLinha}: loja ou produto ausente — ignorada no agrupamento`);
      continue;
    }
    if (qtd == null) {
      erros.push({
        numeroLinha: linha.numeroLinha,
        campo: "Qtd Saída Outras",
        valorOriginal: linha.qtdSaidaOutras,
        codigoErro: "INVENTARIO_QTD_INVALIDA",
        mensagem: "Quantidade de inventário inválida",
        severidade: "erro",
      });
      continue;
    }

    const chave = `${loja}|${produto}`;
    mapa.set(chave, (mapa.get(chave) ?? 0) + qtd);
  }

  const itens: MotorInventarioAgrupado[] = [];
  for (const [chave, inventarioUnid] of mapa) {
    const [lojaStr, produtoStr] = chave.split("|");
    const loja = Number(lojaStr);
    const produto = Number(produtoStr);

    if (inventarioUnid > INVENTARIO_FILTRO_MINIMO) {
      itens.push({ loja, produto, inventarioUnid });
    }
  }

  alertas.push(
    `Filtro inventário > ${INVENTARIO_FILTRO_MINIMO} aplicado: ${itens.length} grupo(s) mantido(s) de ${mapa.size} agrupado(s)`,
  );

  return { itens, erros, alertas };
}

export function transformInventario(
  linhas: MotorLinhaInventario[],
): { itens: MotorInventarioAgrupado[]; erros: MotorErroValidacao[]; alertas: string[] } {
  return agruparInventario(linhas);
}
