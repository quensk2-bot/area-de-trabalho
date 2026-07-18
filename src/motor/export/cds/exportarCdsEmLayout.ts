import { gerarNomeColunaCd } from "./gerarCabecalhosCds.ts";
import type {
  ExportarCdsEmLayoutEntrada,
  ExportarCdsEmLayoutResultado,
  MotorCdCampoExportacao,
} from "./exportTypes.ts";
import { PERFIL_EXPORT_LAYOUT_DINAMICO } from "./perfisExportacaoCd.ts";

function valorCampo(
  cd: ExportarCdsEmLayoutEntrada["cds"][number],
  campo: MotorCdCampoExportacao,
): string | number | null {
  switch (campo) {
    case "estoque":
      return cd.estoque;
    case "pendencia":
      return cd.pendencia;
    case "statusCompra":
      return cd.statusCompra;
    case "diasCompra":
      return cd.diasCompra;
    case "diasRecebimento":
      return cd.diasRecebimento;
  }
}

export function exportarCdsEmLayout(entrada: ExportarCdsEmLayoutEntrada): ExportarCdsEmLayoutResultado {
  const perfil = entrada.perfil ?? PERFIL_EXPORT_LAYOUT_DINAMICO;
  const campos = entrada.campos ?? perfil.camposPorCd;
  const formato = entrada.formatoCabecalho ?? perfil.formatoCabecalho;
  const usarCodigoFisico = entrada.usarCodigoFisicoNoCabecalho ?? perfil.usarCodigoFisico;
  const catalogo = entrada.catalogoPorPosicao;

  const maxDetectado = entrada.cds.reduce((m, c) => Math.max(m, c.posicaoLogica), 0);
  const quantidadePosicoes =
    entrada.quantidadePosicoes === "auto" || entrada.quantidadePosicoes == null
      ? perfil.quantidadePosicoes === "auto"
        ? maxDetectado
        : perfil.quantidadePosicoes
      : entrada.quantidadePosicoes;

  const porPosicao = new Map<number, ExportarCdsEmLayoutEntrada["cds"][number]>();
  for (const cd of entrada.cds) {
    porPosicao.set(cd.posicaoLogica, cd);
  }

  const colunas: Record<string, string | number | null> = {};
  const alertas: string[] = [];

  for (let pos = 1; pos <= quantidadePosicoes; pos++) {
    const cd = porPosicao.get(pos);
    const codigoFisico = cd?.codigoFisico ?? catalogo?.get(pos) ?? null;

    if (cd == null) continue;

    if (codigoFisico == null && usarCodigoFisico) {
      alertas.push(`codigo_fisico_ausente:CD${pos}`);
    }

    for (const campo of campos) {
      const nome = gerarNomeColunaCd(campo, pos, codigoFisico, formato, usarCodigoFisico);
      colunas[nome] = valorCampo(cd, campo);

      if (entrada.incluirPosicaoLogica ?? perfil.incluirPosicaoLogica) {
        colunas[`POSICAO_${nome}`] = pos;
      }
    }
  }

  return { colunas, alertas, quantidadePosicoes };
}
