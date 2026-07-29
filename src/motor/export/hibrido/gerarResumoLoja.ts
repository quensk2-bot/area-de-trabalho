import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { ResumoLojaJson } from "./hibridoTypes.ts";
import { filtrarUniversoOficialCompativel } from "./filtrarUniversoOficialCompativel.ts";

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

function emRupturaOperacional(cls: MotorProdutoLojaConsolidado["classificacaoPrazo"]): boolean {
  return cls === "curto_prazo" || cls === "medio_prazo" || cls === "longo_prazo" || cls === "bloqueado";
}

function emRupturaClassificada(cls: MotorProdutoLojaConsolidado["classificacaoPrazo"]): boolean {
  return cls === "curto_prazo" || cls === "medio_prazo" || cls === "longo_prazo";
}

function somaEstoqueProduto(item: MotorProdutoLojaConsolidado): number {
  if (item.somaEstoqueCd != null) return Number(item.somaEstoqueCd);
  return (item.cds ?? []).reduce((s, cd) => s + Number(cd.estoque ?? 0), 0);
}

function classificarCentralizacao(item: MotorProdutoLojaConsolidado): "centralizado" | "nao_centralizado" | "sem_info" {
  const pc = item.produtoCentralizado;
  if (pc != null && pc > 0) return "centralizado";
  if (pc == null && item.textoProdutoCentralizado?.toLowerCase().includes("não centralizado")) {
    return "nao_centralizado";
  }
  if (pc == null) return "nao_centralizado";
  return "sem_info";
}

export function gerarResumoLoja(
  itens: readonly MotorProdutoLojaConsolidado[],
  input: {
    regional: string;
    bandeira: string;
    loja: number;
    dataReferencia: string;
    modoUniverso?: ResumoLojaJson["modoUniverso"];
  },
): ResumoLojaJson {
  let curto = 0;
  let medio = 0;
  let longo = 0;
  let sem = 0;
  let bloq = 0;
  let totalRupturaGeral = 0;
  let totalRupturaClassificada = 0;
  let totalBaseLimpaElegivel = 0;
  let comEstoqueCd = 0;
  let semEstoqueCd = 0;
  let totalCentralizados = 0;
  let totalNaoCentralizados = 0;
  let totalCentralizacaoSemInfo = 0;

  const setorMap = new Map<string, number>();
  const fornMap = new Map<string, { comprador: string | null; total: number }>();
  const compMap = new Map<string, number>();
  const cdMap = new Map<string, { codigoFisico: number | null; posicaoLogica: number; totalEstoque: number }>();

  for (const item of itens) {
    const cls = item.classificacaoPrazo;
    const emRuptura = emRupturaOperacional(cls);
    const emClassificada = emRupturaClassificada(cls);

    if (emRuptura) totalRupturaGeral += 1;
    if (emClassificada) totalRupturaClassificada += 1;

    if (cls === "curto_prazo") curto += 1;
    else if (cls === "medio_prazo") medio += 1;
    else if (cls === "longo_prazo") longo += 1;
    else if (cls === "bloqueado") bloq += 1;
    else sem += 1;

    if (item.baseLimpa === "Base Limpa") totalBaseLimpaElegivel += 1;

    if (emRuptura) {
      if (somaEstoqueProduto(item) > 0) comEstoqueCd += 1;
      else semEstoqueCd += 1;

      const central = classificarCentralizacao(item);
      if (central === "centralizado") totalCentralizados += 1;
      else if (central === "nao_centralizado") totalNaoCentralizados += 1;
      else totalCentralizacaoSemInfo += 1;
    }

    const setor = item.setorN2 ?? item.divisao ?? "—";
    setorMap.set(setor, (setorMap.get(setor) ?? 0) + (emRuptura ? 1 : 0));

    const fornKey = item.fornecedor ?? String(item.codFornecedor ?? "—");
    const f = fornMap.get(fornKey) ?? { comprador: item.comprador, total: 0 };
    f.total += emRuptura ? 1 : 0;
    fornMap.set(fornKey, f);

    const comp = item.comprador ?? "(sem comprador)";
    compMap.set(comp, (compMap.get(comp) ?? 0) + (emRuptura ? 1 : 0));

    for (const cd of item.cds ?? []) {
      const key = `${cd.codigoFisico ?? "null"}:${cd.posicaoLogica}`;
      const prev = cdMap.get(key) ?? {
        codigoFisico: cd.codigoFisico,
        posicaoLogica: cd.posicaoLogica,
        totalEstoque: 0,
      };
      prev.totalEstoque += Number(cd.estoque ?? 0);
      cdMap.set(key, prev);
    }
  }

  const percentualRupturaGeral = pct(totalRupturaGeral, totalBaseLimpaElegivel);
  const percentualRupturaClassificada = pct(totalRupturaClassificada, totalBaseLimpaElegivel);

  return {
    loja: input.loja,
    regional: input.regional,
    bandeira: input.bandeira,
    dataReferencia: input.dataReferencia,
    modoUniverso: input.modoUniverso,
    totalProdutos: itens.length,
    ruptura: totalRupturaGeral,
    totalRupturaGeral,
    totalRupturaClassificada,
    curtoPrazo: curto,
    medioPrazo: medio,
    longoPrazo: longo,
    semRuptura: sem,
    bloqueados: bloq,
    totalBaseLimpaElegivel,
    percentualRuptura: percentualRupturaGeral,
    percentualRupturaGeral,
    percentualRupturaClassificada,
    comEstoqueCd,
    semEstoqueCd,
    totalCentralizados,
    totalNaoCentralizados,
    totalCentralizacaoSemInfo,
    atualizadoEm: new Date().toISOString(),
    setores: [...setorMap.entries()]
      .map(([setor, totalRuptura]) => ({ setor, totalRuptura }))
      .sort((a, b) => b.totalRuptura - a.totalRuptura),
    fornecedores: [...fornMap.entries()]
      .map(([fornecedor, v]) => ({ fornecedor, comprador: v.comprador, totalRuptura: v.total }))
      .sort((a, b) => b.totalRuptura - a.totalRuptura),
    compradores: [...compMap.entries()]
      .map(([comprador, totalRuptura]) => ({ comprador, totalRuptura }))
      .sort((a, b) => b.totalRuptura - a.totalRuptura),
    estoquePorCd: [...cdMap.values()].sort((a, b) => a.posicaoLogica - b.posicaoLogica),
  };
}

