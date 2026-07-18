import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { chaveDmProdutoLoja, DM_CAMPOS_PRODUTO_LOJA } from "./dmMapping.ts";
import type { DmProdutoLoja } from "./dmTypes.ts";

export function mapearConsolidadoParaDmProdutoLoja(consolidado: MotorProdutoLojaConsolidado): DmProdutoLoja {
  const chave = chaveDmProdutoLoja(consolidado);
  const dm = { ...chave } as Record<string, unknown>;

  for (const campo of DM_CAMPOS_PRODUTO_LOJA) {
    dm[campo] = consolidado[campo];
  }

  dm.quantidadeCds = consolidado.cds.length;

  return dm as DmProdutoLoja;
}

export function mapearLoteParaDmProdutoLoja(consolidado: readonly MotorProdutoLojaConsolidado[]): DmProdutoLoja[] {
  return consolidado.map(mapearConsolidadoParaDmProdutoLoja);
}
