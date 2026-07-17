import type { CompareRowInput } from "../../compare/compareTypes.ts";
import type { MotorCentralizacaoEntrada } from "../../bre/centralizacao/centralizacaoTypes.ts";
import { calcularCentralizacao, construirLookupCentralizadosBatch } from "../../bre/centralizacao/index.ts";
import { loadCatalogos } from "../../catalog/catalogService.ts";
import type { MotorCatalogos } from "../../catalog/catalogTypes.ts";
import { ensureCatalogFixtures } from "./catalogFixtures.ts";

let _catalogos: MotorCatalogos | null = null;

export function catalogosFixture(): MotorCatalogos {
  if (!_catalogos) {
    const fixtures = ensureCatalogFixtures();
    _catalogos = loadCatalogos({ ordemCds: fixtures.ordemCds, rede: fixtures.rede }).catalogos;
  }
  return _catalogos;
}

export function entradaBase(overrides: Partial<MotorCentralizacaoEntrada> = {}): MotorCentralizacaoEntrada {
  return {
    regional: "NORDESTE",
    loja: 103,
    divisao: "NORDESTE",
    rede: "REDE ALPHA",
    diasRecebtoCd1: null,
    diasRecebtoCd2: null,
    diasRecebtoCd3: null,
    diasRecebtoCd4: null,
    diasRecebtoCd5: null,
    estoqueCd1: 0,
    estoqueCd2: 0,
    estoqueCd3: 0,
    estoqueCd4: 0,
    estoqueCd5: 0,
    statusCompraCd1: "A",
    statusCompraCd2: "A",
    statusCompraCd3: "A",
    statusCompraCd4: "A",
    statusCompraCd5: "A",
    ...overrides,
  };
}

export function linhaCentralizacao(
  loja: number,
  produto: number,
  entrada: MotorCentralizacaoEntrada,
  catalogos: MotorCatalogos,
  batch?: MotorCentralizacaoEntrada[],
): CompareRowInput {
  const lookup = construirLookupCentralizadosBatch(batch ?? [entrada], catalogos);
  const r = calcularCentralizacao(entrada, catalogos, lookup);
  return {
    loja,
    produto,
    excel: {
      "Menor Recebto CD": r.menorRecebimento.menorDiasRecebimentoOriginal,
      Centralizado: r.produtoCentralizado.textoProdutoCentralizado,
      "Produto Centralizado": r.produtoCentralizado.textoProdutoCentralizado,
      "1ºCD": r.flags.flagPrimeiroCd,
      "2ºCD": r.flags.flagSegundoCd,
      "3ºCD": r.flags.flagTerceiroCd,
      "4ºCD": r.flags.flagQuartoCd,
      "5ºCD": r.flags.flagQuintoCd,
      "Status Recebto": r.statusRecebto.texto,
      "Status Estoque CDs": r.statusEstoqueCds.texto,
      "Status Solicitação Ativação CD": r.statusAtivacaoCd.texto,
    },
    v7: {
      "Menor Recebto CD": r.menorRecebimento.menorDiasRecebimentoOriginal,
      Centralizado: r.produtoCentralizado.textoProdutoCentralizado,
      "Produto Centralizado": r.produtoCentralizado.textoProdutoCentralizado,
      "1ºCD": r.flags.flagPrimeiroCd,
      "2ºCD": r.flags.flagSegundoCd,
      "3ºCD": r.flags.flagTerceiroCd,
      "4ºCD": r.flags.flagQuartoCd,
      "5ºCD": r.flags.flagQuintoCd,
      "Status Recebto": r.statusRecebto.texto,
      "Status Estoque CDs": r.statusEstoqueCds.texto,
      "Status Solicitação Ativação CD": r.statusAtivacaoCd.texto,
    },
  };
}

function buildFixtures(): CompareRowInput[] {
  const cat = catalogosFixture();
  const batchCd1 = entradaBase({ diasRecebtoCd1: 30, diasRecebtoCd2: 50, estoqueCd1: 1 });
  return [
    linhaCentralizacao(103, 2505088, batchCd1, cat, [batchCd1]),
    linhaCentralizacao(
      103,
      2505089,
      entradaBase({ diasRecebtoCd5: 15, estoqueCd5: 1 }),
      cat,
      [entradaBase({ diasRecebtoCd5: 15, estoqueCd5: 1 })],
    ),
  ];
}

let _fixtureCache: CompareRowInput[] | null = null;

export function getExcelCentralizacaoFixture(): CompareRowInput[] {
  if (!_fixtureCache) _fixtureCache = buildFixtures();
  return _fixtureCache;
}

export const EXCEL_CENTRALIZACAO_FIXTURE: CompareRowInput[] = [];

export const EXCEL_CENTRALIZACAO_DIVERGENTE: CompareRowInput[] = [
  {
    loja: 103,
    produto: 9999999,
    excel: {
      "Menor Recebto CD": 30,
      Centralizado: "CD 101",
      "Produto Centralizado": "CD 101",
      "1ºCD": 101,
      "2ºCD": 0,
      "3ºCD": 0,
      "4ºCD": 0,
      "5ºCD": 0,
      "Status Recebto": "Com movimentação nos úiltimos 120 Dias",
      "Status Estoque CDs": "Estoque no CD: (101)",
      "Status Solicitação Ativação CD": "Ativo no CD",
    },
    v7: {
      "Menor Recebto CD": 30,
      Centralizado: "CD 102",
      "Produto Centralizado": "CD 102",
      "1ºCD": 101,
      "2ºCD": 0,
      "3ºCD": 0,
      "4ºCD": 0,
      "5ºCD": 0,
      "Status Recebto": "Com movimentação nos úiltimos 120 Dias",
      "Status Estoque CDs": "Estoque no CD: (101)",
      "Status Solicitação Ativação CD": "Ativo no CD",
    },
  },
];
