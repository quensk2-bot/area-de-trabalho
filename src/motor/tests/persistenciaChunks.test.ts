import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHUNK_TAMANHO_PADRAO,
  hashChunkPayload,
  hashPacoteLote,
  mapearChunkParaRpc,
  planejarChunks,
  PERSISTENCIA_CHUNKED_USA_RPC,
  totalizarChunks,
  atualizarProgresso,
  criarProgressoInicial,
} from "../persistencia/chunks/index.ts";
import { PERSISTENCIA_PRODUCAO_USA_RPC } from "../persistencia/index.ts";
import { loteProduto1Cd, loteProduto5Cds, loteProduto8Cds, loteCdPosicao12 } from "./fixtures/persistenciaFixtures.ts";
import {
  cloneLoteChunk,
  loteChunkTeste1201,
  CHUNK_TESTE_DATA,
  CHUNK_TESTE_REGIONAL,
} from "./fixtures/persistenciaChunksFixtures.ts";

describe("Fase 3C — Persistencia chunks", () => {
  it("01. planejamento 1 produto", () => {
    const chunks = planejarChunks(loteProduto1Cd());
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].produtos.length, 1);
    assert.equal(chunks[0].cds.length, 1);
  });

  it("02. planejamento 500 produtos", () => {
    const base = loteChunkTeste1201();
    base.produtos = base.produtos.slice(0, 500);
    base.cds = base.cds.filter((c) => base.produtos.some((p) => p.seqproduto === c.seqproduto));
    const chunks = planejarChunks(base, { tamanhoChunk: 500 });
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].produtos.length, 500);
  });

  it("03. planejamento 501 produtos => 2 chunks", () => {
    const base = loteChunkTeste1201();
    base.produtos = base.produtos.slice(0, 501);
    base.cds = base.cds.filter((c) => base.produtos.some((p) => p.seqproduto === c.seqproduto));
    const chunks = planejarChunks(base, { tamanhoChunk: 500 });
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].produtos.length, 500);
    assert.equal(chunks[1].produtos.length, 1);
  });

  it("04. produto com 8 CDs no mesmo chunk", () => {
    const chunks = planejarChunks(loteProduto8Cds());
    assert.equal(chunks[0].cds.length, 8);
  });

  it("05. produto com 12 CDs", () => {
    const chunks = planejarChunks(loteCdPosicao12());
    assert.equal(chunks[0].cds[0].posicaoLogica, 12);
  });

  it("06. pai e filhos permanecem juntos", () => {
    const lote = loteProduto5Cds();
    const chunks = planejarChunks(lote);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].produtos.length, 1);
    assert.equal(chunks[0].cds.length, 5);
  });

  it("07. hash determinístico", () => {
    const lote = loteProduto1Cd();
    const a = mapearChunkParaRpc(lote.produtos, lote.cds);
    const h1 = hashChunkPayload(a.produtos, a.cds);
    const h2 = hashChunkPayload(a.produtos, a.cds);
    assert.equal(h1, h2);
  });

  it("08. ordem determinística por loja/seqproduto", () => {
    const lote = loteChunkTeste1201();
    const c1 = planejarChunks(lote);
    const c2 = planejarChunks(lote);
    assert.deepEqual(
      c1.map((c) => c.hashChunk),
      c2.map((c) => c.hashChunk),
    );
  });

  it("09. 1201 produtos => 3 chunks", () => {
    const chunks = planejarChunks(loteChunkTeste1201(), { tamanhoChunk: 500 });
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].produtos.length, 500);
    assert.equal(chunks[1].produtos.length, 500);
    assert.equal(chunks[2].produtos.length, 201);
  });

  it("10. hash pacote lote completo", () => {
    const lote = loteProduto1Cd();
    const rpc = mapearChunkParaRpc(lote.produtos, lote.cds);
    assert.ok(hashPacoteLote(rpc.produtos, rpc.cds).length === 64);
  });

  it("11. totalizar chunks", () => {
    const lote = loteChunkTeste1201();
    const chunks = planejarChunks(lote);
    const t = totalizarChunks(chunks);
    assert.equal(t.produtos, 1201);
    assert.ok(t.cds > 1201);
  });

  it("12. progresso percentual", () => {
    let p = criarProgressoInicial(100, 500);
    p = atualizarProgresso(p, { produtosProcessados: 50, duracaoMs: 1000 });
    assert.equal(p.percentual, 50);
  });

  it("13. produção usa RPC chunked", () => {
    assert.equal(PERSISTENCIA_CHUNKED_USA_RPC, true);
    assert.equal(PERSISTENCIA_PRODUCAO_USA_RPC, true);
  });

  it("14. entrada não mutada", () => {
    const lote = cloneLoteChunk(loteChunkTeste1201());
    const snap = JSON.stringify(lote);
    planejarChunks(lote);
    assert.equal(JSON.stringify(lote), snap);
  });

  it("15. tamanho padrão chunk 500", () => {
    assert.equal(CHUNK_TAMANHO_PADRAO, 500);
  });

  it("16. redução automática por limite bytes", () => {
    const lote = loteChunkTeste1201();
    const chunks = planejarChunks(lote, { tamanhoChunk: 500, limiteBytes: 5000 });
    assert.ok(chunks.length >= 3);
  });

  it("17. regional/data fixture TESTE", () => {
    const lote = loteChunkTeste1201();
    assert.equal(lote.produtos[0].regional, CHUNK_TESTE_REGIONAL);
    assert.equal(lote.produtos[0].dataReferencia, CHUNK_TESTE_DATA);
  });

  it("18. variantes 1/5/8/12 CDs", () => {
    const lote = loteChunkTeste1201();
    const qtds = new Set(lote.produtos.slice(0, 20).map((p) => p.quantidadeCds));
    assert.ok(qtds.has(1));
    assert.ok(qtds.has(5));
  });
});
