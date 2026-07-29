import type { MotorProdutoLojaConsolidado } from "../consolidar/consolidacaoTypes.ts";
import { camposPersistiveis } from "./dmSchemas.ts";
import { chaveDmCd, chaveDmTexto } from "./dmMapping.ts";
import type { DmLote, DmValidacaoItem, DmValidacaoResultado } from "./dmTypes.ts";

function push(
  itens: DmValidacaoItem[],
  item: DmValidacaoItem,
): void {
  itens.push(item);
}

export function validarEntradaConsolidado(consolidado: readonly MotorProdutoLojaConsolidado[]): DmValidacaoResultado {
  const itens: DmValidacaoItem[] = [];
  const chaves = new Map<string, number>();

  for (const item of consolidado) {
    const chave = chaveDmTexto(item);
    chaves.set(chave, (chaves.get(chave) ?? 0) + 1);

    if (!item.regional?.trim()) {
      push(itens, { codigo: "regional_ausente", severidade: "erro", mensagem: "Regional ausente", loja: item.loja, seqproduto: item.seqproduto, campo: "regional" });
    }
    if (!item.dataReferencia?.trim()) {
      push(itens, { codigo: "data_ausente", severidade: "erro", mensagem: "Data referência ausente", loja: item.loja, seqproduto: item.seqproduto, campo: "dataReferencia" });
    }
    if (item.loja == null || item.loja <= 0) {
      push(itens, { codigo: "loja_invalida", severidade: "erro", mensagem: "Loja inválida", loja: item.loja, seqproduto: item.seqproduto, campo: "loja" });
    }
    if (item.seqproduto == null || item.seqproduto <= 0) {
      push(itens, { codigo: "produto_invalido", severidade: "erro", mensagem: "Seqproduto inválido", loja: item.loja, seqproduto: item.seqproduto, campo: "seqproduto" });
    }

    const posicoes = new Set<number>();
    for (const cd of item.cds) {
      if (posicoes.has(cd.posicaoLogica)) {
        push(itens, {
          codigo: "cd_posicao_duplicada",
          severidade: "erro",
          mensagem: `Posição lógica duplicada: ${cd.posicaoLogica}`,
          loja: item.loja,
          seqproduto: item.seqproduto,
          campo: "cds",
        });
      }
      posicoes.add(cd.posicaoLogica);
    }
  }

  for (const [chave, qtd] of chaves) {
    if (qtd > 1) {
      push(itens, { codigo: "produto_duplicado", severidade: "erro", mensagem: `Chave duplicada: ${chave} (${qtd}x)` });
    }
  }

  return { valido: itens.every((i) => i.severidade !== "erro"), itens };
}

export function validarLoteDm(lote: DmLote): DmValidacaoResultado {
  const itens: DmValidacaoItem[] = [];
  const camposObrigatorios = camposPersistiveis("dm_produto_loja").filter((c) =>
    ["regional", "dataReferencia", "loja", "seqproduto", "classificacaoPrazo", "statusOperacional", "qualidadeDados", "quantidadeCds"].includes(c),
  );

  for (const produto of lote.produtos) {
    for (const campo of camposObrigatorios) {
      const valor = produto[campo as keyof typeof produto];
      if (valor == null || (typeof valor === "string" && !valor.trim())) {
        push(itens, {
          codigo: "campo_obrigatorio_ausente",
          severidade: "erro",
          mensagem: `Campo obrigatório ausente: ${campo}`,
          loja: produto.loja,
          seqproduto: produto.seqproduto,
          campo,
        });
      }
    }
  }

  const chavesCd = new Map<string, number>();
  for (const cd of lote.cds) {
    const chave = chaveDmCd(cd, cd.posicaoLogica);
    chavesCd.set(chave, (chavesCd.get(chave) ?? 0) + 1);

    if (cd.posicaoLogica < 1) {
      push(itens, {
        codigo: "posicao_logica_invalida",
        severidade: "erro",
        mensagem: "posicaoLogica deve ser >= 1",
        loja: cd.loja,
        seqproduto: cd.seqproduto,
        campo: "posicaoLogica",
      });
    }
  }

  for (const [chave, qtd] of chavesCd) {
    if (qtd > 1) {
      push(itens, { codigo: "cd_filha_duplicada", severidade: "erro", mensagem: `Linha CD duplicada: ${chave}` });
    }
  }

  const produtosPorChave = new Map(lote.produtos.map((p) => [chaveDmTexto(p), p]));
  const cdsCountPorChave = new Map<string, number>();
  for (const cd of lote.cds) {
    const chave = chaveDmTexto(cd);
    cdsCountPorChave.set(chave, (cdsCountPorChave.get(chave) ?? 0) + 1);
  }
  for (const produto of lote.produtos) {
    const linhasCd = cdsCountPorChave.get(chaveDmTexto(produto)) ?? 0;
    if (linhasCd !== produto.quantidadeCds) {
      push(itens, {
        codigo: "quantidade_cds_inconsistente",
        severidade: "aviso",
        mensagem: `quantidadeCds=${produto.quantidadeCds} mas filha tem ${linhasCd}`,
        loja: produto.loja,
        seqproduto: produto.seqproduto,
      });
    }
  }

  for (const chave of produtosPorChave.keys()) {
    if (!lote.cds.some((c) => chaveDmTexto(c) === chave) && produtosPorChave.get(chave)!.quantidadeCds === 0) {
      continue;
    }
  }

  return { valido: itens.every((i) => i.severidade !== "erro"), itens };
}

export function validarPipeline(
  consolidado: readonly MotorProdutoLojaConsolidado[],
  lote: DmLote,
): DmValidacaoResultado {
  const entrada = validarEntradaConsolidado(consolidado);
  const dm = validarLoteDm(lote);
  const itens = [...entrada.itens, ...dm.itens];
  return { valido: itens.every((i) => i.severidade !== "erro"), itens };
}

/** Validação mínima para produção — O(n), sem re-varrer consolidado completo. */
export function validarPipelineProducao(lote: DmLote): DmValidacaoResultado {
  const itens: DmValidacaoItem[] = [];
  if (lote.produtos.length === 0) {
    itens.push({ codigo: "lote_vazio", severidade: "erro", mensagem: "Lote sem produtos" });
    return { valido: false, itens };
  }

  const chavesProd = new Map<string, number>();
  for (const p of lote.produtos) {
    const k = chaveDmTexto(p);
    chavesProd.set(k, (chavesProd.get(k) ?? 0) + 1);
  }
  for (const [k, q] of chavesProd) {
    if (q > 1) {
      itens.push({ codigo: "produto_duplicado", severidade: "erro", mensagem: `Chave duplicada: ${k} (${q}x)` });
    }
  }

  const chavesCd = new Map<string, number>();
  for (const cd of lote.cds) {
    const k = chaveDmCd(cd, cd.posicaoLogica);
    chavesCd.set(k, (chavesCd.get(k) ?? 0) + 1);
  }
  for (const [k, q] of chavesCd) {
    if (q > 1) {
      itens.push({ codigo: "cd_filha_duplicada", severidade: "erro", mensagem: `Linha CD duplicada: ${k}` });
    }
  }

  return { valido: itens.every((i) => i.severidade !== "erro"), itens };
}
