/** Uma posição lógica de CD para um produto — coleção ordenada por posicaoLogica. */
export type MotorProdutoCdNormalizado = {
  posicaoLogica: number;
  codigoFisico: number | null;
  estoque: number | null;
  pendencia: number | null;
  statusCompra: string | null;
  diasCompra: number | null;
  diasRecebimento: number | null;
  ultimaCompra: Date | null;
  ultimaEntrada: Date | null;
  estoqueSelecionadoInventario: number | null;
  origemArquivo: string;
  numeroBloco: number;
  posicaoNoArquivo: number;
  alertas: string[];
};

export function calcularPosicaoLogica(posicaoInicial: number, posicaoNoArquivo: number): number {
  return posicaoInicial + posicaoNoArquivo - 1;
}
