import type { CatalogoOrdemCd, CatalogoSequenciaCd } from "../../catalog/catalogTypes.ts";
import type {
  MotorCdConfiguracaoVigente,
  MotorCdMapeamento,
  MotorCdPosicaoLogica,
} from "./cdNormalizationTypes.ts";
import { MOTOR_CD_POSICOES } from "./cdNormalizationTypes.ts";

function normalizarBandeira(bandeira: string): string {
  return bandeira.trim().toLowerCase();
}

export function resolverBandeiraLoja(
  loja: number,
  bandeiraCatalogo: import("../../catalog/catalogTypes.ts").CatalogoBandeiraLoja[],
): import("../../catalog/catalogTypes.ts").CatalogoBandeiraLoja | null {
  return bandeiraCatalogo.find((b) => b.loja === loja) ?? null;
}

export function buildCdMapping(input: {
  regional: string;
  bandeira: string;
  dataReferencia: string;
  ordemCds: CatalogoOrdemCd[];
  sequenciaCds?: CatalogoSequenciaCd[];
}): MotorCdConfiguracaoVigente {
  const alertas: string[] = ["vigencia_cd_ausente"];
  const bandeiraNorm = normalizarBandeira(input.bandeira);

  const ordem = input.ordemCds.find((o) => normalizarBandeira(o.bandeira) === bandeiraNorm);
  if (!ordem) {
    alertas.push("cadastro_cd_ausente");
    const vazio = Object.fromEntries(MOTOR_CD_POSICOES.map((p) => [p, null])) as Record<
      MotorCdPosicaoLogica,
      number | null
    >;
    return {
      regional: input.regional,
      bandeira: input.bandeira,
      dataReferencia: input.dataReferencia,
      origem: "ordem_cds_importada",
      vigenciaStatus: "nao_disponivel",
      alertas,
      mapeamentos: [],
      posicoes: [],
      porPosicaoNumerico: new Map(),
      porCodigoNumerico: new Map(),
      porPosicao: vazio,
      porCodigo: new Map(),
    };
  }

  const seqMap = new Map<string, string>();
  for (const s of input.sequenciaCds ?? []) {
    if (normalizarBandeira(s.bandeira) === bandeiraNorm && s.cd > 0) {
      seqMap.set(String(s.cd), s.ordem);
    }
  }

  const codigos = [ordem.cd1, ordem.cd2, ordem.cd3, ordem.cd4, ordem.cd5];
  const mapeamentos: MotorCdMapeamento[] = [];
  const posicoes: Array<{ posicaoLogica: number; codigoFisico: number | null }> = [];
  const porPosicaoNumerico = new Map<number, number | null>();
  const porCodigoNumerico = new Map<number, number>();
  const porPosicao = {} as Record<MotorCdPosicaoLogica, number | null>;
  const porCodigo = new Map<number, MotorCdPosicaoLogica>();

  codigos.forEach((codigo, idx) => {
    const posNum = idx + 1;
    const pos = MOTOR_CD_POSICOES[idx];
    if (!Number.isFinite(codigo) || codigo <= 0) {
      porPosicao[pos] = null;
      porPosicaoNumerico.set(posNum, null);
      posicoes.push({ posicaoLogica: posNum, codigoFisico: null });
      alertas.push(`posicao_sem_codigo:CD${posNum}`);
      return;
    }
    porPosicao[pos] = codigo;
    porPosicaoNumerico.set(posNum, codigo);
    porCodigoNumerico.set(codigo, posNum);
    porCodigo.set(codigo, pos);
    posicoes.push({ posicaoLogica: posNum, codigoFisico: codigo });
    mapeamentos.push({
      posicaoLogica: pos,
      posicaoNumerica: posNum,
      codigoFisico: codigo,
      ordemPivot: seqMap.get(String(codigo)) ?? null,
    });
  });

  return {
    regional: input.regional,
    bandeira: input.bandeira,
    dataReferencia: input.dataReferencia,
    origem: "ordem_cds_importada",
    vigenciaStatus: "nao_disponivel",
    alertas: [...new Set(alertas)],
    mapeamentos,
    posicoes: posicoes.sort((a, b) => a.posicaoLogica - b.posicaoLogica),
    porPosicaoNumerico,
    porCodigoNumerico,
    porPosicao,
    porCodigo,
  };
}

export function posicaoLogicaFromIndice(posicao: 1 | 2 | 3 | 4 | 5 | null): MotorCdPosicaoLogica | null {
  if (posicao == null) return null;
  return MOTOR_CD_POSICOES[posicao - 1] ?? null;
}

export function codigoParaPosicao(
  config: MotorCdConfiguracaoVigente,
  codigo: number,
): MotorCdPosicaoLogica | null {
  return config.porCodigo.get(codigo) ?? null;
}

export function codigoParaPosicaoNumerica(config: MotorCdConfiguracaoVigente, codigo: number): number | null {
  return config.porCodigoNumerico.get(codigo) ?? null;
}

export function posicaoParaCodigo(
  config: MotorCdConfiguracaoVigente,
  posicao: MotorCdPosicaoLogica,
): number | null {
  return config.porPosicao[posicao];
}

export function posicaoNumericaParaCodigo(config: MotorCdConfiguracaoVigente, posicao: number): number | null {
  return config.porPosicaoNumerico.get(posicao) ?? null;
}
