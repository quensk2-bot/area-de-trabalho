import type { CatalogoBandeiraLoja, CatalogoOrdemCd, CatalogoSequenciaCd } from "../../catalog/catalogTypes.ts";
import type {
  MotorCdConfiguracaoVigente,
  MotorCdMapeamento,
  MotorCdPosicaoLogica,
} from "./cdNormalizationTypes.ts";
import { MOTOR_CD_POSICOES } from "./cdNormalizationTypes.ts";

function posicaoFromIndice(idx: number): MotorCdPosicaoLogica {
  return MOTOR_CD_POSICOES[idx];
}

function normalizarBandeira(bandeira: string): string {
  return bandeira.trim().toLowerCase();
}

export function resolverBandeiraLoja(
  loja: number,
  bandeiraCatalogo: CatalogoBandeiraLoja[],
): CatalogoBandeiraLoja | null {
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
  const porPosicao = {} as Record<MotorCdPosicaoLogica, number | null>;
  const porCodigo = new Map<number, MotorCdPosicaoLogica>();

  codigos.forEach((codigo, idx) => {
    const pos = posicaoFromIndice(idx);
    if (!Number.isFinite(codigo) || codigo <= 0) {
      porPosicao[pos] = null;
      alertas.push(`posicao_sem_codigo:${pos}`);
      return;
    }
    porPosicao[pos] = codigo;
    porCodigo.set(codigo, pos);
    mapeamentos.push({
      posicaoLogica: pos,
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

export function posicaoParaCodigo(
  config: MotorCdConfiguracaoVigente,
  posicao: MotorCdPosicaoLogica,
): number | null {
  return config.porPosicao[posicao];
}
