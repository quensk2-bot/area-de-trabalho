import type { ChunkProgresso, ChunkProgressoCallback, ChunkProgressoEtapa } from "./chunkTypes.ts";

export function criarProgressoInicial(produtosTotal: number, cdsTotal: number): ChunkProgresso {
  return {
    etapa: "preparando_lote",
    mensagem: "Preparando lote",
    produtosProcessados: 0,
    cdsProcessados: 0,
    produtosTotal,
    cdsTotal,
    percentual: 0,
    duracaoMs: 0,
    erros: [],
  };
}

export function atualizarProgresso(
  base: ChunkProgresso,
  patch: Partial<ChunkProgresso> & { etapa?: ChunkProgressoEtapa },
): ChunkProgresso {
  const next = { ...base, ...patch };
  const denom = next.produtosTotal > 0 ? next.produtosTotal : 1;
  next.percentual = Math.min(100, Math.round((next.produtosProcessados / denom) * 100));
  if (next.produtosProcessados > 0 && next.duracaoMs > 0) {
    const msPorProduto = next.duracaoMs / next.produtosProcessados;
    next.estimativaRestanteMs = Math.round(
      msPorProduto * Math.max(0, next.produtosTotal - next.produtosProcessados),
    );
  }
  return next;
}

export function emitirProgresso(callback: ChunkProgressoCallback | undefined, progresso: ChunkProgresso): void {
  callback?.(progresso);
}
