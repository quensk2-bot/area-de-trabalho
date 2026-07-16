import type {
  MotorBreItemInput,
  MotorClassificacaoFinalResultado,
  MotorClassificacaoPrazo,
} from "./breTypes.ts";
import { calcularCrossSumFromValues } from "./rules/ruleCrossDocking.ts";
import { aplicarRuleCurtoPrazo } from "./rules/ruleCurtoPrazo.ts";
import { aplicarRuleLongoPrazo } from "./rules/ruleLongoPrazo.ts";
import { aplicarRuleMedioPrazo } from "./rules/ruleMedioPrazo.ts";
import { calcularPendenciaCpaCd } from "./rules/rulePendenciaCpaCd.ts";
import { listSumIgnoreNull } from "./utils/listSum.ts";

export type ClassificarPrazoInput = {
  item: MotorBreItemInput;
  statusBaseLimpa: "Base Limpa" | "Não considera Ruptura" | null;
  menorQueTres: 0 | 1;
  somaEstoqueCd: number;
  modCurtoPrazo: "LJ_Exclusiva" | null;
  ncurtoPrazo: "G" | "NG" | null;
};

function resolverCrossSum(item: MotorBreItemInput): number {
  const inv = item.estSelecInv;
  return calcularCrossSumFromValues(
    inv?.estSelecInvCd1 ?? null,
    inv?.estSelecInvCd2 ?? null,
    inv?.estSelecInvCd3 ?? null,
    inv?.estSelecInvCd4 ?? null,
  );
}

export function classificarPrazo(input: ClassificarPrazoInput): MotorClassificacaoFinalResultado {
  const crossSum = resolverCrossSum(input.item);
  const crossSumComNullZero = listSumIgnoreNull([
    input.item.estSelecInv?.estSelecInvCd1,
    input.item.estSelecInv?.estSelecInvCd2,
    input.item.estSelecInv?.estSelecInvCd3,
    input.item.estSelecInv?.estSelecInvCd4,
  ]);

  const pendencia = calcularPendenciaCpaCd({
    pendenciaLoja: input.item.produto.pendenciaLoja,
    pendenciaCd1: input.item.produto.pendenciaCd1,
    pendenciaCd2: input.item.produto.pendenciaCd2,
    pendenciaCd3: input.item.produto.pendenciaCd3,
    pendenciaCd4: input.item.produto.pendenciaCd4,
    pendenciaCd5: input.item.cd5?.pendenciaCd5 ?? null,
  });

  const curtoPrazo = aplicarRuleCurtoPrazo({
    statusBaseLimpa: input.statusBaseLimpa,
    menorQueTres: input.menorQueTres,
    somaEstoqueCd: input.somaEstoqueCd,
    crossSum: crossSumComNullZero,
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

  return {
    classificacaoPrazo: classificacao,
    curtoPrazo: curtoPrazo.curtoPrazo,
    medioPrazo: medioPrazo.medioPrazo,
    longoPrazo: longoPrazo.longoPrazo,
    pendenciaCpaCd: pendencia.soma,
    crossSum,
    crossDocking:
      crossSumComNullZero >= 1 &&
      curtoPrazo.curtoPrazo === 1 &&
      input.somaEstoqueCd <= 0 &&
      input.modCurtoPrazo !== "LJ_Exclusiva"
        ? 1
        : 0,
    pendencia,
    curtoPrazoRegra: curtoPrazo,
    medioPrazoRegra: medioPrazo,
    longoPrazoRegra: longoPrazo,
    exclusividadeGarantida: exclusiva,
    alertas: [...pendencia.alertas, ...curtoPrazo.alertas, ...medioPrazo.alertas, ...longoPrazo.alertas],
    regras: [pendencia, curtoPrazo, medioPrazo, longoPrazo],
  };
}
