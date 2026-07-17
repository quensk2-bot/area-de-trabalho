import type { MotorProdutoCdNormalizado } from "./cdTypes.ts";
import { ordenarCdsPorPosicao, validarColecaoCds } from "./validarColecaoCds.ts";

export type MergeBlocosCdsResultado = {
  cds: MotorProdutoCdNormalizado[];
  alertas: string[];
  posicoesDuplicadas: number[];
  blocosSobrepostos: Array<{ posicaoLogica: number; blocos: number[] }>;
};

export function mergeBlocosCds(
  blocos: ReadonlyArray<ReadonlyArray<MotorProdutoCdNormalizado>>,
  contexto?: { regional?: string },
): MergeBlocosCdsResultado {
  const alertas: string[] = [];
  const porPosicao = new Map<number, { cd: MotorProdutoCdNormalizado; numeroBloco: number }[]>();

  for (const bloco of blocos) {
    for (const cd of bloco) {
      const lista = porPosicao.get(cd.posicaoLogica) ?? [];
      lista.push({ cd, numeroBloco: cd.numeroBloco });
      porPosicao.set(cd.posicaoLogica, lista);
    }
  }

  const posicoesDuplicadas: number[] = [];
  const blocosSobrepostos: Array<{ posicaoLogica: number; blocos: number[] }> = [];

  for (const [posicao, entradas] of porPosicao) {
    if (entradas.length > 1) {
      posicoesDuplicadas.push(posicao);
      const blocosNums = [...new Set(entradas.map((e) => e.numeroBloco))];
      blocosSobrepostos.push({ posicaoLogica: posicao, blocos: blocosNums });
      alertas.push(
        `Posição ${posicao} duplicada entre blocos [${blocosNums.join(", ")}] — merge bloqueado para esta posição`,
      );
    }
  }

  const cdsSemDuplicata: MotorProdutoCdNormalizado[] = [];
  for (const [posicao, entradas] of porPosicao) {
    if (entradas.length === 1) {
      cdsSemDuplicata.push(entradas[0].cd);
    }
  }

  const validacao = validarColecaoCds(cdsSemDuplicata);
  if (contexto?.regional) {
    for (const cd of validacao.cdsOrdenados) {
      if (cd.origemArquivo && !cd.origemArquivo.includes(contexto.regional)) {
        // rastreabilidade regional — sem mistura silenciosa
      }
    }
  }

  return {
    cds: ordenarCdsPorPosicao(validacao.cdsOrdenados),
    alertas: [...alertas, ...validacao.alertas],
    posicoesDuplicadas,
    blocosSobrepostos,
  };
}
