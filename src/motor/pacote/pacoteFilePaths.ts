import fs from "node:fs";
import path from "node:path";
import type { TipoArquivoMotor } from "../drive/catalogoArquivosMotor.ts";
import {
  diretorioOriginais,
  diretorioPadronizados,
  resolverCaminhoSeguro,
} from "../drive/worker/workerPaths.ts";
import type { WorkerArquivoDb } from "../drive/worker/workerTypes.ts";

/** Caminhos de entrada do Motor a partir do staging do Worker (sem Excel de conferência). */
export type PacoteMotorFilePaths = {
  grupo1: string;
  grupo2: string;
  inventario: string;
  validacaoPadrao: string;
  rede: string;
  plan6Cd: string;
  bandeiraCsv: string;
  ordemCdsPadrao: string;
  compradoresPadrao: string;
  regrasPadrao: string;
  estruturaFakePadrao: string;
};

const TIPOS_OBRIGATORIOS: TipoArquivoMotor[] = [
  "grupo_ruptura_1",
  "grupo_ruptura_2",
  "inventario_lojas",
  "plan_6_cd",
  "rede",
  "bandeira",
  "validacao_ruptura",
  "ordem_cds",
  "compradores",
  "regras_definidas",
  "estrutura_fake",
];

const MAPA_TIPO_CAMPO: Record<TipoArquivoMotor, keyof PacoteMotorFilePaths> = {
  grupo_ruptura_1: "grupo1",
  grupo_ruptura_2: "grupo2",
  inventario_lojas: "inventario",
  plan_6_cd: "plan6Cd",
  rede: "rede",
  bandeira: "bandeiraCsv",
  validacao_ruptura: "validacaoPadrao",
  ordem_cds: "ordemCdsPadrao",
  compradores: "compradoresPadrao",
  regras_definidas: "regrasPadrao",
  estrutura_fake: "estruturaFakePadrao",
};

const PADROES_PADRONIZADOS: Partial<Record<TipoArquivoMotor, string>> = {
  validacao_ruptura: "motor_validacao_ruptura_padrao.xlsx",
  ordem_cds: "motor_ordem_cds_padrao.xlsx",
  compradores: "motor_compradores_padrao.xlsx",
  regras_definidas: "motor_regras_padrao.xlsx",
  estrutura_fake: "motor_estrutura_fake_padrao.xlsx",
};

function resolverCaminhoArquivo(
  pacoteId: string,
  arquivo: WorkerArquivoDb,
): string | null {
  const tipo = arquivo.tipo_arquivo as TipoArquivoMotor | null;
  if (!tipo) return null;

  if (arquivo.precisa_padronizacao) {
    if (arquivo.caminho_local_padronizado && fs.existsSync(arquivo.caminho_local_padronizado)) {
      return arquivo.caminho_local_padronizado;
    }
    const padrao = PADROES_PADRONIZADOS[tipo];
    if (padrao) {
      const candidato = path.join(diretorioPadronizados(pacoteId), padrao);
      if (fs.existsSync(candidato)) return candidato;
    }
    return null;
  }

  if (arquivo.caminho_local_original && fs.existsSync(arquivo.caminho_local_original)) {
    return arquivo.caminho_local_original;
  }

  const originais = diretorioOriginais(pacoteId);
  const porNome = resolverCaminhoSeguro(originais, arquivo.nome_original);
  if (fs.existsSync(porNome)) return porNome;
  return null;
}

export function resolvePacoteFilePaths(
  pacoteId: string,
  arquivos: WorkerArquivoDb[],
): PacoteMotorFilePaths {
  const paths = {} as Partial<PacoteMotorFilePaths>;

  for (const arq of arquivos) {
    const tipo = arq.tipo_arquivo as TipoArquivoMotor | null;
    if (!tipo || !(tipo in MAPA_TIPO_CAMPO)) continue;
    const campo = MAPA_TIPO_CAMPO[tipo];
    const caminho = resolverCaminhoArquivo(pacoteId, arq);
    if (caminho) paths[campo] = caminho;
  }

  const faltantes = TIPOS_OBRIGATORIOS.filter((t) => !paths[MAPA_TIPO_CAMPO[t]]);
  if (faltantes.length > 0) {
    throw new Error(
      `Arquivos ausentes no staging do pacote ${pacoteId}: ${faltantes.join(", ")}. Execute o Worker com --keep-files.`,
    );
  }

  return paths as PacoteMotorFilePaths;
}

export function assertPacoteSourcesExist(paths: PacoteMotorFilePaths): void {
  for (const [key, caminho] of Object.entries(paths)) {
    if (!fs.existsSync(caminho)) {
      throw new Error(`Fonte do pacote ausente (${key}): ${caminho}`);
    }
  }
}
