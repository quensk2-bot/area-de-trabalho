import type { ResumoLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { RupturaDashboardLoja } from "../../types/rupturaDashboardTypes.ts";

export function mapResumoToDashboard(resumo: ResumoLojaJson): RupturaDashboardLoja {
  const totalRupturaGeral = resumo.totalRupturaGeral ?? resumo.ruptura;
  const totalRupturaClassificada =
    resumo.totalRupturaClassificada ??
    resumo.curtoPrazo + resumo.medioPrazo + resumo.longoPrazo;
  const totalBaseLimpa = resumo.totalBaseLimpaElegivel ?? resumo.totalProdutos;
  const percentualGeral = resumo.percentualRupturaGeral ?? resumo.percentualRuptura;
  const percentualClassificada =
    resumo.percentualRupturaClassificada ??
    (totalBaseLimpa ? Math.round((totalRupturaClassificada / totalBaseLimpa) * 10000) / 100 : null);

  return {
    regional: resumo.regional,
    data_referencia: resumo.dataReferencia,
    loja: resumo.loja,
    total_produtos: resumo.totalProdutos,
    total_em_ruptura: totalRupturaGeral,
    total_ruptura_geral: totalRupturaGeral,
    total_ruptura_classificada: totalRupturaClassificada,
    total_curto_prazo: resumo.curtoPrazo,
    total_medio_prazo: resumo.medioPrazo,
    total_longo_prazo: resumo.longoPrazo,
    total_sem_ruptura: resumo.semRuptura,
    total_bloqueado: resumo.bloqueados,
    total_qualidade_alerta: 0,
    total_com_estoque_cd: resumo.comEstoqueCd ?? 0,
    total_sem_estoque_cd: resumo.semEstoqueCd ?? 0,
    total_com_pendencia: 0,
    total_cross_docking: 0,
    total_centralizado: resumo.totalCentralizados ?? 0,
    total_nao_centralizado: resumo.totalNaoCentralizados ?? 0,
    compradores_distintos: resumo.compradores?.length ?? 0,
    fornecedores_distintos: resumo.fornecedores?.length ?? 0,
    total_base_limpa_elegivel: totalBaseLimpa,
    percentual_ruptura: percentualGeral,
    percentual_ruptura_geral: percentualGeral,
    percentual_ruptura_classificada: percentualClassificada,
  };
}
