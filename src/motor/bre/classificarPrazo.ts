import type {
  MotorBreItemInput,
  MotorClassificacaoFinalResultado,
  MotorClassificacaoPrazo,
} from "./breTypes.ts";
import { aplicarRuleCrossDocking } from "./rules/ruleCrossDocking.ts";
import { resolverCrossProduto } from "./rules/resolverCrossProduto.ts";
import { unificarCdsBre } from "../cds/unificarCdsBre.ts";
import { aplicarRuleCurtoPrazo } from "./rules/ruleCurtoPrazo.ts";
import { aplicarRuleLongoPrazo } from "./rules/ruleLongoPrazo.ts";
import { aplicarRuleMedioPrazo } from "./rules/ruleMedioPrazo.ts";
import { calcularPendenciaCpaCdFromCds } from "./rules/rulePendenciaCpaCd.ts";

export type ClassificarPrazoInput = {
  item: MotorBreItemInput;
  statusBaseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  menorQueTres: 0 | 1;
  somaEstoqueCd: number;
  modCurtoPrazo: "LJ_Exclusiva" | null;
  ncurtoPrazo: "G" | "NG" | null;
};

export function classificarPrazo(input: ClassificarPrazoInput): MotorClassificacaoFinalResultado {
  const cross = resolverCrossProduto(input.item);
  const { crossSum, origemCross, valoresCrossPorCd } = cross;

  const pendencia = calcularPendenciaCpaCdFromCds(
    input.item.produto.pendenciaLoja,
    unificarCdsBre(input.item),
  );

  const curtoPrazo = aplicarRuleCurtoPrazo({
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    somaEstoqueCd: input.somaEstoqueCd,
    crossSum,
    modCurtoPrazo: input.modCurtoPrazo,
    ncurtoPrazo: input.ncurtoPrazo,
  });

  const medioPrazo = aplicarRuleMedioPrazo({
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    curtoPrazo: curtoPrazo.curtoPrazo,
    pendenciaCpaCd: pendencia.soma,
    alertasPendencia: pendencia.alertas,
  });

  const longoPrazo = aplicarRuleLongoPrazo({
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    curtoPrazo: curtoPrazo.curtoPrazo,
    medioPrazo: medioPrazo.medioPrazo,
  });

  let classificacao: MotorClassificacaoPrazo = null;
  if (input.statusBaseLimpa === "Base Limpa" && input.menorQueTres === 1) {
    if (curtoPrazo.curtoPrazo === 1) classificacao = "CP";
    else if (medioPrazo.medioPrazo === 1) classificacao = "MP";
    else if (longoPrazo.longoPrazo === 1) classificacao = "LP";
  }

  const exclusiva =
    [curtoPrazo.curtoPrazo, medioPrazo.medioPrazo, longoPrazo.longoPrazo].filter((f) => f === 1).length <= 1;

  const crossDockingRegra = aplicarRuleCrossDocking(
    crossSum,
    input.somaEstoqueCd,
    curtoPrazo.curtoPrazo,
    input.modCurtoPrazo,
  );

  return {
    classificacaoPrazo: classificacao,
    curtoPrazo: curtoPrazo.curtoPrazo,
    medioPrazo: medioPrazo.medioPrazo,
    longoPrazo: longoPrazo.longoPrazo,
    pendenciaCpaCd: pendencia.soma,
    crossSum,
    crossDocking: crossDockingRegra.resultado as 0 | 1,
    origemCross,
    valoresCrossPorCd,
    pendencia,
    curtoPrazoRegra: curtoPrazo,
    medioPrazoRegra: medioPrazo,
    longoPrazoRegra: longoPrazo,
    exclusividadeGarantida: exclusiva,
    alertas: [...pendencia.alertas, ...curtoPrazo.alertas, ...medioPrazo.alertas, ...longoPrazo.alertas],
    regras: [pendencia, curtoPrazo, medioPrazo, longoPrazo, crossDockingRegra],
  };
}
