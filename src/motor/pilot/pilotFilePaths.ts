import fs from "fs";
import path from "path";

const RUPTURA_BASE = "C:\\area-de-trabalho-v7\\importar\\RUPTURA";
const PADRONIZADOS_BASE = path.join(process.cwd(), "src", "motor", ".tmp", "padronizados");

export type PilotFilePaths = {
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
  excelRegional: string;
};

function findRegionalWorkbook(): string {
  const entries = fs.readdirSync(RUPTURA_BASE);
  const match = entries.find(
    (name) => name.startsWith("Ruptura por Regional") && !name.startsWith("~$") && name.endsWith(".xlsx"),
  );
  if (!match) throw new Error("Workbook Excel regional não encontrado em importar/RUPTURA");
  return path.join(RUPTURA_BASE, match);
}

function resolveExcelReferenciaPath(): string {
  const conferencia = path.join(RUPTURA_BASE, "RESULTADO", "ARQUIVO CONFERENCIA RESULTADO.xlsx");
  if (fs.existsSync(conferencia)) return conferencia;
  return findRegionalWorkbook();
}

function resolvePadronizado(regional: string, dataReferencia: string, arquivo: string): string {
  const ym = dataReferencia.slice(0, 7);
  const candidatos = [
    path.join(PADRONIZADOS_BASE, regional, ym, arquivo),
    path.join(PADRONIZADOS_BASE, regional, "2026-07", arquivo),
  ];
  for (const c of candidatos) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`Arquivo padronizado ausente: ${arquivo} (${regional}/${ym})`);
}

export function resolvePilotFilePaths(regional: string, dataReferencia: string): PilotFilePaths {
  return {
    grupo1: path.join(RUPTURA_BASE, "1º Grupo de Ruptura.txt"),
    grupo2: path.join(RUPTURA_BASE, "2º Grupo de Ruptura.txt"),
    inventario: path.join(RUPTURA_BASE, "Inventário Lojas.txt"),
    validacaoPadrao: resolvePadronizado(regional, dataReferencia, "motor_validacao_ruptura_padrao.xlsx"),
    rede: path.join(RUPTURA_BASE, "Rede.txt"),
    plan6Cd: path.join(RUPTURA_BASE, "Plan 6 CD.txt"),
    bandeiraCsv: path.join(RUPTURA_BASE, "bandeira.csv"),
    ordemCdsPadrao: resolvePadronizado(regional, dataReferencia, "motor_ordem_cds_padrao.xlsx"),
    compradoresPadrao: resolvePadronizado(regional, dataReferencia, "motor_compradores_padrao.xlsx"),
    regrasPadrao: resolvePadronizado(regional, dataReferencia, "motor_regras_padrao.xlsx"),
    estruturaFakePadrao: resolvePadronizado(regional, dataReferencia, "motor_estrutura_fake_padrao.xlsx"),
    excelRegional: resolveExcelReferenciaPath(),
  };
}

export function assertPilotSourcesExist(paths: PilotFilePaths): void {
  for (const [key, caminho] of Object.entries(paths)) {
    if (!fs.existsSync(caminho)) {
      throw new Error(`Fonte piloto ausente (${key}): ${caminho}`);
    }
  }
}

export function defaultPilotOutputDir(regional: string, dataReferencia: string, loja: number): string {
  return path.join(process.cwd(), "src", "motor", ".tmp", "piloto", regional, dataReferencia, `loja-${loja}`);
}
