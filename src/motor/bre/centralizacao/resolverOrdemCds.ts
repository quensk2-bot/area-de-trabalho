import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";
import type { MotorAlerta } from "../breTypes.ts";
import type { MotorOrdemCdsResolvida } from "./centralizacaoTypes.ts";

function alerta(codigo: string, mensagem: string, severidade: MotorAlerta["severidade"] = "aviso"): MotorAlerta {
  return { codigo, mensagem, severidade };
}

export function resolverOrdemCds(
  catalogos: MotorCatalogos,
  regional: string,
  loja: number,
): MotorOrdemCdsResolvida {
  const alertas: MotorAlerta[] = [];
  const bandeiraLoja = catalogos.bandeira.find((b) => b.loja === loja);

  if (!bandeiraLoja) {
    return {
      regional,
      loja,
      bandeira: null,
      tipoLoja: null,
      modalidade: null,
      divisaoCatalogo: null,
      primeiroCd: null,
      segundoCd: null,
      terceiroCd: null,
      quartoCd: null,
      quintoCd: null,
      statusRegra: "nao_aplicavel",
      alertas: [alerta("LOJA_SEM_BANDEIRA", `Loja ${loja} sem bandeira no catálogo padronizado`)],
    };
  }

  const bandeiraNorm = bandeiraLoja.bandeira.trim().toUpperCase();
  const ordens = catalogos.ordemCd.filter((o) => o.bandeira.trim().toUpperCase() === bandeiraNorm);

  if (ordens.length === 0) {
    return {
      regional,
      loja,
      bandeira: bandeiraLoja.bandeira,
      tipoLoja: bandeiraLoja.tipoLoja,
      modalidade: null,
      divisaoCatalogo: null,
      primeiroCd: null,
      segundoCd: null,
      terceiroCd: null,
      quartoCd: null,
      quintoCd: null,
      statusRegra: "nao_aplicavel",
      alertas: [alerta("BANDEIRA_SEM_ORDEM", `Bandeira ${bandeiraLoja.bandeira} sem ordem de CDs`)],
    };
  }

  const ordem = ordens[0];
  if (ordens.length > 1) {
    alertas.push(
      alerta(
        "ORDEM_DUPLICADA_BANDEIRA",
        `Bandeira ${bandeiraLoja.bandeira} possui ${ordens.length} ordens — usando primeira ocorrência (${ordem.divisao})`,
      ),
    );
  }

  const cds = [ordem.cd1, ordem.cd2, ordem.cd3, ordem.cd4, ordem.cd5];
  const cdsValidos = cds.filter((c) => c > 0);
  const duplicados = cdsValidos.length !== new Set(cdsValidos).size;
  if (duplicados) {
    alertas.push(alerta("ORDEM_CD_DUPLICADO", "Ordem contém códigos físicos duplicados"));
  }

  const incompleta = cdsValidos.length < cds.filter((c) => c != null).length && cds.some((c) => c === 0);
  if (incompleta) {
    alertas.push(alerta("ORDEM_INCOMPLETA", "Ordem de CDs com posições zeradas ou ausentes"));
  }

  let modalidade: string | null = null;
  if (bandeiraLoja.tipoLoja) {
    const mod = catalogos.modalidade.find(
      (m) => m.tipoLoja.trim().toUpperCase() === bandeiraLoja.tipoLoja!.trim().toUpperCase(),
    );
    modalidade = mod?.modalidade ?? null;
  }

  return {
    regional,
    loja,
    bandeira: bandeiraLoja.bandeira,
    tipoLoja: bandeiraLoja.tipoLoja,
    modalidade,
    divisaoCatalogo: ordem.divisao,
    primeiroCd: ordem.cd1 > 0 ? ordem.cd1 : null,
    segundoCd: ordem.cd2 > 0 ? ordem.cd2 : null,
    terceiroCd: ordem.cd3 > 0 ? ordem.cd3 : null,
    quartoCd: ordem.cd4 > 0 ? ordem.cd4 : null,
    quintoCd: ordem.cd5 > 0 ? ordem.cd5 : null,
    statusRegra: alertas.some((a) => a.codigo === "ORDEM_CD_DUPLICADO") ? "ambigua" : "aplicada",
    alertas,
  };
}

export function catalogoOrdemDisponivel(catalogos: MotorCatalogos): boolean {
  return catalogos.bandeira.length > 0 && catalogos.ordemCd.length > 0 && catalogos.sequenciaCd.length > 0;
}
