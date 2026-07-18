import { chaveDmCd, chaveDmTexto } from "../datamart/dmMapping.ts";
import type { DmLote, DmProdutoLoja, DmProdutoLojaCd } from "../datamart/dmTypes.ts";
import type { PersistenciaEntrada, PersistenciaValidacaoResultado } from "./persistenciaTypes.ts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function contarCdsPorProduto(cds: readonly DmProdutoLojaCd[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const cd of cds) {
    const chave = chaveDmTexto(cd);
    map.set(chave, (map.get(chave) ?? 0) + 1);
  }
  return map;
}

export function validarEntradaPersistencia(entrada: PersistenciaEntrada): PersistenciaValidacaoResultado {
  return validarLotePersistencia(entrada.lote, {
    regional: entrada.regional,
    dataReferencia: entrada.dataReferencia,
    versao: entrada.versao,
  });
}

export function validarLotePersistencia(
  lote: DmLote,
  contexto: { regional: string; dataReferencia: string; versao: number },
): PersistenciaValidacaoResultado {
  const erros: PersistenciaValidacaoResultado["erros"] = [];

  if (!contexto.regional?.trim()) {
    erros.push({ codigo: "REGIONAL_AUSENTE", mensagem: "Execucao sem regional." });
  }

  if (!ISO_DATE.test(contexto.dataReferencia)) {
    erros.push({ codigo: "DATA_INVALIDA", mensagem: `Data referencia invalida: ${contexto.dataReferencia}` });
  }

  if (!Number.isInteger(contexto.versao) || contexto.versao < 1) {
    erros.push({ codigo: "VERSAO_INVALIDA", mensagem: `Versao invalida: ${contexto.versao}` });
  }

  const produtosVistos = new Set<string>();
  const cdsPorProduto = contarCdsPorProduto(lote.cds);
  const posicoesVistas = new Set<string>();

  for (const produto of lote.produtos) {
    validarProduto(produto, contexto, produtosVistos, cdsPorProduto, erros);
  }

  for (const cd of lote.cds) {
    const chavePos = chaveDmCd(cd, cd.posicaoLogica);
    if (posicoesVistas.has(chavePos)) {
      erros.push({
        codigo: "POSICAO_CD_DUPLICADA",
        mensagem: `Posicao logica duplicada: ${chavePos}`,
        loja: cd.loja,
        seqproduto: cd.seqproduto,
        posicaoLogica: cd.posicaoLogica,
      });
    }
    posicoesVistas.add(chavePos);

    if (!Number.isInteger(cd.posicaoLogica) || cd.posicaoLogica < 1) {
      erros.push({
        codigo: "POSICAO_CD_INVALIDA",
        mensagem: "CD filho sem posicao logica valida.",
        loja: cd.loja,
        seqproduto: cd.seqproduto,
        posicaoLogica: cd.posicaoLogica,
      });
    }
  }

  const produtosComFilhas = new Set(lote.cds.map((c) => chaveDmTexto(c)));
  for (const produto of lote.produtos) {
    const chave = chaveDmTexto(produto);
    const qtdFilhas = cdsPorProduto.get(chave) ?? 0;
    if (produto.quantidadeCds !== qtdFilhas) {
      erros.push({
        codigo: "QUANTIDADE_CDS_DIVERGENTE",
        mensagem: `quantidade_cds=${produto.quantidadeCds} mas filhas=${qtdFilhas}`,
        loja: produto.loja,
        seqproduto: produto.seqproduto,
      });
    }
    if (produto.quantidadeCds > 0 && !produtosComFilhas.has(chave)) {
      erros.push({
        codigo: "PRODUTO_SEM_FILHAS",
        mensagem: "Produto declara CDs mas nao possui linhas filhas.",
        loja: produto.loja,
        seqproduto: produto.seqproduto,
      });
    }
  }

  return { valido: erros.length === 0, erros };
}

function validarProduto(
  produto: DmProdutoLoja,
  contexto: { regional: string; dataReferencia: string },
  produtosVistos: Set<string>,
  _cdsPorProduto: Map<string, number>,
  erros: PersistenciaValidacaoResultado["erros"],
): void {
  const chave = chaveDmTexto(produto);

  if (produto.regional !== contexto.regional || produto.dataReferencia !== contexto.dataReferencia) {
    erros.push({
      codigo: "CHAVE_PRINCIPAL_INVALIDA",
      mensagem: `Chave diverge do contexto: ${chave}`,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
    });
  }

  if (!Number.isInteger(produto.loja) || produto.loja <= 0) {
    erros.push({
      codigo: "LOJA_INVALIDA",
      mensagem: "Loja invalida.",
      loja: produto.loja,
      seqproduto: produto.seqproduto,
    });
  }

  if (!Number.isInteger(produto.seqproduto) || produto.seqproduto <= 0) {
    erros.push({
      codigo: "SEQPRODUTO_INVALIDO",
      mensagem: "Seqproduto invalido.",
      loja: produto.loja,
      seqproduto: produto.seqproduto,
    });
  }

  if (produtosVistos.has(chave)) {
    erros.push({
      codigo: "PRODUTO_DUPLICADO",
      mensagem: `Produto duplicado: ${chave}`,
      loja: produto.loja,
      seqproduto: produto.seqproduto,
    });
  }
  produtosVistos.add(chave);

  if (produto.qualidadeDados === "invalido") {
    erros.push({
      codigo: "QUALIDADE_INVALIDA",
      mensagem: "qualidade_dados=invalido bloqueia persistencia.",
      loja: produto.loja,
      seqproduto: produto.seqproduto,
    });
  }
}
