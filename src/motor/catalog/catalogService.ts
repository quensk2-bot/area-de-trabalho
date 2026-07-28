import fs from "fs";
import path from "path";
import type { CatalogoCompradorConflito, MotorCatalogos } from "./catalogTypes.ts";
import { parseBandeiraFromCsv, parseBandeiraFromXlsx, parseModalidade, parseOrdemCd, parseSequenciaCd, fileExists } from "./parseOrdemCds.ts";
import { parseCompradores } from "./parseCompradores.ts";
import { parseEstruturaFake } from "./parseEstruturaFake.ts";
import { parseModalidadesExclusivas } from "./parseModalidadesExclusivas.ts";
import { parsePlan6Produtos, parseProdutosExclusivos } from "./parseProdutosExclusivos.ts";
import { parseRede } from "./parseRede.ts";
import { parseRegrasExclusao } from "./parseRegrasExclusao.ts";

export type CatalogPaths = {
  rede?: string;
  ordemCds?: string;
  ordemCdsPadrao?: string;
  bandeiraCsv?: string;
  compradores?: string;
  plan6Cd?: string;
  regras?: string;
  estruturaFake?: string;
  regional?: string;
  dataReferencia?: string;
};

export type CatalogServiceResult = {
  catalogos: MotorCatalogos;
  conflitosComprador: CatalogoCompradorConflito[];
  alertas: string[];
  erros: string[];
};

export function resolveOrdemCdsPadraoPath(regional: string, dataReferencia: string): string | null {
  const ym = dataReferencia.slice(0, 7);
  const candidatos = [
    path.join(process.cwd(), "src", "motor", ".tmp", "padronizados", regional, ym, "motor_ordem_cds_padrao.xlsx"),
    path.join(process.cwd(), "src", "motor", ".tmp", "padronizados", regional, dataReferencia.slice(0, 7), "motor_ordem_cds_padrao.xlsx"),
  ];
  for (const candidato of candidatos) {
    if (fileExists(candidato)) return candidato;
  }
  return null;
}

export function resolveOrdemCdsCatalogPath(paths: CatalogPaths): string | null {
  if (paths.ordemCdsPadrao && fileExists(paths.ordemCdsPadrao)) return paths.ordemCdsPadrao;
  if (paths.regional && paths.dataReferencia) {
    const padrao = resolveOrdemCdsPadraoPath(paths.regional, paths.dataReferencia);
    if (padrao) return padrao;
  }
  if (paths.ordemCds && fileExists(paths.ordemCds)) return paths.ordemCds;
  return null;
}

export function loadCatalogos(paths: CatalogPaths): CatalogServiceResult {
  const alertas: string[] = [];
  const erros: string[] = [];
  const conflitosComprador: CatalogoCompradorConflito[] = [];

  const rede = paths.rede && fileExists(paths.rede) ? parseRede(paths.rede) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };
  if (!paths.rede || !fileExists(paths.rede)) erros.push("Rede.txt ausente");

  const ordemCdsPath = resolveOrdemCdsCatalogPath(paths);
  if (ordemCdsPath && ordemCdsPath.includes("motor_ordem_cds_padrao")) {
    alertas.push(`Ordem CDs: usando catálogo padronizado ${ordemCdsPath}`);
  }

  let bandeira = { itens: [] as MotorCatalogos["bandeira"], alertas: [] as string[], erros: [] as typeof rede.erros };
  if (ordemCdsPath) {
    bandeira = parseBandeiraFromXlsx(ordemCdsPath);
  } else if (paths.bandeiraCsv && fileExists(paths.bandeiraCsv)) {
    bandeira = parseBandeiraFromCsv(paths.bandeiraCsv);
  } else {
    erros.push("Bandeira ausente (motor_ordem_cds_padrao.xlsx, Ordem CDs.xlsx ou bandeira.csv)");
  }

  const ordemCd = ordemCdsPath ? parseOrdemCd(ordemCdsPath) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };
  const sequenciaCd = ordemCdsPath ? parseSequenciaCd(ordemCdsPath) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };
  const modalidade = ordemCdsPath ? parseModalidade(ordemCdsPath) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  let compradores: CatalogoServiceResult["catalogos"]["compradores"] = [];
  if (paths.compradores && fileExists(paths.compradores)) {
    const parsed = parseCompradores(paths.compradores, rede.itens);
    compradores = parsed.itens;
    conflitosComprador.push(...parsed.conflitos);
    alertas.push(...parsed.alertas);
  } else {
    alertas.push("Compradores.xlsx ausente — resolução de comprador bloqueada nesta etapa");
  }

  const produtosExclusivos =
    paths.plan6Cd && fileExists(paths.plan6Cd) ? parseProdutosExclusivos(paths.plan6Cd) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  // Carrega TODOS os produtos do Plan 6 com MODALIDADECD oficial
  const plan6Produtos =
    paths.plan6Cd && fileExists(paths.plan6Cd) ? parsePlan6Produtos(paths.plan6Cd) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  const excecoesProdutoLoja =
    paths.plan6Cd && fileExists(paths.plan6Cd)
      ? parseModalidadesExclusivas(paths.plan6Cd, modalidade.itens, bandeira.itens)
      : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  const regrasExclusao = paths.regras && fileExists(paths.regras) ? parseRegrasExclusao(paths.regras) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  const estruturaFake =
    paths.estruturaFake && fileExists(paths.estruturaFake)
      ? parseEstruturaFake(paths.estruturaFake)
      : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  alertas.push(
    ...rede.alertas,
    ...bandeira.alertas,
    ...ordemCd.alertas,
    ...sequenciaCd.alertas,
    ...modalidade.alertas,
    ...produtosExclusivos.alertas,
    ...excecoesProdutoLoja.alertas,
    ...regrasExclusao.alertas,
    ...estruturaFake.alertas,
  );

  return {
    catalogos: {
      rede: rede.itens,
      bandeira: bandeira.itens,
      ordemCd: ordemCd.itens,
      sequenciaCd: sequenciaCd.itens,
      modalidade: modalidade.itens,
      compradores,
      conflitosComprador,
      produtosExclusivos: produtosExclusivos.itens,
      excecoesProdutoLoja: excecoesProdutoLoja.itens,
      regrasExclusao: regrasExclusao.itens,
      estruturaFake: estruturaFake.itens,
      plan6Produtos: plan6Produtos.itens,
    },
    conflitosComprador,
    alertas,
    erros,
  };
}

export function resolveCatalogBasePath(): string {
  return fs.existsSync("C:\\area-de-trabalho-v7\\importar\\RUPTURA")
    ? "C:\\area-de-trabalho-v7\\importar\\RUPTURA"
    : "";
}
