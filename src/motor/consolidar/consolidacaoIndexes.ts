import type { CatalogoComprador } from "../catalog/catalogTypes.ts";
import { mergeCompradores } from "../catalog/parseCompradores.ts";
import type { MotorBreItemResultado } from "../bre/breTypes.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import type { MotorInventarioAgrupado, MotorLinhaValidacao } from "../types/motorLinhaTypes.ts";
import type { MotorBlocoCdsComplementar } from "./cds/consolidarCdsProduto.ts";
import {
  chaveCompradorHierarquia,
  chaveConsolidacao,
  chaveLojaProduto,
  chaveRegionalLojaProduto,
  chaveRegionalProduto,
  validarChaveConsolidacao,
} from "./consolidacaoKeys.ts";
import type { MotorConsolidacaoEntrada, MotorConsolidacaoIndexes } from "./consolidacaoTypes.ts";

function appendMultiMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function buildCompradorIndex(compradores: CatalogoComprador[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const c of compradores) {
    const chave = chaveCompradorHierarquia(c.rede, c.secao, c.nivel2, c.nivel3);
    appendMultiMap(map, chave, c.comprador);
  }
  return map;
}

function cd5ParaBlocoComplementar(cd5: MotorCd5Normalizado, regional: string): MotorBlocoCdsComplementar {
  return {
    numeroBloco: 2,
    origemArquivo: cd5.cds[0]?.origemArquivo ?? `${regional}-grupo2.txt`,
    loja: null,
    cds: cd5.cds.map((cd) => ({ ...cd, numeroBloco: cd.numeroBloco || 2 })),
  };
}

export function detectarDuplicidadesBase(produtos: MotorProdutoLojaNormalizado[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const p of produtos) {
    const val = validarChaveConsolidacao(p.regional, p.loja, p.seqproduto);
    if (!val.valida) continue;
    const chave = chaveConsolidacao(val.regional, val.loja, val.seqproduto);
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const duplicadas = new Map<string, number>();
  for (const [chave, qtd] of contagem) {
    if (qtd > 1) duplicadas.set(chave, qtd);
  }
  return duplicadas;
}

export function construirIndexes(entrada: MotorConsolidacaoEntrada): MotorConsolidacaoIndexes {
  const { contexto, produtosLoja, cds5, inventario, validacao, bre } = entrada;
  const regional = contexto.regional;

  const blocosCdsPorChaveLojaProduto = new Map<string, MotorBlocoCdsComplementar[]>();
  const blocosCdsPorChaveRegionalProduto = new Map<string, MotorBlocoCdsComplementar[]>();
  const cd5PorRegionalProduto = new Map<string, MotorCd5Normalizado[]>();

  for (const [seqproduto, cd5] of cds5) {
    const bloco = cd5ParaBlocoComplementar(cd5, regional);
    appendMultiMap(
      blocosCdsPorChaveRegionalProduto,
      chaveRegionalProduto(regional, seqproduto),
      bloco,
    );
    appendMultiMap(cd5PorRegionalProduto, chaveRegionalProduto(regional, seqproduto), cd5);
  }

  for (const extra of entrada.blocosCdsComplementares ?? []) {
    const chaveRegional = chaveRegionalProduto(extra.regional ?? regional, extra.seqproduto);
    const bloco: MotorBlocoCdsComplementar = {
      numeroBloco: extra.numeroBloco,
      origemArquivo: extra.origemArquivo,
      loja: extra.loja,
      cds: extra.cds.map((cd) => ({ ...cd })),
    };
    if (extra.loja != null && extra.loja > 0) {
      appendMultiMap(
        blocosCdsPorChaveLojaProduto,
        chaveRegionalLojaProduto(extra.regional ?? regional, extra.loja, extra.seqproduto),
        bloco,
      );
    } else {
      appendMultiMap(blocosCdsPorChaveRegionalProduto, chaveRegional, bloco);
    }
  }

  const inventarioPorLojaProduto = new Map<string, MotorInventarioAgrupado>(inventario);
  const validacaoPorLojaProduto = new Map<string, MotorLinhaValidacao>(validacao);

  const redePorFornecedor = new Map<number, string[]>();
  const razaoPorFornecedor = new Map<number, string[]>();
  for (const r of contexto.catalogos.rede) {
    if (r.nomeRede) appendMultiMap(redePorFornecedor, r.seqPessoa, r.nomeRede);
    if (r.razao) appendMultiMap(razaoPorFornecedor, r.seqPessoa, r.razao);
  }

  const bandeiraPorLoja = new Map<number, string>();
  for (const b of contexto.catalogos.bandeira) {
    if (!bandeiraPorLoja.has(b.loja)) bandeiraPorLoja.set(b.loja, b.bandeira);
  }

  const ordemPorBandeira = new Map<string, { cd1: number; cd2: number; cd3: number; cd4: number; cd5: number }[]>();
  for (const o of contexto.catalogos.ordemCd) {
    appendMultiMap(ordemPorBandeira, o.bandeira.trim().toUpperCase(), {
      cd1: o.cd1,
      cd2: o.cd2,
      cd3: o.cd3,
      cd4: o.cd4,
      cd5: o.cd5,
    });
  }

  const compradorPorHierarquia = buildCompradorIndex(contexto.catalogos.compradores);

  const produtoExclusivoPorProduto = new Map<number, boolean>();
  for (const p of contexto.catalogos.produtosExclusivos) {
    produtoExclusivoPorProduto.set(p.codigo, true);
  }

  const excecaoPorLojaProduto = new Map<string, string>();
  for (const e of contexto.catalogos.excecoesProdutoLoja) {
    excecaoPorLojaProduto.set(chaveLojaProduto(e.loja, e.codigo), e.ncurtoPrazo);
  }

  const brePorLojaProduto = new Map<string, MotorBreItemResultado>();
  if (bre) {
    for (const item of bre.itens) {
      brePorLojaProduto.set(chaveLojaProduto(item.loja, item.seqproduto), item);
    }
  }

  const chavesDuplicadasBase = detectarDuplicidadesBase(produtosLoja);

  return {
    blocosCdsPorChaveLojaProduto,
    blocosCdsPorChaveRegionalProduto,
    cd5PorRegionalProduto,
    inventarioPorLojaProduto,
    validacaoPorLojaProduto,
    redePorFornecedor,
    razaoPorFornecedor,
    bandeiraPorLoja,
    ordemPorBandeira,
    compradorPorHierarquia,
    produtoExclusivoPorProduto,
    excecaoPorLojaProduto,
    brePorLojaProduto,
    chavesDuplicadasBase,
  };
}

export function contarDuplicidadesCatalogo(entrada: MotorConsolidacaoEntrada): number {
  const conflitos = entrada.contexto.catalogos.conflitosComprador.length;
  const merged = mergeCompradores(
    entrada.contexto.catalogos.compradores.filter((c) => c.origem === "principal"),
    entrada.contexto.catalogos.compradores.filter((c) => c.origem === "correcao"),
  );
  return conflitos + merged.conflitos.length;
}
