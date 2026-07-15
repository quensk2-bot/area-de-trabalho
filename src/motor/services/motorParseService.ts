import fs from "fs";
import type { MotorArquivoEntrada, MotorResultadoTransformacao } from "../types/motorTypes.ts";
import type {
  MotorInventarioAgrupado,
  MotorLinhaGrupoCds,
  MotorLinhaGrupoRuptura,
  MotorLinhaInventario,
  MotorLinhaValidacao,
} from "../types/motorLinhaTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import { parseGrupoCds2 } from "../parsers/parseGrupoCds2.ts";
import { parseGrupoRuptura1 } from "../parsers/parseGrupoRuptura1.ts";
import { parseInventarioLojas } from "../parsers/parseInventarioLojas.ts";
import { parseValidacaoRuptura } from "../parsers/parseValidacaoRuptura.ts";
import { transformGrupoCds2 } from "../transform/transformGrupoCds2.ts";
import { transformGrupoRuptura1 } from "../transform/transformGrupoRuptura1.ts";
import { transformInventario } from "../transform/transformInventario.ts";
import { writeJsonlOutput } from "../utils/tempOutput.ts";

export type MotorParseServiceResult =
  | MotorResultadoTransformacao<MotorProdutoLojaNormalizado>
  | MotorResultadoTransformacao<MotorCd5Normalizado>
  | MotorResultadoTransformacao<MotorInventarioAgrupado>
  | MotorResultadoTransformacao<MotorLinhaValidacao>;

export class MotorParseError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
  ) {
    super(message);
    this.name = "MotorParseError";
  }
}

export async function executarMotorParse(
  entrada: MotorArquivoEntrada,
): Promise<MotorParseServiceResult> {
  if (!fs.existsSync(entrada.caminho)) {
    throw new MotorParseError(`Arquivo não encontrado: ${entrada.caminho}`, "ARQUIVO_INEXISTENTE");
  }

  const limite = entrada.limiteLinhas;

  switch (entrada.tipo) {
    case "grupo_ruptura_1": {
      const parsed = await parseGrupoRuptura1(entrada.caminho, limite);
      if (!parsed.cabecalhoOk) {
        throw new MotorParseError("Cabeçalho inválido para 1º Grupo de Ruptura", "CABECALHO_INVALIDO");
      }
      const transformed = transformGrupoRuptura1(parsed.linhas, entrada.regional, entrada.dataReferencia);
      const resultado: MotorResultadoTransformacao<MotorProdutoLojaNormalizado> = {
        tipo: entrada.tipo,
        regional: entrada.regional,
        dataReferencia: entrada.dataReferencia,
        itens: transformed.itens,
        erros: [...parsed.erros, ...transformed.erros],
        alertas: transformed.alertas,
        metricas: parsed.metricas,
      };
      if (entrada.outputPath && !entrada.dryRun) {
        writeJsonlOutput(entrada.outputPath, resultado.itens);
      }
      return resultado;
    }

    case "grupo_cds_2": {
      const parsed = await parseGrupoCds2(entrada.caminho, limite);
      if (!parsed.cabecalhoOk) {
        throw new MotorParseError("Cabeçalho inválido para 2º Grupo de CDs", "CABECALHO_INVALIDO");
      }
      const transformed = transformGrupoCds2(parsed.linhas);
      const resultado: MotorResultadoTransformacao<MotorCd5Normalizado> = {
        tipo: entrada.tipo,
        regional: entrada.regional,
        dataReferencia: entrada.dataReferencia,
        itens: transformed.itens,
        erros: [...parsed.erros, ...transformed.erros],
        alertas: transformed.alertas,
        metricas: parsed.metricas,
      };
      if (entrada.outputPath && !entrada.dryRun) {
        writeJsonlOutput(entrada.outputPath, resultado.itens);
      }
      return resultado;
    }

    case "inventario_lojas": {
      const parsed = await parseInventarioLojas(entrada.caminho, limite);
      if (!parsed.cabecalhoOk) {
        throw new MotorParseError("Cabeçalho inválido para Inventário de Lojas", "CABECALHO_INVALIDO");
      }
      const transformed = transformInventario(parsed.linhas);
      const resultado: MotorResultadoTransformacao<MotorInventarioAgrupado> = {
        tipo: entrada.tipo,
        regional: entrada.regional,
        dataReferencia: entrada.dataReferencia,
        itens: transformed.itens,
        erros: [...parsed.erros, ...transformed.erros],
        alertas: transformed.alertas,
        metricas: parsed.metricas,
      };
      if (entrada.outputPath && !entrada.dryRun) {
        writeJsonlOutput(entrada.outputPath, resultado.itens);
      }
      return resultado;
    }

    case "validacao_ruptura": {
      const parsed = await parseValidacaoRuptura(entrada.caminho, limite);
      if (!parsed.cabecalhoOk) {
        throw new MotorParseError("Cabeçalho inválido para Validação Ruptura", "CABECALHO_INVALIDO");
      }
      const resultado: MotorResultadoTransformacao<MotorLinhaValidacao> = {
        tipo: entrada.tipo,
        regional: entrada.regional,
        dataReferencia: entrada.dataReferencia,
        itens: parsed.linhas,
        erros: parsed.erros,
        alertas: [],
        metricas: parsed.metricas,
      };
      if (entrada.outputPath && !entrada.dryRun) {
        writeJsonlOutput(entrada.outputPath, resultado.itens);
      }
      return resultado;
    }

    default: {
      const _exhaustive: never = entrada.tipo;
      throw new MotorParseError(`Tipo inválido: ${String(_exhaustive)}`, "TIPO_INVALIDO");
    }
  }
}

export type {
  MotorLinhaGrupoRuptura,
  MotorLinhaGrupoCds,
  MotorLinhaInventario,
  MotorLinhaValidacao,
};
