import type { MotorProdutoLojaConsolidado } from "../../consolidar/consolidacaoTypes.ts";
import type { MotorCdConfiguracaoVigente } from "../cdNormalization/cdNormalizationTypes.ts";
import { buildV7CdContexto } from "../cdNormalization/buildV7CdContexto.ts";
import { compararCdsProduto } from "./compararCdsPorPosicao.ts";
import {
  compararCampoTextoCdSemantico,
  compararProdutoCentralizadoSemantico,
  compararStatusAtivacaoSemantico,
  compararStatusEstoqueSemantico,
} from "./equivalenciaSemanticaCds.ts";
import type { MotorPerfilComparacaoCd } from "./motorPerfilComparacaoCd.ts";
import { resolverQuantidadePosicoesComparacao } from "./motorPerfilComparacaoCd.ts";
import type { MotorComparacaoCdsProdutoResultado } from "./motorCdComparacaoTypes.ts";
import { detectarColunasCdsExcel, maxPosicaoDetectadaExcel, normalizarLinhaExcelCds } from "./normalizarExcelCds.ts";
import { enriquecerCodigosFisicosV7, mapCdsParaColunasFlatEstoque, normalizarV7Cds } from "./normalizarV7Cds.ts";

export type MapConsolidadoCdsCompareResultado = {
  colunasFlatEstoque: Record<string, number | null>;
  comparacaoPosicoes: MotorComparacaoCdsProdutoResultado | null;
  semanticos: ReturnType<typeof compararStatusEstoqueSemantico>[];
};

export function mapConsolidadoCdsParaCompare(
  item: MotorProdutoLojaConsolidado,
  perfil: MotorPerfilComparacaoCd,
  excelLinha: Record<string, unknown> | null,
  excelHeaders: readonly string[],
  cdConfig: MotorCdConfiguracaoVigente,
): MapConsolidadoCdsCompareResultado {
  const v7 = normalizarV7Cds(item, perfil);
  const v7Enriquecido = {
    ...v7,
    cds: enriquecerCodigosFisicosV7(v7.cds, cdConfig.porPosicaoNumerico),
  };

  const colunasFlatEstoque = mapCdsParaColunasFlatEstoque(v7Enriquecido.cds);

  let comparacaoPosicoes: MotorComparacaoCdsProdutoResultado | null = null;
  const semanticos: MapConsolidadoCdsCompareResultado["semanticos"] = [];

  if (excelLinha) {
    const colunas = detectarColunasCdsExcel(excelHeaders);
    const maxPos = Math.max(maxPosicaoDetectadaExcel(excelHeaders), ...v7Enriquecido.cds.map((c) => c.posicaoLogica));
    const limite = resolverQuantidadePosicoesComparacao(perfil, maxPos);

    const excelCds = normalizarLinhaExcelCds(excelLinha, colunas, cdConfig).filter(
      (c) => c.posicaoLogica <= limite,
    );
    const v7Filtrado = v7Enriquecido.cds.filter((c) => c.posicaoLogica <= limite);

    comparacaoPosicoes = compararCdsProduto(item.loja, item.seqproduto, excelCds, v7Filtrado, {
      compararCodigoFisico: perfil.compararCodigoFisico,
      campos: perfil.compararCamposPorCd,
    });

    const v7Ctx = buildV7CdContexto(item);
    const camposTexto = [
      "Status Estoque CDs",
      "Status Solicitação Ativação CD",
      "Produto Centralizado",
    ] as const;

    for (const campo of camposTexto) {
      const excelVal = excelLinha[campo];
      const excelStr = excelVal != null ? String(excelVal) : null;
      if (campo === "Produto Centralizado") {
        semanticos.push(
          compararProdutoCentralizadoSemantico(
            cdConfig,
            excelStr,
            item.textoProdutoCentralizado,
            item.posicaoCdSelecionada,
            item.codigoCdSelecionado,
          ),
        );
      } else if (campo === "Status Estoque CDs") {
        semanticos.push(compararStatusEstoqueSemantico(cdConfig, excelStr, v7Ctx));
      } else {
        semanticos.push(compararStatusAtivacaoSemantico(cdConfig, excelStr, v7Ctx));
      }
    }
  }

  return { colunasFlatEstoque, comparacaoPosicoes, semanticos };
}