export function gerarResumoRegional(
  resumos: ResumoLojaJson[],
  input: { regional: string; bandeira: string; competencia: string; dataReferencia: string; versao: number },
): import("./hibridoTypes.ts").DashboardRegionalJson {
  const totalProdutos = resumos.reduce((s, r) => s + r.totalProdutos, 0);
  const totalRuptura = resumos.reduce((s, r) => s + r.totalRupturaGeral, 0);
  return {
    regional: input.regional,
    bandeira: input.bandeira,
    competencia: input.competencia,
    dataReferencia: input.dataReferencia,
    versao: input.versao,
    totalLojas: resumos.length,
    totalProdutos,
    totalRuptura,
    atualizadoEm: new Date().toISOString(),
  };
}

export function gerarResumoLojas(
  resumos: ResumoLojaJson[],
  input: { regional: string; bandeira: string; competencia: string },
): import("./hibridoTypes.ts").DashboardLojasJson {
  return {
    regional: input.regional,
    bandeira: input.bandeira,
    competencia: input.competencia,
    lojas: resumos.map((r) => ({
      loja: r.loja,
      totalProdutos: r.totalProdutos,
      ruptura: r.totalRupturaGeral,
      percentualRuptura: r.percentualRupturaGeral,
    })),
  };
}

// re-export aliases per spec file names
export { gerarResumoRegional as gerarResumoRegionalJson };
export { gerarResumoLojas as gerarResumoLojasJson };

/** Resumo KPIs no universo oficial PQ (Base Limpa apenas). */
export function gerarResumoLojaOficialCompativel(
  itens: readonly MotorProdutoLojaConsolidado[],
  input: { regional: string; bandeira: string; loja: number; dataReferencia: string },
): ResumoLojaJson {
  const filtrados = filtrarUniversoOficialCompativel(itens);
  return gerarResumoLoja(filtrados, { ...input, modoUniverso: "OFICIAL_COMPATIVEL" });
}
