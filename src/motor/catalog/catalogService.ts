import fs from "fs";
import type { CatalogoCompradorConflito, MotorCatalogos } from "./catalogTypes.ts";
import { parseBandeiraFromCsv, parseBandeiraFromXlsx, parseModalidade, parseOrdemCd, parseSequenciaCd, fileExists } from "./parseOrdemCds.ts";
import { parseCompradores } from "./parseCompradores.ts";
import { parseEstruturaFake } from "./parseEstruturaFake.ts";
import { parseModalidadesExclusivas } from "./parseModalidadesExclusivas.ts";
import { parseProdutosExclusivos } from "./parseProdutosExclusivos.ts";
import { parseRede } from "./parseRede.ts";
import { parseRegrasExclusao } from "./parseRegrasExclusao.ts";

export type CatalogPaths = {
  rede?: string;
  ordemCds?: string;
  bandeiraCsv?: string;
  compradores?: string;
  plan6Cd?: string;
  regras?: string;
  estruturaFake?: string;
};

export type CatalogServiceResult = {
  catalogos: MotorCatalogos;
  conflitosComprador: CatalogoCompradorConflito[];
  alertas: string[];
  erros: string[];
};

export function loadCatalogos(paths: CatalogPaths): CatalogServiceResult {
  const alertas: string[] = [];
  const erros: string[] = [];
  const conflitosComprador: CatalogoCompradorConflito[] = [];

  const rede = paths.rede && fileExists(paths.rede) ? parseRede(paths.rede) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };
  if (!paths.rede || !fileExists(paths.rede)) erros.push("Rede.txt ausente");

  let bandeira = { itens: [] as MotorCatalogos["bandeira"], alertas: [] as string[], erros: [] as typeof rede.erros };
  if (paths.ordemCds && fileExists(paths.ordemCds)) {
    bandeira = parseBandeiraFromXlsx(paths.ordemCds);
  } else if (paths.bandeiraCsv && fileExists(paths.bandeiraCsv)) {
    bandeira = parseBandeiraFromCsv(paths.bandeiraCsv);
  } else {
    erros.push("Bandeira ausente (Ordem CDs.xlsx ou bandeira.csv)");
  }

  const ordemCd = paths.ordemCds && fileExists(paths.ordemCds) ? parseOrdemCd(paths.ordemCds) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };
  const sequenciaCd = paths.ordemCds && fileExists(paths.ordemCds) ? parseSequenciaCd(paths.ordemCds) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };
  const modalidade = paths.ordemCds && fileExists(paths.ordemCds) ? parseModalidade(paths.ordemCds) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

  let compradores: CatalogoServiceResult["catalogos"]["compradores"] = [];
  if (paths.compradores && fileExists(paths.compradores)) {
    const parsed = parseCompradores(paths.compradores);
    compradores = parsed.itens;
    conflitosComprador.push(...parsed.conflitos);
    alertas.push(...parsed.alertas);
  } else {
    alertas.push("Compradores.xlsx ausente — resolução de comprador bloqueada nesta etapa");
  }

  const produtosExclusivos =
    paths.plan6Cd && fileExists(paths.plan6Cd) ? parseProdutosExclusivos(paths.plan6Cd) : { itens: [], origem: "", quantidadeCarregada: 0, duplicatasRemovidas: 0, erros: [], alertas: [] };

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
