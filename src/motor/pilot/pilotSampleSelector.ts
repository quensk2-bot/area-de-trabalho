import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import type { PilotEstratoInfo } from "./pilotTypes.ts";

export type EstratoDef = {
  id: string;
  descricao: string;
  match: (item: MotorProdutoLojaConsolidado) => boolean;
};

export const ESTRATOS_PILOTO: EstratoDef[] = [
  { id: "cp", descricao: "Curto Prazo", match: (i) => i.curtoPrazo === 1 },
  { id: "mp", descricao: "Médio Prazo", match: (i) => i.medioPrazo === 1 },
  { id: "lp", descricao: "Longo Prazo", match: (i) => i.longoPrazo === 1 },
  { id: "sem_ruptura", descricao: "Sem ruptura", match: (i) => i.classificacaoPrazo === "sem_ruptura" },
  { id: "inventario", descricao: "Com inventário", match: (i) => (i.inventarioUnid ?? 0) > 0 },
  { id: "ruptura_sem_inventario", descricao: "Ruptura sem inventário", match: (i) => (i.rupturaSemInventario ?? 0) === 1 },
  { id: "cd5", descricao: "CD5 com estoque", match: (i) => (i.estoqueCd5 ?? 0) > 0 },
  { id: "produto_exclusivo", descricao: "Produto exclusivo", match: (i) => i.alertas.some((a) => a.codigo.includes("exclusiv")) },
  { id: "excecao_g", descricao: "Exceção G", match: (i) => i.alertas.some((a) => /excecao.*\bg\b/i.test(a.mensagem)) },
  { id: "excecao_ng", descricao: "Exceção NG", match: (i) => i.alertas.some((a) => /excecao.*ng/i.test(a.mensagem)) },
  { id: "pendencia_loja", descricao: "Pendência loja", match: (i) => (i.pendenciaLoja ?? 0) > 0 },
  { id: "pendencia_cd", descricao: "Pendência CD", match: (i) => (i.pendenciaCpaCd ?? 0) > 0 },
  { id: "pendcd_maior_1", descricao: "PENDCD > 1", match: (i) => [i.pendenciaCd1, i.pendenciaCd2, i.pendenciaCd3, i.pendenciaCd4, i.pendenciaCd5].some((v) => (v ?? 0) > 1) },
  { id: "cross_docking", descricao: "Cross Docking", match: (i) => (i.crossDocking ?? 0) === 1 },
  { id: "centralizado", descricao: "Produto centralizado", match: (i) => (i.produtoCentralizado ?? 0) > 0 },
  { id: "nao_centralizado", descricao: "Não centralizado", match: (i) => !i.produtoCentralizado },
  { id: "comprador_ok", descricao: "Comprador identificado", match: (i) => !!i.comprador },
  { id: "comprador_corrigido", descricao: "Comprador corrigido", match: (i) => i.alertas.some((a) => a.codigo.includes("comprador")) },
  { id: "comprador_ausente", descricao: "Comprador ausente", match: (i) => !i.comprador },
  { id: "rede_ausente", descricao: "Rede ausente", match: (i) => !i.rede },
  { id: "ordem_cd_ausente", descricao: "Ordem CD ausente", match: (i) => !i.primeiroCd },
];

export type PilotSampleResult = {
  amostra: MotorProdutoLojaConsolidado[];
  estratos: PilotEstratoInfo[];
};

export function selecionarAmostraEstratificada(
  itens: MotorProdutoLojaConsolidado[],
  sampleSize: number,
): PilotSampleResult {
  const selecionados = new Map<string, MotorProdutoLojaConsolidado>();
  const estratos: PilotEstratoInfo[] = [];

  for (const estrato of ESTRATOS_PILOTO) {
    const candidatos = itens.filter(estrato.match);
    estratos.push({
      id: estrato.id,
      descricao: estrato.descricao,
      encontrado: candidatos.length > 0,
      quantidade: candidatos.length,
    });
    if (candidatos.length > 0 && selecionados.size < sampleSize) {
      const pick = candidatos[0];
      selecionados.set(`${pick.loja}|${pick.seqproduto}`, pick);
    }
  }

  if (selecionados.size < sampleSize) {
    for (const item of itens) {
      const chave = `${item.loja}|${item.seqproduto}`;
      if (!selecionados.has(chave)) {
        selecionados.set(chave, item);
        if (selecionados.size >= sampleSize) break;
      }
    }
  }

  return {
    amostra: [...selecionados.values()].slice(0, sampleSize),
    estratos,
  };
}
